import { useState, useRef, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { useSendMessage, useUploadChatMedia } from '@/hooks/mutations/useChatMutations';
import { SelectedEntityChips } from './SpaceItemPicker';
import ChatRichEditor from './ChatRichEditor';

function createClientId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildPendingAttachments(files) {
  return files.map((file) => ({
    file,
    name: file.name,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
  }));
}

export default function MessageComposer({
  conversationId,
  spaceId,
  currentUser,
  mentionableMembers = [],
  onOptimisticSend,
  onMessageSent,
  onMessageFailed,
}) {
  const [draft, setDraft] = useState({ plain: '', empty: true, content: null, mentions: [] });
  const draftRef = useRef(draft);
  const [attachments, setAttachments] = useState([]);
  const [entityRefs, setEntityRefs] = useState([]);
  const [clearSignal, setClearSignal] = useState(0);
  const fileInputRef = useRef(null);
  const sendingRef = useRef(false);

  const sendMessage = useSendMessage();
  const uploadMedia = useUploadChatMedia();

  const members = useMemo(
    () => mentionableMembers.filter((m) => m._id && m._id !== currentUser?._id),
    [mentionableMembers, currentUser?._id]
  );

  const handleDraftChange = useCallback((next) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addEntityRef = useCallback((ref) => {
    setEntityRefs(prev => (prev.some(r => r.id === ref.id) ? prev : [...prev, ref]));
  }, []);

  const removeEntityRef = (id) => {
    setEntityRefs(prev => prev.filter(r => r.id !== id));
  };

  const sendPayload = useCallback(async (text, content, files, refs, mentions, clientId) => {
    try {
      const message = await sendMessage.mutateAsync({
        conversation_id: conversationId,
        body: text,
        content: content || undefined,
        attachments: [],
        entity_refs: refs,
        mentions,
      });

      let mediaAttachments = [];
      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('media_type', 'chat_attachment');
          formData.append('reference_id', message._id);
          formData.append('reference_for', 'message');
          formData.append('caption', file.name);
          formData.append('file', file);
          const uploaded = await uploadMedia.mutateAsync(formData);
          mediaAttachments.push(uploaded);
        }
      }

      onMessageSent?.(clientId, {
        ...message,
        mediaAttachments,
        entity_refs: refs,
        content: content || message.content,
        status: 'sent',
      });
    } catch {
      onMessageFailed?.(clientId);
    } finally {
      sendingRef.current = false;
    }
  }, [conversationId, sendMessage, uploadMedia, onMessageSent, onMessageFailed]);

  const handleSubmit = useCallback(() => {
    const current = draftRef.current;
    const text = current.plain.trim();
    if (!text && attachments.length === 0 && entityRefs.length === 0) return;
    if (sendingRef.current) return;

    const clientId = createClientId();
    const files = [...attachments];
    const refs = [...entityRefs];
    const content = current.content;
    const mentions = (current.mentions || []).filter((id) => id !== currentUser?._id);
    const pendingAttachments = buildPendingAttachments(files);

    onOptimisticSend?.({
      clientId,
      _id: clientId,
      conversation_id: conversationId,
      sender_id: currentUser?._id,
      body: text,
      content,
      entity_refs: refs,
      mentions,
      pendingAttachments,
      status: 'sending',
      createdAt: new Date().toISOString(),
      senderInfo: {
        _id: currentUser?._id,
        name: currentUser?.name,
        avatarUrl: currentUser?.avatarUrl,
      },
    });

    const emptyDraft = { plain: '', empty: true, content: null, mentions: [] };
    draftRef.current = emptyDraft;
    setDraft(emptyDraft);
    setAttachments([]);
    setEntityRefs([]);
    setClearSignal((n) => n + 1);
    sendingRef.current = true;
    sendPayload(text, content, files, refs, mentions, clientId);
  }, [
    attachments,
    entityRefs,
    conversationId,
    currentUser,
    onOptimisticSend,
    sendPayload,
  ]);

  const canSend = !draft.empty || attachments.length > 0 || entityRefs.length > 0;

  return (
    <div className="border-t bg-background">
      <SelectedEntityChips refs={entityRefs} onRemove={removeEntityRef} />
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5 text-xs">
              <span className="truncate max-w-[140px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="px-3 py-2.5"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <ChatRichEditor
          placeholder={
            spaceId
              ? 'Message…  / format · @mention · #task'
              : 'Message…  / format · @mention'
          }
          onChange={handleDraftChange}
          onSubmit={handleSubmit}
          clearSignal={clearSignal}
          canSubmit={canSend}
          spaceId={spaceId}
          members={members}
          onSelectTask={addEntityRef}
          onAttachClick={() => fileInputRef.current?.click()}
        />
      </form>
    </div>
  );
}
