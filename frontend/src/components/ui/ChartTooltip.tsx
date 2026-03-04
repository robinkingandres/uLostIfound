import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type TooltipKV = { label: string; value: string; color?: string };

export type ChartTooltipContent = {
  title: string;
  description?: string;
  items?: TooltipKV[];
  footer?: string;
};

type TooltipState = {
  open: boolean;
  x: number;
  y: number;
  content: ChartTooltipContent | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function useChartTooltip() {
  const [state, setState] = useState<TooltipState>({
    open: false,
    x: 0,
    y: 0,
    content: null,
  });

  const show = useCallback((e: React.MouseEvent, content: ChartTooltipContent) => {
    setState({
      open: true,
      x: e.clientX,
      y: e.clientY,
      content,
    });
  }, []);

  const move = useCallback((e: React.MouseEvent) => {
    setState((s) => (s.open ? { ...s, x: e.clientX, y: e.clientY } : s));
  }, []);

  const hide = useCallback(() => {
    setState((s) => (s.open ? { ...s, open: false } : s));
  }, []);

  // Hide tooltip on scroll to avoid “stuck” overlays.
  useEffect(() => {
    const onScroll = () => setState((s) => (s.open ? { ...s, open: false } : s));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return useMemo(() => ({ state, show, move, hide }), [state, show, move, hide]);
}

export function ChartTooltipOverlay({ state }: { state: TooltipState }) {
  const el = typeof document !== "undefined" ? document.body : null;

  if (!el || !state.open || !state.content) return null;

  // “Best effort” positioning: keep within viewport.
  const pad = 12;
  const maxW = 360;
  const w = maxW;
  const h = 160; // estimated, just for clamping
  const x = clamp(state.x + 14, pad, window.innerWidth - w - pad);
  const y = clamp(state.y + 14, pad, window.innerHeight - h - pad);

  return createPortal(
    <div
      style={{ left: x, top: y, maxWidth: maxW }}
      className="fixed z-[9999] pointer-events-none"
      aria-hidden="true"
    >
      <div className="rounded-xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur px-4 py-3">
        <div className="text-sm font-semibold text-gray-900">{state.content.title}</div>
        {state.content.description ? (
          <div className="mt-1 text-xs text-gray-600 leading-relaxed">{state.content.description}</div>
        ) : null}

        {state.content.items && state.content.items.length > 0 ? (
          <div className="mt-2 space-y-1">
            {state.content.items.map((kv) => (
              <div key={kv.label} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {kv.color ? <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: kv.color }} /> : null}
                  <span className="text-gray-600 truncate">{kv.label}</span>
                </div>
                <span className="font-semibold text-gray-900 tabular-nums">{kv.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {state.content.footer ? (
          <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">{state.content.footer}</div>
        ) : null}
      </div>
    </div>,
    el
  );
}

