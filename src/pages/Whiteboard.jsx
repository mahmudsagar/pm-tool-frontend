import { useEffect } from 'react';

// utils
import Link from '@/BetterRouter/Link';

import ExcalidrawRender from "@/components/elements/whiteboard";
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

import { Copy, History, MessageSquareMore, Share, Trash } from 'lucide-react';

import "@betternotion/excalidraw/index.css";
import { Button } from '@/components/ui/button';

export default function Whiteboard({ pageContent, handleSubmit, setTopMenu, setOpenDeleteDialog, _id, space_id, onOpenHistory }) {
  useEffect(() => {
    if (!pageContent) return;
    const dropdownContent = <>
      <DropdownMenuItem className="cursor-pointer">
        <div className='flex items-center gap-1'>
          <Share size={12} /> Share
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/whiteboard/${_id}`)}>
        <div className='flex items-center gap-1'>
          <Copy size={12} /> Copy link
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onSelect={(e) => {
        e.preventDefault();
        setTimeout(() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          setOpenDeleteDialog(true);
        }, 150);
      }}>
        <div className='flex items-center gap-1'>
          <Trash size={12} /> Delete this whiteboard
        </div>
      </DropdownMenuItem>
    </>

    const inlineContent = <>
      <Button variant="ghost" size="icon" onClick={onOpenHistory}>
        <History size={20} />
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
  }, [pageContent]);

  return (
    <div className="text-center h-full pt-16 -mt-16 overflow-hidden">
      <ExcalidrawRender content={pageContent?.content} onChange={handleSubmit} spaceId={_id} />
    </div>
  )
}
