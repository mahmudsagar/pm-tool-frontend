import { useEffect, useState } from "react";
import {
  Excalidraw,
  getNonDeletedElements,
  getSceneVersion,
  restoreElements,
  MainMenu,
  THEME,
} from "@excalidraw/excalidraw";
import { } from "@excalidraw/excalidraw";

import useSyncStore from '@/stores/useSyncStore';
import { MoonIcon, SunIcon } from "lucide-react";

/**
 * 
 * @param {viewId} viewId of the current page
 * @returns 
 */
export default function Whiteboard({ viewId }) {
  const [isLightTheme, setIsLightTheme] = useState(true);

  // store data
  const { viewData, setViewData } = useSyncStore()

  const [flags, setFlags] = useState({
    justLoaded: true,
    dirty: false,
  })

  const [previousSceneVersion, setPreviousSceneVersion] = useState(0);

  /**
   * Handle drawing element changes
   * @param {Object} elements 
   * @param {Object} state 
   * @returns 
   */
  const handleChange = (elements, state) => {
    // Making sure we are not updating data during element events (drag, resize, edit etc)
    if (
      state.editingElement === null &&
      state.resizingElement === null &&
      state.draggingElement === null &&
      state.editingGroupId === null &&
      state.editingLinearElement === null
    ) {
      // disabled initialData onchange trigger
      if (flags.justLoaded) {
        setFlags(prev => ({
          ...prev,
          justLoaded: false
        }))
        return;
      }

      // Maintaining scene version so data does not update on each state
      const sceneVersion = getSceneVersion(elements);
      // console.log({ sceneVersion, previousSceneVersion, logic: sceneVersion > 0 && sceneVersion !== previousSceneVersion });
      if (sceneVersion > 0 && sceneVersion !== previousSceneVersion) {
        setPreviousSceneVersion(sceneVersion);

        // Send non deleted elements to store state
        setViewData(viewId, getNonDeletedElements(elements));
      }
    }
  }

  return (
    <div className='h-full flex-1 flex flex-col'>
      {/* <div className='flex flex-row gap-4 justify-center py-4'>
          <Button onClick={() => setViewModeEnabled(!viewModeEnabled)}>
            Toggle View Mode
          </Button>
          <Button onClick={() => setZenModeEnabled(!zenModeEnabled)}>
            Toggle Zen Mode
          </Button>
          <Button onClick={() => setGridModeEnabled(!gridModeEnabled)}>
            Toggle Grid Mode
          </Button>
        </div> */}
      <div className='h-screen'>
        <Excalidraw
          theme={isLightTheme ? THEME.LIGHT : THEME.DARK}
          key={viewData[viewId]}
          initialData={{
            elements: viewData?.[viewId]
            // appState: { viewModeEnabled }
          }}
          onChange={handleChange}
        >
          <MainMenu>
            <MainMenu.Item
              icon={isLightTheme ? <MoonIcon /> : <SunIcon />}
              onSelect={() => setIsLightTheme(prev => !prev)}
            >
              {isLightTheme ? 'Dark' : 'Light'} Mode
            </MainMenu.Item>
          </MainMenu>
        </Excalidraw>
      </div>
    </div>
  );
}