import UniverSheet from '@/components/elements/spreadsheet';
import { useEffect, useRef } from 'react';
import Link from '@/BetterRouter/Link';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Copy, LucideHistory, MessageSquareMore, Save, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
const Sheet = ({ pageContent, setTopMenu, setOpenDeleteDialog, handleSubmit, _id, ...props }) => {
  const univerRef = useRef();
  const { toast } = useToast();

  const handleSaveData = () => {
    const sheetData = univerRef.current?.getData();
    handleSubmit({ content: sheetData });
    toast({
      title: "Current Sheet is saved",
      description: new Date().toLocaleString(),
    })
  }

  useEffect(() => {
    if (!pageContent) return;
    const dropdownContent = <>
      <DropdownMenuItem className="cursor-pointer">
        <Link to={window.location.pathname} target="_blank">Open another in new tab</Link>
      </DropdownMenuItem>
      {/* <DropdownMenuItem className="cursor-pointer" onClick={() => window.print()}>
        Print... <MenubarShortcut>⌘P</MenubarShortcut>
      </DropdownMenuItem> */}
      <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(location.href)}>
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
      <Link href="#" className="text-sm font-medium text-primary">
        <Button variant="ghost" size="icon">
          <LucideHistory size={20} />
        </Button>
      </Link>
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
  }, [pageContent]);
  return (
    pageContent?.content && <UniverSheet style={{ flex: 1 }} ref={univerRef} data={pageContent.content} />

  );
};

export default Sheet;