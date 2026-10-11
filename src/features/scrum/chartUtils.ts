import { useEffect, useRef, useState } from 'react';

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function linePath(points: [number, number][]) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export function areaPath(top: [number, number][], baseline: [number, number][]) {
  if (!top.length) return '';
  return `${linePath(top)} ${[...baseline].reverse().map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} Z`;
}

export function stepPath(points: [number, number][]) {
  return points
    .map(([x, y], i) => {
      if (!i) return `M${x.toFixed(1)},${y.toFixed(1)}`;
      return `H${x.toFixed(1)} V${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Categorical palette for epics, people and CFD bands (works in both themes). */
export const SERIES = ['bg-brand', 'bg-warning', 'bg-success', 'bg-sky-500', 'bg-violet-500', 'bg-rose-400', 'bg-teal-500', 'bg-amber-700'];
export const SERIES_TEXT = ['text-brand', 'text-warning-foreground', 'text-success-foreground', 'text-sky-500', 'text-violet-500', 'text-rose-400', 'text-teal-500', 'text-amber-700'];
