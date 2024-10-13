import { useState } from "react";
import {
  Excalidraw,
  getNonDeletedElements,
  getSceneVersion,
  MainMenu,
  Sidebar,
  convertToExcalidrawElements
} from "@excalidraw/excalidraw";

import useSyncStore from '@/stores/useSyncStore';
import { ComponentIcon, SunIcon } from "lucide-react";
import WhiteboardSidebar from "./WhiteboardSidebar";
import ExcalidrawSideMenubar from "./ExcalidrawSideMenubar";

/**
 * 
 * @param {viewId} viewId of the current page
 * @returns 
 */
export default function Whiteboard({ viewId }) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  // store data
  const { viewData, setViewData } = useSyncStore()

  const [flags, setFlags] = useState({
    justLoaded: true,
    dirty: false,
  })

  const [previousSceneVersion, setPreviousSceneVersion] = useState(0);
  const createStickyNote = () => {
    const { scrollX, scrollY } = excalidrawAPI.getAppState();
    const newStickyNote = convertToExcalidrawElements([
      {
        type: "rectangle",
        x: -scrollX + 200,
        y: -scrollY + 200,
        width: 200,
        height: 200,
        opacity: 100,
        roughness: 1,
        strokeWidth: 2,
        strokeStyle: "solid",
        strokeColor: "#c2255c",
        fillStyle: "solid",
        backgroundColor: "transparent",
        locked: false,
        label: {
          text: "New Sticky Note",
          textAlign: "left",
          verticalAlign: "top",
          fontSize: 20,
        },
      }
    ]);

    // Update the scene with the new element
    const elements = [
      ...excalidrawAPI.getSceneElements(),
      ...newStickyNote
    ]

    excalidrawAPI.updateScene({ elements });
  };

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
      if (sceneVersion > 0 && sceneVersion !== previousSceneVersion) {
        setPreviousSceneVersion(sceneVersion);

        // Send non deleted elements to store state
        setViewData(viewId, {
          data: getNonDeletedElements(elements),
          // clientId: clientId
        });
      }
    }
  }

  return (
    <div className='h-screen relative'>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          elements: viewData?.[viewId]?.data || [],
          appState: {
            currentItemRoughness: 0,
            currentItemRoundness: 'round',
            currentItemEndArrowhead: 'triangle',
            currentChartType: 'line'
          }
        }}
        onChange={handleChange}
        renderTopRightUI={() => {
          return (
            <Sidebar.Trigger
              name="custom"
              tab="one"
              icon={<ComponentIcon />}
            >
              Custom Library
            </Sidebar.Trigger>
          );
        }}
      >
        <MainMenu>
          {/* <MainMenu.DefaultItems.LoadScene /> */}
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <hr className="my-2" />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <hr className="my-2" />
          <MainMenu.Item
            icon={<SunIcon />}
            onSelect={() => createStickyNote()}
          >
            Insert Sticky
          </MainMenu.Item>
        </MainMenu>
        <WhiteboardSidebar />
      </Excalidraw>
      <ExcalidrawSideMenubar />
      {/* json data view */}
      {/* <pre className="text-start text-xs overflow-y-scroll h-screen p-4 bg-green-200">
          {JSON.stringify(viewData[viewId]?.data, null, 2)}
        </pre> */}
    </div>
  );
}