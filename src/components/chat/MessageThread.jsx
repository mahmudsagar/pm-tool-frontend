import { useEffect, useRef, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import MessageStatus from './MessageStatus';
import MessageThreadSkeleton from './ChatSkeletons';
import { EntityLinkCard } from './SpaceItemPicker';
import ChatMessageBody from './ChatMessageBody';

function PendingAttachment({ attachment }) {
  if (attachment.previewUrl) {
    return (
      <img
        src={attachment.previewUrl}
        alt={attachment.name}
        className="max-w-[200px] rounded-md opacity-70"
      />
    );
  }
  return (
    <span className="text-xs opacity-70">📎 {attachment.name}</span>
  );
}

function MessageBubble({ message, isOwn }) {
  const attachments = message.mediaAttachments || [];
  const pendingAttachments = message.pendingAttachments || [];
  const entityRefs = message.entity_refs || [];
  const isPending = message.status === 'sending' || message.status === 'failed';
  const status = isOwn ? (message.status || 'delivered') : null;

  return (
    <div
      className={cn(
        'flex gap-3 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors',
        isPending && 'opacity-60'
      )}
    >
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarImage src={message.senderInfo?.avatarUrl} />
        <AvatarFallback className="text-xs">
          {message.senderInfo?.name?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 leading-none">
          <span className="text-sm font-semibold text-foreground">
            {message.senderInfo?.name || (isOwn ? 'You' : 'Unknown')}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {dayjs(message.createdAt).format('h:mm A')}
          </span>
          <MessageStatus status={status} isOwn={isOwn} />
        </div>

        {message.body || message.content ? (
          <ChatMessageBody body={message.body} content={message.content} className="mt-0.5" />
        ) : null}

        {entityRefs.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {entityRefs.map((ref) => (
              <EntityLinkCard key={ref.id} entityRef={ref} isOwn={false} />
            ))}
          </div>
        )}

        {(attachments.length > 0 || pendingAttachments.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((media) => {
              const isImage = media.url?.match(/\.(jpg|jpeg|png|gif|webp)/i);
              if (isImage) {
                return (
                  <a key={media._id} href={media.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={media.url}
                      alt={media.caption || 'attachment'}
                      className="max-w-[220px] rounded-md border"
                    />
                  </a>
                );
              }
              return (
                <a
                  key={media._id}
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline text-muted-foreground hover:text-foreground"
                >
                  📎 {media.caption || 'Download file'}
                </a>
              );
            })}
            {pendingAttachments.map((att, i) => (
              <PendingAttachment key={i} attachment={att} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DateDivider({ date }) {
  return (
    <div className="flex items-center gap-3 my-3 px-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
        {dayjs(date).format('MMMM D, YYYY')}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function MessageThread({ messages, pendingMessages = [], currentUserId, isLoading }) {
  const bottomRef = useRef(null);
  const prevCountRef = useRef(0);

  const displayMessages = useMemo(() => {
    const serverIds = new Set(messages.map(m => m._id));
    const serverClientIds = new Set(messages.map(m => m.clientId).filter(Boolean));

    const activePending = pendingMessages.filter(
      p => !serverIds.has(p._id) && !serverClientIds.has(p.clientId)
    );

    const enrichedServer = messages.map(m => {
      const pendingMatch = pendingMessages.find(
        p => p._id === m._id || p.clientId === m.clientId
      );
      return pendingMatch?.status ? { ...m, status: pendingMatch.status } : m;
    });

    return [...enrichedServer, ...activePending].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [messages, pendingMessages]);

  useEffect(() => {
    if (displayMessages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = displayMessages.length;
  }, [displayMessages]);

  if (isLoading) {
    return <MessageThreadSkeleton />;
  }

  if (!displayMessages.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-6 text-center">
        <p className="text-sm font-medium">No messages yet</p>
        <p className="text-xs mt-1 opacity-70">Send a message to start the conversation</p>
      </div>
    );
  }

  let lastDate = null;

  return (
    <ScrollArea className="flex-1 px-2 py-3">
      <div>
        {displayMessages.map((msg) => {
          const msgDate = dayjs(msg.createdAt).format('YYYY-MM-DD');
          const showDivider = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <div key={msg.clientId || msg._id}>
              {showDivider && <DateDivider date={msg.createdAt} />}
              <MessageBubble
                message={msg}
                isOwn={msg.sender_id === currentUserId}
              />
            </div>
          );
        })}
        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  );
}
