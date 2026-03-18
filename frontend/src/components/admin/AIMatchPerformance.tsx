import { useEffect, useMemo, useState } from 'react';
import { fetchAdminAIMatchPerformance, type AdminAIMatchPerformanceResponse } from '../../services/api';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

type Props = {
  dateFrom: string;
  dateTo: string;
  category: string;
  onInspect?: (title: string, rows: Array<Record<string, string | number>>) => void;
};

export default function AIMatchPerformance({ dateFrom, dateTo, category, onInspect }: Props) {
  const { isDark } = useAdminTheme();
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

  const suggestionStats = useMemo(() => {
    const accepted = data?.suggestions?.accepted ?? 0;
    const pending = data?.suggestions?.pending ?? 0;
    const rejected = data?.suggestions?.rejected ?? 0;
    const total = data?.suggestions?.total ?? accepted + pending + rejected;
    const successRate =
      data?.suggestions?.success_rate ??
      (total > 0 ? Math.round((accepted / total) * 1000) / 10 : 0);
    return { accepted, pending, rejected, total, successRate };
  }, [data]);

  return (
    <div className={`rounded-2xl border p-4 md:p-6 shadow-sm ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`} data-dashboard-chart data-chart-title="AI Match Performance">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>AI Match Performance</h2>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Acceptance summary + successful vs unmatched + time-to-match distribution</div>
        </div>
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      {loading || !data ? (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-20 rounded-xl border animate-pulse ${isDark ? 'border-slate-800 bg-slate-800/40' : 'border-gray-200 bg-gray-100'}`} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            {
              key: 'success',
              title: 'Acceptance Rate',
              value: `${suggestionStats.successRate}%`,
              foot: `${suggestionStats.accepted.toLocaleString()} / ${suggestionStats.total.toLocaleString()} accepted`,
              className: 'border-sky-200 bg-sky-50 text-sky-900',
              darkClassName: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
              inspect: () =>
                onInspect?.('AI Match Success Rate', [
                  {
                    acceptance_rate: `${suggestionStats.successRate}%`,
                    accepted: suggestionStats.accepted,
                    pending: suggestionStats.pending,
                    rejected: suggestionStats.rejected,
                    total: suggestionStats.total,
                  },
                ]),
            },
            {
              key: 'accepted',
              title: 'Accepted',
              value: suggestionStats.accepted.toLocaleString(),
              foot: 'Approved suggestions',
              className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
              darkClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
              inspect: () =>
                onInspect?.('AI Match Suggestions - Accepted', [
                  { status: 'Accepted', count: suggestionStats.accepted },
                ]),
            },
            {
              key: 'pending',
              title: 'Pending',
              value: suggestionStats.pending.toLocaleString(),
              foot: 'Awaiting review',
              className: 'border-amber-200 bg-amber-50 text-amber-900',
              darkClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
              inspect: () =>
                onInspect?.('AI Match Suggestions - Pending', [
                  { status: 'Pending', count: suggestionStats.pending },
                ]),
            },
            {
              key: 'rejected',
              title: 'Rejected',
              value: suggestionStats.rejected.toLocaleString(),
              foot: 'Declined suggestions',
              className: 'border-rose-200 bg-rose-50 text-rose-900',
              darkClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
              inspect: () =>
                onInspect?.('AI Match Suggestions - Rejected', [
                  { status: 'Rejected', count: suggestionStats.rejected },
                ]),
            },
          ].map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={card.inspect}
              disabled={!onInspect}
              className={`rounded-xl border p-3 text-left transition ${isDark ? card.darkClassName : card.className} ${onInspect ? 'hover:shadow-sm' : 'cursor-default'}`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{card.title}</div>
              <div className="mt-1 text-2xl font-bold">{card.value}</div>
              <div className="mt-1 text-xs opacity-70">{card.foot}</div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}

