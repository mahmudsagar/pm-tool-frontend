import { useEffect, useState } from 'react';
import { Sidebar, convertToExcalidrawElements, exportToBlob, exportToSvg } from '@betternotion/excalidraw';

import { Button } from '@/components/ui/button';
import { STICKY_NOTE } from './constants';
import { Loader } from 'lucide-react';

export default function CustomLibrary({ excalidrawAPI }) {
  const [libraryitems, setLibraryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const svgPromises = [1,2,3].map(async (data) => ({
        id: data,
        data: STICKY_NOTE,
        name: 'Sticky Note',
        preview: await exportToSvg({
          elements: [STICKY_NOTE], // JSON elements
          appState: { viewBackgroundColor: 'transparent' },// Background color 
        })
      }));

      const svgs = await Promise.all(svgPromises); // Wait for all SVGs to generate
      console.log(svgs);
      setLibraryItems(svgs);
      setLoading(false);
    })();
  }, [])

  const insertTemplate = () => {
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

  return (
    <Sidebar name="custom-library" docked={true}>
      <Sidebar.Header className="text-[var(--color-primary)] text-lg font-bold text-ellipsis whitespace-nowrap pe-4">
        Custom Library
      </Sidebar.Header>
      <Sidebar.Tabs style={{ padding: "0.5rem" }}>
        <Sidebar.Tab tab="one">
          {loading ? (
            <Loader />
          ) : (
            <ul>
              {libraryitems.map((item) => (
                <li key={item.id}>
                  <Button onClick={() => insertTemplate(item.id)} as="span">
                    {item.name}
                    <div dangerouslySetInnerHTML={{ __html: item.preview }} />
                    {/* {(() => {
                      console.log(item.preview)
                    })()} */}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Sidebar.Tab>
        <Sidebar.Tab tab="two">Professional!</Sidebar.Tab>
        <Sidebar.TabTriggers>
          <Sidebar.TabTrigger tab="one">Personal</Sidebar.TabTrigger>
          <Sidebar.TabTrigger tab="two">Professional</Sidebar.TabTrigger>
        </Sidebar.TabTriggers>
      </Sidebar.Tabs>
    </Sidebar>
  )
}