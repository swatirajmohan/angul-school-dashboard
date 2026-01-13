import { useEffect, useState } from 'react';
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

