import { ChevronDown } from 'lucide-react';

interface ChartData {
  month: string;
  value: number;
}

interface TotalReportsChartProps {
  data: ChartData[];
  timePeriod: 'weekly' | 'monthly' | 'yearly';
  statusFilter: 'all' | 'lost' | 'found' | 'claimed';
  onTimePeriodChange: (period: 'weekly' | 'monthly' | 'yearly') => void;
  onStatusFilterChange: (filter: 'all' | 'lost' | 'found' | 'claimed') => void;
}

export default function TotalReportsChart({ 
  data, 
  timePeriod, 
  statusFilter,
  onTimePeriodChange,
  onStatusFilterChange 
}: TotalReportsChartProps) {
  // Calculate max value dynamically to scale the bars (default to 10 to avoid division by zero)
  const maxValue = Math.max(...data.map((d) => d.value), 10);
  const currentYear = new Date().getFullYear();

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'weekly':
        return 'Weekly Overview';
      case 'monthly':
        return 'Monthly Overview';
      case 'yearly':
        return 'Yearly Overview';
      default:
        return 'Yearly Overview';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full min-h-[420px] flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Total Reports</h3>
          <p className="text-gray-600 text-sm">{getPeriodLabel()}</p>
        </div>

        {/* Filters - Top Right */}
        <div className="flex gap-2 items-end">
          {/* Time Period Dropdown */}
          <div className="relative">
            <div className="relative">
              <select
                value={timePeriod}
                onChange={(e) => onTimePeriodChange(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                className="w-28 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'lost' | 'found' | 'claimed')}
                className="w-28 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
                <option value="claimed">Claimed</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Bar Graph Container */}
      <div className="flex-1 flex items-end justify-between min-h-[220px] gap-2">
        {data.map((item) => (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
             {/* Tooltip (optional hover effect) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-8 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none">
              {item.value}
            </div>
            
            <div className="w-full bg-gray-200 rounded-t-lg relative flex flex-col justify-end" style={{ height: '100%' }}>
              <div
                className="w-full bg-indigo-400 rounded-t-lg transition-all duration-1000 ease-out hover:bg-indigo-500"
                style={{ 
                  height: `${(item.value / maxValue) * 100}%`,
                  minHeight: item.value > 0 ? '4px' : '0' 
                }}
              ></div>
            </div>
            <span className="text-xs text-gray-600 font-medium">{item.month}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className="w-3 h-3 bg-indigo-400 rounded"></div>
        <span className="text-sm text-gray-600">{currentYear}</span>
      </div>
    </div>
  );
}
