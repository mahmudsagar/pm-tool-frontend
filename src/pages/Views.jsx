import { useParams } from 'react-router-dom';

import Whiteboard from "@/components/views/Whiteboard";

export default function Views() {
  let { viewId } = useParams();
  const viewType = 'whiteboard'; // this should come from api on document type

  if (viewType === 'whiteboard') {
    return (
      <div className="text-center">
        <Whiteboard viewId={viewId} />
      </div>
    )
  }

  return (
    <Whiteboard viewId={viewId} /> // should be default return
  )
}