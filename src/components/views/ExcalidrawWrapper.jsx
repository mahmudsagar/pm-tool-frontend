import { forwardRef, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

import useSyncStore from "@/stores/useSyncStore";

const ExcalidrawWrapper = forwardRef((props, ref) => {
  const { viewData } = useSyncStore()

  useEffect(() => {
    console.log('useEffect > viewData', viewData[props.viewId]);
    if (!props.flags.justLoaded) {
      console.log("Triggering Restore")
      ref.current.updateScene({
        elements: viewData[props.viewId]
      })
      // restoreElements(viewData[viewId])
    }
  }, [viewData, props.viewId])

  return (
    <Excalidraw
      ref={ref}
      initialData={props.initialData}
      onChange={props.initialData.handleChange}
    />
  )
})

ExcalidrawWrapper.displayName = 'ExcalidrawWrapper'

export default ExcalidrawWrapper
