import React, { useEffect, useState, useMemo } from 'react';
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

      const [schoolsResponse, aggregatesResponse] = await Promise.all([
        fetch('/data/schools.json'),
        fetch('/data/schoolAggregates.json')
      ]);

      if (!schoolsResponse.ok || !aggregatesResponse.ok) {
        throw new Error('Failed to load data files');
      }

      const schoolsData: School[] = await schoolsResponse.json();
      const aggregatesData: Record<string, SchoolAggregate> = await aggregatesResponse.json();

      const combinedData: SchoolDisplayData[] = schoolsData.map(school => {
        const aggregate = aggregatesData[school.udise];
        return {
          ...school,
          grade5: aggregate?.grade5,
          grade8: aggregate?.grade8
        };
      });

      setSchools(combinedData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  // Helper function to get color class based on achievement
  const getAchievementColorClass = (percent: number): string => {
    if (percent >= 75) return 'achievement-high';
    if (percent >= 50) return 'achievement-medium';
    return 'achievement-low';
  };

  // Get unique blocks for dropdown
  const uniqueBlocks = Array.from(new Set(schools.map(s => s.block).filter(Boolean))).sort();

  // Apply filters
  const filteredSchools = schools.filter(school => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      school.schoolName.toLowerCase().includes(searchLower) ||
      school.udise.toLowerCase().includes(searchLower);

    const matchesBlock = selectedBlock === 'all' || school.block === selectedBlock;

    let matchesGrade = true;
    if (gradeFilter === 'grade5') {
      matchesGrade = !!school.grade5;
    } else if (gradeFilter === 'grade8') {
      matchesGrade = !!school.grade8;
    }

    return matchesSearch && matchesBlock && matchesGrade;
  });

  // Calculate district and block summaries
  const summaryData = useMemo(() => {
    const grade5Subjects = ['Odia', 'English', 'Mathematics', 'EVS'];
    const grade8Subjects = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];

    const blockStats: Record<string, {
      grade5: {
        schoolCount: number;
        studentCount: number;
        subjectTotals: Record<string, { total: number; count: number }>;
      };
      grade8: {
        schoolCount: number;
        studentCount: number;
        subjectTotals: Record<string, { total: number; count: number }>;
      };
    }> = {};

    const districtStats = {
      grade5: {
        schoolCount: 0,
        studentCount: 0,
        subjectTotals: {} as Record<string, { total: number; count: number }>
      },
      grade8: {
        schoolCount: 0,
        studentCount: 0,
        subjectTotals: {} as Record<string, { total: number; count: number }>
      }
    };

    // Initialize
    grade5Subjects.forEach(subject => {
      districtStats.grade5.subjectTotals[subject] = { total: 0, count: 0 };
    });
    grade8Subjects.forEach(subject => {
      districtStats.grade8.subjectTotals[subject] = { total: 0, count: 0 };
    });

    schools.forEach(school => {
      const block = school.block;
      if (!blockStats[block]) {
        blockStats[block] = {
          grade5: {
            schoolCount: 0,
            studentCount: 0,
            subjectTotals: {}
          },
          grade8: {
            schoolCount: 0,
            studentCount: 0,
            subjectTotals: {}
          }
        };
        grade5Subjects.forEach(subject => {
          blockStats[block].grade5.subjectTotals[subject] = { total: 0, count: 0 };
        });
        grade8Subjects.forEach(subject => {
          blockStats[block].grade8.subjectTotals[subject] = { total: 0, count: 0 };
        });
      }

      // Grade 5
      if (school.grade5) {
        blockStats[block].grade5.schoolCount++;
        blockStats[block].grade5.studentCount += school.grade5.uniqueStudentCount;
        districtStats.grade5.schoolCount++;
        districtStats.grade5.studentCount += school.grade5.uniqueStudentCount;

        grade5Subjects.forEach(subject => {
          if (school.grade5!.subjects[subject]) {
            const percent = school.grade5!.subjects[subject].avgPercent;
            blockStats[block].grade5.subjectTotals[subject].total += percent;
            blockStats[block].grade5.subjectTotals[subject].count += 1;
            districtStats.grade5.subjectTotals[subject].total += percent;
            districtStats.grade5.subjectTotals[subject].count += 1;
          }
        });
      }

      // Grade 8
      if (school.grade8) {
        blockStats[block].grade8.schoolCount++;
        blockStats[block].grade8.studentCount += school.grade8.uniqueStudentCount;
        districtStats.grade8.schoolCount++;
        districtStats.grade8.studentCount += school.grade8.uniqueStudentCount;

        grade8Subjects.forEach(subject => {
          if (school.grade8!.subjects[subject]) {
            const percent = school.grade8!.subjects[subject].avgPercent;
            blockStats[block].grade8.subjectTotals[subject].total += percent;
            blockStats[block].grade8.subjectTotals[subject].count += 1;
            districtStats.grade8.subjectTotals[subject].total += percent;
            districtStats.grade8.subjectTotals[subject].count += 1;
          }
        });
      }
    });

    return { blockStats, districtStats };
  }, [schools]);

  // Render block/district summary table
  const renderSummaryTable = () => {
    const { blockStats, districtStats } = summaryData;
    const blocks = Object.keys(blockStats).sort();
    const grade5Subjects = ['Odia', 'English', 'Mathematics', 'EVS'];
    const grade8Subjects = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];

    const renderStatCell = (value: number, isCount: boolean = false) => {
      if (isCount) {
        return <td className="summary-cell">{value}</td>;
      }
      const colorClass = getAchievementColorClass(value);
      return <td className={`summary-cell ${colorClass}`}><strong>{value}%</strong></td>;
    };

    const calculateGradeTotalAvg = (subjectTotals: Record<string, { total: number; count: number }>) => {
      const subjects = Object.values(subjectTotals);
      const validSubjects = subjects.filter(s => s.count > 0);
      if (validSubjects.length === 0) return 0;
      const avgSum = validSubjects.reduce((sum, s) => sum + (s.total / s.count), 0);
      return Math.round(avgSum / validSubjects.length);
    };

    return (
      <div className="summary-section">
        <h2 className="summary-heading">District & Block-wise Performance Summary</h2>
        <div className="summary-table-container">
          <table className="summary-table-compact">
            <thead>
              <tr>
                <th rowSpan={2}>Area</th>
                <th colSpan={6}>Grade 5</th>
                <th colSpan={7}>Grade 8</th>
              </tr>
              <tr>
                {/* Grade 5 columns */}
                <th>Schools</th>
                <th>Students</th>
                <th>Total Avg %</th>
                <th>Odia</th>
                <th>Eng</th>
                <th>Math</th>
                <th>EVS</th>
                {/* Grade 8 columns */}
                <th>Schools</th>
                <th>Students</th>
                <th>Total Avg %</th>
                <th>Odia</th>
                <th>Eng</th>
                <th>Math</th>
                <th>Sci</th>
                <th>Soc</th>
              </tr>
            </thead>
            <tbody>
              {/* District Average Row */}
              <tr className="district-row">
                <td className="area-name"><strong>District Average</strong></td>
                {/* Grade 5 */}
                <td className="summary-cell">{districtStats.grade5.schoolCount}</td>
                <td className="summary-cell">{districtStats.grade5.studentCount}</td>
                {renderStatCell(calculateGradeTotalAvg(districtStats.grade5.subjectTotals))}
                {grade5Subjects.map(subject => {
                  const data = districtStats.grade5.subjectTotals[subject];
                  const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
                  return <React.Fragment key={`district-g5-${subject}`}>
                    {data.count > 0 ? renderStatCell(avg) : <td className="summary-cell no-data">-</td>}
                  </React.Fragment>;
                })}
                {/* Grade 8 */}
                <td className="summary-cell">{districtStats.grade8.schoolCount}</td>
                <td className="summary-cell">{districtStats.grade8.studentCount}</td>
                {renderStatCell(calculateGradeTotalAvg(districtStats.grade8.subjectTotals))}
                {grade8Subjects.map(subject => {
                  const data = districtStats.grade8.subjectTotals[subject];
                  const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
                  return <React.Fragment key={`district-g8-${subject}`}>
                    {data.count > 0 ? renderStatCell(avg) : <td className="summary-cell no-data">-</td>}
                  </React.Fragment>;
                })}
              </tr>
              {/* Block Rows */}
              {blocks.map(block => (
                <tr key={block}>
                  <td className="area-name">{block}</td>
                  {/* Grade 5 */}
                  <td className="summary-cell">{blockStats[block].grade5.schoolCount}</td>
                  <td className="summary-cell">{blockStats[block].grade5.studentCount}</td>
                  {renderStatCell(calculateGradeTotalAvg(blockStats[block].grade5.subjectTotals))}
                  {grade5Subjects.map(subject => {
                    const data = blockStats[block].grade5.subjectTotals[subject];
                    const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
                    return <React.Fragment key={`${block}-g5-${subject}`}>
                      {data.count > 0 ? renderStatCell(avg) : <td className="summary-cell no-data">-</td>}
                    </React.Fragment>;
                  })}
                  {/* Grade 8 */}
                  <td className="summary-cell">{blockStats[block].grade8.schoolCount}</td>
                  <td className="summary-cell">{blockStats[block].grade8.studentCount}</td>
                  {renderStatCell(calculateGradeTotalAvg(blockStats[block].grade8.subjectTotals))}
                  {grade8Subjects.map(subject => {
                    const data = blockStats[block].grade8.subjectTotals[subject];
                    const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
                    return <React.Fragment key={`${block}-g8-${subject}`}>
                      {data.count > 0 ? renderStatCell(avg) : <td className="summary-cell no-data">-</td>}
                    </React.Fragment>;
                  })}
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
    const colorClass = getAchievementColorClass(subject.avgPercent);
    return (
      <td className={`subject-cell ${colorClass}`}>
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

      {/* Filters and LO Details Button */}
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

        <button
          className="lo-details-button"
          onClick={() => navigate('/lo-details')}
        >
          📊 View LO Details
        </button>
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
