import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { School } from '../types';
import PageHeader from '../components/PageHeader';
import { getAchievementColorClass, formatPercent } from '../utils/achievementUtils';
import '../styles/LoDetails.css';

interface LORecord {
  loCode: string;
  loDescription: string;
  itemCount: number;
  attempts: number;
  correct: number;
  percent: number;
  attempts_G_1: number;
  correct_G_1: number;
  percent_G_1: number | null;
  attempts_G: number;
  correct_G: number;
  percent_G: number | null;
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
  attempts_G_1: number;
  correct_G_1: number;
  percent_G_1: number | null;
  attempts_G: number;
  correct_G: number;
  percent_G: number | null;
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

    const result: Record<string, Record<string, AggregatedLO[]>> = {
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
          attempts_G_1: number;
          correct_G_1: number;
          attempts_G: number;
          correct_G: number;
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
                  correct: 0,
                  attempts_G_1: 0,
                  correct_G_1: 0,
                  attempts_G: 0,
                  correct_G: 0
                };
              }
              loMap[key].itemCounts.add(lo.itemCount);
              loMap[key].attempts += lo.attempts;
              loMap[key].correct += lo.correct;
              loMap[key].attempts_G_1 += lo.attempts_G_1;
              loMap[key].correct_G_1 += lo.correct_G_1;
              loMap[key].attempts_G += lo.attempts_G;
              loMap[key].correct_G += lo.correct_G;
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
          const percent_G_1 = lo.attempts_G_1 > 0 ? Math.round((lo.correct_G_1 / lo.attempts_G_1) * 100) : null;
          const percent_G = lo.attempts_G > 0 ? Math.round((lo.correct_G / lo.attempts_G) * 100) : null;
          return {
            loCode: lo.loCode,
            loDescription: lo.loDescription,
            itemCount,
            attempts: lo.attempts,
            correct: lo.correct,
            percent,
            attempts_G_1: lo.attempts_G_1,
            correct_G_1: lo.correct_G_1,
            percent_G_1,
            attempts_G: lo.attempts_G,
            correct_G: lo.correct_G,
            percent_G
          };
        });

        if (aggregated.length > 0) {
          result[String(grade)][subject] = aggregated;
        }
      });
    });

    return result;
  }, [loBreakdown, schools, selectedBlock]);

  // Render LO table for a subject
  const renderLOTable = (los: AggregatedLO[]) => {
    if (!los || los.length === 0) {
      return <p className="no-lo-data">No LO data available</p>;
    }

    // Group LOs by achievement level
    const highAchievement = los.filter(lo => lo.percent >= 75);
    const mediumAchievement = los.filter(lo => lo.percent >= 50 && lo.percent < 75);
    const lowAchievement = los.filter(lo => lo.percent < 50);

    const renderLOGroup = (loList: AggregatedLO[], title: string) => {
      if (loList.length === 0) return null;

      return (
        <>
          <tr className="lo-group-header">
            <td colSpan={8}><strong>{title}</strong></td>
          </tr>
          {loList.map((lo, index) => {
            const overallColorClass = getAchievementColorClass(lo.percent);
            const g1ColorClass = getAchievementColorClass(lo.percent_G_1);
            const gColorClass = getAchievementColorClass(lo.percent_G);
            
            return (
              <tr key={index}>
                <td>{lo.loCode}</td>
                <td className="lo-description">{lo.loDescription}</td>
                <td className="centered">{lo.itemCount}</td>
                <td className="centered">{lo.attempts}</td>
                <td className="centered">{lo.correct}</td>
                <td className={`centered achievement ${overallColorClass}`}>{lo.percent}%</td>
                <td className={`centered ${g1ColorClass}`.trim()}>{formatPercent(lo.percent_G_1)}</td>
                <td className={`centered ${gColorClass}`.trim()}>{formatPercent(lo.percent_G)}</td>
              </tr>
            );
          })}
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
            <th>G-1 Ach %</th>
            <th>G Ach %</th>
          </tr>
        </thead>
        <tbody>
          {renderLOGroup(highAchievement, '75–100% (Exceeding Goals)')}
          {renderLOGroup(mediumAchievement, '50–74.9% (Meeting Goals)')}
          {renderLOGroup(lowAchievement, 'Below 50%')}
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
      <PageHeader />
      
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>

      <div className="page-section-header">
        <h2>Learning Outcome (LO) Details</h2>
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
            onChange={(e) => setSelectedBlock(e.target.value)}
          >
            {uniqueBlocks.map(block => (
              <option key={block} value={block}>{block}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject Sections */}
      <div className="subjects-container">
        {subjectOrder.map(subject => {
          const los = gradeData[subject];
          const hasData = los && los.length > 0;

          return (
            <div key={subject} className="subject-section">
              <h3 className="subject-heading">
                {subject}
                {hasData && <span className="lo-count"> ({los.length} LOs)</span>}
              </h3>
              
              {hasData ? (
                <div className="subject-content">
                  {renderLOTable(los)}
                </div>
              ) : (
                <p className="no-lo-data">No data available</p>
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

