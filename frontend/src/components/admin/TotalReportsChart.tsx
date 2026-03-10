import { ChevronDown } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ChartData {
  period: string;
  lost: number;
  found: number;
  matched: number;
  claimed: number;
}

interface TotalReportsChartProps {
  data: ChartData[];
  timePeriod: 'weekly' | 'monthly' | 'semester';
  onTimePeriodChange: (period: 'weekly' | 'monthly' | 'semester') => void;
}

export default function TotalReportsChart({ 
  data, 
  timePeriod, 
  onTimePeriodChange,
}: TotalReportsChartProps) {
  const hasData = data.some((item) => item.lost || item.found || item.matched || item.claimed);
  type SeriesItem = {
    key: keyof ChartData;
    label: string;
    color: string;
    dash?: string;
    emphasis?: boolean;
  };

  const series: SeriesItem[] = [
    { key: 'matched', label: 'Matched', color: '#f97316' },
    { key: 'claimed', label: 'Claimed', color: '#3b82f6' },
    { key: 'lost', label: 'Lost', color: '#ef4444', emphasis: true },
    { key: 'found', label: 'Found', color: '#22c55e', dash: '6 4' },
  ];

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'weekly':
        return 'Weekly Overview (Sunday - Saturday)';
      case 'monthly':
        return 'Monthly Overview (This month)';
      case 'semester':
        return 'Semester Overview (Last 5 months)';
      default:
        return 'Monthly Overview';
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
                onChange={(e) => onTimePeriodChange(e.target.value as 'weekly' | 'monthly' | 'semester')}
                className="w-36 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="semester">Semester</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Line Graph Container */}
      <div className="flex-1 min-h-[220px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.2))]}
              />
              <Tooltip
                cursor={{ stroke: '#cbd5f5', strokeDasharray: '4 4' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
                  fontSize: '12px',
                }}
              />
              {series.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeDasharray={line.dash}
                  strokeWidth={line.emphasis ? 3.25 : 2.5}
                  dot={{ r: line.emphasis ? 4 : 3 }}
                  activeDot={{ r: line.emphasis ? 6 : 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-sm text-gray-500">
            No report activity in this period.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
        {series.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
