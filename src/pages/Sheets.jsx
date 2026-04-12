import UniverSheet from '@/components/elements/spreadsheet';
import { useEffect, useRef, useState } from 'react';
import Link from '@/BetterRouter/Link';
import { useToast } from '@/components/ui/use-toast';
import { debounce } from '@/utils/helper';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Copy, LucideHistory, MessageSquareMore, Save, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
const Sheet = ({ pageContent, setTopMenu, setOpenDeleteDialog, handleSubmit, _id, onOpenHistory, ...props }) => {
  const univerRef = useRef();
  const { toast } = useToast();
  const [firstLoad, setFirstLoad] = useState(true);

  const handleSaveData = () => {
    const sheetData = univerRef.current?.getData();
    handleSubmit({ content: sheetData });
    toast({
      title: "Current Sheet is saved",
      description: new Date().toLocaleString(),
    })
  }

  const onChange = debounce((sheetData) => {
    if (!pageContent) {
      return;
    }

    if (firstLoad) {
      setFirstLoad(false);
      return;
    }
    handleSubmit({ content: sheetData });
  }, 4000);

  useEffect(() => {
    if (!pageContent) return;
    const dropdownContent = <>
      <DropdownMenuItem className="cursor-pointer">
        <Link to={window.location.pathname} target="_blank">Open another in new tab</Link>
      </DropdownMenuItem>
      {/* <DropdownMenuItem className="cursor-pointer" onClick={() => window.print()}>
        Print... <MenubarShortcut>⌘P</MenubarShortcut>
      </DropdownMenuItem> */}
      <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/sheet/${_id}`)}>
        <div className='flex items-center gap-1'>
          <Copy size={12} /> Copy link
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => setOpenDeleteDialog(true)}>
        <div className='flex items-center gap-1'>
          <Trash size={12} /> Delete this sheet
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleSaveData} className="cursor-pointer">
        <div className='flex items-center gap-1'>
          <Save size={12} /> Save
        </div>
        {/* <MenubarShortcut>⌘P</MenubarShortcut> */}
      </DropdownMenuItem>
    </>

    const inlineContent = <>
      <Button variant="ghost" size="icon" onClick={onOpenHistory}>
        <LucideHistory size={20} />
      </Button>
      <Link href={`/comment/${_id}`} target="_sidebar" className="text-sm font-medium text-primary">
        <Button variant="ghost" size="icon">
          <MessageSquareMore size={20} />
        </Button>
      </Link>
    </>

    setTopMenu({
      dropdownContent,
      inlineContent
    })
    setFirstLoad(true);
  }, [pageContent]);
  return (
    pageContent ? (
        <UniverSheet
          key={_id}
          style={{ flex: 1 }}
          ref={univerRef}
          data={pageContent?.content || {}}
          onChange={onChange}
          handleSubmit={handleSubmit}
        />
    ) : null
  );
};

export default Sheet;