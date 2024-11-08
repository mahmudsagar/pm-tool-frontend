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
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
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
import ListMaxIndentLevelPlugin from './plugins/ListMaxIndentLevelPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import useApi from '@/lib/dataFetcher';
import { baseUrl } from '@/utils/constants';
const EMPTY_CONTENT =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

const placeholder = 'Enter some rich text...';
export default function Editor({ title, content, page_content_id, custom_meta, onChange }) {
  const [editor] = useLexicalComposerContext()
  const { loading: imageUploading, data:imageData, callApi:uploadImage } = useApi();
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

  const [coverImage, setCoverImage] = useState(null);
  const isEditable = useLexicalEditable();

  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentEditorState, setCurrentEditorState] = useState(typeof content === 'string' ? content : EMPTY_CONTENT);
  const [currentCustomFields, setCurrentCustomFields] = useState(custom_meta);

  const onRef = (_floatingAnchorElem) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  useEffect(() => {
    const state = editor.parseEditorState(
      currentEditorState || editor.getEditorState()
    )
    editor.setEditorState(state)
  }, [editor])

  const handleOnChange = ({ title, content, custom_meta }) => {
    onChange({ title, content, custom_meta });
  }

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
    const file = files[0];
    const formData = new FormData()
    formData.append('media_type', 'cover_photo')
    formData.append('reference_id', page_content_id)
    formData.append('caption', ' ')

    formData.append('file', file.File)
    if (file) {
      uploadImage(baseUrl + '/v1/upload/media', {
        method: 'POST',
        body: formData
      })
    }
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
            backgroundImage: `url(${imageData?.url})`,
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
        </div>
        }

        <div className="" style={{ fontWeight: 700, lineHeight: 1.2, fontSize: '32px', cursor: 'text' }}>
          <h1 onInput={e => {
            const title = e.target.innerText;
            setCurrentTitle(title);
            handleOnChange({ title, content: currentEditorState, custom_meta: currentCustomFields });
          }} className="empty:after:content-['Untitled'] after:text-slate-300 outline-none m-0 max-w-full w-full whitespace-pre-wrap break-words pt-[3px] pl-[2px] pr-[2px]" spellCheck="true" data-content-editable-leaf="true" suppressContentEditableWarning={true} contentEditable="true">
            {title || "Document title"}
          </h1>
        </div>
        <DynamicInput initialData={custom_meta} onChange={(custom_meta) => {
          setCurrentCustomFields(custom_meta);
          handleOnChange({ title: currentTitle, content: currentEditorState, custom_meta });
        }} />

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
        <ListPlugin />
        <CheckListPlugin />
        <ListMaxIndentLevelPlugin maxDepth={7} />
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
        <OnChangePlugin onChange={editorState => {
          editorState.read(() => {
            const content = JSON.stringify(editorState);
            setCurrentEditorState(content);
            handleOnChange({ title: currentTitle, content, custom_meta: currentCustomFields });
          });
        }} />
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
