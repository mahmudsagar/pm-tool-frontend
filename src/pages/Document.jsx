import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useEffect, useState } from 'react';
import { debounce } from '@/utils/helper';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import Link from '@/BetterRouter/Link';
import { Copy, History, MessageSquareMore, Share, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlaygroundNodes from '@/components/elements/editor/nodes/PlaygroundNodes';
import PlaygroundEditorTheme from '@/components/elements/editor/themes/PlaygroundEditorTheme';
import Editor from '@/components/elements/editor/editor';

const editorConfig = {
  namespace: 'BetterNotion Demo',
  nodes: [...PlaygroundNodes],
  // Handling of errors during update
  onError(error) {
    throw error;
  },
  // The editor theme
  theme: PlaygroundEditorTheme,
};
let firstLoad = true;
const Document = ({ pageContent, setTopMenu, setOpenDeleteDialog, handleSubmit, _id, ...rest }) => {
  const [showComments, setShowComments] = useState(false);
  useEffect(() => {
    if (!pageContent) return;
    const dropdownContent = <>
      <DropdownMenuItem className="cursor-pointer">
        <div className='flex items-center gap-1'>
          <Share size={12} /> Share
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(location.href)}>
        <div className='flex items-center gap-1'>
          <Copy size={12} /> Copy link
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => setOpenDeleteDialog(true)}>
        <div className='flex items-center gap-1'>
          <Trash size={12} /> Delete this document
        </div>
      </DropdownMenuItem>
    </>

    const inlineContent = <>
      <Link href="#" className="text-sm font-medium text-primary">
        <Button variant="ghost" size="icon">
          <History size={20} />
        </Button>
      </Link>
      {/* <Link href={`/comment/${_id}`} target="_sidebar" className="text-sm font-medium text-primary">
        <Button variant="ghost" size="icon" onClick={() => setShowComments(prev => !prev)}>
          <MessageSquareMore size={20} />
        </Button>
      </Link> */}
    </>
    setTopMenu({
      dropdownContent,
      inlineContent
    })
  }, [pageContent, setOpenDeleteDialog, setTopMenu]);

  const onChange = debounce((value) => {
    if (!pageContent) {
      return;
    }

    if (firstLoad) {
      firstLoad = false;
      return;
    }
    handleSubmit(value);
  }, 4000);

  const editorProps = {
    page_id: _id,
    content: pageContent?.content?.content,
    onChange,
    showComments,
    setShowComments,
    ...rest
  }

  return <div className='lexical-editor'>
    <LexicalComposer initialConfig={editorConfig}>
      {pageContent && <Editor {...editorProps} />}
    </LexicalComposer>
  </div>
}

export default Document;