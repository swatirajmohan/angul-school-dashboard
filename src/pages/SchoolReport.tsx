import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { School, SchoolAggregate } from '../types';
import '../styles/SchoolReport.css';

interface LORecord {
  loCode: string;
  loDescription: string;
  itemCount: number;
  attempts: number;
  correct: number;
  percent: number;
}

interface SchoolLoBreakdown {
  [udise: string]: {
    grade5?: {
      [subject: string]: LORecord[];
    };
    grade8?: {
      [subject: string]: LORecord[];
    };
  };
}

function SchoolReport() {
  const { udise } = useParams<{ udise: string }>();
  const navigate = useNavigate();
  
  const [school, setSchool] = useState<School | null>(null);
  const [aggregate, setAggregate] = useState<SchoolAggregate | null>(null);
  const [loBreakdown, setLoBreakdown] = useState<SchoolLoBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchoolData();
  }, [udise]);

  const loadSchoolData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data
      const [schoolsResponse, aggregatesResponse, loBreakdownResponse] = await Promise.all([
        fetch('/data/schools.json'),
        fetch('/data/schoolAggregates.json'),
        fetch('/data/schoolLoBreakdown.json')
      ]);

      if (!schoolsResponse.ok || !aggregatesResponse.ok || !loBreakdownResponse.ok) {
        throw new Error('Failed to load data files');
      }

      const schoolsData: School[] = await schoolsResponse.json();
      const aggregatesData: Record<string, SchoolAggregate> = await aggregatesResponse.json();
      const loBreakdownData: SchoolLoBreakdown = await loBreakdownResponse.json();

      // Find the specific school
      const foundSchool = schoolsData.find(s => s.udise === udise);
      if (!foundSchool) {
        throw new Error('School not found');
      }

      setSchool(foundSchool);
      setAggregate(aggregatesData[udise!] || null);
      setLoBreakdown(loBreakdownData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading school data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load school data');
      setLoading(false);
    }
  };

  const renderLOTable = (los: LORecord[], subject: string) => {
    if (!los || los.length === 0) {
      return <p className="no-lo-data">No LO data available</p>;
    }

    // Sort by achievement % ascending (weakest first)
    const sortedLos = [...los].sort((a, b) => a.percent - b.percent);

    return (
      <div className="subject-section">
        <h3 className="subject-heading">{subject}</h3>
        <table className="lo-table">
          <thead>
            <tr>
              <th>LO Code</th>
              <th>LO Description</th>
              <th>Item Count</th>
              <th>Attempts</th>
              <th>Correct</th>
              <th>Achievement %</th>
            </tr>
          </thead>
          <tbody>
            {sortedLos.map((lo, index) => (
              <tr key={index}>
                <td>{lo.loCode}</td>
                <td className="lo-description">{lo.loDescription}</td>
                <td className="centered">{lo.itemCount}</td>
                <td className="centered">{lo.attempts}</td>
                <td className="centered">{lo.correct}</td>
                <td className="centered achievement">{lo.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading school report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Error: {error}</div>
        <button className="back-button" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="container">
        <div className="error">School not found</div>
        <button className="back-button" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const schoolLO = loBreakdown?.[udise!];
  const hasGrade5 = !!aggregate?.grade5;
  const hasGrade8 = !!aggregate?.grade8;

  return (
    <div className="container">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>

      <div className="school-header">
        <h1>{school.schoolName}</h1>
        <div className="school-info">
          <div className="info-item">
            <span className="label">UDISE:</span>
            <span className="value">{school.udise}</span>
          </div>
          <div className="info-item">
            <span className="label">Block:</span>
            <span className="value">{school.block}</span>
          </div>
          <div className="info-item">
            <span className="label">Management:</span>
            <span className="value">{school.management}</span>
          </div>
          <div className="info-item">
            <span className="label">Location:</span>
            <span className="value">{school.location}</span>
          </div>
        </div>
        <div className="grades-available">
          <span className="label">Grades Available:</span>
          {hasGrade5 && <span className="grade-badge">Grade 5</span>}
          {hasGrade8 && <span className="grade-badge">Grade 8</span>}
          {!hasGrade5 && !hasGrade8 && <span className="no-data">No assessment data</span>}
        </div>
      </div>

      {/* Grade 5 Section */}
      {hasGrade5 && (
        <div className="grade-section">
          <h2 className="grade-heading">Grade 5 Performance</h2>
          
          {aggregate?.grade5 && (
            <div className="grade-summary">
              <div className="summary-item">
                <span className="summary-label">Students:</span>
                <span className="summary-value">{aggregate.grade5.studentCount}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Overall Average:</span>
                <span className="summary-value">
                  {aggregate.grade5.overallAvgMarks} marks ({aggregate.grade5.overallPercent}%)
                </span>
              </div>
            </div>
          )}

          {schoolLO?.grade5 ? (
            Object.keys(schoolLO.grade5).sort().map(subject => (
              <div key={subject}>
                {renderLOTable(schoolLO.grade5![subject], subject)}
              </div>
            ))
          ) : (
            <p className="no-data">No LO data available for Grade 5</p>
          )}
        </div>
      )}

      {/* Grade 8 Section */}
      {hasGrade8 && (
        <div className="grade-section">
          <h2 className="grade-heading">Grade 8 Performance</h2>
          
          {aggregate?.grade8 && (
            <div className="grade-summary">
              <div className="summary-item">
                <span className="summary-label">Students:</span>
                <span className="summary-value">{aggregate.grade8.studentCount}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Overall Average:</span>
                <span className="summary-value">
                  {aggregate.grade8.overallAvgMarks} marks ({aggregate.grade8.overallPercent}%)
                </span>
              </div>
            </div>
          )}

          {schoolLO?.grade8 ? (
            Object.keys(schoolLO.grade8).sort().map(subject => (
              <div key={subject}>
                {renderLOTable(schoolLO.grade8![subject], subject)}
              </div>
            ))
          ) : (
            <p className="no-data">No LO data available for Grade 8</p>
          )}
        </div>
      )}

      {!hasGrade5 && !hasGrade8 && (
        <div className="no-data-message">
          <p>No assessment data available for this school.</p>
        </div>
      )}
    </div>
  );
}

export default SchoolReport;

