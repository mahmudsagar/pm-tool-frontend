import { useCallback, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import ChatRichEditorJs from '@/components/chat/ChatRichEditor';
import { SelectedEntityChips as SelectedEntityChipsJs } from '@/components/chat/SpaceItemPicker';
import useAuthStore from '@/stores/useAuthStore';
import { useToast } from '@/components/ui/use-toast';
import { upsertMessage, useSendMessage, useUploadChatFile, type EntityRef, type MemberDetail, type Message } from '@/features/chat/api';
import { useTypingEmitter } from '@/features/chat/realtime';

interface Draft {
  plain: string;
  empty: boolean;
  content: string | null;
  mentions: string[];
}

// The editor and chips are untyped JS components.
const ChatRichEditor = ChatRichEditorJs as unknown as React.ComponentType<{
  placeholder?: string;
  onChange: (d: Draft) => void;
  onSubmit: () => void;
  clearSignal: number;
  canSubmit: boolean;
  spaceId?: string | null;
  members: MemberDetail[];
  onSelectTask: (ref: EntityRef) => void;
  onAttachClick: () => void;
  onTyping?: (hasText: boolean) => void;
  toolbar?: 'toggle' | 'always';
  submitLabel?: string;
  footer?: React.ReactNode;
  ariaLabel?: string;
}>;
const SelectedEntityChips = SelectedEntityChipsJs as unknown as React.ComponentType<{ refs: EntityRef[]; onRemove: (id: string) => void }>;

const EMPTY: Draft = { plain: '', empty: true, content: null, mentions: [] };

interface ComposerProps {
  conversationId: string;
  spaceId?: string | null;
  members: MemberDetail[];
  parentId?: string | null;
  placeholder: string;
  submitLabel?: string;
  toolbar?: 'toggle' | 'always';
  ariaLabel?: string;
}

/** Message composer with optimistic send, attachments, linked issues and typing signals. */
export function ChatComposer({ conversationId, spaceId, members, parentId = null, placeholder, submitLabel, toolbar = 'always', ariaLabel }: ComposerProps) {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { toast } = useToast();
  const send = useSendMessage();
  const upload = useUploadChatFile();
  const typing = useTypingEmitter(conversationId, parentId);
  const draftRef = useRef<Draft>(EMPTY);
  const [canSend, setCanSend] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [refs, setRefs] = useState<EntityRef[]>([]);
  const [clear, setClear] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const mentionable = useMemo(() => members.filter((m) => m._id !== me?._id), [members, me?._id]);

  const onChange = useCallback((d: Draft) => {
    draftRef.current = d;
    setCanSend(!d.empty);
  }, []);

  const submit = useCallback(() => {
    const d = draftRef.current;
    const text = d.plain.trim();
    if (!text && !files.length && !refs.length) return;
    const clientId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pendingFiles = files;
    const pendingRefs = refs;
    const optimistic: Message = {
      _id: clientId,
      clientId,
      conversation_id: conversationId,
      sender_id: me?._id ?? '',
      body: text,
      content: d.content,
      mentions: d.mentions,
      entity_refs: pendingRefs,
      parent_message_id: parentId,
      pendingAttachments: pendingFiles.map((f) => ({ name: f.name, previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null })),
      senderInfo: { _id: me?._id ?? '', name: me?.name, avatarUrl: (me as { avatar?: string } | null)?.avatar },
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    upsertMessage(qc, optimistic);
    draftRef.current = EMPTY;
    setCanSend(false);
    setFiles([]);
    setRefs([]);
    setClear((n) => n + 1);
    typing.stop();

    void (async () => {
      try {
        const saved = await send.mutateAsync({
          conversation_id: conversationId,
          body: text,
          content: d.content,
          mentions: d.mentions.filter((id) => id !== me?._id),
          entity_refs: pendingRefs,
          parent_message_id: parentId,
        });
        const media = [];
        for (const file of pendingFiles) {
          const form = new FormData();
          form.append('media_type', 'chat_attachment');
          form.append('reference_id', saved._id);
          form.append('reference_for', 'message');
          form.append('caption', file.name);
          form.append('file', file);
          media.push(await upload.mutateAsync(form));
        }
        upsertMessage(qc, { ...optimistic, ...saved, clientId, mediaAttachments: media, pendingAttachments: [], status: 'sent' });
      } catch (error) {
        upsertMessage(qc, { ...optimistic, status: 'failed' });
        toast({ variant: 'destructive', title: 'Message not sent', description: (error as Error).message });
      }
    })();
  }, [files, refs, conversationId, me, parentId, qc, send, upload, typing, toast]);

  return (
    <div className="space-y-2">
      <SelectedEntityChips refs={refs} onRemove={(id) => setRefs((r) => r.filter((x) => x.id !== id))} />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs">
              <span className="max-w-[10rem] truncate">{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            setFiles((x) => [...x, ...list]);
            e.target.value = '';
          }}
        />
        <ChatRichEditor
          placeholder={placeholder}
          onChange={onChange}
          onSubmit={submit}
          clearSignal={clear}
          canSubmit={canSend || files.length > 0 || refs.length > 0}
          spaceId={spaceId}
          members={mentionable}
          onSelectTask={(ref) => setRefs((r) => (r.some((x) => x.id === ref.id) ? r : [...r, ref]))}
          onAttachClick={() => fileInput.current?.click()}
          onTyping={typing.ping}
          toolbar={toolbar}
          submitLabel={submitLabel}
          ariaLabel={ariaLabel}
          footer={<span className="hidden sm:inline">Markdown supported · Enter to send · Shift+Enter for a new line</span>}
        />
      </form>
    </div>
  );
}
