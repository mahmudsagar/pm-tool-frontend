import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FilePlus,
  FileEdit,
  Type,
  Settings2,
  Users,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePageHistory } from '@/hooks/queries/useHistoryQueries';
import { useRollbackVersion } from '@/hooks/mutations/useHistoryMutations';
import Spinner from '@/components/elements/spinner';

const ACTION_CONFIG = {
  created: { label: 'Created', icon: FilePlus, variant: 'default' },
  content_updated: { label: 'Content updated', icon: FileEdit, variant: 'secondary' },
  meta_updated: { label: 'Meta updated', icon: Settings2, variant: 'secondary' },
  title_updated: { label: 'Title changed', icon: Type, variant: 'outline' },
  custom_meta_updated: { label: 'Properties changed', icon: Settings2, variant: 'outline' },
  sharing_updated: { label: 'Sharing changed', icon: Users, variant: 'outline' },
  restored: { label: 'Restored', icon: RotateCcw, variant: 'default' },
};

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ContentChange({ words, simpleLabel, preview, fullText }) {
  const [expanded, setExpanded] = useState(false);
  const hasFullText = fullText && fullText.length > 0;
  const displayText = expanded ? fullText : preview;

  return (
    <div className="break-words space-y-0.5">
      <div>
        <span className="font-medium">Content</span>
        {words != null && <span className="opacity-70"> &middot; ~{words} word{words !== 1 ? 's' : ''}</span>}
        {simpleLabel && <span> &mdash; {simpleLabel}</span>}
        {!preview && !simpleLabel && !hasFullText && words == null && <span> was modified</span>}
      </div>
      {(displayText || hasFullText) && (
        <div className="text-[11px] leading-relaxed bg-muted/50 rounded px-1.5 py-1 space-y-1">
          <p className={`italic opacity-80 whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}>
            &ldquo;{displayText || fullText}&rdquo;
          </p>
          {hasFullText && fullText.length > 120 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
            >
              {expanded ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> Show full content</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ChangeSummary({ changes }) {
  if (!changes || Object.keys(changes).length === 0) return null;
  const entries = Object.entries(changes).filter(([key]) => key !== 'note' && key !== 'restored_from_version');

  if (entries.length === 0) return null;

  return (
    <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
      {entries.map(([field, value]) => {
        if (field === 'content') {
          const desc = value?.description;
          const isDocObj = desc && typeof desc === 'object';
          const fullText = isDocObj ? desc.text : null;
          const preview = isDocObj ? desc.preview : null;
          const words = isDocObj ? desc.words : null;
          const simpleLabel = typeof desc === 'string' ? desc : null;
          return (
            <ContentChange
              key={field}
              words={words}
              simpleLabel={simpleLabel}
              preview={preview}
              fullText={fullText}
            />
          );
        }
        if (value?.from !== undefined && value?.to !== undefined) {
          const from = typeof value.from === 'object' ? JSON.stringify(value.from) : String(value.from);
          const to = typeof value.to === 'object' ? JSON.stringify(value.to) : String(value.to);
          return (
            <div key={field} className="break-words">
              <span className="font-medium">{field}</span>:{' '}
              <span className="line-through opacity-60">{from.slice(0, 30)}</span>
              {' → '}
              <span>{to.slice(0, 30)}</span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function HistoryEntry({ entry, pageId, isFirst }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const rollbackMutation = useRollbackVersion();
  const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.meta_updated;
  const Icon = config.icon;
  const canRollback = entry.content_snapshot != null && entry.action !== 'created';

  const handleRollback = () => {
    rollbackMutation.mutate(
      { pageId, historyId: entry._id },
      { onSuccess: () => setConfirmOpen(false) }
    );
  };

  return (
    <>
      <div className="flex gap-3 py-3 group">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
            <Icon size={14} className="text-muted-foreground" />
          </div>
          {!isFirst && <div className="w-px flex-1 bg-border mt-1" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">v{entry.version}</span>
              </div>

              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Avatar className="h-5 w-5">
                  {entry.user?.avatar && <AvatarImage src={entry.user.avatar} />}
                  <AvatarFallback className="text-[9px]">
                    {getInitials(entry.user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium break-words">
                  {entry.user?.name || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
              </div>

              {entry.action === 'restored' && entry.changes?.restored_from_version && (
                <p className="text-xs text-muted-foreground mt-1">
                  Restored to version {entry.changes.restored_from_version}
                </p>
              )}

              <ChangeSummary changes={entry.changes} />
            </div>

            {canRollback && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => setConfirmOpen(true)}
                disabled={rollbackMutation.isPending}
              >
                {rollbackMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RotateCcw size={12} />
                )}
                <span className="ml-1 text-xs">Restore</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore to version {entry.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current content with the version from{' '}
              {new Date(entry.createdAt).toLocaleString()}. Your current content will be saved
              as a new version before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={rollbackMutation.isPending}>
              {rollbackMutation.isPending ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function HistoryPanel({ pageId, open, onOpenChange }) {
  const { data, isLoading, isError } = usePageHistory(pageId, { enabled: open });
  const history = data?.history || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-base">Version History</SheetTitle>
          <SheetDescription className="text-xs">
            {data?.total ? `${data.total} version${data.total !== 1 ? 's' : ''}` : 'Loading...'}
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="px-4 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : isError ? (
              <p className="text-sm text-destructive text-center py-12">
                Failed to load history
              </p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                No history yet
              </p>
            ) : (
              history.map((entry, i) => (
                <HistoryEntry
                  key={entry._id}
                  entry={entry}
                  pageId={pageId}
                  isFirst={i === history.length - 1}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
