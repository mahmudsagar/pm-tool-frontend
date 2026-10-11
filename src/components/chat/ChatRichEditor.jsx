import { useCallback, useEffect, useMemo, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import LexicalContentEditable from '@/components/elements/editor/ui/ContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  $isListItemNode,
} from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import { $isRootTextContentEmpty, $rootTextContent } from '@lexical/text';
import { $findMatchingParent } from '@lexical/utils';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  KEY_ENTER_COMMAND,
} from 'lexical';
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  SendHorizonal,
  Strikethrough,
  Type,
  Underline,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CommentEditorTheme from '@/components/elements/editor/themes/CommentEditorTheme';
import { $isMentionNode, MentionNode } from '@/components/elements/editor/nodes/MentionNode';
import ChatMentionsPlugin from './plugins/ChatMentionsPlugin';
import ChatTaskPickerPlugin from './plugins/ChatTaskPickerPlugin';
import ChatSlashMenuPlugin from './plugins/ChatSlashMenuPlugin';
import './ChatRichEditor.css';

const chatNodes = [
  LinkNode,
  AutoLinkNode,
  ListNode,
  ListItemNode,
  HeadingNode,
  QuoteNode,
  CodeNode,
  MentionNode,
];

function EnterToSendPlugin({ onSubmit, enabled }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!enabled || !event || event.shiftKey) return false;

        // Let list items continue (new bullet / number) instead of sending
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchor = selection.anchor.getNode();
          if ($findMatchingParent(anchor, $isListItemNode)) {
            return false;
          }
        }

        event.preventDefault();
        onSubmit?.();
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onSubmit, enabled]);

  return null;
}

function ClearOnSignalPlugin({ clearSignal, onCleared }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!clearSignal) return;
    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    onCleared?.();
  }, [clearSignal, editor, onCleared]);

  return null;
}

function MiniToolbar({ allowIssues }) {
  const [editor] = useLexicalComposerContext();
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
  });

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        setFormats({
          bold: selection.hasFormat('bold'),
          italic: selection.hasFormat('italic'),
          underline: selection.hasFormat('underline'),
          strikethrough: selection.hasFormat('strikethrough'),
          code: selection.hasFormat('code'),
        });
      });
    });
  }, [editor]);

  const run = (command, payload) => editor.dispatchCommand(command, payload);

  const insertLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  };

  const tools = [
    { key: 'bold', icon: Bold, active: formats.bold, action: () => run(FORMAT_TEXT_COMMAND, 'bold'), title: 'Bold' },
    { key: 'italic', icon: Italic, active: formats.italic, action: () => run(FORMAT_TEXT_COMMAND, 'italic'), title: 'Italic' },
    { key: 'underline', icon: Underline, active: formats.underline, action: () => run(FORMAT_TEXT_COMMAND, 'underline'), title: 'Underline' },
    { key: 'strike', icon: Strikethrough, active: formats.strikethrough, action: () => run(FORMAT_TEXT_COMMAND, 'strikethrough'), title: 'Strikethrough' },
    { key: 'code', icon: Code, active: formats.code, action: () => run(FORMAT_TEXT_COMMAND, 'code'), title: 'Code' },
    { key: 'link', icon: Link2, active: false, action: insertLink, title: 'Link' },
    { key: 'ul', icon: List, active: false, action: () => run(INSERT_UNORDERED_LIST_COMMAND), title: 'Bullet list' },
    { key: 'ol', icon: ListOrdered, active: false, action: () => run(INSERT_ORDERED_LIST_COMMAND), title: 'Numbered list' },
  ];

  // Typing the trigger character opens the mention / issue pickers.
  const insertTrigger = (char) =>
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) selection.insertText(char);
    });

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/60">
      {tools.map(({ key, icon: Icon, active, action, title }) => (
        <button
          key={key}
          type="button"
          title={title}
          aria-label={title}
          aria-pressed={active}
          onMouseDown={(e) => {
            e.preventDefault();
            action();
          }}
          className={cn(
            'h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
            active && 'bg-muted text-foreground'
          )}
        >
          <Icon size={14} />
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.focus();
          insertTrigger('@');
        }}
        className="h-7 inline-flex items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        @ Mention
      </button>
      {allowIssues && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.focus();
            insertTrigger('#');
          }}
          className="h-7 inline-flex items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          # Issue
        </button>
      )}
    </div>
  );
}

/**
 * Seamless Lexical chat composer with markdown shortcuts, @mentions, #tasks.
 */
export default function ChatRichEditor({
  placeholder = 'Message…  try @mention or #task',
  onChange,
  onSubmit,
  clearSignal,
  onCleared,
  className,
  canSubmit = true,
  spaceId,
  members = [],
  onSelectTask,
  onAttachClick,
  onTyping,
  toolbar = 'toggle',
  submitLabel,
  footer,
  ariaLabel = 'Message',
}) {
  const [showToolbar, setShowToolbar] = useState(toolbar === 'always');

  const initialConfig = useMemo(
    () => ({
      namespace: 'ChatComposer',
      nodes: chatNodes,
      onError: (error) => console.error(error),
      theme: CommentEditorTheme,
    }),
    []
  );

  const handleChange = useCallback(
    (editorState, editor) => {
      editorState.read(() => {
        const plain = $rootTextContent();
        const empty = $isRootTextContentEmpty(editor.isComposing(), true);
        const mentionIds = [];
        const walk = (node) => {
          if ($isMentionNode(node)) {
            const id = node.getUserId?.();
            if (id && !mentionIds.includes(id)) mentionIds.push(id);
          }
          if (typeof node.getChildren === 'function') {
            node.getChildren().forEach(walk);
          }
        };
        walk($getRoot());

        onTyping?.(!empty);
        onChange?.({
          plain,
          empty,
          content: empty ? null : JSON.stringify(editorState),
          mentions: mentionIds,
        });
      });
    },
    [onChange, onTyping]
  );

  return (
    <div
      className={cn(
        'ChatRichEditor flex-1 min-w-0 rounded-xl border border-border bg-card overflow-hidden focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/15',
        className
      )}
    >
      <LexicalComposer initialConfig={initialConfig}>
        {showToolbar && <MiniToolbar allowIssues={!!spaceId} />}

        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <LexicalContentEditable
                className="ChatRichEditor__input"
                ariaLabel={ariaLabel}
                placeholder={placeholder}
                placeholderClassName="ChatRichEditor__placeholder"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
          <button
            type="button"
            title="Attach file"
            aria-label="Attach file"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onAttachClick}
          >
            <Paperclip size={16} />
          </button>
          {toolbar === 'toggle' && (
            <button
              type="button"
              title={showToolbar ? 'Hide formatting' : 'Show formatting'}
              aria-label={showToolbar ? 'Hide formatting' : 'Show formatting'}
              aria-pressed={showToolbar}
              className={cn(
                'h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground',
                showToolbar && 'bg-brand/10 text-brand'
              )}
              onClick={() => setShowToolbar((v) => !v)}
            >
              <Type size={16} />
            </button>
          )}

          <div className="flex-1 min-w-0 px-1 text-2xs text-subtle truncate">{footer}</div>

          <button
            type="submit"
            title="Send (Enter)"
            aria-label={submitLabel || 'Send'}
            disabled={!canSubmit}
            className={cn(
              'h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-35 disabled:pointer-events-none',
              submitLabel ? 'px-3 text-xs font-medium' : 'w-8'
            )}
          >
            {submitLabel}
            <SendHorizonal size={15} />
          </button>
        </div>

        <OnChangePlugin onChange={handleChange} />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <ClearEditorPlugin />
        <EnterToSendPlugin onSubmit={onSubmit} enabled={canSubmit} />
        <ClearOnSignalPlugin clearSignal={clearSignal} onCleared={onCleared} />
        <ChatMentionsPlugin members={members} />
        <ChatTaskPickerPlugin spaceId={spaceId} onSelectTask={onSelectTask} />
        <ChatSlashMenuPlugin />
      </LexicalComposer>
    </div>
  );
}
