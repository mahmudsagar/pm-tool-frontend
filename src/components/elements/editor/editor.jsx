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
import { mediaBaseUrl } from '@/utils/constants';
import Spinner from '../spinner';
import { sanitize } from '@/utils/helper';
import { cn } from '@/lib/utils';
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
import Comment from '../comment';
const EMPTY_CONTENT =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

const placeholder = 'Enter some rich text...';
export default function Editor({ title, content, page_id, user_id, custom_meta, comments, mediaAttachments, onChange, showComments, setShowComments }) {
  const [editor] = useLexicalComposerContext()
  const { loading: imageLoading, data: imageData, callApi: uploadImage } = useApi();
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

  const [coverImage, setCoverImage] = useState(sanitize(mediaAttachments, 'array').find(media => media.media_type === 'cover_photo'));
  const isEditable = useLexicalEditable();

  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentEditorState, setCurrentEditorState] = useState(typeof content === 'string' ? content : EMPTY_CONTENT);
  const [currentCustomFields, setCurrentCustomFields] = useState(custom_meta);
  const [currentComments, setCurrentComments] = useState(comments);
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

  const handleOnChange = (values) => {
    onChange(values);
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
    const file = files[0];
    const formData = new FormData()
    formData.append('media_type', 'cover_photo')
    formData.append('reference_id', page_id)
    formData.append('caption', ' ')
    formData.append('reference_for', 'page')

    formData.append('file', file.File)
    if (file) {
      uploadImage(mediaBaseUrl, {
        method: 'POST',
        body: formData
      })
    }
  }

  useEffect(() => {
    if (imageData?.url) {
      setCoverImage(imageData)
    }
  }, [imageData])

  const handleCoverRemove = () => {
    uploadImage(mediaBaseUrl + '?id=' + coverImage?._id + '&reference_for=page',
      {
        method: 'DELETE'
      }, () => {

        setCoverImage(null)
      })
  }

  return (
    <div className="editor-container relative">
      {coverImage?.url &&
        <div
          className="relative h-52 cover-image-container group"
          style={{
            backgroundImage: `url(${coverImage?.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {imageLoading ?
            <Spinner className="absolute inset-0" />
            :
            <Button onClick={handleCoverRemove} variant="outline" className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-70">
              Remove cover
            </Button>}
        </div>
      }
      <div className='py-2 px-6 mb-4 relative'>
        {!coverImage?.url && <div className={cn('h-10', imageLoading ? '' : 'opacity-0 hover:opacity-100')}>
          {imageLoading ?
            <Spinner className="absolute inset-0" />
            :
            <ImageUpload onChange={coverImageUploadHandler} >
              <Button variant="secondary" className="opacity-60 ">
                <Image size={15} className='mr-1' />
                Add a cover
              </Button>
            </ImageUpload>}
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
          handleOnChange({ title: currentTitle, content: currentEditorState, custom_meta, comments: currentComments });
        }} />
        <Comment {...{ page_id, user_id }} />
      </div>
      <Separator />
      <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
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
        <AutoFocusPlugin />
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
        <HorizontalRulePlugin />
        <LayoutPlugin />
        <CommentPlugin showComments={showComments} setShowComments={setShowComments} onChange={(comments) => {
          setCurrentComments(comments);
          handleOnChange({ title: currentTitle, content: currentEditorState, custom_meta: currentCustomFields, comments });
        }} />
        <TablePlugin hasCellMerge={true}
          hasCellBackgroundColor={true} />
        <TableCellResizerPlugin />
        <TableHoverActionsPlugin />
        <OnChangePlugin onChange={editorState => {
          editorState.read(() => {
            const content = JSON.stringify(editorState);
            setCurrentEditorState(content);
            handleOnChange({ title: currentTitle, content, custom_meta: currentCustomFields, comments: currentComments });
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
