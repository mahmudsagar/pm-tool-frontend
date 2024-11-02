import { useParams } from 'react-router-dom';

import ExcalidrawRender from "@/components/elements/whiteboard";
import "@betternotion/excalidraw/index.css";

export default function Whiteboard() {
  let { viewId } = useParams();

  return (
    <div className="text-center h-full pt-16 -mt-16 overflow-hidden">
      <ExcalidrawRender viewId={viewId | '1234'} />
    </div>
  )
}
