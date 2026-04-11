import { useParams } from 'react-router-dom';
import { useDocument } from '@/hooks/queries/useFilesQueries';
import NotFound from '@/BetterRouter/NotFound';
import Spinner from '@/components/elements/spinner';
import Comment from '@/components/elements/comment';

const CommentPage = ({ ...props }) => {
  const { id } = useParams();
  const paramId = props.id || id;
  const { data, isLoading, isError } = useDocument(paramId);

  if (isError) {
    return <NotFound />
  }

  const commentProps = {
    page_id: data?._id,
    user_id: data?.user_id,
    comments: data?.comments || []
  }

  return (
    <div className='relative h-full'>
      {(isLoading || (!data && !isError)) ?
        <Spinner />
        :
        data && (
          <div className='py-2 px-6 relative'>
            {data?.title && <div className="" style={{ fontWeight: 700, lineHeight: 1.2, fontSize: '32px', cursor: 'text' }}>
              <h1 className="empty:after:content-['Untitled'] after:text-slate-300 outline-none m-0 max-w-full w-full whitespace-pre-wrap break-words pt-[3px] pl-[2px] pr-[2px]">
                {data.title}
              </h1>
            </div>
            }
            <Comment {...commentProps} />
          </div>)
      }
    </div>
  )
}

export default CommentPage;