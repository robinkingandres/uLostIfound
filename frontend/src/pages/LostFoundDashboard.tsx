import { useState, useEffect } from 'react';
import './LostFoundDashboard.css';
import { 
  Package, PackageSearch, CheckCircle, Clock, AlertTriangle, 
  Users, Loader2, AlertCircle,
  Activity, Target
} from 'lucide-react';
import { fetchLostFoundDashboard, type LostFoundDashboardData } from '../services/api';

// Summary Card Component
const SummaryCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  loading 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string;
  loading?: boolean;
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    {loading ? (
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    ) : (
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    )}
  </div>
);

// Progress Bar Component
const ProgressBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Interactive Bar Chart Component
const InteractiveBarChart = ({ 
  data, 
  title, 
  xKey, 
  yKey, 
  color, 
  loading 
}: { 
  data: any[]; 
  title: string; 
  xKey: string; 
  yKey: string; 
  color: string;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d[yKey] || 0), 1);
  const topData = data.slice(0, 10);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
      <div className="space-y-3">
        {topData.map((item, idx) => {
          const value = item[yKey] || 0;
          const percentage = (value / maxValue) * 100;
          const label = item[xKey] || 'Unknown';
          
          return (
            <div 
              key={idx} 
              className="group relative"
              title={`${label}: ${value} items`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm text-gray-600 w-32 truncate">{label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                  <div 
                    className={`h-6 rounded-full transition-all duration-1000 ease-out ${color} flex items-center justify-end pr-2 group-hover:opacity-90`}
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{value}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Line Chart Component with Animation
const AnimatedLineChart = ({ 
  data, 
  title, 
  loading,
  showLegend = true
}: { 
  data: Array<{ day: string; lost: number; found: number }>; 
  title: string; 
  loading?: boolean;
  showLegend?: boolean;
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.lost || 0, d.found || 0)),
    1
  );
  const height = 200;
  const width = 100;
  const xStep = width / (data.length - 1 || 1);

  const lostPoints = data.map((d, i) => ({
    x: i * xStep,
    y: height - ((d.lost || 0) / maxValue) * height
  }));

  const foundPoints = data.map((d, i) => ({
    x: i * xStep,
    y: height - ((d.found || 0) / maxValue) * height
  }));

  const lostPath = lostPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const foundPath = foundPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {showLegend && (
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Lost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Found</span>
            </div>
          </div>
        )}
      </div>
      <div className="h-64 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid lines */}
          {[0, height / 2, height].map((y, i) => (
            <line 
              key={i}
              x1="0" 
              y1={y} 
              x2={width} 
              y2={y} 
              stroke="#f3f4f6" 
              strokeWidth="1" 
            />
          ))}
          
          {/* Lost line */}
          <path
            d={lostPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            className="animate-draw"
            style={{ strokeDasharray: '1000', strokeDashoffset: '1000', animation: 'draw 2s ease-out forwards' }}
          />
          
          {/* Found line */}
          <path
            d={foundPath}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            className="animate-draw"
            style={{ strokeDasharray: '1000', strokeDashoffset: '1000', animation: 'draw 2s ease-out 0.5s forwards' }}
          />
          
          {/* Data points with tooltips */}
          {lostPoints.map((p, i) => (
            <g key={`lost-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r="3"
                fill="white"
                stroke="#ef4444"
                strokeWidth="2"
                className="cursor-pointer hover:r-5 transition-all"
              />
              <title>{`${data[i].day}: Lost ${data[i].lost || 0} items`}</title>
            </g>
          ))}
          
          {foundPoints.map((p, i) => (
            <g key={`found-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r="3"
                fill="white"
                stroke="#22c55e"
                strokeWidth="2"
                className="cursor-pointer hover:r-5 transition-all"
              />
              <title>{`${data[i].day}: Found ${data[i].found || 0} items`}</title>
            </g>
          ))}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => (
            <span key={i}>{new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Peak Times Chart
const PeakTimesChart = ({ data, loading }: { data: Array<{ hour: number; lost: number; found: number }>; loading?: boolean }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Peak Times</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.lost || 0, d.found || 0)), 1);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Peak Times (Hour of Day)</h3>
      <div className="grid grid-cols-12 gap-2">
        {Array.from({ length: 24 }, (_, hour) => {
          const hourData = data.find(d => d.hour === hour) || { hour, lost: 0, found: 0 };
          const lostHeight = ((hourData.lost || 0) / maxValue) * 100;
          const foundHeight = ((hourData.found || 0) / maxValue) * 100;
          
          return (
            <div 
              key={hour} 
              className="flex flex-col items-center gap-1 group relative"
              title={`${hour}:00 - Lost: ${hourData.lost}, Found: ${hourData.found}`}
            >
              <div className="w-full flex flex-col-reverse gap-0.5 h-32">
                <div 
                  className="bg-red-500 rounded-t transition-all duration-500 hover:opacity-80"
                  style={{ height: `${lostHeight}%` }}
                />
                <div 
                  className="bg-green-500 rounded-t transition-all duration-500 hover:opacity-80"
                  style={{ height: `${foundHeight}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{hour}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-xs text-gray-600">Lost</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-600">Found</span>
        </div>
      </div>
    </div>
  );
};

// Location Heatmap Component
const LocationHeatmap = ({ 
  lostData, 
  foundData, 
  loading 
}: { 
  lostData: Array<{ location: string; count: number }>; 
  foundData: Array<{ location: string; count: number }>; 
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  // Combine and aggregate location data
  const locationMap = new Map<string, { lost: number; found: number; total: number }>();
  
  lostData.forEach(item => {
    const existing = locationMap.get(item.location) || { lost: 0, found: 0, total: 0 };
    existing.lost = item.count;
    existing.total += item.count;
    locationMap.set(item.location, existing);
  });
  
  foundData.forEach(item => {
    const existing = locationMap.get(item.location) || { lost: 0, found: 0, total: 0 };
    existing.found = item.count;
    existing.total += item.count;
    locationMap.set(item.location, existing);
  });

  const locations = Array.from(locationMap.entries())
    .map(([location, data]) => ({ location, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const maxTotal = Math.max(...locations.map(l => l.total), 1);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Location Heatmap (High-Risk Areas)</h3>
      <div className="space-y-2">
        {locations.map((loc, idx) => {
          const intensity = (loc.total / maxTotal) * 100;
          const colorIntensity = Math.min(intensity / 100, 1);
          const bgColor = `rgba(239, 68, 68, ${0.3 + colorIntensity * 0.7})`;
          
          return (
            <div 
              key={idx}
              className="p-3 rounded-lg transition-all hover:shadow-md group relative"
              style={{ backgroundColor: bgColor }}
              title={`${loc.location}: ${loc.lost} lost, ${loc.found} found (Total: ${loc.total})`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">{loc.location}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-red-600 font-semibold">Lost: {loc.lost}</span>
                  <span className="text-green-600 font-semibold">Found: {loc.found}</span>
                  <span className="text-gray-700 font-bold">Total: {loc.total}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function LostFoundDashboard() {
  const [data, setData] = useState<LostFoundDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const dashboardData = await fetchLostFoundDashboard();
      setData(dashboardData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Alerts Section */}
      {data?.alerts && (data.alerts.highLossAlert || data.alerts.unclaimedOld > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-2">Alerts & Anomalies</h4>
              <div className="space-y-1 text-sm text-yellow-800">
                {data.alerts.highLossAlert && (
                  <p>⚠️ Unusually high number of items lost recently: {data.alerts.recentLostCount} items in the last 7 days</p>
                )}
                {data.alerts.unclaimedOld > 0 && (
                  <p>⚠️ {data.alerts.unclaimedOld} items found but not claimed for 14+ days</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 1. Overall Summary Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Overall Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <SummaryCard
            title="Total Lost Items"
            value={data?.summary.totalLost || 0}
            icon={Package}
            color="bg-red-500"
            loading={loading}
          />
          <SummaryCard
            title="Total Found Items"
            value={data?.summary.totalFound || 0}
            icon={PackageSearch}
            color="bg-green-500"
            loading={loading}
          />
          <SummaryCard
            title="Items Returned"
            value={data?.summary.totalReturned || 0}
            icon={CheckCircle}
            color="bg-blue-500"
            loading={loading}
          />
          <SummaryCard
            title="Unclaimed Items"
            value={data?.summary.unclaimed || 0}
            icon={Clock}
            color="bg-yellow-500"
            loading={loading}
          />
          <SummaryCard
            title="Avg Return Time"
            value={`${data?.summary.avgReturnTime || 0} days`}
            icon={Activity}
            color="bg-purple-500"
            loading={loading}
          />
        </div>
      </div>

      {/* Recovery Rate & Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Recovery Rate & Efficiency
          </h3>
          <ProgressBar
            label="Recovery Rate"
            value={data?.recoveryRate || 0}
            max={100}
            color="bg-green-500"
          />
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Items Stuck in System (&gt;7 days pending)</span>
              <span className="font-bold text-red-600">{data?.stuckItems || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Response Time</span>
              <span className="font-bold text-gray-900">{data?.avgResponseTime || 0} hours</span>
            </div>
          </div>
        </div>

        {/* User Analytics */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5" />
            User/Reporter Analytics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Users Reporting Lost Items</span>
              <span className="text-xl font-bold text-gray-900">{data?.usersReportingLost || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Users Reporting Found Items</span>
              <span className="text-xl font-bold text-gray-900">{data?.usersReportingFound || 0}</span>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Repeat Users</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {data?.repeatUsers.slice(0, 5).map((user, idx) => (
                  <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{user.reporter__username}</span>
                    <span className="font-bold text-gray-900">{user.report_count} reports</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Analytics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Item Categories & Trends</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InteractiveBarChart
            data={data?.categories || []}
            title="Items by Category"
            xKey="category"
            yKey="lost_count"
            color="bg-indigo-500"
            loading={loading}
          />
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Top Lost Items</h3>
            <div className="space-y-3">
              {data?.topLostItems.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-medium text-gray-700">{item.item_name}</span>
                  <span className="text-sm font-bold text-red-600">{item.count} times</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Found Items */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Top Found Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {data?.topFoundItems.slice(0, 10).map((item, idx) => (
            <div key={idx} className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors">
              <p className="text-sm font-medium text-gray-700 mb-1">{item.item_name}</p>
              <p className="text-2xl font-bold text-green-600">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Location Analytics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Location-Based Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InteractiveBarChart
            data={data?.locationLost || []}
            title="Items Lost by Location"
            xKey="location"
            yKey="count"
            color="bg-red-500"
            loading={loading}
          />
          <InteractiveBarChart
            data={data?.locationFound || []}
            title="Items Found by Location"
            xKey="location"
            yKey="count"
            color="bg-green-500"
            loading={loading}
          />
        </div>
        <div className="mt-6">
          <LocationHeatmap
            lostData={data?.locationLost || []}
            foundData={data?.locationFound || []}
            loading={loading}
          />
        </div>
      </div>

      {/* 4. Time-Based Insights */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Time-Based Insights</h2>
        <div className="grid grid-cols-1 gap-6">
          <AnimatedLineChart
            data={data?.dailyTrends || []}
            title="Daily Trends (Last 30 Days)"
            loading={loading}
          />
          <PeakTimesChart
            data={data?.peakTimes || []}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
