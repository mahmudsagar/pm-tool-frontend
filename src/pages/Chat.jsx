import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, Users, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useAuthStore from '@/stores/useAuthStore';
import { useConversations, useMessages } from '@/hooks/queries/useChatQueries';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import ConversationList from '@/components/chat/ConversationList';
import MessageThread from '@/components/chat/MessageThread';
import MessageComposer from '@/components/chat/MessageComposer';
import CreateGroupDialog from '@/components/chat/CreateGroupDialog';
import StartDMDialog from '@/components/chat/StartDMDialog';
import { ConversationListSkeleton } from '@/components/chat/ChatSkeletons';
import { useQueryClient } from '@tanstack/react-query';

export default function Chat() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get('c');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: loadingConversations } = useConversations();
  const { data: messages = [], isLoading: loadingMessages } = useMessages(activeId);

  const handleMessageDelivered = useCallback((messageId) => {
    setPendingMessages(prev =>
      prev.filter(m => m._id !== messageId && m.clientId !== messageId)
    );
    if (!activeId) return;
    queryClient.setQueryData(['chat', 'messages', activeId], (old) =>
      (old ?? []).map(m =>
        m._id === messageId ? { ...m, status: 'delivered' } : m
      )
    );
  }, [activeId, queryClient]);

  useRealtimeChat(activeId, user?._id, handleMessageDelivered);

  const activeConversation = conversations.find(c => c._id === activeId);

  const selectConversation = (id) => {
    setPendingMessages([]);
    setSearchParams({ c: id });
  };

  const handleOptimisticSend = useCallback((pending) => {
    setPendingMessages(prev => [...prev, pending]);
  }, []);

  const handleMessageSent = useCallback((clientId, serverMessage) => {
    setPendingMessages(prev =>
      prev.map(m =>
        m.clientId === clientId
          ? { ...serverMessage, clientId, status: 'sent' }
          : m
      )
    );

    queryClient.setQueryData(['chat', 'messages', activeId], (old) => {
      const existing = old ?? [];
      if (existing.some(m => m._id === serverMessage._id)) {
        return existing.map(m =>
          m._id === serverMessage._id ? { ...m, ...serverMessage, status: 'sent' } : m
        );
      }
      return [...existing, { ...serverMessage, status: 'sent' }];
    });
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
  }, [activeId, queryClient]);

  const handleMessageFailed = useCallback((clientId) => {
    setPendingMessages(prev =>
      prev.map(m =>
        m.clientId === clientId ? { ...m, status: 'failed' } : m
      )
    );
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] border rounded-lg mx-4 my-2 overflow-hidden bg-background">
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Chat</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" title="New message" onClick={() => setDmDialogOpen(true)}>
                <MessageSquarePlus size={18} />
              </Button>
              <Button variant="ghost" size="icon" title="Create group" onClick={() => setGroupDialogOpen(true)}>
                <Users size={18} />
              </Button>
            </div>
          </div>
        </div>

        {loadingConversations ? (
          <ConversationListSkeleton />
        ) : (
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={selectConversation}
            currentUserId={user?._id}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <>
            <div className="px-4 py-3 border-b flex items-center gap-3">
              {activeConversation.type === 'channel' && <Hash size={18} className="text-blue-600 shrink-0" />}
              {activeConversation.type === 'group' && <Users size={18} className="text-green-600 shrink-0" />}
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{activeConversation.displayName || activeConversation.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {activeConversation.type === 'channel' ? 'Space Channel' :
                     activeConversation.type === 'group' ? 'Group' : 'Direct Message'}
                  </Badge>
                  {activeConversation.spaceInfo && (
                    <span className="text-xs text-muted-foreground truncate">
                      {activeConversation.spaceInfo.name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {activeConversation.memberDetails?.length || 0} members
                  </span>
                </div>
              </div>
            </div>

            <MessageThread
              messages={messages}
              pendingMessages={pendingMessages}
              currentUserId={user?._id}
              isLoading={loadingMessages}
            />

            <MessageComposer
              conversationId={activeId}
              spaceId={activeConversation.type === 'channel' ? activeConversation.space_id : null}
              currentUser={user}
              mentionableMembers={activeConversation.memberDetails || []}
              onOptimisticSend={handleOptimisticSend}
              onMessageSent={handleMessageSent}
              onMessageFailed={handleMessageFailed}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquarePlus size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Or start a new message or group</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setDmDialogOpen(true)}>
                New Message
              </Button>
              <Button variant="outline" onClick={() => setGroupDialogOpen(true)}>
                Create Group
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onCreated={selectConversation}
      />
      <StartDMDialog
        open={dmDialogOpen}
        onOpenChange={setDmDialogOpen}
        onCreated={selectConversation}
      />
    </div>
  );
}
