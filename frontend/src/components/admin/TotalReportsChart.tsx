import {
  CartesianGrid,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

interface ChartData {
  period: string;
  lost: number;
  found: number;
  matched: number;
  claimed: number;
}

interface TotalReportsChartProps {
  data: ChartData[];
  timePeriod: 'last7' | 'last30' | 'last90';
  onTimePeriodChange: (period: 'last7' | 'last30' | 'last90') => void;
}

export default function TotalReportsChart({ 
  data, 
  timePeriod, 
  onTimePeriodChange,
}: TotalReportsChartProps) {
  const { isDark } = useAdminTheme();
  const hasData = data.some((item) => item.lost || item.found || item.matched || item.claimed);
  type SeriesItem = {
    key: keyof ChartData;
    label: string;
    color: string;
    emphasis?: boolean;
  };

  const series: SeriesItem[] = [
    { key: 'matched', label: 'matched', color: '#f97316' },
    { key: 'claimed', label: 'claimed', color: '#3b82f6' },
    { key: 'lost', label: 'lost', color: '#ef4444', emphasis: true },
    { key: 'found', label: 'found', color: '#22c55e' },
  ];

  const formatDate = (value: Date) =>
    value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const buildChartData = () => {
    const totalPoints = Math.max(data.length, timePeriod === 'last7' ? 7 : timePeriod === 'last30' ? 30 : 90);
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (totalPoints - 1));

    return data.map((item, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return { ...item, label: formatDate(d) };
    });
  };

  const getPeriodLabel = () => {
    const today = new Date();
    const start = new Date(today);
    switch (timePeriod) {
      case 'last7':
        start.setDate(today.getDate() - 6);
        return `Last 7 Days (${formatDate(start)} - ${formatDate(today)})`;
      case 'last30':
        start.setDate(today.getDate() - 29);
        return `Last 30 Days (${formatDate(start)} - ${formatDate(today)})`;
      case 'last90':
        start.setDate(today.getDate() - 89);
        return `Last 90 Days (${formatDate(start)} - ${formatDate(today)})`;
      default:
        return 'Last 30 Days';
    }
  };

  const chartData = buildChartData();
  const gridStroke = isDark ? '#1f2937' : '#e5e7eb';
  const tickColor = isDark ? '#94a3b8' : '#6b7280';
  const tooltipStyle = {
    borderRadius: '12px',
    border: isDark ? '1px solid #1f2937' : '1px solid #e5e7eb',
    boxShadow: isDark ? '0 10px 25px rgba(2, 6, 23, 0.5)' : '0 10px 25px rgba(15, 23, 42, 0.08)',
    fontSize: '12px',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#111827',
  } as const;

  return (
    <div className={`rounded-2xl p-6 shadow-sm border h-full min-h-[420px] flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Total Reports</h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{getPeriodLabel()}</p>
        </div>

        <div className={`inline-flex rounded-lg border p-1 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
          {([
            { key: 'last90', label: 'Last 90 days' },
            { key: 'last30', label: 'Last 30 days' },
            { key: 'last7', label: 'Last 7 days' },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onTimePeriodChange(item.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                timePeriod === item.key
                  ? isDark
                    ? 'bg-slate-100 text-slate-900 shadow-sm'
                    : 'bg-gray-900 text-white shadow-sm'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-100'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Line Graph Container */}
      <div className="flex-1 min-h-[220px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs>
                {series.map((item) => (
                  <linearGradient key={item.key} id={`totalReports-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={item.color} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={item.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: tickColor, fontSize: 12 }}
                minTickGap={18}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fill: tickColor, fontSize: 12 }}
                domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.2))]}
              />
              <Tooltip
                cursor={{ stroke: isDark ? '#334155' : '#cbd5f5', strokeDasharray: '4 4' }}
                contentStyle={tooltipStyle}
              />
              {series.map((item) => (
                <Area
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.label}
                  stroke={item.color}
                  fill={`url(#totalReports-${item.key})`}
                  strokeWidth={item.emphasis ? 3 : 2.4}
                  dot={{ r: item.emphasis ? 4 : 3 }}
                  activeDot={{ r: item.emphasis ? 6 : 5 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className={`h-[260px] flex items-center justify-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            No report activity in this period.
          </div>
        )}
      </div>

      <div className={`mt-4 flex flex-wrap items-center gap-4 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
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
