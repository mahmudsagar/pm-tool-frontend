import { useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import CommentEditorTheme from '@/components/elements/editor/themes/CommentEditorTheme';
import { MentionNode } from '@/components/elements/editor/nodes/MentionNode';
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

function isLexicalJson(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    return !!parsed?.root;
  } catch {
    return false;
  }
}

/**
 * Renders a chat message body. Uses read-only Lexical when rich content exists.
 */
export default function ChatMessageBody({ body, content, className = '' }) {
  const hasRich = isLexicalJson(content);

  const initialConfig = useMemo(() => {
    if (!hasRich) return null;
    return {
      namespace: `ChatMessage-${Math.random().toString(36).slice(2, 8)}`,
      nodes: chatNodes,
      editable: false,
      editorState: content,
      onError: (error) => console.error(error),
      theme: CommentEditorTheme,
    };
  }, [content, hasRich]);

  if (!hasRich) {
    if (!body) return null;
    return (
      <p className={`text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed ${className}`}>
        {body}
      </p>
    );
  }

  return (
    <div className={`text-sm text-foreground/90 break-words leading-relaxed ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin
          contentEditable={<ContentEditable className="ChatMessageBody__readonly" />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <LinkPlugin />
      </LexicalComposer>
    </div>
  );
}
