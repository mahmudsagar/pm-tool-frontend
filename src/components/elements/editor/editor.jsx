/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import ContentEditable from './ui/ContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin/index';
import './style.scss';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/FloatingTextFormatToolbarPlugin';
import { useEffect, useRef, useState } from 'react';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import Modal from '../modal';
import ComponentPickerMenuPlugin from './plugins/ComponentPickerPlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import LexicalAutoLinkPlugin from './plugins/AutoLinkPlugin';
import LinkPlugin from './plugins/LinkPlugin';
import YouTubePlugin from './plugins/YouTubePlugin';
import DragDropPaste from './plugins/DragDropPastePlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import InlineImagePlugin from './plugins/InlineImagePlugin';
import { LayoutPlugin } from './plugins/LayoutPlugin/LayoutPlugin';
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';

import TableCellResizerPlugin from './plugins/TableCellResizer';
import TableHoverActionsPlugin from './plugins/TableHoverActionsPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import CommentPlugin from './plugins/CommentPlugin';
import PageBreakPlugin from './plugins/PageBreakPlugin';
import CollapsiblePlugin from './plugins/CollapsiblePlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import FigmaPlugin from './plugins/FigmaPlugin';
import PollPlugin from './plugins/PollPlugin';
const EMPTY_CONTENT =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

const placeholder = "Type '/' for commands…";

/**
 * Lexical body: toolbar, content and plugins. Page chrome (cover, icon, title,
 * properties, comments) lives in the document page.
 * onChange receives partial page updates: { content } and/or { inner_comments }.
 */
export default function Editor({ content, page_id, onChange, onTextChange, showComments, setShowComments, editable = true }) {
  const [editor] = useLexicalComposerContext()
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);
  const isEditable = useLexicalEditable();
  const initialContent = useRef(typeof content === 'string' ? content : EMPTY_CONTENT);
  const onRef = (_floatingAnchorElem) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  useEffect(() => {
    try {
      editor.setEditorState(editor.parseEditorState(initialContent.current || editor.getEditorState()));
    } catch {
      // Unparseable stored content: start empty rather than crash the page.
    }
  }, [editor])

  useEffect(() => {
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport =
        window.matchMedia('(max-width: 1025px)').matches;

      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);

  return (
    <div className="editor-container relative" data-page-id={page_id}>
      {editable && <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />}
      <div className="editor-inner editor-shell min-h-screen">
        <RichTextPlugin
          contentEditable={
            <div className="editor-scroller">
              <div className="editor" ref={onRef}>
                <ContentEditable className="editor-input" spellCheck="false"
                  aria-placeholder={placeholder} placeholder={placeholder} />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <CheckListPlugin />
        <ListMaxIndentLevelPlugin maxDepth={7} />
        <DragDropPaste />
        <ComponentPickerMenuPlugin />
        <AutoEmbedPlugin />
        <HistoryPlugin />
        <LexicalAutoLinkPlugin />
        <ImagesPlugin />
        <InlineImagePlugin />
        <CollapsiblePlugin />
        <PageBreakPlugin />
        <LinkPlugin />
        <PollPlugin />
        <TwitterPlugin />
        <YouTubePlugin />
        <FigmaPlugin />
        <ClickableLinkPlugin disabled={isEditable} />
        <CodeHighlightPlugin />
        <HorizontalRulePlugin />
        <LayoutPlugin />
        <CommentPlugin showComments={showComments} setShowComments={setShowComments} onChange={(comments) => onChange({ inner_comments: comments })} />
        <TablePlugin hasCellMerge={true}
          hasCellBackgroundColor={true} />
        <TableCellResizerPlugin />
        <TableHoverActionsPlugin />
        <OnChangePlugin ignoreSelectionChange ignoreHistoryMergeTagChange onChange={editorState => {
          const serialized = JSON.stringify(editorState);
          if (serialized === initialContent.current) return;
          initialContent.current = serialized;
          onChange({ content: serialized });
          onTextChange?.(serialized);
        }} />
        <>
          {floatingAnchorElem && !isSmallWidthViewport && editable && (
            <>
              <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
              {/* <CodeActionMenuPlugin anchorElem={floatingAnchorElem} /> */}
              <FloatingLinkEditorPlugin
                anchorElem={floatingAnchorElem}
                isLinkEditMode={isLinkEditMode}
                setIsLinkEditMode={setIsLinkEditMode}
              />
              <TableCellActionMenuPlugin
                anchorElem={floatingAnchorElem}
                cellMerge={true}
              />
              <FloatingTextFormatToolbarPlugin
                anchorElem={floatingAnchorElem}
                setIsLinkEditMode={setIsLinkEditMode}
              />
            </>
          )}
        </>
      </div>
      <Modal />
    </div>
  );
}
