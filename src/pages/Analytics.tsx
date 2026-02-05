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

function Analytics() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [aggregates, setAggregates] = useState<Record<string, SchoolAggregate>>({});
  const [loBreakdown, setLoBreakdown] = useState<LORecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

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

  // Calculate G-1 vs G achievement with block filter
  const questionLevelAchievement = useMemo(() => {
    // Filter LO records by selected block
    const filteredLOs = selectedBlock === 'all' 
      ? loBreakdown 
      : loBreakdown.filter(lo => udiseToBlock.get(lo.udise) === selectedBlock);

    // Aggregate attempts and correct
    let totalAttemptsG1 = 0;
    let totalCorrectG1 = 0;
    let totalAttemptsG = 0;
    let totalCorrectG = 0;

    filteredLOs.forEach(lo => {
      totalAttemptsG1 += lo.attempts_G_1 || 0;
      totalCorrectG1 += lo.correct_G_1 || 0;
      totalAttemptsG += lo.attempts_G || 0;
      totalCorrectG += lo.correct_G || 0;
    });

    const percentG1 = totalAttemptsG1 > 0 
      ? Math.round((totalCorrectG1 / totalAttemptsG1) * 1000) / 10 
      : null;
    const percentG = totalAttemptsG > 0 
      ? Math.round((totalCorrectG / totalAttemptsG) * 1000) / 10 
      : null;

    return {
      g1: {
        attempts: totalAttemptsG1,
        correct: totalCorrectG1,
        percent: percentG1
      },
      g: {
        attempts: totalAttemptsG,
        correct: totalCorrectG,
        percent: percentG
      }
    };
  }, [loBreakdown, selectedBlock, udiseToBlock]);

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
                  {slice.label}: {slice.value} ({slice.percentage}%)
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

  // Prepare chart data
  const locationChartData: PieChartData[] = Object.entries(distributionData.location).map(([label, value]) => ({
    label,
    value,
    color: label === 'Rural' ? '#4a90e2' : '#f39c12'
  }));

  const managementChartData: PieChartData[] = Object.entries(distributionData.management).map(([label, value]) => ({
    label,
    value,
    color: label === 'Govt' ? '#27ae60' : label === 'Govt Aided' ? '#e74c3c' : '#9b59b6'
  }));

  // School Category chart data with varied colors
  const categoryColors = ['#3498db', '#e67e22', '#2ecc71', '#9b59b6', '#e74c3c', '#1abc9c', '#f39c12', '#34495e'];
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

      {/* Question Level Achievement Analysis */}
      <div className="achievement-section">
        <h3>Achievement by Question Level (G-1 vs G)</h3>
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
        <div className="achievement-cards">
          <div className="achievement-card">
            <div className="achievement-label">G-1 Achievement %</div>
            <div className="achievement-value" style={{ color: '#e67e22' }}>
              {questionLevelAchievement.g1.percent !== null 
                ? `${questionLevelAchievement.g1.percent}%` 
                : '-'}
            </div>
            <div className="achievement-subtitle">
              Grade-level questions (below current grade)
            </div>
            <div className="achievement-detail">
              {questionLevelAchievement.g1.attempts > 0 
                ? `${questionLevelAchievement.g1.correct.toLocaleString()} / ${questionLevelAchievement.g1.attempts.toLocaleString()} correct`
                : 'No data'}
            </div>
          </div>
          <div className="achievement-card">
            <div className="achievement-label">G Achievement %</div>
            <div className="achievement-value" style={{ color: '#27ae60' }}>
              {questionLevelAchievement.g.percent !== null 
                ? `${questionLevelAchievement.g.percent}%` 
                : '-'}
            </div>
            <div className="achievement-subtitle">
              Grade-level questions (at current grade)
            </div>
            <div className="achievement-detail">
              {questionLevelAchievement.g.attempts > 0 
                ? `${questionLevelAchievement.g.correct.toLocaleString()} / ${questionLevelAchievement.g.attempts.toLocaleString()} correct`
                : 'No data'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;

