import { DEFAULT_WORKBOOK_DATA } from '@/assets/univer-sheet-data';
import UniverSheet from '@/components/elements/spreadsheet';
import { useRef, useState } from 'react';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import Link from '@/BetterRouter/Link';
import { useToast } from '@/components/ui/use-toast';

const Sheet = () => {
  const [data] = useState(DEFAULT_WORKBOOK_DATA);
  const univerRef = useRef();
  const { toast } = useToast();

  const handleSaveData = () => {

    console.log(univerRef.current?.getData());

    toast({
      title: "Current Sheet is saved",
      description: new Date().toLocaleString(),
    })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Link to={window.location.pathname} target="_blank">Open another in new tab</Link>
              {/* <MenubarShortcut>⌘T</MenubarShortcut> */}
            </MenubarItem>
            <MenubarItem disabled>
              New Window <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Share</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onClick={() => navigator.clipboard.writeText(location.href)}>Copy link</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem onClick={() => window.print()}>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleSaveData}>
              Save
              {/* <MenubarShortcut>⌘P</MenubarShortcut> */}
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>
              Always Show Full URLs
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>
              Reload <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled inset>
              Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Toggle Fullscreen</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Hide Sidebar</MenubarItem>
          </MenubarContent>
        </MenubarMenu> */}
      </Menubar>
      <UniverSheet style={{ flex: 1 }} ref={univerRef} data={data} />
    </div>
  );
};

export default Sheet;