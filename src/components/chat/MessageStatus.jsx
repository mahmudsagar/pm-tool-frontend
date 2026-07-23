import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  sending: {
    icon: Clock,
    label: 'Sending',
    className: 'text-muted-foreground animate-pulse',
  },
  sent: {
    icon: Check,
    label: 'Sent',
    className: 'text-muted-foreground',
  },
  delivered: {
    icon: CheckCheck,
    label: 'Delivered',
    className: 'text-muted-foreground',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed to send',
    className: 'text-destructive',
  },
};

export default function MessageStatus({ status = 'delivered', isOwn, className }) {
  if (!isOwn || !status) return null;

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.delivered;
  const Icon = config.icon;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', config.className, className)}
      title={config.label}
    >
      <Icon size={12} strokeWidth={status === 'delivered' ? 2.5 : 2} />
    </span>
  );
}
