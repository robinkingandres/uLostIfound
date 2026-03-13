import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchAdminAIMatchPerformance, type AdminAIMatchPerformanceResponse } from '../../services/api';

type Props = {
  dateFrom: string;
  dateTo: string;
  category: string;
  onInspect?: (title: string, rows: Array<Record<string, string | number>>) => void;
};

export default function AIMatchPerformance({ dateFrom, dateTo, category, onInspect }: Props) {
  const [data, setData] = useState<AdminAIMatchPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchAdminAIMatchPerformance({ date_from: dateFrom, date_to: dateTo, category })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load AI match performance');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, category]);

  const donutData = useMemo(() => {
    const successful = data?.donut.successful_matches ?? 0;
    const unmatched = data?.donut.unmatched_reports ?? 0;
    return [
      { name: 'Successful Matches', value: successful },
      { name: 'Unmatched Reports', value: unmatched },
    ];
  }, [data]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm" data-dashboard-chart data-chart-title="AI Match Performance">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">AI Match Performance</h2>
          <div className="text-xs text-gray-500">Successful vs unmatched + time-to-match distribution</div>
        </div>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      {loading || !data ? (
        <div className="mt-4 h-80 rounded-2xl border border-gray-200 bg-gray-100 animate-pulse" />
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="h-72 rounded-xl border border-gray-100 bg-gray-50/40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="aiTealDonut" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={96}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={900}
                  onClick={(entry: any) => {
                    if (!onInspect) return;
                    onInspect(`AI Match Performance - ${entry?.name ?? ''}`, [entry?.payload ?? entry]);
                  }}
                >
                  <Cell fill="url(#aiTealDonut)" />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-xs text-gray-500">Avg time-to-match</div>
                <div className="text-2xl font-bold text-gray-900">{data.avg_time_to_match_days}d</div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.05 }} className="h-72 rounded-xl border border-gray-100 bg-gray-50/40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.histogram}
                margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
                onClick={(state: any) => {
                  if (!onInspect) return;
                  const active = state?.activePayload?.[0]?.payload as { bucket: string; count: number } | undefined;
                  if (!active) return;
                  onInspect(`Time-to-match - ${active.bucket}`, [active]);
                }}
              >
                <defs>
                  <linearGradient id="aiTealBars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.18} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="url(#aiTealBars)" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={950} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}
    </div>
  );
}

