import { Download } from 'lucide-react';
import DashboardHeader from '../components/admin/DashboardHeader';

// --- KPI Card Component ---
const KPICard = ({ title, value, subtext }: { title: string; value: string; subtext?: string }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <h3 className="text-sm font-semibold text-gray-500 mb-2">{title}</h3>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
  </div>
);

// --- Bar Chart Component (Claim Processing) ---
const BarChart = () => {
  const data = [
    { month: 'Jan', claimed: 20, found: 25, verified: 45 },
    { month: 'Feb', claimed: 35, found: 35, verified: 20 },
    { month: 'Mar', claimed: 15, found: 40, verified: 30 },
    { month: 'Apr', claimed: 10, found: 45, verified: 45 },
    { month: 'May', claimed: 35, found: 40, verified: 30 },
  ];
  const max = 50;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Claim Processing Efficiency</h3>
      
      <div className="flex items-end justify-between h-48 gap-2 mb-4 px-2">
        {data.map((d) => (
          <div key={d.month} className="flex flex-col items-center gap-2 flex-1">
            <div className="flex items-end gap-1 h-full w-full justify-center">
              {/* Red Bar */}
              <div style={{ height: `${(d.claimed / max) * 100}%` }} className="w-2 md:w-3 bg-red-500 rounded-t-sm transition-all duration-500" />
              {/* Blue Bar */}
              <div style={{ height: `${(d.found / max) * 100}%` }} className="w-2 md:w-3 bg-blue-500 rounded-t-sm transition-all duration-500" />
              {/* Green Bar */}
              <div style={{ height: `${(d.verified / max) * 100}%` }} className="w-2 md:w-3 bg-green-500 rounded-t-sm transition-all duration-500" />
            </div>
            <span className="text-xs text-gray-500 font-medium">{d.month}</span>
          </div>
        ))}
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

// --- Line Chart Component (Lost Item Pattern) ---
const LineChart = () => {
  // Simple SVG Line Chart implementation
  const points = [70, 50, 50, 15, 25, 90]; // y-values (inverted for SVG)
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June'];
  
  // Calculate SVG points string
  const width = 100;
  const height = 100;
  const xStep = width / (points.length - 1);
  const polylinePoints = points.map((y, i) => `${i * xStep},${100 - y}`).join(' ');

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-lg font-bold text-gray-900">Lost Item Pattern by Month</h3>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">Lost Item</span>
      </div>

      <div className="h-48 relative px-4">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 pointer-events-none">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        
        {/* SVG Chart */}
        <div className="absolute inset-0 ml-6 mb-6">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            {/* Grid Lines in SVG */}
            <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="#f3f4f6" strokeWidth="1" />
            
            {/* The Line */}
            <polyline 
              fill="none" 
              stroke="#6366f1" 
              strokeWidth="2" 
              points={polylinePoints} 
              className="drop-shadow-lg"
            />
            
            {/* The Dots */}
            {points.map((y, i) => (
              <circle 
                key={i} 
                cx={i * xStep} 
                cy={100 - y} 
                r="3" 
                fill="white" 
                stroke="#6366f1" 
                strokeWidth="2" 
              />
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
const DonutChart = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Status Distribution</h3>
      
      <div className="flex items-center justify-center gap-8">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
            {/* Background Circle */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="20" />
            
            {/* Segments (Calculated manually for visual demo) */}
            {/* Claimed (Purple) - 48% */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#818cf8" strokeWidth="20" strokeDasharray="125 251" strokeDashoffset="0" />
            
            {/* Pending (Pink) - 26% */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#fca5a5" strokeWidth="20" strokeDasharray="65 251" strokeDashoffset="-125" />
            
            {/* Verified (Cyan) - 44% (Visual approx) */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22d3ee" strokeWidth="20" strokeDasharray="40 251" strokeDashoffset="-190" />
            
            {/* Rejected (Orange) - 7% */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#fbbf24" strokeWidth="20" strokeDasharray="20 251" strokeDashoffset="-230" />
          </svg>
          
          {/* Center Hole White */}
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-20 h-20 bg-white rounded-full"></div>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Claimed', color: 'bg-indigo-400', value: 48 },
            { label: 'Pending', color: 'bg-red-300', value: 26 },
            { label: 'Verified', color: 'bg-cyan-400', value: 44 },
            { label: 'Rejected', color: 'bg-yellow-400', value: 7 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
              <span className="text-sm font-medium text-gray-600">{item.label}</span>
              {/* <span className="text-xs text-gray-400 ml-auto">{item.value}</span> */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Pie Chart Component (Category Distribution) ---
const PieChart = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Category Distribution</h3>
      
      <div className="flex items-center justify-between">
        {/* CSS Conic Gradient Pie Chart */}
        <div className="w-40 h-40 rounded-full" 
             style={{
               background: `conic-gradient(
                 #818cf8 0% 11%, 
                 #fca5a5 11% 25%, 
                 #22d3ee 25% 42%, 
                 #fbbf24 42% 64%, 
                 #f87171 64% 85%, 
                 #34d399 85% 100%
               )`
             }}>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            { label: 'Electronics', val: '43 (11.38%)', color: 'text-indigo-400' },
            { label: 'Bottles', val: '81 (21.43%)', color: 'text-red-300' },
            { label: 'Umbrellas', val: '66 (17.46%)', color: 'text-cyan-400' },
            { label: 'Books', val: '84 (22.22%)', color: 'text-yellow-400' },
            { label: 'Others', val: '48 (12.70%)', color: 'text-red-400' },
            { label: 'Accessories', val: '56 (14.81%)', color: 'text-green-400' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`w-2 h-2 rounded-full bg-current ${item.color}`}></div>
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
              <p className={`text-xs font-bold ${item.color}`}>{item.val.split(' ')[0]} <span className="font-normal opacity-75">{item.val.split(' ')[1]}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Analytics() {
  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Statistical insights and data visualization</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <KPICard title="Average Resolution Time" value="3.5 days" />
          <KPICard title="Ai Match Accuracy" value="89%" />
          <KPICard title="Success Rate" value="78%" />
        </div>

        {/* Middle Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <BarChart />
          <LineChart />
        </div>

        {/* Bottom Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DonutChart />
          <PieChart />
        </div>
      </div>
    </div>
  );
}