import { Button } from "@/components/ui/button";
import Whiteboard from "@/components/views/Whiteboard";
import { useState } from "react";
import { useParams } from 'react-router-dom';

export default function Views() {
  let { viewId } = useParams();
  const viewType = 'whiteboard'; // this should come from api on document type
  const [isLightTheme, setIsLightTheme] = useState(true);

  if (viewType === 'whiteboard') {
    return (
      <div className="text-center">
        <Button onClick={() => setIsLightTheme(prev => !prev)} className="mb-4">
          Theme Toggle
        </Button>
        <Whiteboard viewId={viewId} theme={isLightTheme ? "light" : "dark"} />
      </div>
    )
  }

  return (
    <Whiteboard viewId={viewId} /> // should be default return
  )
}