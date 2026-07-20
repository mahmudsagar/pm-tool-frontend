import { cn } from '@/lib/utils';
import {
  getEpicBadgeClassName,
  normalizeEpicKey,
  pickColorForEpic,
} from '@/components/elements/dataView/scrum/epicUtils';

export default function EpicBadge({
  name,
  colorKey,
  epicRegistry = {},
  size = 'sm',
  className,
}) {
  if (!name) return null;
  const resolvedColor =
    colorKey ||
    epicRegistry[normalizeEpicKey(name)]?.color ||
    pickColorForEpic(name, epicRegistry);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        getEpicBadgeClassName(resolvedColor),
        size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      <span className="truncate max-w-[180px]">{name}</span>
    </span>
  );
}
