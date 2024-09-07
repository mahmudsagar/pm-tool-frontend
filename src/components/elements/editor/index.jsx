/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import ContentEditable from './ui/ContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';

import ToolbarPlugin from './plugins/ToolbarPlugin/index';
import { defaultTheme } from './theme/default';
import './style.scss';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/FloatingTextFormatToolbarPlugin';
import { useEffect, useState } from 'react';
import Modal from '../modal';
import DynamicInput from './dynamicInput';

const placeholder = 'Enter some rich text...';

const editorConfig = {
  namespace: 'React.js Demo',
  nodes: [],
  // Handling of errors during update
  onError(error) {
    throw error;
  },
  // The editor theme
  theme: defaultTheme,
};

export default function Editor() {

  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

  const onRef = (_floatingAnchorElem) => {
    console.log('onRef', _floatingAnchorElem);
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

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
    <div className='lexical-editor'>
      <LexicalComposer initialConfig={editorConfig}>
        <div className="editor-container border">
          <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
          <HistoryPlugin />
          <div className="editor-inner min-h-screen" ref={onRef}>

            <RichTextPlugin
              contentEditable={

                <div className="editor-scroller">
                  <div className="editor" ref={onRef}>
                    <ContentEditable className="editor-input"
                      aria-placeholder={placeholder} placeholder={placeholder} />
                    <DynamicInput />
                  </div>
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            {/* <TreeViewPlugin /> */}

            <>
              {floatingAnchorElem && !isSmallWidthViewport && (
                <>
                  <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                  {/* <CodeActionMenuPlugin anchorElem={floatingAnchorElem} /> */}
                  <FloatingLinkEditorPlugin
                    anchorElem={floatingAnchorElem}
                    isLinkEditMode={isLinkEditMode}
                    setIsLinkEditMode={setIsLinkEditMode}
                  />
                  {/* <TableCellActionMenuPlugin
                  anchorElem={floatingAnchorElem}
                  cellMerge={true}
                /> */}
                  <FloatingTextFormatToolbarPlugin
                    anchorElem={floatingAnchorElem}
                    setIsLinkEditMode={setIsLinkEditMode}
                  />
                </>
              )}
            </>
          </div>
        </div>
      </LexicalComposer>
      <Modal />
    </div>
  );
}
