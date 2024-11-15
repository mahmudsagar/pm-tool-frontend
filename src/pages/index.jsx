import useApi from '@/lib/dataFetcher';
import { useEffect, useState } from 'react';
import { useLocation, useOutletContext, useParams } from 'react-router-dom';
import { documentBaseUrl } from '@/utils/constants';
import { debounce, sanitize } from '@/utils/helper';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import NotFound from '@/BetterRouter/NotFound';
import Spinner from '@/components/elements/spinner';
import Document from './Document';
import Sheet from './Sheets';

const pageType = {
  document: Document,
  sheet: Sheet,
}
const Page = () => {
  const { loading, data, callApi, error } = useApi();
  const [, setTopMenu] = useOutletContext();
  const { pathname } = useLocation()
  const { id } = useParams();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const { page_type, ...restData } = data || {}

  useEffect(debounce(() => {
    callApi(documentBaseUrl + '?id=' + id)
  }, 1000), [pathname, id])

  const handleDelete = () => {
    callApi(documentBaseUrl + '?id=' + id,
      {
        method: 'DELETE',
      }, () => {
        //window.location.reload();
      });
  }

  const handleSubmit = (value) => {
    fetch(documentBaseUrl, {
      method: 'PUT',
      body: JSON.stringify({ id: data?._id, ...sanitize(value) }),
    });
  }

  if (error) {
    return <NotFound />
  }

  if (!data) return null;

  const componentProps = {
    ...restData,
    setTopMenu,
    setOpenDeleteDialog,
    handleSubmit
  }


  const Component = pageType[page_type] || NotFound;
  return <div className='relative h-full'>
    {(loading || (!data && !error)) ?
      <Spinner />
      :
      <Component {...componentProps} />
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
}

export default Page;