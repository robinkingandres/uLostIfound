import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, Download, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchAdminAnalytics, type AdminAnalyticsResponse } from '../services/api';

type DatePreset = 'week' | 'month' | 'year';

type DetailState = {
  title: string;
  rows: Array<Record<string, string | number>>;
} | null;

const cardMotion = {
  hidden: { opacity: 0, x: -20 },
  show: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.08, duration: 0.35 } }),
};

const lineColors = {
  lost: '#ef4444',
  found: '#22c55e',
  claims: '#3b82f6',
  ai: '#8b5cf6',
};

const statusColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#64748b'];

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toTitleCase(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function exportCsv(data: AdminAnalyticsResponse) {
  const rows: string[] = [];
  rows.push('section,key,value');

  Object.entries(data.kpis).forEach(([k, v]) => rows.push(`kpi,${k},${v}`));
  data.trends.forEach((r) => rows.push(`trend,${r.month},lost=${r.lost}|found=${r.found}|claims=${r.claims}|ai=${r.ai}`));
  data.due_claims_monthly.forEach((r) => rows.push(`due_claims,${r.month},${r.count}`));
  data.pending_claims_monthly.forEach((r) => rows.push(`pending_claims,${r.month},${r.count}`));
  data.categories.forEach((r) => rows.push(`category,${r.name},${r.count}`));
  Object.entries(data.status_breakdown).forEach(([k, v]) => rows.push(`status,${k},${v}`));
  data.locations.forEach((r) => rows.push(`location,${r.name},${r.count}`));

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics_${data.filters.date_from}_${data.filters.date_to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPdf(data: AdminAnalyticsResponse) {
  const win = window.open('', '_blank');
  if (!win) return;

  const statusRows = Object.entries(data.status_breakdown)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Analytics Export</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 8px 0; }
          h2 { margin: 24px 0 8px 0; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <h1>Lost & Found Analytics</h1>
        <div class="meta">Range: ${data.filters.date_from} to ${data.filters.date_to} | Category: ${data.filters.category}</div>

        <h2>KPIs</h2>
        <table>
          <thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody>
            ${Object.entries(data.kpis).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>Monthly Trends</h2>
        <table>
          <thead><tr><th>Month</th><th>Lost</th><th>Found</th><th>Claims</th><th>AI</th></tr></thead>
          <tbody>
            ${data.trends.map((r) => `<tr><td>${r.month}</td><td>${r.lost}</td><td>${r.found}</td><td>${r.claims}</td><td>${r.ai}</td></tr>`).join('')}
          </tbody>
        </table>

        <h2>Status Breakdown</h2>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>${statusRows}</tbody>
        </table>
      </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 250);
}

function SkeletonCard() {
  return <div className="h-32 rounded-2xl border border-gray-200 bg-gray-100 animate-pulse" />;
}

function SkeletonPanel({ height = 'h-80' }: { height?: string }) {
  return <div className={`${height} rounded-2xl border border-gray-200 bg-gray-100 animate-pulse`} />;
}

export default function Analytics() {
  const [preset, setPreset] = useState<DatePreset>('month');
  const [dateFrom, setDateFrom] = useState(dateOffset(-30));
  const [dateTo, setDateTo] = useState(dateOffset(0));
  const [category, setCategory] = useState('all');
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<DetailState>(null);

  const loadAnalytics = async (opts?: { keepLoading?: boolean }) => {
    if (!opts?.keepLoading) setLoading(true);
    setError('');
    try {
      const payload = await fetchAdminAnalytics({
        date_from: dateFrom,
        date_to: dateTo,
        category,
      });
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preset === 'week') setDateFrom(dateOffset(-7));
    if (preset === 'month') setDateFrom(dateOffset(-30));
    if (preset === 'year') setDateFrom(dateOffset(-365));
    setDateTo(dateOffset(0));
  }, [preset]);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, category]);

  const statusChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.status_breakdown).map(([name, value]) => ({ name: toTitleCase(name), value }));
  }, [data]);

  const categories = useMemo(() => {
    if (!data) return ['all'];
    return ['all', ...data.categories.map((c) => c.name)];
  }, [data]);

  if (error) {
    return <div className="p-8 text-red-600 font-semibold">{error}</div>;
  }

  const kpis = data?.kpis;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lost & Found Analytics Dashboard</h1>
            <p className="text-sm text-gray-500">8 core metrics for operational efficiency and AI match monitoring.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (!data) return;
                setExporting('pdf');
                try {
                  exportPdf(data);
                } finally {
                  setTimeout(() => setExporting(null), 300);
                }
              }}
              disabled={!data || exporting !== null}
              className="px-3 py-2 rounded-lg border text-sm bg-white border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export PDF
            </button>
            <button
              onClick={() => {
                if (!data) return;
                setExporting('csv');
                try {
                  exportCsv(data);
                } finally {
                  setExporting(null);
                }
              }}
              disabled={!data || exporting !== null}
              className="px-3 py-2 rounded-lg border text-sm bg-white border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {exporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export CSV
            </button>
            <button onClick={() => setPreset('week')} className={`px-3 py-2 rounded-lg border text-sm ${preset === 'week' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'}`}>Week</button>
            <button onClick={() => setPreset('month')} className={`px-3 py-2 rounded-lg border text-sm ${preset === 'month' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'}`}>Month</button>
            <button onClick={() => setPreset('year')} className={`px-3 py-2 rounded-lg border text-sm ${preset === 'year' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'}`}>Year</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white">
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => loadAnalytics({ keepLoading: true })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white hover:scale-[1.01] transition-transform"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading || !kpis ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          [
            { title: 'Total Reports', today: `+${kpis.reports_today} today`, value: kpis.total_reports, foot: `${kpis.total_reports.toLocaleString()} total` },
            { title: 'Claims Submitted', today: `+${kpis.claims_today} today`, value: kpis.claims_submitted, foot: `${kpis.claims_submitted.toLocaleString()} total` },
            { title: 'Resolution Rate', today: `${kpis.claims_resolved.toLocaleString()} resolved`, value: `${kpis.resolution_rate}%`, foot: `${kpis.avg_resolution_time_days} days avg` },
            { title: 'AI Matches', today: `+${kpis.ai_matches_today} today`, value: kpis.ai_matches_generated, foot: `${kpis.ai_matches_generated.toLocaleString()} total` },
          ].map((card, i) => (
            <motion.button
              type="button"
              key={card.title}
              custom={i}
              variants={cardMotion}
              initial="hidden"
              animate="show"
              whileHover={{ scale: 1.015 }}
              onClick={() => setDetail({ title: card.title, rows: [{ metric: card.title, value: card.value, detail: card.foot }] })}
              className="text-left rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="text-sm font-semibold text-gray-600">{card.title}</div>
              <div className="mt-2 text-xs text-gray-500">{card.today}</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{card.value}</div>
              <div className="mt-2 text-xs text-gray-500">{card.foot}</div>
            </motion.button>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Monthly Trends</h2>
            <span className="text-xs text-gray-500">Lost, Found, Claims, AI Matches</span>
          </div>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel height="h-96" /></div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="h-96 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends} onClick={(state: any) => {
                  const active = state?.activePayload?.[0]?.payload as AdminAnalyticsResponse['trends'][number] | undefined;
                  if (!active) return;
                  setDetail({ title: `Trend Details - ${active.month}`, rows: [{ month: active.month, lost: active.lost, found: active.found, claims: active.claims, ai: active.ai }] });
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="lost" stroke={lineColors.lost} strokeWidth={3} dot={{ r: 3 }} isAnimationActive animationDuration={900} />
                  <Line type="monotone" dataKey="found" stroke={lineColors.found} strokeWidth={3} dot={{ r: 3 }} isAnimationActive animationDuration={1000} />
                  <Line type="monotone" dataKey="claims" stroke={lineColors.claims} strokeWidth={3} dot={{ r: 3 }} isAnimationActive animationDuration={1100} />
                  <Line type="monotone" dataKey="ai" stroke={lineColors.ai} strokeWidth={3} dot={{ r: 3 }} isAnimationActive animationDuration={1200} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Due Claims (Monthly)</h2>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel /></div>
          ) : (
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.due_claims_monthly} onClick={(state: any) => {
                  const active = state?.activePayload?.[0]?.payload as { month: string; count: number } | undefined;
                  if (!active) return;
                  setDetail({ title: `Due Claims - ${active.month}`, rows: [active] });
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Pending Claims (Monthly)</h2>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel /></div>
          ) : (
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pending_claims_monthly} onClick={(state: any) => {
                  const active = state?.activePayload?.[0]?.payload as { month: string; count: number } | undefined;
                  if (!active) return;
                  setDetail({ title: `Pending Claims - ${active.month}`, rows: [active] });
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Top Categories</h2>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel /></div>
          ) : (
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categories.slice(0, 8)} onClick={(state: any) => {
                  const active = state?.activePayload?.[0]?.payload as { name: string; count: number } | undefined;
                  if (!active) return;
                  setDetail({ title: `Category - ${active.name}`, rows: [active] });
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} height={48} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Status Distribution</h2>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel /></div>
          ) : (
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    onClick={(entry: any) => setDetail({ title: `Status - ${entry.name}`, rows: [entry.payload] })}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {statusChartData.map((_, index) => (
                      <Cell key={index} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Top Locations</h2>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel /></div>
          ) : (
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.locations} layout="vertical" margin={{ left: 30 }} onClick={(state: any) => {
                  const active = state?.activePayload?.[0]?.payload as { name: string; count: number } | undefined;
                  if (!active) return;
                  setDetail({ title: `Location - ${active.name}`, rows: [active] });
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={110} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#14b8a6" radius={[0, 8, 8, 0]} isAnimationActive animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className={`rounded-xl border p-3 ${kpis.resolution_rate >= 80 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="text-xs text-gray-600">Resolution Threshold</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
              {kpis.resolution_rate >= 80 ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {kpis.resolution_rate >= 80 ? 'Healthy (>=80%)' : 'Needs attention (<80%)'}
            </div>
          </div>
          <div className={`rounded-xl border p-3 ${kpis.overdue_claims > 7 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
            <div className="text-xs text-gray-600">Overdue Claims (&gt;7 days)</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{kpis.overdue_claims}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-3 bg-white">
            <div className="text-xs text-gray-600">Pending Claims</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{kpis.pending_claims}</div>
          </div>
          <div className="rounded-xl border border-gray-200 p-3 bg-white">
            <div className="text-xs text-gray-600">Avg Resolution Time</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{kpis.avg_resolution_time_days} days</div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{detail.title}</h3>
              <button onClick={() => setDetail(null)} className="text-sm text-gray-500 hover:text-gray-900">Close</button>
            </div>
            <div className="mt-4 overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    {Object.keys(detail.rows[0] || {}).map((k) => <th key={k} className="py-2 pr-2">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map((row, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      {Object.values(row).map((val, idx) => <td key={idx} className="py-2 pr-2">{String(val)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
