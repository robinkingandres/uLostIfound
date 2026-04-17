import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchAdminHonestyRanking, type AdminHonestyRankingResponse, type HonestyRankingRow } from '../../services/api';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

type Props = {
  dateFrom: string;
  dateTo: string;
  category: string;
  limit?: number;
  onInspect?: (title: string, rows: Array<Record<string, string | number>>) => void;
};

export default function HonestyLeaderboard({ dateFrom, dateTo, category, limit = 10, onInspect }: Props) {
  const { isDark } = useAdminTheme();
  const [data, setData] = useState<AdminHonestyRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchAdminHonestyRanking({ date_from: dateFrom, date_to: dateTo, category })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load honesty ranking');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, category]);

  const rows: HonestyRankingRow[] = useMemo(() => data?.results ?? [], [data]);
  const sliced = useMemo(() => rows.slice(0, limit), [rows, limit]);

  return (
    <div className={`rounded-2xl border p-4 md:p-6 shadow-sm ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`} data-dashboard-chart data-chart-title="Honesty Awards Leaderboard">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Honesty Awards</h2>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Top reporters (Found reports submitted)</div>
        </div>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      {loading || !data ? (
        <div className={`mt-4 h-80 rounded-2xl border animate-pulse ${isDark ? 'border-slate-800 bg-slate-800/40' : 'border-gray-200 bg-gray-100'}`} />
      ) : (
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-xs border-b ${isDark ? 'text-slate-400 border-slate-800' : 'text-gray-500 border-gray-200'}`}>
                <th className="py-2 pr-2 w-10">#</th>
                <th className="py-2 pr-2">Identifier</th>
                <th className="py-2 pr-2 w-20 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {sliced.length ? (
                sliced.map((row, i) => (
                  <motion.tr
                    key={`${row.rank}-${row.identifier}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.03 }}
                    className={`border-b last:border-b-0 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}
                  >
                    <td className={`py-2 pr-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{row.rank}</td>
                    <td className="py-2 pr-2">
                      <button
                        type="button"
                        className={`text-left hover:underline font-medium ${isDark ? 'text-slate-100' : 'text-gray-900'}`}
                        onClick={() => {
                          if (!onInspect) return;
                          onInspect(`Honesty Award - ${row.identifier}`, [row as any]);
                        }}
                      >
                        {row.identifier}
                      </button>
                    </td>
                    <td className={`py-2 pr-2 text-right tabular-nums font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{row.surrender_count}</td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td className={`py-6 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`} colSpan={3}>
                    No found reports in range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

