import { useState } from 'react';
import { Check, CloudOff, Copy, Globe, Link2, Loader2, Lock, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/common/UserAvatar';
import useAuthStore from '@/stores/useAuthStore';
import { AccessPicker } from '@/features/create/AccessPicker';
import type { PresenceUser } from '@/lib/realtime/presence';
import { usePatchPage } from './pageMeta';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-2xs', state === 'error' ? 'text-danger-foreground' : 'text-muted-foreground')} aria-live="polite">
      {state === 'saving' ? (
        <>
          <Loader2 className="size-3 animate-spin" /> Saving…
        </>
      ) : state === 'error' ? (
        <>
          <CloudOff className="size-3" /> Not saved
        </>
      ) : (
        <>
          <span className="size-1.5 rounded-full bg-success" /> Saved
        </>
      )}
    </span>
  );
}

/** Avatars of other people on this page, with an "N editing" hint. */
export function PresenceStack({ users, max = 3 }: { users: PresenceUser[]; max?: number }) {
  const me = useAuthStore((s) => s.user?._id);
  const others = users.filter((u) => u.user_id !== me);
  if (!others.length) return null;
  const editing = others.filter((u) => u.editing).length;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2" aria-label={`${others.length} other ${others.length === 1 ? 'person' : 'people'} here`}>
          <div className="flex -space-x-1.5">
            {others.slice(0, max).map((u) => (
              <span key={u.user_id} className={cn('rounded-full ring-2 ring-background', u.editing && 'ring-brand')}>
                <UserAvatar user={{ _id: u.user_id, name: u.name, avatar: u.avatar }} size="sm" />
              </span>
            ))}
            {others.length > max && (
              <span className="flex size-6 items-center justify-center rounded-full bg-muted font-mono text-2xs text-muted-foreground ring-2 ring-background">
                +{others.length - max}
              </span>
            )}
          </div>
          {editing > 0 && (
            <span className="hidden items-center gap-1 text-2xs text-muted-foreground sm:inline-flex">
              <span className="size-1.5 animate-pulse rounded-full bg-warning" /> {editing} editing
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {others.map((u) => `${u.name ?? 'Someone'}${u.editing ? ' (editing)' : ''}`).join(', ')}
      </TooltipContent>
    </Tooltip>
  );
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  path: string;
  title: string;
  isPrivate?: boolean;
  sharedMembers?: string[];
  sharedTeams?: string[];
}

/** Share a page with people and teams; copy its link. */
export function ShareDialog({ open, onOpenChange, pageId, path, title, isPrivate, sharedMembers = [], sharedTeams = [] }: ShareDialogProps) {
  const patch = usePatchPage(pageId);
  const [members, setMembers] = useState<string[]>(sharedMembers);
  const [teams, setTeams] = useState<string[]>(sharedTeams);
  const [copied, setCopied] = useState(false);
  const dirty = members.join() !== sharedMembers.join() || teams.join() !== sharedTeams.join();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setMembers(sharedMembers);
          setTeams(sharedTeams);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{title}”</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            {isPrivate ? <Lock className="size-3" /> : <Globe className="size-3" />}
            {isPrivate ? 'In a private space: only people added here can open it.' : 'Everyone in this space can open it. Add people outside it below.'}
          </DialogDescription>
        </DialogHeader>
        <AccessPicker members={members} teams={teams} onMembersChange={setMembers} onTeamsChange={setTeams} />
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 pl-3">
          <Link2 className="size-4 shrink-0 text-subtle" />
          <span className="min-w-0 flex-1 truncate font-mono text-2xs text-muted-foreground">
            {window.location.host}
            {path}
          </span>
          <Button variant="outline" size="xs" onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={!dirty || patch.isPending}
            onClick={() => patch.mutate({ shared_members: members, shared_teams: teams }, { onSuccess: () => onOpenChange(false) })}
          >
            {patch.isPending ? 'Saving…' : 'Save access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShareButton(props: Omit<ShareDialogProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="brand" onClick={() => setOpen(true)}>
        <Share2 /> Share
      </Button>
      <ShareDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

interface StudioBarProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  onTitleChange?: (title: string) => void;
  editable?: boolean;
  badges?: React.ReactNode;
  children?: React.ReactNode;
}

/** Header row for full-canvas studios (sheet, whiteboard): icon, inline title, actions. */
export function StudioBar({ icon: Icon, iconClassName, title, onTitleChange, editable = true, badges, children }: StudioBarProps) {
  const [draft, setDraft] = useState(title);
  const [focused, setFocused] = useState(false);
  const shown = focused ? draft : title;
  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background/80 px-3 py-1.5 backdrop-blur-md sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Icon className={cn('size-4 shrink-0 text-muted-foreground', iconClassName)} />
        <input
          value={shown}
          disabled={!editable || !onTitleChange}
          aria-label="Title"
          maxLength={200}
          onFocus={() => {
            setDraft(title);
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
            const next = draft.trim();
            if (next && next !== title) onTitleChange?.(next);
          }}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraft(title);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="min-w-0 max-w-md flex-1 truncate rounded-md bg-transparent px-1.5 py-1 text-sm font-medium text-foreground outline-none hover:bg-accent/60 focus:bg-accent disabled:hover:bg-transparent"
        />
        {badges}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}
