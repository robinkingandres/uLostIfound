import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  Package,
  PackageSearch,
  Printer,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  fetchActivityFeed,
  fetchAnalytics,
  fetchClaims,
  fetchLostFoundDashboard,
  fetchReports,
  type Activity as ActivityItem,
  type AnalyticsData,
  type LostFoundDashboardData,
} from "../services/api";
import { ChartTooltipOverlay, useChartTooltip } from "../components/ui/ChartTooltip";
import type { Claim } from "../types/claim";
import type { Report } from "../types/report";

type TimeFrame = "daily" | "weekly" | "monthly" | "yearly";

const KPI = ({
  title,
  value,
  hint,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: any;
  color: string;
  loading?: boolean;
}) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-600">{title}</div>
        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : (
          <div className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{value}</div>
        )}
        {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
      </div>
      <div className={`shrink-0 p-2.5 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

function formatPct(n: number) {
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

function formatNum(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat().format(n);
}

function safeDateLabel(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function safeParseDate(d: string): Date | null {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function isWithinLastDays(dateStr: string, days: number) {
  const dt = safeParseDate(dateStr);
  if (!dt) return true; // if unknown format, keep it (better for auditing than dropping)
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return dt.getTime() >= cutoff;
}

function HeatmapRow({
  label,
  cells,
  max,
  onCellHover,
  onMove,
  onLeave,
  baseColor,
}: {
  label: string;
  cells: { key: string; value: number; meta: Record<string, string> }[];
  max: number;
  baseColor: "red" | "green" | "indigo";
  onCellHover: (e: React.MouseEvent, key: string, value: number, meta: Record<string, string>) => void;
  onMove: (e: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const color = (v: number) => {
    const t = max > 0 ? v / max : 0;
    const a = 0.08 + 0.82 * Math.min(1, Math.max(0, t));
    if (baseColor === "red") return `rgba(239, 68, 68, ${a})`;
    if (baseColor === "green") return `rgba(34, 197, 94, ${a})`;
    return `rgba(99, 102, 241, ${a})`;
  };

  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      <div className="grid grid-cols-12 md:grid-cols-24 gap-1">
        {cells.map((c) => (
          <button
            key={c.key}
            type="button"
            className="h-6 md:h-7 rounded-md border border-gray-100 hover:border-gray-300 transition-colors"
            style={{ background: color(c.value) }}
            onMouseEnter={(e) => onCellHover(e, c.key, c.value, c.meta)}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            aria-label={`${label} ${c.key}: ${c.value}`}
          />
        ))}
      </div>
    </div>
  );
}

function DonutSegments({
  title,
  description,
  entries,
  colors,
  tooltip,
}: {
  title: string;
  description: string;
  entries: { label: string; value: number }[];
  colors: string[];
  tooltip: ReturnType<typeof useChartTooltip>;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const total = entries.reduce((s, e) => s + e.value, 0) || 1;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  let current = 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-lg font-bold text-gray-900">{title}</div>
          <div className="text-sm text-gray-500 mt-1">{description}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-bold tabular-nums">{formatNum(total)}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
        <div className="relative w-52 h-52 mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f3f4f6" strokeWidth="18" />
            {entries.map((e, idx) => {
              const pct = e.value / total;
              const dash = pct * circumference;
              const offset = -current;
              current += dash;

              const stroke = colors[idx % colors.length];
              const dashArray = animate ? `${dash} ${circumference}` : `0 ${circumference}`;

              return (
                <circle
                  key={e.label}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="transparent"
                  stroke={stroke}
                  strokeWidth="18"
                  strokeDasharray={dashArray}
                  strokeDashoffset={offset}
                  className="cursor-pointer transition-[stroke-dasharray] duration-1000 ease-out"
                  onMouseEnter={(ev) =>
                    tooltip.show(ev, {
                      title: `${title}: ${e.label}`,
                      description,
                      items: [
                        { label: "Count", value: formatNum(e.value), color: stroke },
                        { label: "Share", value: `${(pct * 100).toFixed(1)}%` },
                      ],
                      footer: "Hover different segments to compare distributions.",
                    })
                  }
                  onMouseMove={tooltip.move}
                  onMouseLeave={tooltip.hide}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-full border border-gray-100" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map((e, idx) => {
            const pct = (e.value / total) * 100;
            const stroke = colors[idx % colors.length];
            return (
              <div
                key={e.label}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors"
                onMouseEnter={(ev) =>
                  tooltip.show(ev, {
                    title: `${title}: ${e.label}`,
                    description,
                    items: [
                      { label: "Count", value: formatNum(e.value), color: stroke },
                      { label: "Share", value: `${pct.toFixed(1)}%` },
                    ],
                  })
                }
                onMouseMove={tooltip.move}
                onMouseLeave={tooltip.hide}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: stroke }} />
                  <span className="text-sm font-semibold text-gray-700 truncate">{e.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{formatNum(e.value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GroupedBars({
  title,
  description,
  data,
  tooltip,
}: {
  title: string;
  description: string;
  data: AnalyticsData["claimProcessingEfficiency"];
  tooltip: ReturnType<typeof useChartTooltip>;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.claimed || 0, d.found || 0, d.verified || 0))
  );

  const series = [
    { key: "claimed" as const, label: "Claimed", color: "#ef4444", meaning: "User claims submitted for found items." },
    { key: "found" as const, label: "Found", color: "#3b82f6", meaning: "Items reported as found." },
    { key: "verified" as const, label: "Verified", color: "#22c55e", meaning: "Claims verified/approved by staff." },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-lg font-bold text-gray-900">{title}</div>
          <div className="text-sm text-gray-500 mt-1">{description}</div>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
              <span className="text-xs text-gray-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 h-56 flex items-end gap-2">
        {data.map((d) => (
          <div key={d.period} className="flex-1 min-w-0">
            <div className="h-48 flex items-end justify-center gap-1">
              {series.map((s) => {
                const v = d[s.key] || 0;
                const pct = (v / max) * 100;
                return (
                  <div
                    key={s.key}
                    className="w-2.5 md:w-3.5 rounded-t-sm cursor-pointer"
                    style={{
                      background: s.color,
                      height: `${animate ? pct : 0}%`,
                      transition: "height 900ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }}
                    onMouseEnter={(ev) =>
                      tooltip.show(ev, {
                        title: `${title} • ${d.period}`,
                        description: "Compare throughput across the pipeline. Hover each bar for its meaning.",
                        items: [
                          { label: "Claimed", value: formatNum(d.claimed), color: "#ef4444" },
                          { label: "Found", value: formatNum(d.found), color: "#3b82f6" },
                          { label: "Verified", value: formatNum(d.verified), color: "#22c55e" },
                        ],
                        footer: `${s.label}: ${s.meaning}`,
                      })
                    }
                    onMouseMove={tooltip.move}
                    onMouseLeave={tooltip.hide}
                  />
                );
              })}
            </div>
            <div className="mt-2 text-center text-[11px] font-medium text-gray-500 truncate">{d.period}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DualLine({
  title,
  description,
  data,
  tooltip,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; lost: number; found: number }>;
  tooltip: ReturnType<typeof useChartTooltip>;
}) {
  const [animate, setAnimate] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const max = Math.max(1, ...data.map((d) => Math.max(d.lost, d.found)));
  const w = 100;
  const h = 100;
  const step = w / (data.length - 1 || 1);

  const points = useMemo(
    () =>
      data.map((d, i) => {
        const x = i * step;
        const lostY = h - (d.lost / max) * h;
        const foundY = h - (d.found / max) * h;
        return { x, lostY, foundY };
      }),
    [data, max, step]
  );

  const smoothPath = (ys: (p: (typeof points)[number]) => number) => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x},${ys(points[0])}`;

    const pts = points.map((p) => ({ x: p.x, y: ys(p) }));
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const lostLine = useMemo(() => smoothPath((p) => p.lostY), [points]); // eslint-disable-line react-hooks/exhaustive-deps
  const foundLine = useMemo(() => smoothPath((p) => p.foundY), [points]); // eslint-disable-line react-hooks/exhaustive-deps

  const areaPath = (line: string) => {
    if (!line || points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${line} L ${last.x},${h} L ${first.x},${h} Z`;
  };

  const lostArea = useMemo(() => areaPath(lostLine), [lostLine]);
  const foundArea = useMemo(() => areaPath(foundLine), [foundLine]);

  const updateHoverFromEvent = (ev: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    if (data.length === 0) return;
    const svg = (ev.currentTarget.ownerSVGElement as SVGSVGElement | null) ?? null;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const xPx = ev.clientX - rect.left;
    const t = rect.width > 0 ? xPx / rect.width : 0;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(t * (data.length - 1))));

    setHoverIndex(idx);

    const d = data[idx];
    const prev = idx > 0 ? data[idx - 1] : null;
    const dl = prev ? d.lost - prev.lost : 0;
    const df = prev ? d.found - prev.found : 0;

    tooltip.show(ev as unknown as React.MouseEvent, {
      title: `${title} • ${d.label}`,
      description: "Area chart view (filled trend) with a shared hover cursor across both series.",
      items: [
        { label: "Lost", value: formatNum(d.lost), color: "#ef4444" },
        { label: "Found", value: formatNum(d.found), color: "#22c55e" },
        prev ? { label: "Δ Lost vs prev", value: `${dl >= 0 ? "+" : ""}${formatNum(dl)}` } : undefined,
        prev ? { label: "Δ Found vs prev", value: `${df >= 0 ? "+" : ""}${formatNum(df)}` } : undefined,
      ].filter(Boolean) as { label: string; value: string; color?: string }[],
      footer: "Tip: move horizontally to compare the same date across both trends.",
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-lg font-bold text-gray-900">{title}</div>
          <div className="text-sm text-gray-500 mt-1">{description}</div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600">Lost</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">Found</span>
          </div>
        </div>
      </div>

      <div className="mt-4 h-56 relative">
        <div className="absolute inset-0">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="lostFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.04" />
              </linearGradient>
              <linearGradient id="foundFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="#f3f4f6" strokeWidth="1" />

            {/* Areas (fade in) */}
            {foundArea ? (
              <path
                d={foundArea}
                fill="url(#foundFill)"
                style={{ opacity: animate ? 1 : 0, transition: "opacity 900ms ease-out 180ms" }}
              />
            ) : null}
            {lostArea ? (
              <path d={lostArea} fill="url(#lostFill)" style={{ opacity: animate ? 1 : 0, transition: "opacity 900ms ease-out" }} />
            ) : null}

            {/* Lines (draw) */}
            {lostLine ? (
              <path
                d={lostLine}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                style={{ strokeDasharray: "1000", strokeDashoffset: "1000", animation: "draw 1.8s ease-out forwards" }}
              />
            ) : null}
            {foundLine ? (
              <path
                d={foundLine}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                style={{ strokeDasharray: "1000", strokeDashoffset: "1000", animation: "draw 1.8s ease-out 200ms forwards" }}
              />
            ) : null}

            {/* Shared hover cursor + focus dots */}
            {hoverIndex != null && points[hoverIndex] ? (
              <g>
                <line
                  x1={points[hoverIndex].x}
                  y1="0"
                  x2={points[hoverIndex].x}
                  y2="100"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={points[hoverIndex].x}
                  cy={points[hoverIndex].lostY}
                  r="4"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle
                  cx={points[hoverIndex].x}
                  cy={points[hoverIndex].foundY}
                  r="4"
                  fill="#22c55e"
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ) : null}

            {/* Interaction layer */}
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={(ev) => updateHoverFromEvent(ev)}
              onMouseMove={(ev) => updateHoverFromEvent(ev)}
              onMouseLeave={() => {
                setHoverIndex(null);
                tooltip.hide();
              }}
            />
          </svg>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 flex justify-between text-[11px] text-gray-500">
          {data.length > 1
            ? [data[0], data[Math.floor((data.length - 1) / 2)], data[data.length - 1]].map((d) => (
                <span key={d.label}>{d.label}</span>
              ))
            : data.map((d) => <span key={d.label}>{d.label}</span>)}
        </div>
      </div>
    </div>
  );
}

function CategoryTrends({
  title,
  description,
  data,
  tooltip,
}: {
  title: string;
  description: string;
  data: LostFoundDashboardData["categoryTrends"];
  tooltip: ReturnType<typeof useChartTooltip>;
}) {
  const colors = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7"];

  const prepared = useMemo(() => {
    const rows = data || [];
    const dayMap = new Map<string, string>(); // iso -> label
    for (const r of rows) dayMap.set(r.day, safeDateLabel(r.day));

    const daysIso = Array.from(dayMap.keys()).sort((a, b) => +new Date(a) - +new Date(b));
    const lastDays = daysIso.slice(Math.max(0, daysIso.length - 14));

    const byCat = new Map<string, Map<string, number>>(); // cat -> (iso -> total)
    for (const r of rows) {
      if (!lastDays.includes(r.day)) continue;
      const v = (r.lost || 0) + (r.found || 0);
      const m = byCat.get(r.category) || new Map<string, number>();
      m.set(r.day, (m.get(r.day) || 0) + v);
      byCat.set(r.category, m);
    }

    const ranked = Array.from(byCat.entries())
      .map(([category, m]) => ({
        category,
        total: Array.from(m.values()).reduce((s, v) => s + v, 0),
        byDay: m,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);

    const days = lastDays.map((iso) => ({ iso, label: dayMap.get(iso) || iso }));
    const series = ranked.map((r, idx) => ({
      category: r.category,
      color: colors[idx % colors.length],
      values: days.map((d) => ({ dayIso: d.iso, dayLabel: d.label, value: r.byDay.get(d.iso) || 0 })),
    }));

    return { days, series };
  }, [data]);

  const max = useMemo(() => {
    const vals = prepared.series.flatMap((s) => s.values.map((v) => v.value));
    return Math.max(1, ...vals);
  }, [prepared]);

  const w = 100;
  const h = 100;
  const step = w / (prepared.days.length - 1 || 1);

  const toPoints = (values: { value: number }[]) =>
    values
      .map((v, i) => {
        const y = h - (v.value / max) * h;
        return `${i * step},${y}`;
      })
      .join(" ");

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-lg font-bold text-gray-900">{title}</div>
          <div className="text-sm text-gray-500 mt-1">{description}</div>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          {prepared.series.map((s) => (
            <div key={s.category} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-gray-600">{s.category}</span>
            </div>
          ))}
        </div>
      </div>

      {prepared.days.length < 2 || prepared.series.length === 0 ? (
        <div className="mt-8 text-sm text-gray-500">Not enough category trend data available.</div>
      ) : (
        <div className="mt-4 h-56 relative">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <line x1="0" y1="0" x2="100" y2="0" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="#f3f4f6" strokeWidth="1" />

            {prepared.series.map((s, si) => (
              <g key={s.category}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  points={toPoints(s.values)}
                  style={{
                    strokeDasharray: "1000",
                    strokeDashoffset: "1000",
                    animation: `draw 1.8s ease-out ${si * 120}ms forwards`,
                  }}
                />
                {s.values.map((v, i) => {
                  const x = i * step;
                  const y = h - (v.value / max) * h;
                  return (
                    <circle
                      key={`${s.category}-${v.dayIso}`}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="white"
                      stroke={s.color}
                      strokeWidth="2"
                      className="cursor-pointer"
                      onMouseEnter={(ev) =>
                        tooltip.show(ev, {
                          title: `Category trend • ${v.dayLabel}`,
                          description: "Top categories over time (Lost + Found combined). Hover other points to compare momentum.",
                          items: [
                            { label: "Category", value: s.category, color: s.color },
                            { label: "Reports", value: formatNum(v.value) },
                          ],
                          footer: "Use this to spot seasonal spikes (e.g., umbrellas, water bottles, IDs).",
                        })
                      }
                      onMouseMove={tooltip.move}
                      onMouseLeave={tooltip.hide}
                    />
                  );
                })}
              </g>
            ))}
          </svg>

          <div className="absolute -bottom-1 left-0 right-0 flex justify-between text-[11px] text-gray-500">
            {[prepared.days[0], prepared.days[Math.floor((prepared.days.length - 1) / 2)], prepared.days[prepared.days.length - 1]].map((d) => (
              <span key={d.iso}>{d.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LostFoundAnalyticsDashboard() {
  const tooltip = useChartTooltip();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [reporting, setReporting] = useState<"print" | "csv" | null>(null);

  const [lf, setLf] = useState<LostFoundDashboardData | null>(null);
  const [an, setAn] = useState<AnalyticsData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const loadAll = async (tf: TimeFrame) => {
    setLoading(true);
    setError("");
    try {
      const [lfRes, anRes, actRes] = await Promise.all([
        fetchLostFoundDashboard(),
        fetchAnalytics(tf),
        fetchActivityFeed().catch(() => [] as ActivityItem[]),
      ]);
      setLf(lfRes);
      setAn(anRes);
      setActivity(actRes);
    } catch (e) {
      console.error(e);
      setError("Failed to load dashboard analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(timeFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFrame]);

  const timeFrameOptions: { value: TimeFrame; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const peakMax = useMemo(() => {
    const arr = lf?.peakTimes || [];
    return Math.max(1, ...arr.map((d) => Math.max(d.lost || 0, d.found || 0)));
  }, [lf]);

  const peakLostCells = useMemo(() => {
    const byHour = new Map((lf?.peakTimes || []).map((d) => [d.hour, d]));
    return Array.from({ length: 24 }, (_, hour) => {
      const v = byHour.get(hour)?.lost || 0;
      return { key: `${hour}:00`, value: v, meta: { Hour: `${hour}:00`, Type: "Lost" } };
    });
  }, [lf]);

  const peakFoundCells = useMemo(() => {
    const byHour = new Map((lf?.peakTimes || []).map((d) => [d.hour, d]));
    return Array.from({ length: 24 }, (_, hour) => {
      const v = byHour.get(hour)?.found || 0;
      return { key: `${hour}:00`, value: v, meta: { Hour: `${hour}:00`, Type: "Found" } };
    });
  }, [lf]);

  const line30d = useMemo(() => {
    const src = lf?.dailyTrends || [];
    return src.map((d) => ({ label: safeDateLabel(d.day), lost: d.lost || 0, found: d.found || 0 }));
  }, [lf]);

  const statusEntries = useMemo(() => {
    const m = an?.statusDistribution || {};
    return Object.entries(m)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [an]);

  const categoryEntries = useMemo(() => {
    const arr = an?.categoryDistribution || [];
    return arr
      .map((c) => ({ label: c.category, value: c.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [an]);

  const locationMatrix = useMemo(() => {
    const lost = lf?.locationLost || [];
    const found = lf?.locationFound || [];
    const map = new Map<string, { lost: number; found: number; total: number }>();
    for (const l of lost) {
      map.set(l.location, { lost: l.count, found: map.get(l.location)?.found || 0, total: 0 });
    }
    for (const f of found) {
      map.set(f.location, { lost: map.get(f.location)?.lost || 0, found: f.count, total: 0 });
    }
    for (const [, v] of map) v.total = v.lost + v.found;
    return Array.from(map.entries())
      .map(([location, v]) => ({ location, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [lf]);

  const locationMax = useMemo(() => Math.max(1, ...locationMatrix.map((r) => r.total)), [locationMatrix]);

  const alerts = lf?.alerts;
  const hasAlerts = Boolean(alerts && (alerts.highLossAlert || alerts.unclaimedOld > 0));

  const buildTransparencySnapshot = async () => {
    const [lostReportsRaw, foundReportsRaw, claimsRaw] = await Promise.all([
      fetchReports("Lost"),
      fetchReports("Found"),
      fetchClaims(),
    ]);

    // Keep this report aligned to "last 30 days" (as in the chart title),
    // but do NOT drop items with unparseable dates.
    const last30 = 30;
    const lostReports = (lostReportsRaw || []).filter((r) => isWithinLastDays(r.date, last30));
    const foundReports = (foundReportsRaw || []).filter((r) => isWithinLastDays(r.date, last30));
    const successfulClaims = (claimsRaw || [])
      .filter((c) => c.status === "Claimed")
      .filter((c) => isWithinLastDays(c.date, last30));

    const uniqueLostUsers = new Map<number, Report>();
    for (const r of lostReports) uniqueLostUsers.set(r.reporter, r);

    const uniqueFoundUsers = new Map<number, Report>();
    for (const r of foundReports) uniqueFoundUsers.set(r.reporter, r);

    const uniqueClaimUsers = new Map<string, Claim>();
    for (const c of successfulClaims) uniqueClaimUsers.set(c.claimantName, c);

    // Optional: tie a claim to the found report reporter (best-effort by itemName).
    const foundByItemName = new Map<string, Report>();
    for (const r of foundReports) {
      if (!foundByItemName.has(r.itemName)) foundByItemName.set(r.itemName, r);
    }

    return {
      generatedAt: new Date(),
      timeFrame,
      lostReports,
      foundReports,
      successfulClaims,
      uniqueLostUsers,
      uniqueFoundUsers,
      uniqueClaimUsers,
      foundByItemName,
    };
  };

  const downloadCSV = async () => {
    setReporting("csv");
    try {
      const snap = await buildTransparencySnapshot();
      const rows: string[] = [];

      rows.push("uLost iFound - Transparency & Activity Report (Last 30 Days)");
      rows.push(`Generated,${snap.generatedAt.toLocaleString()}`);
      rows.push(`Time frame selection,${snap.timeFrame}`);
      rows.push("");

      rows.push("Summary");
      rows.push(`Users who reported Lost,${snap.uniqueLostUsers.size}`);
      rows.push(`Users who reported Found,${snap.uniqueFoundUsers.size}`);
      rows.push(`Users who successfully Claimed,${snap.uniqueClaimUsers.size}`);
      rows.push("");

      rows.push("Users who reported Lost (unique)");
      rows.push("Reporter Name,Username,School ID,Role,User ID");
      for (const r of Array.from(snap.uniqueLostUsers.values()).sort((a, b) => a.reporterName.localeCompare(b.reporterName))) {
        rows.push(
          [
            r.reporterName,
            r.reporterUsername,
            r.reporterSchoolId,
            r.reporterRole,
            String(r.reporter),
          ]
            .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
            .join(",")
        );
      }
      rows.push("");

      rows.push("Users who reported Found (unique)");
      rows.push("Reporter Name,Username,School ID,Role,User ID");
      for (const r of Array.from(snap.uniqueFoundUsers.values()).sort((a, b) => a.reporterName.localeCompare(b.reporterName))) {
        rows.push(
          [r.reporterName, r.reporterUsername, r.reporterSchoolId, r.reporterRole, String(r.reporter)]
            .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
            .join(",")
        );
      }
      rows.push("");

      rows.push("Successful claims (status = Claimed)");
      rows.push("Claimant Name,Role,Item Name,Claim Date,Reported By (best-effort)");
      for (const c of snap.successfulClaims) {
        const reporter = snap.foundByItemName.get(c.itemName)?.reporterName || "";
        rows.push(
          [c.claimantName, c.claimantRole, c.itemName, c.date, reporter]
            .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
            .join(",")
        );
      }
      rows.push("");

      rows.push("Lost reports (last 30 days)");
      rows.push("Date,Reporter Name,Item,Location,Status,Category");
      for (const r of snap.lostReports) {
        rows.push(
          [r.date, r.reporterName, r.itemName, r.location, r.status, r.category]
            .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
            .join(",")
        );
      }
      rows.push("");

      rows.push("Found reports (last 30 days)");
      rows.push("Date,Reporter Name,Item,Location,Status,Category");
      for (const r of snap.foundReports) {
        rows.push(
          [r.date, r.reporterName, r.itemName, r.location, r.status, r.category]
            .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
            .join(",")
        );
      }

      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uLost-iFound-transparency-report-${snap.generatedAt.toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to generate CSV report. Please try again.");
    } finally {
      setReporting(null);
    }
  };

  const printReport = async () => {
    setReporting("print");
    try {
      const snap = await buildTransparencySnapshot();
      const win = window.open("", "_blank");
      if (!win) {
        alert("Please allow pop-ups to print / save as PDF.");
        return;
      }

      const esc = (v: unknown) =>
        String(v ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");

      const userRows = (reports: Report[]) =>
        reports
          .map(
            (r) => `<tr>
  <td>${esc(r.reporterName)}</td>
  <td>${esc(r.reporterUsername)}</td>
  <td>${esc(r.reporterSchoolId)}</td>
  <td>${esc(r.reporterRole)}</td>
  <td>${esc(r.reporter)}</td>
</tr>`
          )
          .join("");

      const reportRows = (reports: Report[]) =>
        reports
          .map(
            (r) => `<tr>
  <td>${esc(r.date)}</td>
  <td>${esc(r.reporterName)}</td>
  <td>${esc(r.itemName)}</td>
  <td>${esc(r.location)}</td>
  <td>${esc(r.status)}</td>
  <td>${esc(r.category)}</td>
</tr>`
          )
          .join("");

      const claimRows = (claims: Claim[]) =>
        claims
          .map((c) => {
            const reportedBy = snap.foundByItemName.get(c.itemName)?.reporterName || "N/A";
            return `<tr>
  <td>${esc(c.date)}</td>
  <td>${esc(c.claimantName)}</td>
  <td>${esc(c.claimantRole)}</td>
  <td>${esc(c.itemName)}</td>
  <td>${esc(c.status)}</td>
  <td>${esc(reportedBy)}</td>
</tr>`;
          })
          .join("");

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>uLost iFound - Transparency Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 36px; color: #111827; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .sub { color: #6b7280; margin: 0 0 18px; font-size: 12px; }
    .chips { display:flex; gap:10px; flex-wrap:wrap; margin: 12px 0 18px; }
    .chip { border:1px solid #e5e7eb; padding:8px 10px; border-radius:10px; background:#f9fafb; font-size:12px; }
    .kpis { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; margin: 14px 0 18px; }
    .kpi { border:1px solid #e5e7eb; border-radius:12px; padding: 12px; background:#fff; }
    .kpi .label { font-size: 12px; color:#6b7280; }
    .kpi .value { font-size: 20px; font-weight: 700; margin-top: 6px; }
    h2 { margin: 22px 0 10px; font-size: 16px; }
    table { width:100%; border-collapse:collapse; margin: 10px 0 18px; }
    th, td { border:1px solid #e5e7eb; padding: 8px; font-size: 12px; vertical-align: top; }
    th { background:#f3f4f6; text-align:left; }
    .footer { margin-top: 20px; font-size: 11px; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:12px;}
    @media print { body { padding: 0; } .no-print { display:none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:12px;">
    <button onclick="window.print()" style="padding:10px 14px; border:1px solid #e5e7eb; background:#111827; color:white; border-radius:10px; font-weight:700; cursor:pointer;">Print / Save as PDF</button>
  </div>

  <h1>uLost iFound — Transparency & Activity Report</h1>
  <p class="sub">
    Generated: <b>${esc(snap.generatedAt.toLocaleString())}</b> • Scope: <b>Last 30 days</b> • Time-frame selection: <b>${esc(snap.timeFrame)}</b>
  </p>

  <div class="kpis">
    <div class="kpi"><div class="label">Users who reported Lost</div><div class="value">${esc(snap.uniqueLostUsers.size)}</div></div>
    <div class="kpi"><div class="label">Users who reported Found</div><div class="value">${esc(snap.uniqueFoundUsers.size)}</div></div>
    <div class="kpi"><div class="label">Users who successfully Claimed</div><div class="value">${esc(snap.uniqueClaimUsers.size)}</div></div>
  </div>

  <h2>Users who reported Lost (unique)</h2>
  <table>
    <thead><tr><th>Name</th><th>Username</th><th>School ID</th><th>Role</th><th>User ID</th></tr></thead>
    <tbody>${userRows(Array.from(snap.uniqueLostUsers.values()))}</tbody>
  </table>

  <h2>Users who reported Found (unique)</h2>
  <table>
    <thead><tr><th>Name</th><th>Username</th><th>School ID</th><th>Role</th><th>User ID</th></tr></thead>
    <tbody>${userRows(Array.from(snap.uniqueFoundUsers.values()))}</tbody>
  </table>

  <h2>Successful claims (status = Claimed)</h2>
  <p class="sub">Includes claimant name. “Reported by” is a best-effort match by item name.</p>
  <table>
    <thead><tr><th>Date</th><th>Claimant</th><th>Role</th><th>Item</th><th>Status</th><th>Reported by</th></tr></thead>
    <tbody>${claimRows(snap.successfulClaims)}</tbody>
  </table>

  <h2>Lost reports (last 30 days)</h2>
  <table>
    <thead><tr><th>Date</th><th>Reporter</th><th>Item</th><th>Location</th><th>Status</th><th>Category</th></tr></thead>
    <tbody>${reportRows(snap.lostReports)}</tbody>
  </table>

  <h2>Found reports (last 30 days)</h2>
  <table>
    <thead><tr><th>Date</th><th>Reporter</th><th>Item</th><th>Location</th><th>Status</th><th>Category</th></tr></thead>
    <tbody>${reportRows(snap.foundReports)}</tbody>
  </table>

  <div class="footer">
    This document serves as an official system activity record for auditing and tracking purposes.
  </div>
</body>
</html>`;

      win.document.write(html);
      win.document.close();
      // bring focus to popup
      win.focus();
    } catch (e) {
      console.error(e);
      alert("Failed to generate printable report. Please try again.");
    } finally {
      setReporting(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Required keyframes for line-draw animation */}
      <style>
        {`@keyframes draw{to{stroke-dashoffset:0}}`}
      </style>

      <ChartTooltipOverlay state={tooltip.state} />

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : null}

      {/* Controls */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <div>
            <div className="text-sm font-semibold text-gray-900">Single-page Lost & Found Analytics</div>
            <div className="text-xs text-gray-500">Hover any chart element for detailed metrics + explanations.</div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="font-semibold">Time frame</span>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {timeFrameOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeFrame(opt.value)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                  timeFrame === opt.value ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => loadAll(timeFrame)}
            className="ml-auto lg:ml-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-800"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Refresh
          </button>

          <div className="h-px w-full lg:hidden bg-gray-100" />

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="font-semibold">Transparency report</span>
            </div>
            <button
              type="button"
              onClick={printReport}
              disabled={reporting !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 text-sm font-semibold disabled:opacity-60"
              title="Print or save as PDF"
            >
              {reporting === "print" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={downloadCSV}
              disabled={reporting !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-800 disabled:opacity-60"
              title="Download CSV"
            >
              {reporting === "csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Alerts & anomalies */}
      {hasAlerts ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-yellow-900">Alerts & anomalies</div>
              <div className="mt-2 space-y-1.5 text-sm text-yellow-900/90">
                {alerts?.highLossAlert ? (
                  <div>
                    <span className="font-semibold">High loss volume:</span> {formatNum(alerts.recentLostCount)} lost reports in the last 7 days.
                  </div>
                ) : null}
                {alerts?.unclaimedOld ? (
                  <div>
                    <span className="font-semibold">Aging unclaimed items:</span> {formatNum(alerts.unclaimedOld)} found items unclaimed for 14+ days.
                  </div>
                ) : null}
              </div>
            </div>
            <div className="hidden md:block text-xs text-yellow-800">
              Hover charts to understand what changed.
            </div>
          </div>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI
          title="Total lost items"
          value={formatNum(lf?.summary.totalLost || 0)}
          hint="Reports marked as Lost"
          icon={Package}
          color="bg-red-500"
          loading={loading}
        />
        <KPI
          title="Total found items"
          value={formatNum(lf?.summary.totalFound || 0)}
          hint="Reports marked as Found"
          icon={PackageSearch}
          color="bg-green-500"
          loading={loading}
        />
        <KPI
          title="Items returned"
          value={formatNum(lf?.summary.totalReturned || 0)}
          hint={`Recovery rate: ${formatPct(lf?.recoveryRate || 0)}`}
          icon={CheckCircle}
          color="bg-blue-500"
          loading={loading}
        />
        <KPI
          title="Unclaimed items"
          value={formatNum(lf?.summary.unclaimed || 0)}
          hint="Found but not yet claimed"
          icon={Clock}
          color="bg-yellow-500"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPI
          title="Average return time"
          value={`${formatNum(lf?.summary.avgReturnTime || 0)} days`}
          hint="Avg time from report to return"
          icon={Activity}
          color="bg-purple-600"
          loading={loading}
        />
        <KPI
          title="Average resolution time"
          value={`${formatNum(an?.averageResolutionTime || 0)} days`}
          hint="From report to closed/verified"
          icon={ShieldCheck}
          color="bg-indigo-600"
          loading={loading}
        />
        <KPI
          title="Success & accuracy"
          value={`${formatPct(an?.successRate || 0)} success`}
          hint={`AI match accuracy: ${formatPct(an?.aiMatchAccuracy || 0)}`}
          icon={TrendingUp}
          color="bg-slate-800"
          loading={loading}
        />
      </div>

      {/* Efficiency + Recovery context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Recovery rate & operational health
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Recovery rate estimates how many reports result in a return. “Stuck” items indicate bottlenecks.
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Recovery rate</div>
              <div className="text-2xl font-bold text-gray-900 tabular-nums">{formatPct(lf?.recoveryRate || 0)}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 bg-green-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, lf?.recoveryRate || 0))}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-xs text-gray-500">Items stuck in system (&gt; 7 days pending)</div>
                <div className="text-2xl font-bold text-red-600 tabular-nums">{formatNum(lf?.stuckItems || 0)}</div>
              </div>
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-xs text-gray-500">Average response time</div>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">{formatNum(lf?.avgResponseTime || 0)} hours</div>
              </div>
            </div>
          </div>
        </div>

        {/* Peak time heatmap */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Peak times heatmap (hourly)
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Darker cells mean higher volume. Hover any cell for counts and interpretation.
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Max per hour</div>
              <div className="text-lg font-bold tabular-nums">{formatNum(peakMax)}</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <HeatmapRow
              label="Lost"
              baseColor="red"
              cells={peakLostCells}
              max={peakMax}
              onCellHover={(e, key, value) =>
                tooltip.show(e, {
                  title: `Peak times • ${key} (Lost)`,
                  description: "Hourly concentration of lost reports. Useful for staffing and hotspot investigation.",
                  items: [{ label: "Lost reports", value: formatNum(value), color: "#ef4444" }],
                })
              }
              onMove={tooltip.move}
              onLeave={tooltip.hide}
            />
            <HeatmapRow
              label="Found"
              baseColor="green"
              cells={peakFoundCells}
              max={peakMax}
              onCellHover={(e, key, value) =>
                tooltip.show(e, {
                  title: `Peak times • ${key} (Found)`,
                  description: "Hourly concentration of found reports. Peaks can indicate discovery/turn-in patterns.",
                  items: [{ label: "Found reports", value: formatNum(value), color: "#22c55e" }],
                })
              }
              onMove={tooltip.move}
              onLeave={tooltip.hide}
            />
            <div className="text-[11px] text-gray-500">
              Hours run left→right. Use this to spot “high-risk” windows (lost) and “recovery” windows (found).
            </div>
          </div>
        </div>
      </div>

      {/* Core charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DualLine
          title="Lost vs found trend (last 30 days)"
          description="Tracks reporting volume over time with animated lines. Hover points for exact values + context."
          data={line30d}
          tooltip={tooltip}
        />
        <GroupedBars
          title="Claim processing efficiency"
          description="Animated grouped bars for claim pipeline throughput. Hover bars for meaning + numbers."
          data={an?.claimProcessingEfficiency || []}
          tooltip={tooltip}
        />
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DonutSegments
          title="Status distribution"
          description="Operational state of reports/claims (e.g., Pending vs Verified). Hover slices for details."
          entries={statusEntries}
          colors={["#818cf8", "#fca5a5", "#22d3ee", "#fbbf24", "#94a3b8"]}
          tooltip={tooltip}
        />
        <DonutSegments
          title="Category distribution"
          description="Most common item categories. Hover slices for counts and share."
          entries={categoryEntries}
          colors={["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7", "#64748b", "#f97316"]}
          tooltip={tooltip}
        />
      </div>

      <CategoryTrends
        title="Category trends (last 14 days)"
        description="Animated multi-line chart for the highest-volume categories. Hover points for totals and explanations."
        data={lf?.categoryTrends || []}
        tooltip={tooltip}
      />

      {/* Location trends + heatmap */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location trends (top areas)
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Locations ranked by total volume. Hover cells to see Lost vs Found breakdown.
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Tracked locations</div>
            <div className="text-lg font-bold tabular-nums">{formatNum((lf?.locationLost?.length || 0) + (lf?.locationFound?.length || 0))}</div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Lost</th>
                <th className="py-2 pr-3">Found</th>
                <th className="py-2 pr-3">Heat (total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {locationMatrix.map((r) => {
                const intensity = r.total / locationMax;
                const bg = `rgba(99, 102, 241, ${0.08 + 0.75 * Math.min(1, Math.max(0, intensity))})`;
                return (
                  <tr key={r.location} className="hover:bg-gray-50">
                    <td className="py-3 pr-3 font-semibold text-gray-900">{r.location}</td>
                    <td className="py-3 pr-3 tabular-nums text-red-600 font-semibold">{formatNum(r.lost)}</td>
                    <td className="py-3 pr-3 tabular-nums text-green-600 font-semibold">{formatNum(r.found)}</td>
                    <td className="py-3 pr-3">
                      <div
                        className="h-8 rounded-lg border border-gray-100"
                        style={{ background: bg }}
                        onMouseEnter={(ev) =>
                          tooltip.show(ev, {
                            title: `Location heat • ${r.location}`,
                            description: "Total volume intensity. Higher heat = higher combined Lost + Found activity.",
                            items: [
                              { label: "Lost", value: formatNum(r.lost), color: "#ef4444" },
                              { label: "Found", value: formatNum(r.found), color: "#22c55e" },
                              { label: "Total", value: formatNum(r.total), color: "#6366f1" },
                            ],
                            footer: "Use this to prioritize signage, patrols, or lost-and-found drop boxes.",
                          })
                        }
                        onMouseMove={tooltip.move}
                        onMouseLeave={tooltip.hide}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User activity + tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                User activity & reporters
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Who is reporting, and how frequently. Helpful for targeted announcements and education.
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Reporting users</div>
              <div className="text-lg font-bold tabular-nums">{formatNum((lf?.usersReportingLost || 0) + (lf?.usersReportingFound || 0))}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="text-xs text-gray-500">Users reporting lost</div>
              <div className="text-2xl font-bold tabular-nums">{formatNum(lf?.usersReportingLost || 0)}</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="text-xs text-gray-500">Users reporting found</div>
              <div className="text-2xl font-bold tabular-nums">{formatNum(lf?.usersReportingFound || 0)}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-800 mb-2">Top repeat reporters</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Reports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(lf?.repeatUsers || []).slice(0, 8).map((u) => (
                    <tr key={`${u.reporter}-${u.reporter__username}`} className="hover:bg-gray-50">
                      <td className="py-2 pr-3 font-semibold text-gray-900">{u.reporter__username}</td>
                      <td className="py-2 pr-3 tabular-nums font-bold text-gray-900">{formatNum(u.report_count)}</td>
                    </tr>
                  ))}
                  {(!lf?.repeatUsers || lf.repeatUsers.length === 0) && !loading ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-sm text-gray-500">
                        No repeat-user data available.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live activity feed
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Recent actions in the system. Hover rows to see additional detail.
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activity.slice(0, 10).map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-gray-50"
                    onMouseEnter={(ev) =>
                      tooltip.show(ev, {
                        title: `${a.user} • ${a.action}`,
                        description: "Recent system activity event.",
                        items: [
                          { label: "Role", value: a.role },
                          { label: "Item", value: a.item || "-" },
                          { label: "Timestamp", value: new Date(a.timestamp).toLocaleString() },
                        ],
                      })
                    }
                    onMouseMove={tooltip.move}
                    onMouseLeave={tooltip.hide}
                  >
                    <td className="py-2 pr-3 font-semibold text-gray-900">{a.user}</td>
                    <td className="py-2 pr-3 text-gray-700">{a.role}</td>
                    <td className="py-2 pr-3 text-gray-700">{a.action}</td>
                    <td className="py-2 pr-3 text-gray-700">{a.item}</td>
                    <td className="py-2 pr-3 text-gray-500">{new Date(a.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {activity.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-sm text-gray-500">
                      No activity feed data available (or endpoint not enabled).
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top items tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Top lost items
          </div>
          <div className="text-sm text-gray-500 mt-1">Most frequently reported lost item names.</div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(lf?.topLostItems || []).slice(0, 10).map((it) => (
                  <tr key={it.item_name} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 font-semibold text-gray-900">{it.item_name}</td>
                    <td className="py-2 pr-3 tabular-nums font-bold text-red-600">{formatNum(it.count)}</td>
                  </tr>
                ))}
                {(!lf?.topLostItems || lf.topLostItems.length === 0) && !loading ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-sm text-gray-500">
                      No data available.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <PackageSearch className="w-5 h-5" />
            Top found items
          </div>
          <div className="text-sm text-gray-500 mt-1">Most frequently reported found item names.</div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(lf?.topFoundItems || []).slice(0, 10).map((it) => (
                  <tr key={it.item_name} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 font-semibold text-gray-900">{it.item_name}</td>
                    <td className="py-2 pr-3 tabular-nums font-bold text-green-600">{formatNum(it.count)}</td>
                  </tr>
                ))}
                {(!lf?.topFoundItems || lf.topFoundItems.length === 0) && !loading ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-sm text-gray-500">
                      No data available.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

