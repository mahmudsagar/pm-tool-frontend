import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, LayoutGrid, ListTodo, PanelRight, SmilePlus, Sheet, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useDocument } from '@/hooks/queries/useFilesQueries';
import { cn } from '@/lib/utils';
import { withTabActive } from '@/features/peek/peekUrl';
import { statusCategory, toPriority } from '@/features/board/model';
import { PriorityPill, StatusPill } from '@/features/board/components/chips';
import type { EntityRef, MemberDetail } from '@/features/chat/api';

/* --------------------------------------------------------------- emoji */

const EMOJI = ['👍', '👀', '🎉', '🙌', '❤️', '😄', '🤔', '🔥', '✅', '🚀', '👏', '😅', '🙏', '💯', '⚠️', '❌'];

export function EmojiPicker({ onPick, children, align = 'start' }: { onPick: (emoji: string) => void; children: ReactNode; align?: 'start' | 'end' }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <div className="grid grid-cols-8 gap-0.5" role="listbox" aria-label="Pick a reaction">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              role="option"
              aria-selected={false}
              aria-label={`React with ${e}`}
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-accent"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AddReactionButton({ onPick, className }: { onPick: (e: string) => void; className?: string }) {
  return (
    <EmojiPicker onPick={onPick}>
      <button type="button" aria-label="Add reaction" className={cn('inline-flex h-6 items-center rounded-full border border-dashed border-border px-1.5 text-muted-foreground hover:border-border-strong hover:text-foreground', className)}>
        <SmilePlus className="size-3.5" />
      </button>
    </EmojiPicker>
  );
}

/* ------------------------------------------------------------ people */

export function PresenceAvatar({ user, online, size = 'sm' }: { user?: MemberDetail | null; online?: boolean; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  return (
    <span className="relative inline-flex shrink-0">
      <UserAvatar user={user ? { _id: user._id, name: user.name, email: user.email, avatar: user.avatar ?? user.avatarUrl } : null} size={size} />
      {online !== undefined && (
        <span aria-label={online ? 'Online' : 'Offline'} className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card', online ? 'bg-success' : 'bg-muted-foreground/50')} />
      )}
    </span>
  );
}

/* ------------------------------------------------------------ entity */

const KIND: Record<string, { label: string; icon: typeof FileText }> = {
  task: { label: 'Task', icon: ListTodo },
  story: { label: 'Story', icon: ListTodo },
  subtask: { label: 'Subtask', icon: ListTodo },
  document: { label: 'Doc', icon: FileText },
  page: { label: 'Doc', icon: FileText },
  sheet: { label: 'Sheet', icon: Sheet },
  whiteboard: { label: 'Whiteboard', icon: PenTool },
  board: { label: 'Board', icon: LayoutGrid },
  scrum: { label: 'Sprint board', icon: LayoutGrid },
};

/** Linked task/doc card with live status, priority, points and assignee when available. */
export function EntityCard({ entity, members, compact }: { entity: EntityRef; members: Map<string, MemberDetail>; compact?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isPage = !['board', 'scrum'].includes(entity.type);
  const { data } = useDocument(isPage ? entity.id : undefined) as { data?: Record<string, unknown> | Record<string, unknown>[] };
  const doc = (Array.isArray(data) ? data[0] : data) as { title?: string; custom_meta?: { values?: Record<string, unknown> }; task_key?: string; page_type?: string } | undefined;
  const values = doc?.custom_meta?.values ?? {};
  const kind = KIND[entity.type] ?? KIND[doc?.page_type ?? ''] ?? KIND.task;
  const Icon = kind.icon;
  const path = entity.url || (entity.type === 'board' ? `/board/${entity.id}` : entity.type === 'scrum' ? `/scrum/${entity.id}` : `/document/${entity.id}`);
  const status = String(values.status ?? entity.status ?? '');
  const priority = toPriority(values.priority);
  const points = values.story_points ?? values.points;
  const assignee = values.assignee ? members.get(String(values.assignee)) : undefined;
  const title = doc?.title || entity.title;
  const isTask = !!(status || priority || points);

  return (
    <div className={cn('max-w-xl rounded-xl border border-border bg-card', compact ? 'p-3' : 'p-4')}>
      <div className="flex flex-wrap items-center gap-2 text-2xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Icon className="size-3.5" /> {kind.label}
        </span>
        {doc?.task_key && <span className="font-mono text-muted-foreground">{doc.task_key}</span>}
        {priority && <PriorityPill priority={priority} />}
        {points ? <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-mono text-warning-foreground">{String(points)} pts</span> : null}
        {status && <StatusPill label={status.replace(/[_-]/g, ' ')} category={statusCategory(status)} className="capitalize" />}
        {entity.board_name && <span className="truncate text-subtle">· {entity.board_name}</span>}
      </div>
      <p className={cn('mt-1.5 font-semibold leading-snug', compact ? 'text-sm' : 'text-base')}>{title}</p>
      {!compact && (isTask || assignee) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground">
            {assignee ? (
              <>
                <UserAvatar user={assignee} size="xs" /> Assignee: {assignee.name}
              </>
            ) : (
              'Unassigned'
            )}
          </span>
          <Button size="xs" variant="outline" onClick={() => navigate(path)}>
            <ExternalLink /> Open
          </Button>
          {isPage && (
            <Button size="xs" variant="brand" onClick={() => navigate({ pathname: location.pathname, search: withTabActive(location.search, path) })}>
              <PanelRight /> Side panel
            </Button>
          )}
        </div>
      )}
      {(compact || (!isTask && !assignee)) && (
        <div className="mt-2 flex gap-2">
          <Button size="xs" variant="ghost" className="-ml-2" onClick={() => navigate({ pathname: location.pathname, search: withTabActive(location.search, path) })}>
            <PanelRight /> Open in side panel
          </Button>
        </div>
      )}
    </div>
  );
}
