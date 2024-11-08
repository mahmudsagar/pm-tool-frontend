import { LexicalComposer } from '@lexical/react/LexicalComposer';
import useApi from '@/lib/dataFetcher';
import { useEffect, useState } from 'react';
import { useLocation, useOutletContext, useParams } from 'react-router-dom';
import { baseUrl } from '@/utils/constants';
import { debounce, sanitize } from '@/utils/helper';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import Link from '@/BetterRouter/Link';
import { Copy, History, MessageSquareMore, Share, Trash } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import NotFound from '@/BetterRouter/NotFound';
import { Button } from '@/components/ui/button';
import PlaygroundNodes from '@/components/elements/editor/nodes/PlaygroundNodes';
import PlaygroundEditorTheme from '@/components/elements/editor/themes/PlaygroundEditorTheme';
import Editor from '@/components/elements/editor/editor';
import Spinner from '@/components/elements/spinner';

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
export const Document = () => {
  const { loading, data, callApi, error } = useApi();
  const [topMenu, setTopMenu] = useOutletContext();
  const { pathname } = useLocation()
  const { id } = useParams();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const { pageMeta, ...restData } = data || {}

  useEffect(() => {
    if (!data) return;
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
      <Link href="#" className="text-sm font-medium text-primary">
        <Button variant="ghost" size="icon">
          <MessageSquareMore size={20} />
        </Button>
      </Link>
    </>

    setTopMenu({
      dropdownContent,
      inlineContent
    })
  }, [data]);

  const handleDelete = () => {
    fetch(baseUrl + '/v1/page/document?id=' + id,
      {
        method: 'DELETE',
      });
  }

  useEffect(() => {
    debounce(() => {
      callApi(baseUrl + '/v1/page/document?id=' + id)
    }, 1000)();
  }, [pathname, id])

  const onChange = debounce((value) => {
    console.log('onChange', value);
    if (!data) {
      return;
    }

    if (firstLoad) {
      firstLoad = false;
      return;
    }

    fetch(baseUrl + '/v1/page/document', {
      method: 'PUT',
      body: JSON.stringify({ ...restData, id: data?._id, ...sanitize(value) }),
    });
  }, 4000);

  if (error) {
    return <NotFound />
  }
  return <div className='lexical-editor relative h-full'>
    {loading ?
      <Spinner />
      :
      <LexicalComposer initialConfig={editorConfig}>
        {data?.content && <Editor onChange={onChange} content={data.content} {...sanitize(pageMeta)} />}
      </LexicalComposer>}

    <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure to proceed?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this
            document.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}