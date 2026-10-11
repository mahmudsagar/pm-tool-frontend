import { memo, useState } from 'react';
import { AlertCircle, Copy, Link2, MessageSquareReply, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AvatarStack } from '@/components/common/UserAvatar';
import ChatMessageBodyJs from '@/components/chat/ChatMessageBody';
import { cn } from '@/lib/utils';
import type { MemberDetail, Message } from '@/features/chat/api';
import { ago, roleTag, timeLabel } from '@/features/chat/format';
import { AddReactionButton, EmojiPicker, EntityCard, PresenceAvatar } from './parts';

const ChatMessageBody = ChatMessageBodyJs as unknown as React.ComponentType<{ body?: string; content?: string | null; className?: string }>;
const QUICK = ['👍', '✅', '👀'];

export interface MessageActions {
  me: string;
  isAdmin: boolean;
  members: Map<string, MemberDetail>;
  online: Set<string>;
  onReply?: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  onPin: (m: Message) => void;
  onEdit: (m: Message, body: string) => void;
  onDelete: (m: Message) => void;
  linkFor: (m: Message) => string;
}

interface Props {
  message: Message;
  /** Same author within a few minutes: hide the avatar and name. */
  continuation?: boolean;
  inThread?: boolean;
  actions: MessageActions;
}

function MessageItemImpl({ message: m, continuation, inThread, actions }: Props) {
  const { me, members, online } = actions;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body ?? '');
  const author = members.get(m.sender_id) ?? (m.senderInfo ? { _id: m.sender_id, name: m.senderInfo.name, avatar: m.senderInfo.avatarUrl ?? m.senderInfo.avatar } : undefined);
  const own = m.sender_id === me;
  const deleted = !!m.deleted_at;
  const pending = m.status === 'sending' || m.status === 'failed';
  const tag = roleTag(author);
  const canDelete = own || actions.isAdmin;

  const saveEdit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== m.body) actions.onEdit(m, next);
  };

  return (
    <article
      id={`msg-${m._id}`}
      aria-label={`${author?.name ?? 'Someone'} at ${timeLabel(m.createdAt)}`}
      className={cn('group relative flex gap-3 rounded-lg px-3 transition-colors hover:bg-accent/40', continuation ? 'py-0.5' : 'mt-2 py-1.5', m.pinned && 'bg-warning/5', pending && 'opacity-60')}
    >
      <div className="w-9 shrink-0">
        {!continuation ? (
          <PresenceAvatar user={author ?? null} online={online.has(m.sender_id)} size="md" />
        ) : (
          <span className="invisible block pt-1 text-right font-mono text-[10px] text-subtle group-hover:visible">{timeLabel(m.createdAt)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!continuation && (
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">{author?.name ?? (own ? 'You' : 'Unknown')}</span>
            {tag && <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-2xs font-medium text-brand">{tag}</span>}
            <time dateTime={m.createdAt} className="text-2xs text-subtle">
              {timeLabel(m.createdAt)}
            </time>
            {m.pinned && (
              <span className="inline-flex items-center gap-0.5 text-2xs text-warning-foreground">
                <Pin className="size-3" /> Pinned
              </span>
            )}
          </p>
        )}

        {deleted ? (
          <p className="text-sm italic text-subtle">This message was deleted.</p>
        ) : editing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              autoFocus
              rows={2}
              value={draft}
              aria-label="Edit message"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            <div className="flex gap-2 text-2xs text-muted-foreground">
              <Button size="xs" variant="brand" onClick={saveEdit}>
                Save
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <span className="self-center">Enter to save · Esc to cancel</span>
            </div>
          </div>
        ) : (
          <>
            {(m.body || m.content) && <ChatMessageBody body={m.body} content={m.content} className="qp-chat-body" />}
            {m.edited_at && <span className="text-2xs text-subtle">(edited)</span>}
          </>
        )}

        {!deleted && (m.entity_refs?.length ?? 0) > 0 && (
          <div className="mt-2 space-y-2">
            {m.entity_refs!.map((ref) => (
              <EntityCard key={ref.id} entity={ref} members={members} compact={inThread} />
            ))}
          </div>
        )}

        {!deleted && ((m.mediaAttachments?.length ?? 0) > 0 || (m.pendingAttachments?.length ?? 0) > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {(m.mediaAttachments ?? []).map((a) =>
              /\.(png|jpe?g|gif|webp)$/i.test(a.url) ? (
                <a key={a._id} href={a.url} target="_blank" rel="noopener noreferrer">
                  <img src={a.url} alt={a.caption || 'Attachment'} className="max-h-60 max-w-[18rem] rounded-lg border border-border" />
                </a>
              ) : (
                <a key={a._id} href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent">
                  📎 {a.caption || 'Attachment'}
                </a>
              ),
            )}
            {(m.pendingAttachments ?? []).map((a) =>
              a.previewUrl ? <img key={a.name} src={a.previewUrl} alt={a.name} className="max-h-40 rounded-lg opacity-70" /> : <span key={a.name} className="text-xs opacity-70">📎 {a.name}</span>,
            )}
          </div>
        )}

        {!deleted && (m.reactions?.length ?? 0) > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {m.reactions!.map((r) => {
              const mine = r.user_ids.includes(me);
              const names = r.user_ids.map((id) => (id === me ? 'You' : members.get(id)?.name ?? 'Someone')).join(', ');
              return (
                <Tooltip key={r.emoji}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-pressed={mine}
                      aria-label={`${r.emoji} ${r.user_ids.length}, ${mine ? 'remove your reaction' : 'react'}`}
                      onClick={() => actions.onReact(m, r.emoji)}
                      className={cn('inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors', mine ? 'border-brand/40 bg-brand/10 text-foreground' : 'border-border bg-muted/40 text-muted-foreground hover:border-border-strong')}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-mono text-2xs">{r.user_ids.length}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{names}</TooltipContent>
                </Tooltip>
              );
            })}
            <AddReactionButton onPick={(e) => actions.onReact(m, e)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" />
          </div>
        )}

        {!inThread && !deleted && (m.reply_count ?? 0) > 0 && actions.onReply && (
          <button type="button" onClick={() => actions.onReply!(m)} className="mt-1.5 inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-accent">
            <AvatarStack users={(m.reply_user_ids ?? []).map((id) => members.get(id) ?? { _id: id })} size="xs" max={3} />
            <span className="font-medium text-brand">
              {m.reply_count} {m.reply_count === 1 ? 'reply' : 'replies'}
            </span>
            {m.last_reply_at && <span className="text-subtle">Last reply {ago(m.last_reply_at)}</span>}
          </button>
        )}

        {m.status === 'failed' && (
          <p className="mt-1 flex items-center gap-1 text-2xs text-danger-foreground">
            <AlertCircle className="size-3" /> Not sent. Check your connection and try again.
          </p>
        )}
      </div>

      {!deleted && !pending && !editing && (
        <div className="absolute -top-3 right-3 hidden items-center gap-0.5 rounded-lg border border-border bg-popover p-0.5 shadow-sm group-focus-within:flex group-hover:flex" role="toolbar" aria-label="Message actions">
          {QUICK.map((e) => (
            <button key={e} type="button" aria-label={`React with ${e}`} onClick={() => actions.onReact(m, e)} className="flex size-7 items-center justify-center rounded-md text-sm hover:bg-accent">
              {e}
            </button>
          ))}
          <EmojiPicker onPick={(e) => actions.onReact(m, e)} align="end">
            <button type="button" aria-label="More reactions" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <span className="text-xs">+😀</span>
            </button>
          </EmojiPicker>
          {!inThread && actions.onReply && !m.parent_message_id && (
            <button type="button" aria-label="Reply in thread" onClick={() => actions.onReply!(m)} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <MessageSquareReply className="size-4" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More message actions" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {!m.parent_message_id && (
                <DropdownMenuItem onSelect={() => actions.onPin(m)}>
                  {m.pinned ? <PinOff /> : <Pin />} {m.pinned ? 'Unpin message' : 'Pin message'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(m.body ?? '')}>
                <Copy /> Copy text
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(actions.linkFor(m))}>
                <Link2 /> Copy link
              </DropdownMenuItem>
              {own && (
                <DropdownMenuItem
                  onSelect={() => {
                    setDraft(m.body ?? '');
                    setEditing(true);
                  }}
                >
                  <Pencil /> Edit message
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-danger-foreground focus:text-danger-foreground" onSelect={() => actions.onDelete(m)}>
                    <Trash2 /> Delete message
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </article>
  );
}

export const MessageItem = memo(MessageItemImpl);
