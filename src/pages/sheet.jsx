import { DEFAULT_WORKBOOK_DATA } from '@/assets/univer-sheet-data';
import UniverSheet from '@/components/elements/spreadsheet';
import { useEffect, useRef, useState } from 'react';
import Link from '@/BetterRouter/Link';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Copy, LucideHistory, MessageSquareMore, Save, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useApi from '@/lib/dataFetcher';
import { useLocation, useOutletContext, useParams } from 'react-router-dom';
import { baseUrl } from '@/utils/constants';
import Spinner from '@/components/elements/spinner';
import NotFound from '@/BetterRouter/NotFound';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const Sheet = () => {
  const univerRef = useRef();
  const { toast } = useToast();
  const { loading, data, callApi } = useApi();
  const [topMenu, setTopMenu] = useOutletContext();
  const { pathname } = useLocation()
  const { id } = useParams();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const { pageMeta, ...restData } = data || {}

  const handleSaveData = () => {

    const sheetData = univerRef.current?.getData();

    fetch(baseUrl + '/v1/page/document', {
      method: 'PUT',
      body: JSON.stringify({ ...restData, id: data?._id, content: sheetData }),
    });

    toast({
      title: "Current Sheet is saved",
      description: new Date().toLocaleString(),
    })
  }

  useEffect(() => {
    callApi(baseUrl + '/v1/page/document?id=' + id)
  }, [pathname, id])

  const handleDelete = () => {
    fetch(baseUrl + '/v1/page/document?id=' + id,
      {
        method: 'DELETE',
      });
  }

  useEffect(() => {
    if (!data) return;
    const dropdownContent = <>
      <DropdownMenuItem className="cursor-pointer">
        <Link to={window.location.pathname} target="_blank">Open another in new tab</Link>
      </DropdownMenuItem>
      {/* <DropdownMenuItem className="cursor-pointer" onClick={() => window.print()}>
        Print... <MenubarShortcut>⌘P</MenubarShortcut>
      </DropdownMenuItem> */}
      <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(location.href)}>
        <div className='flex items-center gap-1'>
          <Copy size={12} /> Copy link
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => setOpenDeleteDialog(true)}>
        <div className='flex items-center gap-1'>
          <Trash size={12} /> Delete this sheet
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleSaveData}>
        <div className='flex items-center gap-1'>
          <Save size={12} /> Save
        </div>
        {/* <MenubarShortcut>⌘P</MenubarShortcut> */}
      </DropdownMenuItem>
    </>

    const inlineContent = <>
      <Link href="#" className="text-sm font-medium text-primary">
        <Button variant="ghost" size="icon">
          <LucideHistory size={20} />
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

  if (!loading && !data) {
    return <NotFound />
  }
  return (
    <div className='relative h-full'>
      {loading ?
        <Spinner />
        :
        <UniverSheet style={{ flex: 1 }} ref={univerRef} data={data.content} />
      }
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
  );
};

export default Sheet;