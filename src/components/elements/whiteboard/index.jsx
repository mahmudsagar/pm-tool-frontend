import { useState, useRef, useCallback } from 'react';
import {
  Excalidraw,
  MainMenu,
  Footer,
  convertToExcalidrawElements,
  getNonDeletedElements,
  getSceneVersion,
} from "@betternotion/excalidraw";

import { StickyNote } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

import { PAGE_EMBED, STICKY_NOTE } from './constants';
import PageEmbed from "./PageEmbed";

/**
 * 
 * @param {viewId} viewId of the current page
 * @returns 
 */
export default function ExcalidrawRender({ content, onChange, spaceId }) {
  const { theme } = useTheme();
  const wrapperRef = useRef(null);

  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const setExcalidrawAPICallback = useCallback((api) => setExcalidrawAPI(api), []);

  // Refs for values only used in handleChange — avoids re-renders and keeps handleChange stable
  const justLoadedRef = useRef(true);
  const previousSceneVersionRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const contentRef = useRef(content);
  contentRef.current = content;
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

    const settings = {
      locked: excalidrawAPI.getAppState()?.activeTool?.locked
    }

    excalidrawAPI.updateScene({ elements });
    onChangeRef.current({ content: { elements, settings } })
  }

  /**
   * Handle drawing element changes
   * @param {Object} elements 
   * @param {Object} state 
   * @returns 
   */
  const handleChange = useCallback((elements, state) => {
    // Making sure we are not updating data during element events (drag, resize, edit etc)
    if (
      state.resizingElement === null &&
      state.editingGroupId === null &&
      state.editingLinearElement === null
    ) {
      // disabled initialData onchange trigger
      if (justLoadedRef.current) {
        justLoadedRef.current = false;
        return;
      }
      
      // Maintaining scene version so data does not update on each state
      const sceneVersion = getSceneVersion(elements);

      if (
        (sceneVersion > 0 && sceneVersion !== previousSceneVersionRef.current) ||
        (!!state?.activeTool?.locked !== !!contentRef.current?.settings?.locked)
      ) {
        previousSceneVersionRef.current = sceneVersion;

        // Send non deleted elements to store state
        onChangeRef.current({ content: {
          elements: getNonDeletedElements(elements),
          settings: {
            locked: state?.activeTool?.locked
          }
        }})
      }
    }
  }, []);

  return (
    <div className='h-full relative' ref={wrapperRef}>
      {/* <pre className="text-start text-xs overflow-y-scroll h-16 p-4 bg-green-200">
        {JSON.stringify(viewData?.[viewId]?.data, null, 2)}
      </pre> */}
      <Excalidraw
        excalidrawAPI={setExcalidrawAPICallback}
        initialData={{
          elements: Array.isArray(content?.elements) ? content?.elements : [],
          appState: {
            currentItemRoughness: 0,
            currentItemRoundness: 'round',
            currentItemEndArrowhead: 'triangle',
            currentChartType: 'line',
            activeTool: {
              locked: content?.settings?.locked
            }
          }
        }}
        theme={theme}
        onChange={handleChange}
      >
        <MainMenu>
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
          <PageEmbed spaceId={spaceId} onSelect={(id) => createPageEmbed(id)} />
        </Footer>
      </Excalidraw>
    </div>
  );
}