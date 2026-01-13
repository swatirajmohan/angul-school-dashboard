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

// Subject ordering
const GRADE5_SUBJECT_ORDER = ['Odia', 'English', 'Mathematics', 'EVS'];
const GRADE8_SUBJECT_ORDER = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];

function SchoolReport() {
  const { udise } = useParams<{ udise: string }>();
  const navigate = useNavigate();
  
  const [school, setSchool] = useState<School | null>(null);
  const [aggregate, setAggregate] = useState<SchoolAggregate | null>(null);
  const [loBreakdown, setLoBreakdown] = useState<SchoolLoBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<5 | 8 | null>(null);

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
      const agg = aggregatesData[udise!] || null;
      setAggregate(agg);
      setLoBreakdown(loBreakdownData);
      
      // Set default selected grade
      if (agg) {
        if (agg.grade5) {
          setSelectedGrade(5);
        } else if (agg.grade8) {
          setSelectedGrade(8);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading school data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load school data');
      setLoading(false);
    }
  };

  // Helper function to get color class based on achievement
  const getAchievementColorClass = (percent: number): string => {
    if (percent >= 75) return 'achievement-high';
    if (percent >= 50) return 'achievement-medium';
    return 'achievement-low';
  };

  // Helper function to get student count for a subject
  const getStudentCount = (los: LORecord[]): number => {
    if (!los || los.length === 0) return 0;
    // Use the attempts from the first LO as all LOs for a subject should have the same student count
    return los[0]?.attempts || 0;
  };

  // Render subject-wise summary table
  const renderSubjectSummary = (grade: 5 | 8) => {
    const gradeData = grade === 5 ? aggregate?.grade5 : aggregate?.grade8;
    if (!gradeData || !gradeData.subjects) return null;

    const subjectOrder = grade === 5 ? GRADE5_SUBJECT_ORDER : GRADE8_SUBJECT_ORDER;
    const availableSubjects = subjectOrder.filter(subject => gradeData.subjects[subject]);

    if (availableSubjects.length === 0) return null;

    return (
      <div className="subject-summary">
        <h3>Subject-wise Achievement Summary</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Average Achievement %</th>
            </tr>
          </thead>
          <tbody>
            {availableSubjects.map(subject => {
              const subjectData = gradeData.subjects[subject];
              const percent = subjectData.avgPercent;
              const colorClass = getAchievementColorClass(percent);
              return (
                <tr key={subject}>
                  <td className="subject-name-cell">{subject}</td>
                  <td className={`centered ${colorClass}`}>{percent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderLOTable = (los: LORecord[], subject: string) => {
    if (!los || los.length === 0) {
      return <p className="no-lo-data">No LO data available</p>;
    }

    // Group LOs by achievement level
    const highAchievement = los.filter(lo => lo.percent >= 75).sort((a, b) => b.percent - a.percent);
    const mediumAchievement = los.filter(lo => lo.percent >= 50 && lo.percent < 75).sort((a, b) => b.percent - a.percent);
    const lowAchievement = los.filter(lo => lo.percent < 50).sort((a, b) => b.percent - a.percent);

    const studentCount = getStudentCount(los);

    const renderLORows = (loList: LORecord[], colorClass: string) => {
      return loList.map((lo, index) => (
        <tr key={index} className={colorClass}>
          <td>{lo.loCode}</td>
          <td className="lo-description">{lo.loDescription}</td>
          <td className="centered">{lo.itemCount}</td>
          <td className="centered">{lo.attempts}</td>
          <td className="centered">{lo.correct}</td>
          <td className="centered achievement">{lo.percent}%</td>
        </tr>
      ));
    };

    return (
      <div className="subject-section">
        <h3 className="subject-heading">
          {subject} <span className="student-count">({studentCount} students)</span>
        </h3>
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
            {highAchievement.length > 0 && renderLORows(highAchievement, 'achievement-high')}
            {mediumAchievement.length > 0 && renderLORows(mediumAchievement, 'achievement-medium')}
            {lowAchievement.length > 0 && renderLORows(lowAchievement, 'achievement-low')}
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

  // Render grade section
  const renderGradeSection = (grade: 5 | 8) => {
    const gradeData = grade === 5 ? aggregate?.grade5 : aggregate?.grade8;
    const gradeLoData = grade === 5 ? schoolLO?.grade5 : schoolLO?.grade8;
    const subjectOrder = grade === 5 ? GRADE5_SUBJECT_ORDER : GRADE8_SUBJECT_ORDER;

    if (!gradeData) return null;

    return (
      <div className="grade-section">
        <h2 className="grade-heading">Grade {grade} Performance</h2>
        
        {/* Overall Average */}
        <div className="grade-summary">
          <div className="summary-item">
            <span className="summary-label">Overall Average:</span>
            <span className="summary-value">
              {gradeData.overallAvgMarks} marks ({gradeData.overallPercent}%)
            </span>
          </div>
        </div>

        {/* Subject-wise Summary Table */}
        {renderSubjectSummary(grade)}

        {/* LO Tables by Subject in Order */}
        {gradeLoData ? (
          subjectOrder
            .filter(subject => gradeLoData[subject])
            .map(subject => (
              <div key={subject}>
                {renderLOTable(gradeLoData[subject], subject)}
              </div>
            ))
        ) : (
          <p className="no-data">No LO data available for Grade {grade}</p>
        )}
      </div>
    );
  };

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
      </div>

      {/* Grade Toggle */}
      {(hasGrade5 || hasGrade8) && (
        <div className="grade-toggle">
          {hasGrade5 && (
            <button
              className={`grade-tab ${selectedGrade === 5 ? 'active' : ''}`}
              onClick={() => setSelectedGrade(5)}
            >
              Grade 5
            </button>
          )}
          {hasGrade8 && (
            <button
              className={`grade-tab ${selectedGrade === 8 ? 'active' : ''}`}
              onClick={() => setSelectedGrade(8)}
            >
              Grade 8
            </button>
          )}
        </div>
      )}

      {/* Render Selected Grade */}
      {selectedGrade === 5 && hasGrade5 && renderGradeSection(5)}
      {selectedGrade === 8 && hasGrade8 && renderGradeSection(8)}

      {!hasGrade5 && !hasGrade8 && (
        <div className="no-data-message">
          <p>No assessment data available for this school.</p>
        </div>
      )}
    </div>
  );
}

export default SchoolReport;

