import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { School, SchoolAggregate } from '../types';
import PageHeader from '../components/PageHeader';
import '../styles/Analytics.css';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface LORecord {
  udise: string;
  grade: number;
  subject: string;
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

// Subject ordering constants
const GRADE5_SUBJECTS = ['Odia', 'English', 'Mathematics', 'EVS'];
const GRADE8_SUBJECTS = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];

const getSubjectDisplay = (subject: string): string =>
  subject === 'Social Science' ? 'SST' : subject;

// Compute aggregated G-1 and G stats for a given grade, subject, and optional block filter
const computeQuestionLevelStats = (
  records: LORecord[],
  grade: number,
  subject: string,
  block: string,
  blockMap: Map<string, string>
) => {
  let filtered = records.filter(lo => lo.grade === grade && lo.subject === subject);
  if (block !== 'all') {
    filtered = filtered.filter(lo => blockMap.get(lo.udise) === block);
  }

  let gMinus1Attempts = 0, gMinus1Correct = 0, gAttempts = 0, gCorrect = 0;
  filtered.forEach(lo => {
    gMinus1Attempts += lo.attempts_G_1 || 0;
    gMinus1Correct += lo.correct_G_1 || 0;
    gAttempts += lo.attempts_G || 0;
    gCorrect += lo.correct_G || 0;
  });

  const gMinus1Pct = gMinus1Attempts > 0
    ? Math.min(100, Math.max(0, Math.round((gMinus1Correct / gMinus1Attempts) * 1000) / 10))
    : 0;
  const gPct = gAttempts > 0
    ? Math.min(100, Math.max(0, Math.round((gCorrect / gAttempts) * 1000) / 10))
    : 0;

  return { gMinus1Pct, gPct, gMinus1Correct, gMinus1Attempts, gCorrect, gAttempts };
};

function Analytics() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [aggregates, setAggregates] = useState<Record<string, SchoolAggregate>>({});
  const [loBreakdown, setLoBreakdown] = useState<LORecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<5 | 8>(5);
  const [selectedSubject, setSelectedSubject] = useState<string>('Odia');

  useEffect(() => {
    loadData();
  }, []);

  // Reset subject selection when grade changes
  useEffect(() => {
    const subjects = selectedGrade === 5 ? GRADE5_SUBJECTS : GRADE8_SUBJECTS;
    setSelectedSubject(subjects[0]);
  }, [selectedGrade]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [schoolsResponse, aggregatesResponse, loResponse] = await Promise.all([
        fetch('/data/schools.json'),
        fetch('/data/schoolAggregates.json'),
        fetch('/data/schoolLoBreakdown.json')
      ]);

      if (!schoolsResponse.ok || !aggregatesResponse.ok || !loResponse.ok) {
        throw new Error('Failed to load data files');
      }

      const schoolsData: School[] = await schoolsResponse.json();
      const aggregatesData: Record<string, SchoolAggregate> = await aggregatesResponse.json();
      const loData: Record<string, any> = await loResponse.json();

      // Flatten LO breakdown structure
      const flattenedLOs: LORecord[] = [];
      Object.entries(loData).forEach(([udise, gradeData]: [string, any]) => {
        ['grade5', 'grade8'].forEach(gradeKey => {
          if (gradeData[gradeKey]) {
            const grade = gradeKey === 'grade5' ? 5 : 8;
            Object.entries(gradeData[gradeKey]).forEach(([subject, los]: [string, any]) => {
              if (Array.isArray(los)) {
                los.forEach(lo => {
                  flattenedLOs.push({
                    udise,
                    grade,
                    subject,
                    ...lo
                  });
                });
              }
            });
          }
        });
      });

      setSchools(schoolsData);
      setAggregates(aggregatesData);
      setLoBreakdown(flattenedLOs);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  // Calculate participation metrics
  const participationMetrics = useMemo(() => {
    // Schools assessed = unique UDISEs present in aggregates data
    const schoolsAssessed = Object.keys(aggregates).length;
    
    // Students tested = sum of unique students across grades
    let totalStudents = 0;
    Object.values(aggregates).forEach(agg => {
      if (agg.grade5) {
        totalStudents += agg.grade5.uniqueStudentCount;
      }
      if (agg.grade8) {
        totalStudents += agg.grade8.uniqueStudentCount;
      }
    });

    return {
      schoolsAssessed,
      totalStudents
    };
  }, [aggregates]);

  // Map management to three categories
  const mapManagement = (mgmt: string): string => {
    const lower = mgmt.toLowerCase();
    if (lower.includes('tribal')) return 'Tribal';
    if (lower.includes('aided')) return 'Govt Aided';
    return 'Govt';
  };

  // Calculate distributions from schools master
  const distributionData = useMemo(() => {
    // Management distribution
    const managementCounts: Record<string, number> = {
      'Govt': 0,
      'Govt Aided': 0,
      'Tribal': 0
    };

    schools.forEach(school => {
      const category = mapManagement(school.management);
      managementCounts[category]++;
    });

    // Location distribution
    const locationCounts: Record<string, number> = {};
    schools.forEach(school => {
      const location = school.location.toLowerCase().includes('rural') ? 'Rural' : 'Urban';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    // School Category distribution
    const categoryCounts: Record<string, number> = {};
    schools.forEach(school => {
      const cat = school.schoolCategory || 'Unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return {
      management: managementCounts,
      location: locationCounts,
      category: categoryCounts
    };
  }, [schools]);

  // Get unique blocks for filter
  const uniqueBlocks = useMemo(() => {
    const blocks = new Set<string>();
    schools.forEach(school => {
      if (school.block) blocks.add(school.block);
    });
    return Array.from(blocks).sort();
  }, [schools]);

  // Build UDISE to Block map for fast lookup
  const udiseToBlock = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach(school => {
      map.set(school.udise, school.block);
    });
    return map;
  }, [schools]);

  // Current subjects for selected grade
  const currentSubjects = selectedGrade === 5 ? GRADE5_SUBJECTS : GRADE8_SUBJECTS;

  // Compute performance stats for selected grade + subject + block
  const performanceStats = useMemo(() => {
    return computeQuestionLevelStats(loBreakdown, selectedGrade, selectedSubject, selectedBlock, udiseToBlock);
  }, [loBreakdown, selectedGrade, selectedSubject, selectedBlock, udiseToBlock]);

  // Render simple pie chart using SVG
  const renderPieChart = (data: PieChartData[], title: string) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;

    let currentAngle = -90; // Start at top
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    const slices = data.map(item => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Calculate path
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      currentAngle = endAngle;

      return {
        path,
        color: item.color,
        label: item.label,
        value: item.value,
        percentage: percentage.toFixed(1)
      };
    });

    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="chart-content">
          <svg viewBox="0 0 200 200" className="pie-chart">
            {slices.map((slice, index) => (
              <path
                key={index}
                className="pie-slice"
                d={slice.path}
                fill={slice.color}
                stroke="#fff"
                strokeWidth="1"
              />
            ))}
          </svg>
          <div className="chart-legend">
            {slices.map((slice, index) => (
              <div key={index} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: slice.color }}></span>
                <span className="legend-text">
                  {slice.label}: {slice.value} <strong>({slice.percentage}%)</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading analytics data...</div>
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

  // Prepare chart data — muted, subtle palette
  const locationChartData: PieChartData[] = Object.entries(distributionData.location).map(([label, value]) => ({
    label,
    value,
    color: label === 'Rural' ? '#7fadcf' : '#d4a574'
  }));

  const managementChartData: PieChartData[] = Object.entries(distributionData.management).map(([label, value]) => ({
    label,
    value,
    color: label === 'Govt' ? '#7fb5a0' : label === 'Govt Aided' ? '#c98686' : '#9b8ec4'
  }));

  // School Category chart data with muted varied colors
  const categoryColors = ['#7fadcf', '#d4a574', '#7fb5a0', '#9b8ec4', '#c98686', '#85b8a0', '#c4a87d', '#8c99a6'];
  const categoryChartData: PieChartData[] = Object.entries(distributionData.category)
    .sort((a, b) => {
      // Sort "Unknown" to the end
      if (a[0] === 'Unknown') return 1;
      if (b[0] === 'Unknown') return -1;
      return a[0].localeCompare(b[0]);
    })
    .map(([label, value], index) => ({
      label,
      value,
      color: categoryColors[index % categoryColors.length]
    }));

  return (
    <div className="container">
      <PageHeader />
      
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>

      <div className="analytics-header">
        <h2>Analytics Overview</h2>
        <p className="subtitle">Assessment participation and school distribution analysis</p>
      </div>

      {/* Participation Metrics */}
      <div className="metrics-section">
        <h3>Overall Participation</h3>
        <div className="metrics-cards">
          <div className="metric-card">
            <div className="metric-value">{participationMetrics.schoolsAssessed}</div>
            <div className="metric-label">Schools Assessed</div>
            <div className="metric-subtitle">Unique schools with student response data</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{participationMetrics.totalStudents.toLocaleString()}</div>
            <div className="metric-label">Students Tested</div>
            <div className="metric-subtitle">Total student responses across Grade 5 & 8</div>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="charts-section">
        <h3>School Distribution</h3>
        <div className="charts-grid">
          {renderPieChart(locationChartData, 'Location Distribution')}
          {renderPieChart(managementChartData, 'Management Distribution')}
          {renderPieChart(categoryChartData, 'School Category Distribution')}
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="achievement-section">
        <h3>Performance Analysis</h3>
        <p className="performance-subheading">Achievement by Question Level (G-1 vs G)</p>

        {/* Block Filter */}
        <div className="achievement-filter">
          <label htmlFor="block-filter">Filter by Block: </label>
          <select 
            id="block-filter"
            value={selectedBlock} 
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="block-select"
          >
            <option value="all">All Blocks</option>
            {uniqueBlocks.map(block => (
              <option key={block} value={block}>{block}</option>
            ))}
          </select>
        </div>

        {/* Grade Toggle */}
        <div className="grade-toggle">
          <button 
            className={`grade-btn ${selectedGrade === 5 ? 'active' : ''}`}
            onClick={() => setSelectedGrade(5)}
          >
            Grade 5
          </button>
          <button 
            className={`grade-btn ${selectedGrade === 8 ? 'active' : ''}`}
            onClick={() => setSelectedGrade(8)}
          >
            Grade 8
          </button>
        </div>

        {/* Subject Tabs */}
        <div className="subject-tabs">
          {currentSubjects.map(subject => (
            <button
              key={subject}
              className={`subject-tab ${selectedSubject === subject ? 'active' : ''}`}
              onClick={() => setSelectedSubject(subject)}
            >
              {getSubjectDisplay(subject)}
            </button>
          ))}
        </div>

        {/* Bar Chart */}
        <div className="perf-bar-chart">
          <div className="perf-bar-column">
            <div className="perf-bar-value">{performanceStats.gMinus1Pct.toFixed(1)}%</div>
            <div className="perf-bar-track">
              <div 
                className="perf-bar-fill perf-bar-g1" 
                style={{ height: `${performanceStats.gMinus1Pct}%` }}
              ></div>
            </div>
            <div className="perf-bar-label">G{selectedGrade - 1} level (%)</div>
            <div className="perf-bar-detail">
              {performanceStats.gMinus1Attempts > 0
                ? `${performanceStats.gMinus1Correct.toLocaleString()} / ${performanceStats.gMinus1Attempts.toLocaleString()} correct`
                : 'No attempts'}
            </div>
          </div>
          <div className="perf-bar-column">
            <div className="perf-bar-value">{performanceStats.gPct.toFixed(1)}%</div>
            <div className="perf-bar-track">
              <div 
                className="perf-bar-fill perf-bar-g" 
                style={{ height: `${performanceStats.gPct}%` }}
              ></div>
            </div>
            <div className="perf-bar-label">G{selectedGrade} level (%)</div>
            <div className="perf-bar-detail">
              {performanceStats.gAttempts > 0
                ? `${performanceStats.gCorrect.toLocaleString()} / ${performanceStats.gAttempts.toLocaleString()} correct`
                : 'No attempts'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;

