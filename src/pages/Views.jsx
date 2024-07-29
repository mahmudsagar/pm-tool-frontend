import Whiteboard from "@/components/views/Whiteboard";
import { useParams } from 'react-router-dom';

export default function Views() {
  let { viewId } = useParams();

  return (
    <Whiteboard viewId={viewId} />
  )
}