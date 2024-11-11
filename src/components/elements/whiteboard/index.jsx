import { useState, useRef } from "react";
import {
  Excalidraw,
  MainMenu,
  Footer,
  convertToExcalidrawElements,
  getNonDeletedElements,
  getSceneVersion,
} from "@betternotion/excalidraw";

import { StickyNote } from "lucide-react";

import useSyncStore from '@/stores/useSyncStore';
import { useTheme } from "@/components/theme-provider";
// import CustomLibrary from "./custom-library";

import { PAGE_EMBED, STICKY_NOTE } from './constants';
import PageEmbed from "./PageEmbed";
import useDocumentStore from "@/stores/useDocumentStore";

/**
 * 
 * @param {viewId} viewId of the current page
 * @returns 
 */
export default function ExcalidrawRender({ viewId }) {
  const { documentData, loading } = useDocumentStore(state => state);

  const { theme } = useTheme();
  const wrapperRef = useRef(null);

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
        ...STICKY_NOTE,
        x: -scrollX + 200,
        y: -scrollY + 200,
      }
    ]);

    // Update the scene with the new element
    const elements = [
      ...excalidrawAPI.getSceneElements(),
      ...newStickyNote
    ]

    excalidrawAPI.updateScene({ elements });
  };

  const createPageEmbed = (id) => {
    const { scrollX, scrollY } = excalidrawAPI.getAppState();
    const newStickyNote = convertToExcalidrawElements([
      {
        ...PAGE_EMBED,
        link: `betternotion:${id}`,
        x: -scrollX + 200,
        y: -scrollY + 200,
      }
    ]);

    // Update the scene with the new element
    const elements = [
      ...excalidrawAPI.getSceneElements(),
      ...newStickyNote
    ]

    excalidrawAPI.updateScene({ elements });
  }

  /**
   * Handle drawing element changes
   * @param {Object} elements 
   * @param {Object} state 
   * @returns 
   */
  const handleChange = (elements, state) => {
    // Making sure we are not updating data during element events (drag, resize, edit etc)
    if (
      state.resizingElement === null &&
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

        console.log('is saving!');
        // Send non deleted elements to store state
        setViewData(viewId, {
          data: getNonDeletedElements(elements),
          // clientId: clientId
        });
      }
    }
  }

  if(loading.document) {
    return null
  }

  return (
    <div className='h-full relative' ref={wrapperRef}>
      {/* <pre className="text-start text-xs overflow-y-scroll h-16 p-4 bg-green-200">
        {JSON.stringify(viewData?.[viewId]?.data, null, 2)}
      </pre> */}
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          elements: documentData?.[viewId]?.data || [],
          appState: {
            currentItemRoughness: 0,
            currentItemRoundness: 'round',
            currentItemEndArrowhead: 'triangle',
            currentChartType: 'line'
          }
        }}
        theme={theme}
        onChange={handleChange}
        // renderTopRightUI={() => {
        //   return (
        //     <Sidebar.Trigger
        //       name="custom-library"
        //       tab="one"
        //       icon={<BookIcon />}
        //     >
        //       Library
        //     </Sidebar.Trigger>
        //   );
        // }}
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
            icon={<StickyNote />}
            onSelect={() => createStickyNote()}
          >
            Insert Sticky Note
          </MainMenu.Item>
        </MainMenu>
        <Footer>
          <PageEmbed onSelect={(id) => createPageEmbed(id)} />
        </Footer>
        {/* <CustomLibrary excalidrawAPI={excalidrawAPI} /> */}
      </Excalidraw>
      {/* json data view */}
    </div>
  );
}