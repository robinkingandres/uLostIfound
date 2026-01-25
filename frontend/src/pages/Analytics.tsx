import { useState, useEffect } from 'react';
import { Download, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { fetchAnalytics, type AnalyticsData } from '../services/api';

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

// --- KPI Card Component ---
const KPICard = ({ title, value, subtext, loading }: { title: string; value: string; subtext?: string; loading?: boolean }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <h3 className="text-sm font-semibold text-gray-500 mb-2">{title}</h3>
    {loading ? (
      <div className="flex items-center justify-center h-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    ) : (
      <>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </>
    )}
  </div>
);

// --- Bar Chart Component (Claim Processing) ---
const BarChart = ({ 
  data, 
  loading, 
  timeFrame 
}: { 
  data: AnalyticsData['claimProcessingEfficiency']; 
  loading?: boolean;
  timeFrame: string;
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Claim Processing Efficiency</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map(d => Math.max(d.claimed, d.found, d.verified)), 1);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Claim Processing Efficiency</h3>
      
      <div className="flex items-end justify-between h-48 gap-2 mb-4 px-2">
        {data.map((d) => {
          const formatTooltipDate = (period: string) => {
            if (timeFrame === 'daily') {
              return `Hour: ${period}`;
            } else if (timeFrame === 'weekly') {
              return `Date: ${period}`;
            } else if (timeFrame === 'yearly') {
              return `Month: ${period}`;
            } else {
              return `Date: ${period}`;
            }
          };

          return (
            <div 
              key={d.period} 
              className="flex flex-col items-center gap-2 flex-1 group relative"
              title={`${formatTooltipDate(d.period)}\nClaimed: ${d.claimed}\nFound: ${d.found}\nVerified: ${d.verified}`}
            >
              <div className="flex items-end gap-1 h-full w-full justify-center">
                {/* Red Bar - Claimed */}
                <div 
                  style={{ height: `${(d.claimed / max) * 100}%` }} 
                  className="w-2 md:w-3 bg-red-500 rounded-t-sm transition-all duration-500 hover:bg-red-600 cursor-pointer" 
                />
                {/* Blue Bar - Found */}
                <div 
                  style={{ height: `${(d.found / max) * 100}%` }} 
                  className="w-2 md:w-3 bg-blue-500 rounded-t-sm transition-all duration-500 hover:bg-blue-600 cursor-pointer" 
                />
                {/* Green Bar - Verified */}
                <div 
                  style={{ height: `${(d.verified / max) * 100}%` }} 
                  className="w-2 md:w-3 bg-green-500 rounded-t-sm transition-all duration-500 hover:bg-green-600 cursor-pointer" 
                />
              </div>
              <span className="text-xs text-gray-500 font-medium">{d.period}</span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          <span className="text-xs text-gray-600">Claimed items</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
          <span className="text-xs text-gray-600">Found Items</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          <span className="text-xs text-gray-600">Verified Items</span>
        </div>
      </div>
    </div>
  );
};

// --- Dual-Series Line Chart Component (Lost vs Found Pattern) ---
const DualSeriesLineChart = ({ 
  data, 
  loading, 
  timeFrame 
}: { 
  data: AnalyticsData['lostFoundPattern']; 
  loading?: boolean;
  timeFrame: string;
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-bold text-gray-900">Lost vs Found Pattern</h3>
          <div className="flex gap-2">
            <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">Lost</span>
            <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">Found</span>
          </div>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.lost, d.found)), 
    1
  );
  const lostPoints = data.map(d => (d.lost / maxValue) * 100);
  const foundPoints = data.map(d => (d.found / maxValue) * 100);
  const labels = data.map(d => d.period);
  
  const width = 100;
  const xStep = width / (lostPoints.length - 1 || 1);
  const lostPolylinePoints = lostPoints.map((y, i) => `${i * xStep},${100 - y}`).join(' ');
  const foundPolylinePoints = foundPoints.map((y, i) => `${i * xStep},${100 - y}`).join(' ');

  // Format tooltip date based on time frame
  const formatTooltipDate = (period: string) => {
    if (timeFrame === 'daily') {
      return `Hour: ${period}`;
    } else if (timeFrame === 'weekly') {
      return `Date: ${period}`;
    } else if (timeFrame === 'yearly') {
      return `Month: ${period}`;
    } else {
      return `Date: ${period}`;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-lg font-bold text-gray-900">Lost vs Found Pattern</h3>
        <div className="flex gap-2">
          <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">Lost</span>
          <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">Found</span>
        </div>
      </div>

      <div className="h-48 relative px-4">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 pointer-events-none">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>0</span>
        </div>
        
        {/* SVG Chart */}
        <div className="absolute inset-0 ml-6 mb-6">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            {/* Grid Lines in SVG */}
            <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="#f3f4f6" strokeWidth="1" />
            
            {/* Lost Items Line */}
            {lostPoints.length > 1 && (
              <polyline 
                fill="none" 
                stroke="#ef4444" 
                strokeWidth="2" 
                points={lostPolylinePoints} 
                className="drop-shadow-lg"
              />
            )}
            
            {/* Found Items Line */}
            {foundPoints.length > 1 && (
              <polyline 
                fill="none" 
                stroke="#22c55e" 
                strokeWidth="2" 
                points={foundPolylinePoints} 
                className="drop-shadow-lg"
              />
            )}
            
            {/* Lost Dots with tooltips */}
            {lostPoints.map((y, i) => (
              <g key={`lost-${i}`}>
                <circle 
                  cx={i * xStep} 
                  cy={100 - y} 
                  r="3" 
                  fill="white" 
                  stroke="#ef4444" 
                  strokeWidth="2"
                  className="cursor-pointer hover:r-4 transition-all"
                />
                <title>{formatTooltipDate(labels[i])} - Lost: {data[i].lost}</title>
              </g>
            ))}
            
            {/* Found Dots with tooltips */}
            {foundPoints.map((_, i) => (
              <g key={`found-${i}`}>
                <circle 
                  cx={i * xStep} 
                  cy={100 - foundPoints[i]} 
                  r="3" 
                  fill="white" 
                  stroke="#22c55e" 
                  strokeWidth="2"
                  className="cursor-pointer hover:r-4 transition-all"
                />
                <title>{formatTooltipDate(labels[i])} - Found: {data[i].found}</title>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="flex justify-between px-6 ml-6 text-xs text-gray-500 mt-2">
        {labels.map(l => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
};

// --- Donut Chart Component (Status Distribution) ---
const DonutChart = ({ data, loading }: { data: AnalyticsData['statusDistribution']; loading?: boolean }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Status Distribution</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'Claimed': '#818cf8',
    'Pending': '#fca5a5',
    'Verified': '#22d3ee',
    'Rejected': '#fbbf24',
  };

  const statusLabels: Record<string, string> = {
    'Claimed': 'Claimed',
    'Pending': 'Pending',
    'Verified': 'Verified',
    'Rejected': 'Rejected',
  };

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const statuses = Object.entries(data).map(([status, count]) => ({
    status,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  })).sort((a, b) => b.count - a.count);

  // Calculate SVG path for donut chart
  let currentOffset = 0;
  const circumference = 2 * Math.PI * 40; // radius = 40
  const segments = statuses.map(item => {
    const dashArray = (item.percentage / 100) * circumference;
    const dashOffset = -currentOffset;
    currentOffset += dashArray;
    return { ...item, dashArray, dashOffset, color: statusColors[item.status] || '#94a3b8' };
  });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Status Distribution</h3>
      
      <div className="flex items-center justify-center gap-8">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
            {/* Background Circle */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="20" />
            
            {/* Segments */}
            {segments.map((seg, idx) => (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={seg.color}
                strokeWidth="20"
                strokeDasharray={`${seg.dashArray} ${circumference}`}
                strokeDashoffset={seg.dashOffset}
              />
            ))}
          </svg>
          
          {/* Center Hole White */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-full"></div>
          </div>
        </div>

        <div className="space-y-3">
          {statuses.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: statusColors[item.status] || '#94a3b8' }}
              ></div>
              <span className="text-sm font-medium text-gray-600">{statusLabels[item.status] || item.status}</span>
              <span className="text-xs text-gray-400 ml-auto">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Pie Chart Component (Category Distribution) ---
const PieChart = ({ data, loading }: { data: AnalyticsData['categoryDistribution']; loading?: boolean }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Category Distribution</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const colors = ['#818cf8', '#fca5a5', '#22d3ee', '#fbbf24', '#f87171', '#34d399', '#94a3b8', '#fbbf24'];
  
  // Build conic gradient for pie chart
  let currentPercent = 0;
  const gradientParts = data.map((item, idx) => {
    const start = currentPercent;
    const end = currentPercent + item.percentage;
    currentPercent = end;
    return `${colors[idx % colors.length]} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Category Distribution</h3>
      
      <div className="flex items-center justify-between">
        {/* CSS Conic Gradient Pie Chart */}
        <div 
          className="w-40 h-40 rounded-full" 
          style={{
            background: `conic-gradient(${gradientParts})`
          }}
        >
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {data.slice(0, 6).map((item, idx) => (
            <div key={item.category}>
              <div className="flex items-center gap-2 mb-0.5">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: colors[idx % colors.length] }}
                ></div>
                <span className="text-xs text-gray-500">{item.category}</span>
              </div>
              <p className="text-xs font-bold" style={{ color: colors[idx % colors.length] }}>
                {item.count} <span className="font-normal opacity-75">({item.percentage.toFixed(1)}%)</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');

  useEffect(() => {
    loadAnalytics();
  }, [timeFrame]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const analyticsData = await fetchAnalytics(timeFrame);
      setData(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;
    
    setExporting('csv');
    try {
      // Prepare CSV data
      const csvRows: string[] = [];
      
      // Header
      csvRows.push('Transparency Report - Analytics Data');
      csvRows.push(`Generated: ${new Date().toLocaleString()}`);
      csvRows.push('');
      
      // KPIs
      csvRows.push('Key Performance Indicators');
      csvRows.push(`Average Resolution Time,${data.averageResolutionTime} days`);
      csvRows.push(`AI Match Accuracy,${data.aiMatchAccuracy}%`);
      csvRows.push(`Success Rate,${data.successRate}%`);
      csvRows.push('');
      
      // Lost vs Found Pattern
      csvRows.push('Lost vs Found Pattern');
      csvRows.push('Period,Lost,Found');
      data.lostFoundPattern.forEach(item => {
        csvRows.push(`${item.period},${item.lost},${item.found}`);
      });
      csvRows.push('');
      
      // Claim Processing Efficiency
      csvRows.push('Claim Processing Efficiency by Month');
      csvRows.push('Month,Claimed,Found,Verified');
      data.claimProcessingEfficiency.forEach(item => {
        csvRows.push(`${item.period},${item.claimed},${item.found},${item.verified}`);
      });
      csvRows.push('');
      
      // Status Distribution
      csvRows.push('Status Distribution');
      csvRows.push('Status,Count');
      Object.entries(data.statusDistribution).forEach(([status, count]) => {
        csvRows.push(`${status},${count}`);
      });
      csvRows.push('');
      
      // Category Distribution
      csvRows.push('Category Distribution');
      csvRows.push('Category,Count,Percentage');
      data.categoryDistribution.forEach(item => {
        csvRows.push(`${item.category},${item.count},${item.percentage.toFixed(2)}%`);
      });
      
      // Create and download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transparency-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = () => {
    if (!data) return;
    
    setExporting('pdf');
    try {
      // Create a printable HTML document
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to generate PDF');
        setExporting(null);
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Transparency Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #1f2937; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .kpi { display: flex; gap: 20px; margin: 20px 0; }
            .kpi-item { flex: 1; padding: 15px; background: #f9fafb; border-radius: 8px; }
            .kpi-value { font-size: 24px; font-weight: bold; color: #6366f1; }
          </style>
        </head>
        <body>
          <h1>Transparency Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          
          <h2>Key Performance Indicators</h2>
          <div class="kpi">
            <div class="kpi-item">
              <div>Average Resolution Time</div>
              <div class="kpi-value">${data.averageResolutionTime} days</div>
            </div>
            <div class="kpi-item">
              <div>AI Match Accuracy</div>
              <div class="kpi-value">${data.aiMatchAccuracy}%</div>
            </div>
            <div class="kpi-item">
              <div>Success Rate</div>
              <div class="kpi-value">${data.successRate}%</div>
            </div>
          </div>
          
          <h2>Lost vs Found Pattern</h2>
          <table>
            <tr><th>Period</th><th>Lost</th><th>Found</th></tr>
            ${data.lostFoundPattern.map(item => `<tr><td>${item.period}</td><td>${item.lost}</td><td>${item.found}</td></tr>`).join('')}
          </table>
          
          <h2>Claim Processing Efficiency</h2>
          <table>
            <tr><th>Period</th><th>Claimed</th><th>Found</th><th>Verified</th></tr>
            ${data.claimProcessingEfficiency.map(item => 
              `<tr><td>${item.period}</td><td>${item.claimed}</td><td>${item.found}</td><td>${item.verified}</td></tr>`
            ).join('')}
          </table>
          
          <h2>Status Distribution</h2>
          <table>
            <tr><th>Status</th><th>Count</th></tr>
            ${Object.entries(data.statusDistribution).map(([status, count]) => 
              `<tr><td>${status}</td><td>${count}</td></tr>`
            ).join('')}
          </table>
          
          <h2>Category Distribution</h2>
          <table>
            <tr><th>Category</th><th>Count</th><th>Percentage</th></tr>
            ${data.categoryDistribution.map(item => 
              `<tr><td>${item.category}</td><td>${item.count}</td><td>${item.percentage.toFixed(2)}%</td></tr>`
            ).join('')}
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        setExporting(null);
      }, 250);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF. Please try again.');
      setExporting(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  const timeFrameOptions: { value: TimeFrame; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <div className="p-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        {/* Time Frame Selector */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Time Frame:</span>
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            {timeFrameOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeFrame(option.value)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeFrame === option.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={!data || exporting === 'csv'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'csv' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            disabled={!data || exporting === 'pdf'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export PDF
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KPICard 
          title="Average Resolution Time" 
          value={data ? `${data.averageResolutionTime} days` : '0 days'} 
          loading={loading}
        />
        <KPICard 
          title="AI Match Accuracy" 
          value={data ? `${data.aiMatchAccuracy}%` : '0%'} 
          loading={loading}
        />
        <KPICard 
          title="Success Rate" 
          value={data ? `${data.successRate}%` : '0%'} 
          loading={loading}
        />
      </div>

      {/* Middle Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <BarChart 
          data={data?.claimProcessingEfficiency || []} 
          loading={loading}
          timeFrame={data?.timeFrame || 'monthly'}
        />
        <DualSeriesLineChart 
          data={data?.lostFoundPattern || []} 
          loading={loading}
          timeFrame={data?.timeFrame || 'monthly'}
        />
      </div>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart data={data?.statusDistribution || {}} loading={loading} />
        <PieChart data={data?.categoryDistribution || []} loading={loading} />
      </div>
    </div>
  );
}
