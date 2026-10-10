import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface DrawerHeaderProps {
  closeBtn: ReactNode;
  topMenu?: { inlineContent?: ReactNode; dropdownContent?: ReactNode };
}

/** Compact header for pages opened in the side panel. */
export default function DrawerHeader({ closeBtn, topMenu }: DrawerHeaderProps) {
  return (
    <div className="sticky top-0 z-20 flex h-12 items-center justify-between gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur-md">
      {closeBtn}
      <div className="flex items-center gap-1">
        {topMenu?.inlineContent}
        {topMenu?.dropdownContent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Page actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {topMenu.dropdownContent}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
