import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useEffect, useState } from 'react';
import { debounce } from '@/utils/helper';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Copy, ExternalLink, History, Maximize2, MessageSquareMore } from 'lucide-react';
import Delete from '@/layouts/elements/components/DropdownMenuItems/items/Delete';
import { Button } from '@/components/ui/button';
import PlaygroundNodes from '@/components/elements/editor/nodes/PlaygroundNodes';
import PlaygroundEditorTheme from '@/components/elements/editor/themes/PlaygroundEditorTheme';
import Editor from '@/components/elements/editor/editor';
import SubtaskPanel from '@/components/elements/SubtaskPanel';

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
const Document = ({ pageContent, setTopMenu, handleSubmit, _id, onOpenHistory, assigneeOptions = [], board_id, subtasks = [], board, ...rest }) => {
  const boardFields = board?.custom_meta?.fields || [];
  const [showComments, setShowComments] = useState(false);
  useEffect(() => {
    if (!pageContent) return;
    const dropdownContent = <>
      <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(`/document/${_id}`, '_blank')}>
        <div className='flex items-center gap-1'>
          <ExternalLink size={12} /> Open in new tab
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = `/document/${_id}`}>
        <div className='flex items-center gap-1'>
          <Maximize2 size={12} /> Open in full mode
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/document/${_id}`)}>
        <div className='flex items-center gap-1'>
          <Copy size={12} /> Copy link
        </div>
      </DropdownMenuItem>
      <Delete fileId={_id} fileType="page" />
    </>

    const inlineContent = <>
      <Button variant="ghost" size="icon" onClick={onOpenHistory}>
        <History size={20} />
      </Button>
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
  }, [pageContent, setTopMenu]);

  const onChange = debounce((value) => {
    if (!pageContent) {
      return;
    }

    if (firstLoad) {
      firstLoad = false;
      return;
    }
    handleSubmit(value);
  }, 1000);

  const editorProps = {
    page_id: _id,
    content: pageContent?.content,
    onChange,
    showComments,
    setShowComments,
    assigneeOptions,
    subtaskPanel: board_id ? (
      <div className="mt-4 mb-2">
        <SubtaskPanel
          parentTaskId={_id}
          boardId={board_id}
          subtasks={subtasks}
          boardFields={boardFields}
        />
      </div>
    ) : null,
    ...rest
  }

  return <div className='lexical-editor'>
    <LexicalComposer initialConfig={editorConfig}>
      {pageContent && <Editor {...editorProps} />}
    </LexicalComposer>

  </div>
}

export default Document;