import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fetchAdminHonestyAwards, type AdminHonestyAwardsResponse, type HonestyAwardRow } from '../../services/api';

type Props = {
  dateFrom: string;
  dateTo: string;
  category: string;
  limit?: number;
  actions?: ReactNode;
  onInspect?: (title: string, rows: Array<Record<string, string | number>>) => void;
};

const formatFoundDate = (value: string) => {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatGradeSection = (grade?: string, section?: string) => {
  const g = (grade || '').trim();
  const s = (section || '').trim();
  if (g && s) return `${g} - ${s}`;
  if (g) return g;
  if (s) return s;
  return 'N/A';
};

export default function HonestyAwardsPanel({
  dateFrom,
  dateTo,
  category,
  limit = 20,
  actions,
  onInspect,
}: Props) {
  const [data, setData] = useState<AdminHonestyAwardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchAdminHonestyAwards({ date_from: dateFrom, date_to: dateTo, category, limit })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load honesty awards');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, category, limit]);

  const rows: HonestyAwardRow[] = useMemo(() => data?.results ?? [], [data]);
  const sliced = useMemo(() => rows.slice(0, limit), [rows, limit]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm" data-dashboard-chart data-chart-title="Honesty Awards">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Honesty Award</h2>
          <span className="text-xs text-gray-500">Found items with return status in the selected range.</span>
        </div>
        {actions ? actions : null}
      </div>
      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}

      {loading || !data ? (
        <div className="mt-4 h-80 rounded-2xl border border-gray-200 bg-gray-100 animate-pulse" />
      ) : (
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2 pr-2">Found By</th>
                <th className="py-2 pr-2">Grade &amp; Section</th>
                <th className="py-2 pr-2">Date Found</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Item Name</th>
                <th className="py-2 pr-2">Returned</th>
              </tr>
            </thead>
            <tbody>
              {sliced.length ? (
                sliced.map((row, i) => (
                  <motion.tr
                    key={row.report_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.03 }}
                    className="border-b last:border-b-0"
                  >
                    <td className="py-2 pr-2">
                      {onInspect ? (
                        <button
                          type="button"
                          className="text-left hover:underline text-gray-900 font-medium"
                          onClick={() => {
                            onInspect(`Honesty Award - ${row.found_by}`, [
                              {
                                'Found By': row.found_by,
                                'Grade & Section': formatGradeSection(row.grade, row.section),
                                'Date Found': formatFoundDate(row.date_found),
                                Category: row.category || 'Uncategorized',
                                'Item Name': row.item_name || 'Unnamed item',
                                Returned: row.returned ? 'Yes' : 'No',
                              },
                            ]);
                          }}
                        >
                          {row.found_by}
                        </button>
                      ) : (
                        <span className="text-gray-900 font-medium">{row.found_by}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-gray-700">{formatGradeSection(row.grade, row.section)}</td>
                    <td className="py-2 pr-2 text-gray-700">{formatFoundDate(row.date_found)}</td>
                    <td className="py-2 pr-2 text-gray-700">{row.category || 'Uncategorized'}</td>
                    <td className="py-2 pr-2 text-gray-700">{row.item_name || 'Unnamed item'}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.returned ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {row.returned ? 'Returned' : 'Not returned'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td className="py-6 text-center text-gray-500" colSpan={6}>
                    No found items in range.
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
