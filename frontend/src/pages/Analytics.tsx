import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, Download, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  fetchAdminAnalytics,
  fetchAdminAnalyticsExportData,
  type AdminAnalyticsResponse,
  type AdminAnalyticsExportResponse,
} from '../services/api';

type Timeframe = 'last7' | 'last30' | 'last90';
type MetricKey = 'lost' | 'found' | 'claimed' | 'matched';

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
  claimed: '#3b82f6',
  matched: '#f97316',
};

const lostFoundColors = ['#ef4444', '#22c55e'];

const metricApiMap: Record<MetricKey, 'lost' | 'found' | 'claims' | 'ai'> = {
  lost: 'lost',
  found: 'found',
  claimed: 'claims',
  matched: 'ai',
};

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isValidDate(d: Date) {
  return !Number.isNaN(d.getTime());
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toTitleCase(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

const EXPORT_COLUMNS = [
  'Date Reported',
  'Record Type',
  'Report ID',
  'Item Name',
  'Category',
  'Location',
  'Report Status',
  'Report Description',
  'Item Image URL',
  'Reporter Name',
  'Reporter School ID',
  'Reporter Role',
  'Reporter Email',
  'Claim ID',
  'Claim Status',
  'Claimed At',
  'Claimant Name',
  'Claimant School ID',
  'Claimant Email',
  'Claim Proof Image URL',
] as const;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type CapturedDashboardChart = {
  title: string;
  svgDataUri: string;
};

function captureDashboardCharts(): CapturedDashboardChart[] {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-dashboard-chart]'));
  const charts: CapturedDashboardChart[] = [];

  sections.forEach((section) => {
    const title = section.dataset.chartTitle || 'Chart';
    const svg = section.querySelector('svg.recharts-surface');
    if (!svg) return;

    const cloned = svg.cloneNode(true) as SVGSVGElement;
    if (!cloned.getAttribute('xmlns')) cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!cloned.getAttribute('xmlns:xlink')) cloned.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const width = svg.getAttribute('width') || `${Math.ceil(svg.getBoundingClientRect().width)}`;
    const height = svg.getAttribute('height') || `${Math.ceil(svg.getBoundingClientRect().height)}`;
    if (width) cloned.setAttribute('width', width);
    if (height) cloned.setAttribute('height', height);

    const serialized = new XMLSerializer().serializeToString(cloned);
    const encoded = window.btoa(unescape(encodeURIComponent(serialized)));
    charts.push({
      title,
      svgDataUri: `data:image/svg+xml;base64,${encoded}`,
    });
  });

  return charts;
}

function exportDashboardPdfWithGraphs(
  data: AdminAnalyticsResponse,
  charts: CapturedDashboardChart[],
  rows: AdminAnalyticsExportResponse['rows']
) {
  const win = window.open('', '_blank');
  if (!win) return;

  const compactRows = rows.slice(0, 20);
  const detailRows = compactRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.date_reported)}</td>
      <td>${escapeHtml(row.item_name)}</td>
      <td>${escapeHtml(row.record_type)}</td>
      <td>${escapeHtml(row.report_status)}</td>
      <td>${escapeHtml(row.reporter_name)}<br/><small>${escapeHtml(row.reporter_school_id)}</small></td>
      <td>${row.claimant_name ? `${escapeHtml(row.claimant_name)}<br/><small>${escapeHtml(row.claimant_school_id)}</small>` : '-'}</td>
    </tr>
  `).join('');

  const chartBlocks = charts.length
    ? charts.map((chart) => `
      <div class="chart-card">
        <h3>${escapeHtml(chart.title)}</h3>
        <img src="${chart.svgDataUri}" alt="${escapeHtml(chart.title)}" />
      </div>
    `).join('')
    : '<p>No chart visuals available. Please wait for charts to load, then export again.</p>';

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Admin Dashboard Graph Export</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          body { font-family: Arial, sans-serif; padding: 8px; color: #111827; }
          h1 { margin: 0 0 8px 0; }
          h2 { margin: 14px 0 8px 0; font-size: 14px; }
          h3 { margin: 0 0 6px 0; font-size: 11px; }
          .meta { color: #6b7280; font-size: 10px; margin-bottom: 10px; }
          .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 8px 0 10px 0; }
          .chip { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 8px; font-size: 10px; background: #f9fafb; }
          .charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .chart-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; break-inside: avoid; }
          .chart-card img { width: 100%; max-height: 160px; height: auto; object-fit: contain; display: block; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #e5e7eb; padding: 5px; text-align: left; font-size: 9px; vertical-align: top; }
          th { background: #f3f4f6; }
          small { color: #6b7280; font-size: 8px; }
          .note { margin-top: 4px; color: #6b7280; font-size: 9px; }
          @media print {
            .chart-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Admin Analytics Dashboard</h1>
        <div class="meta">Range: ${escapeHtml(data.filters.date_from)} to ${escapeHtml(data.filters.date_to)} | Category: ${escapeHtml(data.filters.category)}</div>
          <div class="summary">
          <div class="chip">Daily Reports Added: ${data.kpis.reports_today}</div>
          <div class="chip">Items Claimed Today: ${data.kpis.claims_today}</div>
          <div class="chip">Resolution Rate: ${data.kpis.resolution_rate}%</div>
          <div class="chip">Items Matched Today: ${data.kpis.ai_matches_today}</div>
        </div>
        <h2>Graph Snapshot</h2>
        <div class="charts">${chartBlocks}</div>
        <h2>Reported Items and Users</h2>
        <table>
          <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Status</th><th>Reporter</th><th>Claimant</th></tr></thead>
          <tbody>${detailRows}</tbody>
        </table>
        <div class="note">Showing ${compactRows.length} of ${rows.length} records for compact PDF output.</div>
      </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildDetailedCsv(exportData: AdminAnalyticsExportResponse) {
  const lines: string[] = [EXPORT_COLUMNS.join(',')];
  exportData.rows.forEach((row) => {
    lines.push([
      escapeCsv(row.date_reported),
      escapeCsv(row.record_type),
      escapeCsv(row.report_id),
      escapeCsv(row.item_name),
      escapeCsv(row.category),
      escapeCsv(row.location),
      escapeCsv(row.report_status),
      escapeCsv(row.report_description),
      escapeCsv(row.item_image_url),
      escapeCsv(row.reporter_name),
      escapeCsv(row.reporter_school_id),
      escapeCsv(row.reporter_role),
      escapeCsv(row.reporter_email),
      escapeCsv(row.claim_id),
      escapeCsv(row.claim_status),
      escapeCsv(row.claimed_at),
      escapeCsv(row.claimant_name),
      escapeCsv(row.claimant_school_id),
      escapeCsv(row.claimant_email),
      escapeCsv(row.claim_proof_image_url),
    ].join(','));
  });
  return new Blob([lines.join('\n')], { type: 'application/vnd.ms-excel;charset=utf-8;' });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function exportDetailedPdf(exportData: AdminAnalyticsExportResponse) {
  const win = window.open('', '_blank');
  if (!win) return;

  const lostCount = exportData.rows.filter((r) => r.record_type === 'Lost').length;
  const foundCount = exportData.rows.filter((r) => r.record_type === 'Found').length;
  const claimedCount = exportData.rows.filter((r) => r.report_status === 'Claimed' || r.claim_status === 'Claimed').length;
  const tableRows = exportData.rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.date_reported)}</td>
      <td>${escapeHtml(row.record_type)}</td>
      <td>${escapeHtml(row.item_name)}</td>
      <td>${escapeHtml(row.report_status)}</td>
      <td>${escapeHtml(row.reporter_name)}<br/><small>${escapeHtml(row.reporter_school_id)} | ${escapeHtml(row.reporter_email)}</small></td>
      <td>${row.claimant_name ? `${escapeHtml(row.claimant_name)}<br/><small>${escapeHtml(row.claimant_school_id)} | ${escapeHtml(row.claimant_email)}</small>` : '-'}</td>
      <td>${row.item_image_url ? `<img src="${escapeHtml(row.item_image_url)}" alt="item" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />` : '-'}</td>
      <td>${row.claim_proof_image_url ? `<img src="${escapeHtml(row.claim_proof_image_url)}" alt="proof" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />` : '-'}</td>
    </tr>
  `).join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Analytics Detailed Export</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 8px 0; }
          h2 { margin: 20px 0 8px 0; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 11px; vertical-align: top; }
          th { background: #f3f4f6; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
          .summary { display: flex; gap: 8px; margin: 12px 0 16px 0; }
          .chip { border: 1px solid #e5e7eb; border-radius: 999px; padding: 6px 10px; font-size: 12px; background: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>Lost & Found Detailed Report</h1>
        <div class="meta">Range: ${escapeHtml(exportData.filters.date_from)} to ${escapeHtml(exportData.filters.date_to)} | Category: ${escapeHtml(exportData.filters.category)}</div>
        <div class="summary">
          <div class="chip">Lost Reports: ${lostCount}</div>
          <div class="chip">Found Reports: ${foundCount}</div>
          <div class="chip">Claimed Items: ${claimedCount}</div>
          <div class="chip">Rows: ${exportData.rows.length}</div>
        </div>

        <h2>Record Details</h2>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Item</th><th>Status</th><th>Reporter</th><th>Claimant</th><th>Item Image</th><th>Proof Image</th></tr></thead>
          <tbody>
            ${tableRows}
          </tbody>
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
  const [timeframe, setTimeframe] = useState<Timeframe>('last30');
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(['lost', 'found', 'claimed', 'matched']);
  const [dateFrom, setDateFrom] = useState(dateOffset(-29));
  const [dateTo, setDateTo] = useState(dateOffset(0));
  const [category, setCategory] = useState('all');
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | 'dashboard' | null>(null);
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
        timeframe: timeframe === 'last7' ? 'week' : timeframe === 'last30' ? 'month' : 'year',
        metrics: activeMetrics.map((metric) => metricApiMap[metric]),
      });
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeframe === 'last7') setDateFrom(dateOffset(-6));
    if (timeframe === 'last30') setDateFrom(dateOffset(-29));
    if (timeframe === 'last90') setDateFrom(dateOffset(-89));
    setDateTo(dateOffset(0));
  }, [timeframe]);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, category, timeframe, activeMetrics]);

  const lostFoundChartData = useMemo(() => {
    if (!data) return [];
    const totals = data.trends.reduce(
      (acc, item) => ({
        lost: acc.lost + (item.lost ?? 0),
        found: acc.found + (item.found ?? 0),
      }),
      { lost: 0, found: 0 }
    );
    return [
      { name: 'Lost', value: totals.lost },
      { name: 'Found', value: totals.found },
    ];
  }, [data]);

  const categories = useMemo(() => {
    if (!data) return ['all'];
    return ['all', ...data.categories.map((c) => c.name)];
  }, [data]);

  const trendSeries = useMemo(() => {
    if (!data) return [];
    const base = new Date(`${dateFrom}T00:00:00`);
    const end = new Date(`${dateTo}T00:00:00`);
    const totalDays = Math.max(
      1,
      Math.round((end.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const mappedByDate = new Map<string, AdminAnalyticsResponse['trends'][number]>();
    data.trends.forEach((item) => {
      const parsed = new Date(item.month);
      if (isValidDate(parsed)) mappedByDate.set(toDateKey(parsed), item);
    });

    return Array.from({ length: totalDays }).map((_, index) => {
      const d = new Date(base);
      d.setDate(base.getDate() + index);
      const key = toDateKey(d);
      const item = mappedByDate.get(key) ?? data.trends[index];
      return {
        label: formatShortDate(d),
        lost: item?.lost ?? 0,
        found: item?.found ?? 0,
        claimed: item?.claims ?? 0,
        matched: item?.ai ?? 0,
      };
    });
  }, [data, dateFrom]);

  const locationChartHeight = useMemo(() => {
    if (!data?.locations?.length) return 320;
    return Math.max(320, data.locations.length * 32);
  }, [data]);

  if (error) {
    return <div className="p-8 text-red-600 font-semibold">{error}</div>;
  }

  const kpis = data?.kpis;
  const timeframeText = timeframe === 'last7' ? 'Last 7 Days' : timeframe === 'last30' ? 'Last 30 Days' : 'Last 90 Days';
  const rangeText = timeframe === 'last7' ? '7 Days' : timeframe === 'last30' ? '30 Days' : '90 Days';

  const toggleMetric = (metric: MetricKey) => {
    setActiveMetrics((prev) => {
      if (prev.includes(metric)) return prev.filter((m) => m !== metric);
      return [...prev, metric];
    });
  };

  const loadExportData = () =>
    fetchAdminAnalyticsExportData({
      date_from: dateFrom,
      date_to: dateTo,
      category,
      timeframe: timeframe === 'last7' ? 'week' : timeframe === 'last30' ? 'month' : 'year',
    });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lost & Found Analytics Dashboard</h1>
            <p className="text-sm text-gray-500">8 core metrics for operational efficiency and match monitoring.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                if (!data) return;
                setExporting('dashboard');
                try {
                  const charts = captureDashboardCharts();
                  const exportData = await loadExportData();
                  exportDashboardPdfWithGraphs(data, charts, exportData.rows);
                } catch (err) {
                  console.error(err);
                } finally {
                  setTimeout(() => setExporting(null), 150);
                }
              }}
              disabled={!data || exporting !== null}
              className="px-3 py-2 rounded-lg border text-sm bg-white border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {exporting === 'dashboard' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Dashboard PDF
            </button>
            <button
              onClick={async () => {
                setExporting('pdf');
                try {
                  const exportData = await loadExportData();
                  exportDetailedPdf(exportData);
                } catch (err) {
                  console.error(err);
                } finally {
                  setTimeout(() => setExporting(null), 300);
                }
              }}
              disabled={exporting !== null}
              className="px-3 py-2 rounded-lg border text-sm bg-white border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export History PDF
            </button>
            <button
              onClick={async () => {
                setExporting('excel');
                try {
                  const exportData = await loadExportData();
                  const csvBlob = buildDetailedCsv(exportData);
                  downloadBlob(
                    csvBlob,
                    `analytics_detailed_${exportData.filters.date_from}_${exportData.filters.date_to}.xls`
                  );
                } catch (err) {
                  console.error(err);
                } finally {
                  setExporting(null);
                }
              }}
              disabled={exporting !== null}
              className="px-3 py-2 rounded-lg border text-sm bg-white border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Excel
            </button>
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

        <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">Trend Metrics</summary>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['lost', 'found', 'claimed', 'matched'] as MetricKey[]).map((metric) => (
              <label key={metric} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={activeMetrics.includes(metric)}
                  onChange={() => toggleMetric(metric)}
                />
                {metric}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading || !kpis ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          [
            { title: 'Daily Reports Added', today: `+${kpis.reports_today} today`, value: kpis.reports_today, foot: `${kpis.total_reports.toLocaleString()} total` },
            { title: 'Items Claimed Today', today: `+${kpis.claims_today} today`, value: kpis.claims_today, foot: `${kpis.claims_submitted.toLocaleString()} total` },
            { title: 'Resolution Rate', today: `${kpis.claims_resolved.toLocaleString()} resolved`, value: `${kpis.resolution_rate}%`, foot: `${kpis.avg_resolution_time_days} days avg` },
            { title: 'Items Matched Today', today: `+${kpis.ai_matches_today} today`, value: kpis.ai_matches_today, foot: `${kpis.ai_matches_generated.toLocaleString()} total` },
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
        <div
          className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm"
          data-dashboard-chart
          data-chart-title={`${timeframeText} Trends`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{timeframeText} Trends (Lost, Found, Claimed, Matched)</h2>
              <span className="text-xs text-gray-500">Lost, Found, Claimed, Matched</span>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 self-start sm:self-auto">
              {([
                { key: 'last7', label: 'Last 7 days' },
                { key: 'last30', label: 'Last 30 days' },
                { key: 'last90', label: 'Last 90 days' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTimeframe(item.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${timeframe === item.key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel height="h-96" /></div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="h-96 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendSeries} onClick={(state: any) => {
                  const active = state?.activePayload?.[0]?.payload as (typeof trendSeries)[number] | undefined;
                  if (!active) return;
                  setDetail({
                    title: `Trend Details - ${active.label}`,
                    rows: [{ date: active.label, lost: active.lost, found: active.found, claimed: active.claimed, matched: active.matched }],
                  });
                }}>
                  <defs>
                    <linearGradient id="trendLost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineColors.lost} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={lineColors.lost} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="trendFound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineColors.found} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={lineColors.found} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="trendClaimed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineColors.claimed} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={lineColors.claimed} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="trendMatched" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lineColors.matched} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={lineColors.matched} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={18} interval="preserveStartEnd" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {activeMetrics.includes('lost') ? (
                    <Area
                      type="monotone"
                      dataKey="lost"
                      name="lost"
                      stroke={lineColors.lost}
                      fill="url(#trendLost)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive
                      animationDuration={900}
                    />
                  ) : null}
                  {activeMetrics.includes('found') ? (
                    <Area
                      type="monotone"
                      dataKey="found"
                      name="found"
                      stroke={lineColors.found}
                      fill="url(#trendFound)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive
                      animationDuration={1000}
                    />
                  ) : null}
                  {activeMetrics.includes('claimed') ? (
                    <Area
                      type="monotone"
                      dataKey="claimed"
                      name="claimed"
                      stroke={lineColors.claimed}
                      fill="url(#trendClaimed)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive
                      animationDuration={1100}
                    />
                  ) : null}
                  {activeMetrics.includes('matched') ? (
                    <Area
                      type="monotone"
                      dataKey="matched"
                      name="matched"
                      stroke={lineColors.matched}
                      fill="url(#trendMatched)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive
                      animationDuration={1200}
                    />
                  ) : null}
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div
          className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm"
          data-dashboard-chart
          data-chart-title={`Due Claims (${timeframeText})`}
        >
          <h2 className="font-semibold text-gray-900">Due Claims ({timeframeText})</h2>
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

        <div
          className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm"
          data-dashboard-chart
          data-chart-title={`Pending Claims (${timeframeText})`}
        >
          <h2 className="font-semibold text-gray-900">Pending Claims ({timeframeText})</h2>
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
        <div
          className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm"
          data-dashboard-chart
          data-chart-title={`${timeframeText} Category Breakdown`}
        >
          <h2 className="font-semibold text-gray-900">{timeframeText} Category Breakdown</h2>
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

        <div
          className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm"
          data-dashboard-chart
          data-chart-title="Lost vs Found"
        >
          <h2 className="font-semibold text-gray-900">Lost vs Found</h2>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel /></div>
          ) : (
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lostFoundChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    onClick={(entry: any) => setDetail({ title: `Lost vs Found - ${entry.name}`, rows: [entry.payload] })}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {lostFoundChartData.map((_, index) => (
                      <Cell key={index} fill={lostFoundColors[index % lostFoundColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm"
          data-dashboard-chart
          data-chart-title="Top Locations for Lost and Found Items"
        >
          <h2 className="font-semibold text-gray-900">Top Locations for Lost and Found Items</h2>
          {loading || !data ? (
            <div className="mt-4"><SkeletonPanel /></div>
          ) : (
            <div className="mt-4 max-h-[420px] overflow-y-auto">
              <div style={{ height: locationChartHeight }} className="min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.locations} layout="vertical" margin={{ left: 30 }} onClick={(state: any) => {
                    const active = state?.activePayload?.[0]?.payload as { name: string; count: number } | undefined;
                    if (!active) return;
                    setDetail({ title: `Location - ${active.name}`, rows: [active] });
                  }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={110} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#14b8a6" radius={[0, 8, 8, 0]} isAnimationActive animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
