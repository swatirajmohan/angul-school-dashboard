import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { School } from '../types';
import '../styles/LoDetails.css';

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

interface AggregatedLO {
  loCode: string;
  loDescription: string;
  itemCount: number;
  attempts: number;
  correct: number;
  percent: number;
}

// Subject ordering
const GRADE5_SUBJECT_ORDER = ['Odia', 'English', 'Mathematics', 'EVS'];
const GRADE8_SUBJECT_ORDER = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];

function LoDetails() {
  const navigate = useNavigate();
  
  const [schools, setSchools] = useState<School[]>([]);
  const [loBreakdown, setLoBreakdown] = useState<SchoolLoBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedGrade, setSelectedGrade] = useState<5 | 8>(5);
  const [selectedBlock, setSelectedBlock] = useState<string>('District');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [schoolsResponse, loBreakdownResponse] = await Promise.all([
        fetch('/data/schools.json'),
        fetch('/data/schoolLoBreakdown.json')
      ]);

      if (!schoolsResponse.ok || !loBreakdownResponse.ok) {
        throw new Error('Failed to load data files');
      }

      const schoolsData: School[] = await schoolsResponse.json();
      const loBreakdownData: SchoolLoBreakdown = await loBreakdownResponse.json();

      setSchools(schoolsData);
      setLoBreakdown(loBreakdownData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  // Get unique blocks
  const uniqueBlocks = useMemo(() => {
    return ['District', ...Array.from(new Set(schools.map(s => s.block).filter(Boolean))).sort()];
  }, [schools]);

  // Aggregate LO data by grade, block, and subject
  const aggregatedLOs = useMemo(() => {
    if (!loBreakdown || !schools.length) return {};

    const result: Record<string, Record<string, Record<string, AggregatedLO[]>>> = {
      '5': {},
      '8': {}
    };

    // Filter schools by block
    const filteredSchools = selectedBlock === 'District' 
      ? schools 
      : schools.filter(s => s.block === selectedBlock);

    // Aggregate for each grade
    [5, 8].forEach(grade => {
      const gradeKey = `grade${grade}` as 'grade5' | 'grade8';
      const subjects = grade === 5 ? GRADE5_SUBJECT_ORDER : GRADE8_SUBJECT_ORDER;

      subjects.forEach(subject => {
        // Collect LOs across all schools for this subject
        const loMap: Record<string, {
          loCode: string;
          loDescription: string;
          itemCounts: Set<number>;
          attempts: number;
          correct: number;
        }> = {};

        filteredSchools.forEach(school => {
          const schoolLOs = loBreakdown[school.udise]?.[gradeKey]?.[subject];
          if (schoolLOs) {
            schoolLOs.forEach(lo => {
              const key = lo.loCode || 'UNKNOWN';
              if (!loMap[key]) {
                loMap[key] = {
                  loCode: lo.loCode,
                  loDescription: lo.loDescription,
                  itemCounts: new Set([lo.itemCount]),
                  attempts: 0,
                  correct: 0
                };
              }
              loMap[key].itemCounts.add(lo.itemCount);
              loMap[key].attempts += lo.attempts;
              loMap[key].correct += lo.correct;
              if (lo.loDescription && !loMap[key].loDescription) {
                loMap[key].loDescription = lo.loDescription;
              }
            });
          }
        });

        // Convert to array
        const aggregated: AggregatedLO[] = Object.values(loMap).map(lo => {
          const itemCount = Math.max(...Array.from(lo.itemCounts));
          const percent = lo.attempts > 0 ? Math.round((lo.correct / lo.attempts) * 100) : 0;
          return {
            loCode: lo.loCode,
            loDescription: lo.loDescription,
            itemCount,
            attempts: lo.attempts,
            correct: lo.correct,
            percent
          };
        });

        if (aggregated.length > 0) {
          if (!result[String(grade)][subject]) {
            result[String(grade)][subject] = {};
          }
          result[String(grade)][subject] = aggregated;
        }
      });
    });

    return result;
  }, [loBreakdown, schools, selectedBlock]);

  // Helper function to get color class based on achievement
  const getAchievementColorClass = (percent: number): string => {
    if (percent >= 75) return 'achievement-high';
    if (percent >= 50) return 'achievement-medium';
    return 'achievement-low';
  };

  // Toggle subject accordion
  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  // Render LO table for a subject
  const renderLOTable = (los: AggregatedLO[]) => {
    if (!los || los.length === 0) {
      return <p className="no-lo-data">No LO data available</p>;
    }

    // Group LOs by achievement level
    const highAchievement = los.filter(lo => lo.percent >= 75);
    const mediumAchievement = los.filter(lo => lo.percent >= 50 && lo.percent < 75);
    const lowAchievement = los.filter(lo => lo.percent < 50);

    const renderLOGroup = (loList: AggregatedLO[], title: string, colorClass: string) => {
      if (loList.length === 0) return null;

      return (
        <>
          <tr className="lo-group-header">
            <td colSpan={6}><strong>{title}</strong></td>
          </tr>
          {loList.map((lo, index) => (
            <tr key={index} className={colorClass}>
              <td>{lo.loCode}</td>
              <td className="lo-description">{lo.loDescription}</td>
              <td className="centered">{lo.itemCount}</td>
              <td className="centered">{lo.attempts}</td>
              <td className="centered">{lo.correct}</td>
              <td className="centered achievement"><strong>{lo.percent}%</strong></td>
            </tr>
          ))}
        </>
      );
    };

    return (
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
          {renderLOGroup(highAchievement, 'Above 75%', 'achievement-high')}
          {renderLOGroup(mediumAchievement, '50% to 75%', 'achievement-medium')}
          {renderLOGroup(lowAchievement, 'Below 50%', 'achievement-low')}
        </tbody>
      </table>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading LO details...</div>
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

  const subjectOrder = selectedGrade === 5 ? GRADE5_SUBJECT_ORDER : GRADE8_SUBJECT_ORDER;
  const gradeData = aggregatedLOs[String(selectedGrade)] || {};

  return (
    <div className="container">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>

      <div className="page-header">
        <h1>Learning Outcome (LO) Details</h1>
        <p className="subtitle">Aggregated LO performance across schools</p>
      </div>

      {/* Grade Toggle and Block Filter */}
      <div className="controls-panel">
        <div className="grade-toggle">
          <button
            className={`grade-tab ${selectedGrade === 5 ? 'active' : ''}`}
            onClick={() => setSelectedGrade(5)}
          >
            Grade 5
          </button>
          <button
            className={`grade-tab ${selectedGrade === 8 ? 'active' : ''}`}
            onClick={() => setSelectedGrade(8)}
          >
            Grade 8
          </button>
        </div>

        <div className="block-filter">
          <label htmlFor="block-select">Block:</label>
          <select
            id="block-select"
            className="block-select"
            value={selectedBlock}
            onChange={(e) => {
              setSelectedBlock(e.target.value);
              setExpandedSubjects(new Set()); // Collapse all when block changes
            }}
          >
            {uniqueBlocks.map(block => (
              <option key={block} value={block}>{block}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject Accordions */}
      <div className="subjects-container">
        {subjectOrder.map(subject => {
          const los = gradeData[subject];
          const isExpanded = expandedSubjects.has(subject);
          const hasData = los && los.length > 0;

          return (
            <div key={subject} className="subject-accordion">
              <button
                className={`accordion-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleSubject(subject)}
                disabled={!hasData}
              >
                <span className="subject-name">{subject}</span>
                {hasData && <span className="lo-count">({los.length} LOs)</span>}
                {!hasData && <span className="no-data-label">No data</span>}
                {hasData && <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>}
              </button>
              
              {isExpanded && hasData && (
                <div className="accordion-content">
                  {renderLOTable(los)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {subjectOrder.every(subject => !gradeData[subject] || gradeData[subject].length === 0) && (
        <div className="no-data-message">
          <p>No LO data available for Grade {selectedGrade} in {selectedBlock}.</p>
        </div>
      )}
    </div>
  );
}

export default LoDetails;

