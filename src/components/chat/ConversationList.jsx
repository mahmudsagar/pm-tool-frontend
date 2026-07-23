import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, Users, MessageCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const RECENT_LIMIT = 6;
/** Conversations with no activity for this long drop out of Recent */
const RECENT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function sortByRecent(list) {
  return [...list].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at) : new Date(a.createdAt || 0);
    const bTime = b.last_message_at ? new Date(b.last_message_at) : new Date(b.createdAt || 0);
    return bTime - aTime;
  });
}

function isRecentlyActive(conv, now = Date.now()) {
  if (!conv.last_message_at) return false;
  const age = now - new Date(conv.last_message_at).getTime();
  return age >= 0 && age <= RECENT_MAX_AGE_MS;
}

function ConversationIcon({ conversation, currentUserId }) {
  if (conversation.type === 'channel') {
    return (
      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
        <Hash size={16} className="text-blue-600" />
      </div>
    );
  }
  if (conversation.type === 'group') {
    return (
      <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
        <Users size={16} className="text-green-600" />
      </div>
    );
  }

  const other = conversation.memberDetails?.find((m) => m._id !== currentUserId);
  return (
    <Avatar className="w-9 h-9 shrink-0">
      <AvatarImage src={other?.avatarUrl} />
      <AvatarFallback>{other?.name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
    </Avatar>
  );
}

function ConversationRow({ conv, activeId, onSelect, currentUserId }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(conv._id)}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-muted/80',
        activeId === conv._id && 'bg-purple-50 dark:bg-purple-900/20'
      )}
    >
      <ConversationIcon conversation={conv} currentUserId={currentUserId} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">
            {conv.displayName || conv.name}
          </span>
          {conv.last_message_at && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {dayjs(conv.last_message_at).fromNow(true)}
            </span>
          )}
        </div>
        {conv.last_message_preview && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {conv.last_message_preview}
          </p>
        )}
        {conv.spaceInfo && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {conv.spaceInfo.name}
          </p>
        )}
      </div>
    </button>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  items,
  activeId,
  onSelect,
  currentUserId,
  defaultOpen = true,
  emptyLabel,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {Icon && <Icon size={12} />}
        <span className="flex-1 text-left">{title}</span>
        <span className="text-[10px] font-normal tabular-nums">{items.length}</span>
      </button>

      {open && (
        <div className="px-1 pb-2 space-y-0.5">
          {items.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">{emptyLabel}</p>
          ) : (
            items.map((conv) => (
              <ConversationRow
                key={`${id}-${conv._id}`}
                conv={conv}
                activeId={activeId}
                onSelect={onSelect}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ConversationList({
  conversations = [],
  activeId,
  onSelect,
  currentUserId,
}) {
  const { recent, channels, groups, dms } = useMemo(() => {
    const now = Date.now();
    const sorted = sortByRecent(conversations);
    const recentItems = sorted
      .filter((c) => isRecentlyActive(c, now))
      .slice(0, RECENT_LIMIT);

    return {
      recent: recentItems,
      channels: sortByRecent(conversations.filter((c) => c.type === 'channel')),
      groups: sortByRecent(conversations.filter((c) => c.type === 'group')),
      dms: sortByRecent(conversations.filter((c) => c.type === 'dm')),
    };
  }, [conversations]);

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
        <MessageCircle size={32} className="mb-2 opacity-50" />
        <p className="text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="py-2">
        <Section
          id="recent"
          title="Recent"
          icon={Clock}
          items={recent}
          activeId={activeId}
          onSelect={onSelect}
          currentUserId={currentUserId}
          defaultOpen
          emptyLabel="No chats in the last 24 hours"
        />
        <div className="mx-3 my-1 border-t border-border/60" />
        <Section
          id="channels"
          title="Channels"
          icon={Hash}
          items={channels}
          activeId={activeId}
          onSelect={onSelect}
          currentUserId={currentUserId}
          defaultOpen
          emptyLabel="No channels — create one from a space"
        />
        <Section
          id="groups"
          title="Groups"
          icon={Users}
          items={groups}
          activeId={activeId}
          onSelect={onSelect}
          currentUserId={currentUserId}
          defaultOpen
          emptyLabel="No groups yet"
        />
        <Section
          id="dms"
          title="Direct messages"
          icon={MessageCircle}
          items={dms}
          activeId={activeId}
          onSelect={onSelect}
          currentUserId={currentUserId}
          defaultOpen
          emptyLabel="No direct messages yet"
        />
      </div>
    </ScrollArea>
  );
}
