/** Compact relative date for lists: "Just now", "5m ago", "3h ago", then "Jul 23, 2026". */
export function formatDate(iso: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMin = (Date.now() - date.getTime()) / 60000;
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
