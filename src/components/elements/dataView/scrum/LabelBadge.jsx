import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getLabelBadgeClassName,
  normalizeLabelKey,
  pickColorForLabel,
} from '@/components/elements/dataView/scrum/labelUtils';

export default function LabelBadge({
  name,
  colorKey,
  labelRegistry = {},
  onRemove,
  size = 'sm',
  className,
}) {
  const resolvedColor =
    colorKey ||
    labelRegistry[normalizeLabelKey(name)]?.color ||
    pickColorForLabel(name, labelRegistry);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border font-medium',
        getLabelBadgeClassName(resolvedColor),
        size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      <span className="truncate max-w-[140px]">{name}</span>
      {onRemove ? (
        <button
          type="button"
          className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={`Remove ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        </button>
      ) : null}
    </span>
  );
}
