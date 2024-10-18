/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import ContentEditable from './ui/ContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';

import ToolbarPlugin from './plugins/ToolbarPlugin/index';
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
import ComponentPickerMenuPlugin from './plugins/ComponentPickerPlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import LexicalAutoLinkPlugin from './plugins/AutoLinkPlugin';
import LinkPlugin from './plugins/LinkPlugin';

import YouTubePlugin from './plugins/YouTubePlugin';
import DragDropPaste from './plugins/DragDropPastePlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import InlineImagePlugin from './plugins/InlineImagePlugin';
import { LayoutPlugin } from './plugins/LayoutPlugin/LayoutPlugin';

const placeholder = 'Enter some rich text...';



export default function Editor() {

  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

  const [coverImage, setCoverImage] = useState(null);
  const isEditable = useLexicalEditable();

  const onRef = (_floatingAnchorElem) => {
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

    <div className="editor-container relative">
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
          <h1 className="empty:after:content-['Untitled'] after:text-slate-300 outline-none m-0 max-w-full w-full whitespace-pre-wrap break-words pt-[3px] pl-[2px] pr-[2px]" spellCheck="true" data-content-editable-leaf="true" suppressContentEditableWarning={true} contentEditable="true">Document title</h1>
        </div>
        <DynamicInput />

      </div>
      <Separator />
      <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
      <div className="editor-inner editor-shell min-h-screen">
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
        <DragDropPaste />
        <AutoFocusPlugin />
        <ComponentPickerMenuPlugin />
        <AutoEmbedPlugin />
        <HistoryPlugin />
        <LexicalAutoLinkPlugin />
        <ImagesPlugin />
        <InlineImagePlugin />
        <LinkPlugin />
        <YouTubePlugin />
        <ClickableLinkPlugin disabled={isEditable} />
        <HorizontalRulePlugin />
        <LayoutPlugin />
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
      <Modal />
    </div>
  );
}
