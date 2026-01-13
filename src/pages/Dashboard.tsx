import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { School, SchoolAggregate, SchoolDisplayData } from '../types';
import '../styles/Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | 'grade5' | 'grade8'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both JSON files
      const [schoolsResponse, aggregatesResponse] = await Promise.all([
        fetch('/data/schools.json'),
        fetch('/data/schoolAggregates.json')
      ]);

      if (!schoolsResponse.ok || !aggregatesResponse.ok) {
        throw new Error('Failed to load data files');
      }

      const schoolsData: School[] = await schoolsResponse.json();
      const aggregatesData: Record<string, SchoolAggregate> = await aggregatesResponse.json();

      // Join data using UDISE as key
      const combinedData: SchoolDisplayData[] = schoolsData.map(school => {
        const aggregate = aggregatesData[school.udise];
        return {
          ...school,
          grade5: aggregate?.grade5,
          grade8: aggregate?.grade8
        };
      });

      setSchools(combinedData);

      // Logging
      console.log(`Total schools loaded: ${combinedData.length}`);
      const schoolsWithGrade5 = combinedData.filter(s => s.grade5).length;
      const schoolsWithGrade8 = combinedData.filter(s => s.grade8).length;
      console.log(`Schools with Grade 5 data: ${schoolsWithGrade5}`);
      console.log(`Schools with Grade 8 data: ${schoolsWithGrade8}`);

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  // Get unique blocks for dropdown
  const uniqueBlocks = Array.from(new Set(schools.map(s => s.block).filter(Boolean))).sort();

  // Apply filters
  const filteredSchools = schools.filter(school => {
    // Search filter (school name or UDISE)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      school.schoolName.toLowerCase().includes(searchLower) ||
      school.udise.toLowerCase().includes(searchLower);

    // Block filter
    const matchesBlock = selectedBlock === 'all' || school.block === selectedBlock;

    // Grade filter
    let matchesGrade = true;
    if (gradeFilter === 'grade5') {
      matchesGrade = !!school.grade5;
    } else if (gradeFilter === 'grade8') {
      matchesGrade = !!school.grade8;
    }

    return matchesSearch && matchesBlock && matchesGrade;
  });

  // Helper function to get color class based on achievement
  const getAchievementColorClass = (percent: number): string => {
    if (percent >= 75) return 'achievement-high';
    if (percent >= 50) return 'achievement-medium';
    return 'achievement-low';
  };

  // Calculate block and district averages
  const calculateBlockAverages = () => {
    const blockData: Record<string, {
      grade5: Record<string, { total: number; count: number }>;
      grade8: Record<string, { total: number; count: number }>;
    }> = {};

    const districtData = {
      grade5: {} as Record<string, { total: number; count: number }>,
      grade8: {} as Record<string, { total: number; count: number }>
    };

    const grade5Subjects = ['Odia', 'English', 'Mathematics', 'EVS'];
    const grade8Subjects = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];

    // Initialize
    grade5Subjects.forEach(subject => {
      districtData.grade5[subject] = { total: 0, count: 0 };
    });
    grade8Subjects.forEach(subject => {
      districtData.grade8[subject] = { total: 0, count: 0 };
    });

    schools.forEach(school => {
      // Initialize block if not exists
      if (!blockData[school.block]) {
        blockData[school.block] = {
          grade5: {},
          grade8: {}
        };
        grade5Subjects.forEach(subject => {
          blockData[school.block].grade5[subject] = { total: 0, count: 0 };
        });
        grade8Subjects.forEach(subject => {
          blockData[school.block].grade8[subject] = { total: 0, count: 0 };
        });
      }

      // Grade 5
      if (school.grade5?.subjects) {
        grade5Subjects.forEach(subject => {
          if (school.grade5!.subjects[subject]) {
            const percent = school.grade5!.subjects[subject].avgPercent;
            blockData[school.block].grade5[subject].total += percent;
            blockData[school.block].grade5[subject].count += 1;
            districtData.grade5[subject].total += percent;
            districtData.grade5[subject].count += 1;
          }
        });
      }

      // Grade 8
      if (school.grade8?.subjects) {
        grade8Subjects.forEach(subject => {
          if (school.grade8!.subjects[subject]) {
            const percent = school.grade8!.subjects[subject].avgPercent;
            blockData[school.block].grade8[subject].total += percent;
            blockData[school.block].grade8[subject].count += 1;
            districtData.grade8[subject].total += percent;
            districtData.grade8[subject].count += 1;
          }
        });
      }
    });

    return { blockData, districtData };
  };

  const { blockData, districtData } = calculateBlockAverages();

  // Render block/district summary table
  const renderSummaryTable = () => {
    const blocks = Object.keys(blockData).sort();
    const grade5Subjects = ['Odia', 'English', 'Mathematics', 'EVS'];
    const grade8Subjects = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];

    const renderSummaryCell = (data: { total: number; count: number }) => {
      if (data.count === 0) {
        return <td className="no-data summary-cell">-</td>;
      }
      const avg = Math.round(data.total / data.count);
      const colorClass = getAchievementColorClass(avg);
      return <td className={`summary-cell ${colorClass}`}>{avg}%</td>;
    };

    return (
      <div className="summary-section">
        <h2 className="summary-heading">District & Block-wise Performance Summary</h2>
        <div className="summary-table-container">
          <table className="summary-table">
            <thead>
              <tr>
                <th rowSpan={2}>Area</th>
                <th colSpan={4}>Grade 5 Average Achievement %</th>
                <th colSpan={5}>Grade 8 Average Achievement %</th>
              </tr>
              <tr>
                {/* Grade 5 subjects */}
                <th>Odia</th>
                <th>English</th>
                <th>Math</th>
                <th>EVS</th>
                {/* Grade 8 subjects */}
                <th>Odia</th>
                <th>English</th>
                <th>Math</th>
                <th>Science</th>
                <th>Social Sci</th>
              </tr>
            </thead>
            <tbody>
              {/* District Average Row */}
              <tr className="district-row">
                <td className="area-name"><strong>District Average</strong></td>
                {grade5Subjects.map(subject => (
                  <React.Fragment key={`district-g5-${subject}`}>
                    {renderSummaryCell(districtData.grade5[subject])}
                  </React.Fragment>
                ))}
                {grade8Subjects.map(subject => (
                  <React.Fragment key={`district-g8-${subject}`}>
                    {renderSummaryCell(districtData.grade8[subject])}
                  </React.Fragment>
                ))}
              </tr>
              {/* Block Rows */}
              {blocks.map(block => (
                <tr key={block}>
                  <td className="area-name">{block}</td>
                  {grade5Subjects.map(subject => (
                    <React.Fragment key={`${block}-g5-${subject}`}>
                      {renderSummaryCell(blockData[block].grade5[subject])}
                    </React.Fragment>
                  ))}
                  {grade8Subjects.map(subject => (
                    <React.Fragment key={`${block}-g8-${subject}`}>
                      {renderSummaryCell(blockData[block].grade8[subject])}
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSubjectCell = (subjects: Record<string, any> | undefined, subjectName: string) => {
    if (!subjects || !subjects[subjectName]) {
      return <td className="no-data">No data</td>;
    }

    const subject = subjects[subjectName];
    return (
      <td className="subject-cell">
        <div className="marks">{subject.avgMarks} / {subject.totalMarks}</div>
        <div className="percent">({subject.avgPercent}%)</div>
      </td>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading school data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Anugul School Assessment Dashboard</h1>
        <p className="subtitle">Assessment conducted over two days, Grades 5 and 8</p>
      </header>

      {/* Block and District Summary */}
      {renderSummaryTable()}

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by school name or UDISE"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={selectedBlock}
          onChange={(e) => setSelectedBlock(e.target.value)}
        >
          <option value="all">All Blocks</option>
          {uniqueBlocks.map(block => (
            <option key={block} value={block}>{block}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value as 'all' | 'grade5' | 'grade8')}
        >
          <option value="all">All Schools</option>
          <option value="grade5">Schools with Grade 5 data</option>
          <option value="grade8">Schools with Grade 8 data</option>
        </select>

        {(searchTerm || selectedBlock !== 'all' || gradeFilter !== 'all') && (
          <button
            className="clear-filters-button"
            onClick={() => {
              setSearchTerm('');
              setSelectedBlock('all');
              setGradeFilter('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="schools-table">
          <thead>
            <tr>
              <th rowSpan={2}>School Name</th>
              <th rowSpan={2}>UDISE</th>
              <th rowSpan={2}>Block</th>
              <th colSpan={4}>Grade 5 Average Score</th>
              <th colSpan={5}>Grade 8 Average Score</th>
              <th rowSpan={2}>Actions</th>
            </tr>
            <tr>
              {/* Grade 5 subjects */}
              <th>Odia</th>
              <th>English</th>
              <th>Mathematics</th>
              <th>EVS</th>
              {/* Grade 8 subjects */}
              <th>Odia</th>
              <th>English</th>
              <th>Mathematics</th>
              <th>Science</th>
              <th>Social Science</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchools.length === 0 ? (
              <tr>
                <td colSpan={13} className="no-results">
                  No schools found for selected filters
                </td>
              </tr>
            ) : (
              filteredSchools.map((school) => (
              <tr key={school.udise}>
                <td className="school-name">{school.schoolName}</td>
                <td>{school.udise}</td>
                <td>{school.block}</td>

                {/* Grade 5 subjects */}
                {renderSubjectCell(school.grade5?.subjects, 'Odia')}
                {renderSubjectCell(school.grade5?.subjects, 'English')}
                {renderSubjectCell(school.grade5?.subjects, 'Mathematics')}
                {renderSubjectCell(school.grade5?.subjects, 'EVS')}

                {/* Grade 8 subjects */}
                {renderSubjectCell(school.grade8?.subjects, 'Odia')}
                {renderSubjectCell(school.grade8?.subjects, 'English')}
                {renderSubjectCell(school.grade8?.subjects, 'Mathematics')}
                {renderSubjectCell(school.grade8?.subjects, 'Science')}
                {renderSubjectCell(school.grade8?.subjects, 'Social Science')}

                <td>
                  <button className="view-button" onClick={() => navigate(`/school/${school.udise}`)}>
                    View School Report
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <div className="results-info">
        Showing {filteredSchools.length} of {schools.length} schools
      </div>
    </div>
  );
}

export default Dashboard;

