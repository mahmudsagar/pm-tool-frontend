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
import { Button } from '@/components/ui/button';
import { Image } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ImageUpload from './upload/image';

const placeholder = 'Enter some rich text...';

const editorConfig = {
  namespace: 'BetterNotion Demo',
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

  const [coverImage, setCoverImage] = useState(null);

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

  const coverImageUploadHandler = (files) => {
    console.log('coverImageUploadHandler', files);
    setCoverImage(files[0]);
  }

  const handleCoverRemove = () => {
    setCoverImage(null);
  }

  return (
    <div className='lexical-editor'>

      <LexicalComposer initialConfig={editorConfig}>
        <div className="editor-container relative">

          {/* <div className="min-h-6 py-2 px-3 shadow">
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="icon">
                <History size={15} />
              </Button>
              <Button variant="ghost" size="icon">
                <MessageSquareMore size={15} />
              </Button>
              <Button variant="ghost" size="icon">
                <Star size={15} />
              </Button>
            </div>


          </div> */}


          {coverImage &&
            <div
              className="relative h-52 cover-image-container group"
              style={{
                backgroundImage: `url(${URL.createObjectURL(coverImage.File)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <Button onClick={handleCoverRemove} variant="outline" className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-70">
                Remove cover
              </Button>
            </div>

          }
          <div className='py-2 px-6 mb-4'>

            {!coverImage && <div className='h-10 opacity-0 hover:opacity-100'>
              <ImageUpload onChange={coverImageUploadHandler} >
                <Button variant="secondary" className="opacity-60 ">
                  <Image size={15} className='mr-1' />
                  Add a cover
                </Button>
              </ImageUpload>
            </div>}

            <div className="" style={{ fontWeight: 700, lineHeight: 1.2, fontSize: '32px', cursor: 'text' }}>
              <h1 className="empty:after:content-['Untitled'] after:text-slate-300 outline-none m-0" spellCheck="true" data-content-editable-leaf="true" contentEditable="true" style={{ maxWidth: '100%', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingTop: '3px', paddingLeft: '2px', paddingRight: '2px', fontSize: '1em' }}>Document title</h1>
            </div>

            <DynamicInput />

          </div>
          <Separator />
          <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
          <HistoryPlugin />
          <div className="editor-inner min-h-screen" ref={onRef}>

            <RichTextPlugin
              contentEditable={

                <div className="editor-scroller">
                  <div className="editor" ref={onRef}>
                    <ContentEditable className="editor-input"
                      aria-placeholder={placeholder} placeholder={placeholder} />
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
