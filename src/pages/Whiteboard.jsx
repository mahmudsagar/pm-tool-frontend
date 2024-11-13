import { useState, useRef, useEffect } from 'react';
import { useLocation, useOutletContext, useParams } from 'react-router-dom';

// utils
import useApi from '@/lib/dataFetcher';
import { baseUrl } from '@/utils/constants';
import { debounce, sanitize } from '@/utils/helper';
import NotFound from '@/BetterRouter/NotFound';
import Link from '@/BetterRouter/Link';

import ExcalidrawRender from "@/components/elements/whiteboard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

import { Copy, History, MessageSquareMore, Share, Trash } from 'lucide-react';

import "@betternotion/excalidraw/index.css";
import Spinner from '@/components/elements/spinner';
import { Button } from '@/components/ui/button';

let firstLoad = true;
export default function Whiteboard() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const { loading, data, callApi, error } = useApi()
  const { pageMeta, ...restData } = data || {}
  const [, setTopMenu] = useOutletContext()

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const handleDelete = () => {
    fetch(baseUrl + '/v1/page/document?id=' + id, { method: 'DELETE', });
  }

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
          <Trash size={12} /> Delete this whiteboard
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

  useEffect(() => {
    console.log({url: baseUrl + '/v1/page/document?id=' + id});
    callApi(baseUrl + '/v1/page/document?id=' + id)
  }, [pathname, id])

  const onChange = debounce((value) => {
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

  if (loading) {
    return <Spinner />
  }

  return (
    <div className="text-center h-full pt-16 -mt-16 overflow-hidden">
      <ExcalidrawRender content={data?.content} onChange={onChange} {...sanitize(pageMeta)} />

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
  )
}
