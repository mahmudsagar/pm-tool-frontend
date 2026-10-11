import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Bookmark as BookmarkIcon, FileText, Hash, Link2, MoreHorizontal, Pin, PinOff, Plus, Search, Settings2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AvatarStack, UserAvatar } from '@/components/common/UserAvatar';
import { useMemberDirectory } from '@/features/members/useMemberDirectory';
import { useMessageSearch, usePinned, useUpdateConversation, type Bookmark, type Conversation, type MemberDetail } from '@/features/chat/api';
import { conversationName, roleTag, timeLabel } from '@/features/chat/format';
import { PresenceAvatar } from './parts';

interface Props {
  conversation: Conversation;
  me: string;
  isAdmin: boolean;
  online: Set<string>;
  onJump: (messageId: string, conversationId: string) => void;
  onBack: () => void;
}

/* ------------------------------------------------------------ settings */

function SettingsDialog({ conversation, open, onOpenChange, canManage }: { conversation: Conversation; open: boolean; onOpenChange: (o: boolean) => void; canManage: boolean }) {
  const update = useUpdateConversation();
  const { members } = useMemberDirectory();
  const [name, setName] = useState(conversation.name ?? '');
  const [topic, setTopic] = useState(conversation.topic ?? '');
  const [add, setAdd] = useState('');
  const isGroup = conversation.type === 'group';
  const outside = members.filter((m) => !conversation.members.includes(m._id));
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName(conversation.name ?? '');
          setTopic(conversation.topic ?? '');
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{conversationName(conversation)} settings</DialogTitle>
          <DialogDescription>Topic and bookmarks are visible to everyone here.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate({ id: conversation._id, topic: topic.trim(), ...(isGroup && canManage && name.trim() ? { name: name.trim() } : {}) }, { onSuccess: () => onOpenChange(false) });
          }}
        >
          {isGroup && (
            <div className="space-y-1.5">
              <Label htmlFor="conv-name">Name</Label>
              <Input id="conv-name" value={name} disabled={!canManage} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="conv-topic">Topic</Label>
            <Textarea id="conv-topic" rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What is this conversation about?" />
          </div>
          {isGroup && canManage && (
            <div className="space-y-1.5">
              <Label>Members</Label>
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {(conversation.memberDetails ?? []).map((m) => (
                  <li key={m._id} className="flex items-center gap-2 text-sm">
                    <UserAvatar user={m} size="xs" /> <span className="flex-1 truncate">{m.name || m.email}</span>
                    {m._id !== conversation.created_by && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => update.mutate({ id: conversation._id, remove_members: [m._id] })}>
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {outside.length > 0 && (
                <div className="flex gap-2">
                  <select value={add} onChange={(e) => setAdd(e.target.value)} aria-label="Add member" className="h-8 flex-1 rounded-md border border-border bg-card px-2 text-sm">
                    <option value="">Add a member…</option>
                    {outside.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                  <Button type="button" size="sm" variant="outline" disabled={!add} onClick={() => update.mutate({ id: conversation._id, add_members: [add] }, { onSuccess: () => setAdd('') })}>
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" variant="brand" disabled={update.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------- bookmarks */

function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return '';
  if (v.startsWith('/')) return v;
  try {
    const u = new URL(v.includes('://') ? v : `https://${v}`);
    // Links to this app become in-app paths.
    if (u.origin === window.location.origin) return `${u.pathname}${u.search}`;
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : '';
  } catch {
    return '';
  }
}

export function BookmarksBar({ conversation, me }: { conversation: Conversation; me: string }) {
  const navigate = useNavigate();
  const update = useUpdateConversation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const list = conversation.bookmarks ?? [];
  const save = (next: Bookmark[]) => update.mutate({ id: conversation._id, bookmarks: next });
  const target = normalizeUrl(url);
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-3 py-1.5 [scrollbar-width:none]" aria-label="Bookmarks">
      <BookmarkIcon className="size-3.5 shrink-0 text-subtle" />
      {list.length === 0 && <span className="shrink-0 text-2xs text-subtle">Pin docs, boards and links for everyone here</span>}
      {list.map((b) => {
        const internal = b.url.startsWith('/');
        const Icon = internal ? FileText : Link2;
        const body = (
          <>
            <Icon className="size-3 shrink-0" /> <span className="max-w-[12rem] truncate">{b.title}</span>
          </>
        );
        return (
          <span key={b.id} className="group/bm inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-border bg-muted/40 pl-2 pr-1 text-2xs text-foreground hover:border-border-strong">
            {internal ? (
              <button type="button" onClick={() => navigate(b.url)} className="inline-flex items-center gap-1">
                {body}
              </button>
            ) : (
              <a href={b.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                {body}
              </a>
            )}
            <button type="button" aria-label={`Remove bookmark ${b.title}`} onClick={() => save(list.filter((x) => x.id !== b.id))} className="rounded p-0.5 text-subtle opacity-0 hover:text-foreground group-hover/bm:opacity-100 focus-visible:opacity-100">
              <X className="size-3" />
            </button>
          </span>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="xs" className="shrink-0" disabled={list.length >= 20}>
            <Plus /> Bookmark
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || !target) return;
              save([...list, { id: `bm-${Date.now().toString(36)}`, title: title.trim(), url: target, added_by: me, added_at: new Date().toISOString() }]);
              setTitle('');
              setUrl('');
              setOpen(false);
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="bm-title">Title</Label>
              <Input id="bm-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sprint 42 board" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bm-url">Link</Label>
              <Input id="bm-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link to a doc, board or site" className="h-8" />
              {url && !target && <p className="text-2xs text-danger-foreground">That doesn&apos;t look like a link.</p>}
            </div>
            <Button type="submit" size="sm" variant="brand" className="w-full" disabled={!title.trim() || !target}>
              Add bookmark
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* -------------------------------------------------------------- header */

export function ChannelHeader({ conversation, me, isAdmin, online, onJump, onBack }: Props) {
  const navigate = useNavigate();
  const update = useUpdateConversation();
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [q, setQ] = useState('');
  const pinned = usePinned(conversation._id, pinnedOpen);
  const search = useMessageSearch(q, conversation._id);
  const members = (conversation.memberDetails ?? []) as MemberDetail[];
  const other = conversation.type === 'dm' ? members.find((m) => m._id !== me) : undefined;
  const name = conversationName(conversation);
  const canManage = conversation.created_by === me || isAdmin;

  return (
    <header className="flex min-h-14 items-center gap-2 border-b border-border px-3 sm:px-4">
      <Button variant="ghost" size="icon-sm" aria-label="Back to conversations" className="md:hidden" onClick={onBack}>
        <ArrowLeft />
      </Button>
      {conversation.type === 'dm' ? (
        <PresenceAvatar user={other ?? null} online={other ? online.has(other._id) : undefined} size="sm" />
      ) : conversation.type === 'group' ? (
        <Users className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <Hash className="size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 truncate text-sm font-semibold">
          {name}
          {other && roleTag(other) && <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-2xs font-medium text-brand">{roleTag(other)}</span>}
          {conversation.spaceInfo && <span className="hidden truncate text-2xs font-normal text-subtle sm:inline">in {conversation.spaceInfo.name}</span>}
        </h1>
        {(conversation.topic || conversation.type === 'dm') && (
          <p className="truncate text-2xs text-muted-foreground">{conversation.topic || (other && online.has(other._id) ? 'Online now' : 'Offline')}</p>
        )}
      </div>

      {conversation.type !== 'dm' && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="hidden items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent sm:inline-flex" aria-label={`${members.length} members`}>
              <Users className="size-3.5" /> {members.length}
              <AvatarStack users={members} size="xs" max={3} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{members.length} members</p>
            <ul className="max-h-72 overflow-y-auto">
              {members.map((m) => (
                <li key={m._id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm">
                  <PresenceAvatar user={m} online={online.has(m._id)} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{m.name || m.email}</span>
                  {roleTag(m) && <span className="text-2xs text-subtle">{roleTag(m)}</span>}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}

      <Popover open={pinnedOpen} onOpenChange={setPinnedOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 px-2" aria-label={`Pinned messages (${conversation.pinned_count ?? 0})`}>
            <Pin /> <span className="font-mono text-2xs">{conversation.pinned_count ?? 0}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-2">
          <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Pinned messages</p>
          {pinned.isPending && <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>}
          {pinned.data?.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">Nothing pinned yet. Use a message&apos;s ⋯ menu to pin it.</p>}
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {pinned.data?.map((m) => (
              <li key={m._id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  onClick={() => {
                    setPinnedOpen(false);
                    onJump(m._id, conversation._id);
                  }}
                >
                  <p className="text-2xs text-muted-foreground">
                    {m.senderInfo?.name} · {timeLabel(m.createdAt)}
                  </p>
                  <p className="line-clamp-2 text-xs">{m.body || 'Attachment'}</p>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Search messages">
            <Search />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search in ${name}…`} aria-label="Search messages" className="h-8 pl-7 text-xs" />
          </div>
          <ul className="mt-2 max-h-80 space-y-0.5 overflow-y-auto">
            {q.trim().length >= 2 && search.data?.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">No messages match.</li>}
            {search.data?.map((m) => (
              <li key={m._id}>
                <button type="button" className="w-full rounded-md px-2 py-1.5 text-left hover:bg-accent" onClick={() => onJump(m.parent_message_id ?? m._id, m.conversation_id)}>
                  <p className="text-2xs text-muted-foreground">
                    {m.senderInfo?.name} · {new Date(m.createdAt).toLocaleDateString()} {m.parent_message_id ? '· in thread' : ''}
                  </p>
                  <p className="line-clamp-2 text-xs">{m.body}</p>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Conversation options">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => update.mutate({ id: conversation._id, pinned: !conversation.pinned })}>
            {conversation.pinned ? <PinOff /> : <Pin />} {conversation.pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => update.mutate({ id: conversation._id, muted: !conversation.muted })}>
            {conversation.muted ? <Bell /> : <BellOff />} {conversation.muted ? 'Unmute' : 'Mute'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <Settings2 /> Topic & members
          </DropdownMenuItem>
          {conversation.spaceInfo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(`/space/${conversation.spaceInfo!._id}`)}>
                <Hash /> Open {conversation.spaceInfo.name}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog conversation={conversation} open={settingsOpen} onOpenChange={setSettingsOpen} canManage={canManage} />
    </header>
  );
}
