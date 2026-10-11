import { useState, type ReactNode } from 'react';
import { useWidth } from './chartUtils';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------- XY frame */

export interface Scales {
  /** x position of point index i (points are centred in their slot when `band`). */
  x: (i: number) => number;
  y: (v: number) => number;
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  slot: number;
}

interface XYChartProps {
  n: number;
  yMax: number;
  height?: number;
  /** Bars use slots; lines connect slot centres. */
  band?: boolean;
  xLabel?: (i: number) => ReactNode;
  xLabelEvery?: number;
  highlightX?: number;
  yFormat?: (v: number) => string;
  yTicks?: number;
  tooltip?: (i: number) => ReactNode;
  ariaLabel: string;
  children: (s: Scales) => ReactNode;
  className?: string;
}

function niceMax(v: number) {
  if (v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

/** Responsive SVG chart with gridlines, axes, a hover crosshair and an HTML tooltip. */
export function XYChart({ n, yMax, height = 280, band = false, xLabel, xLabelEvery = 1, highlightX, yFormat = (v) => String(Math.round(v)), yTicks = 4, tooltip, ariaLabel, children, className }: XYChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const top = 12;
  const bottom = 28;
  const left = 40;
  const right = 12;
  const max = niceMax(yMax * 1.05);
  const plotW = Math.max(10, width - left - right);
  const plotH = height - top - bottom;
  const slot = n > 0 ? plotW / (band ? n : Math.max(1, n - 1)) : plotW;
  const s: Scales = {
    x: (i) => left + (band ? slot * i + slot / 2 : slot * i),
    y: (v) => top + plotH - (Math.max(0, v) / max) * plotH,
    width,
    height,
    plotLeft: left,
    plotRight: left + plotW,
    plotTop: top,
    plotBottom: top + plotH,
    slot,
  };
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (max / yTicks) * i);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!n) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left - left;
    const i = band ? Math.floor(px / slot) : Math.round(px / slot);
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseMove={tooltip ? onMove : undefined} onMouseLeave={() => setHover(null)} className="block select-none">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={left + plotW} y1={s.y(t)} y2={s.y(t)} className="stroke-border" strokeWidth={1} strokeDasharray={t === 0 ? undefined : '2 4'} />
              <text x={left - 6} y={s.y(t)} dy="0.32em" textAnchor="end" className="fill-subtle font-mono text-[10px]">
                {yFormat(t)}
              </text>
            </g>
          ))}
          {highlightX !== undefined && highlightX >= 0 && highlightX < n && (
            <line x1={s.x(highlightX)} x2={s.x(highlightX)} y1={top} y2={top + plotH} className="stroke-warning" strokeDasharray="3 3" strokeWidth={1} />
          )}
          {children(s)}
          {xLabel &&
            Array.from({ length: n }, (_, i) =>
              i % xLabelEvery === 0 || i === n - 1 || i === highlightX ? (
                <text key={i} x={s.x(i)} y={height - 8} textAnchor="middle" className={cn('font-mono text-[10px]', i === highlightX ? 'fill-warning-foreground font-semibold' : 'fill-subtle')}>
                  {xLabel(i)}
                </text>
              ) : null,
            )}
          {hover !== null && tooltip && <line x1={s.x(hover)} x2={s.x(hover)} y1={top} y2={top + plotH} className="stroke-foreground/30" strokeWidth={1} />}
        </svg>
      )}
      {hover !== null && tooltip && width > 0 && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 rounded-lg border border-border bg-popover p-2.5 text-xs shadow-overlay"
          style={s.x(hover) > width / 2 ? { right: width - s.x(hover) + 12 } : { left: s.x(hover) + 12 }}
        >
          {tooltip(hover)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- legend */

export function LegendChip({ label, swatch, active = true, onClick, value }: { label: string; swatch: string; active?: boolean; onClick?: () => void; value?: ReactNode }) {
  const body = (
    <>
      <span className={cn('inline-block h-2 w-3 rounded-sm', swatch)} aria-hidden />
      {label}
      {value !== undefined && <span className="font-mono text-subtle">{value}</span>}
    </>
  );
  if (!onClick) return <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">{body}</span>;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('inline-flex h-6 items-center gap-1.5 rounded-md border border-border px-2 text-2xs transition-opacity hover:bg-accent', active ? 'text-foreground' : 'opacity-40')}
    >
      {body}
    </button>
  );
}

/* ---------------------------------------------------------- small viz */

export function Ring({ value, size = 36, stroke = 4, className }: { value: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className={cn('-rotate-90', className)} role="img" aria-label={`${Math.round(value)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, value)) / 100)} className="stroke-brand transition-[stroke-dashoffset]" />
    </svg>
  );
}

export interface Segment {
  key: string;
  value: number;
  className: string;
  label: string;
}

export function SegmentedBar({ segments, className }: { segments: Segment[]; className?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className={cn('flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted', className)} role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <div key={s.key} title={`${s.label}: ${Math.round(s.value * 10) / 10}`} className={cn('h-full first:rounded-l-full last:rounded-r-full', s.className)} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
    </div>
  );
}

