import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

function computeCoords(el, width) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
    return null;
  }

  const menuMaxHeight = 280;
  const gap = 8;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < Math.min(menuMaxHeight, 180);

  const left = Math.min(
    Math.max(8, rect.left),
    Math.max(8, window.innerWidth - width - 8)
  );

  if (openUp) {
    return {
      left,
      bottom: Math.max(8, window.innerHeight - rect.top + gap),
      top: undefined,
      maxHeight: Math.max(120, Math.min(menuMaxHeight, rect.top - 16)),
    };
  }

  return {
    left,
    top: rect.bottom + gap,
    bottom: undefined,
    maxHeight: Math.max(120, Math.min(menuMaxHeight, spaceBelow - 16)),
  };
}

/**
 * Portals a typeahead menu to document.body and opens it upward when needed.
 * Single scroll container; scrollbar visually hidden.
 */
export default function ChatTypeaheadPortal({
  anchorRef,
  children,
  className,
  width = 240,
}) {
  const el = anchorRef?.current;
  const [coords, setCoords] = useState(() => computeCoords(el, width));

  useLayoutEffect(() => {
    const node = anchorRef?.current;
    if (!node) {
      setCoords(null);
      return;
    }

    const update = () => setCoords(computeCoords(node, width));
    update();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(node);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const t = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(t);
      ro?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, width, el]);

  if (!el || !coords) return null;

  return createPortal(
    <div
      className={cn(
        'ChatTypeahead z-[200] rounded-lg border bg-popover text-popover-foreground shadow-lg',
        className
      )}
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.top,
        bottom: coords.bottom,
        width,
        maxHeight: coords.maxHeight,
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {children}
    </div>,
    document.body
  );
}
