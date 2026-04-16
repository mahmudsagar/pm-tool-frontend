import { useState, useCallback } from 'react'
import { EllipsisVertical, Link2, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Delete from './items/Delete';
import AddFileDialog from '../AddFileDialog';

const SpaceMenu = ({ id, type = 'space', fileName, isOpen: externalIsOpen, onToggle: externalOnToggle }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = externalIsOpen !== undefined && externalOnToggle !== undefined;
  const isOpen = isControlled ? !!externalIsOpen[id] : internalOpen;
  const handleOpenChange = useCallback((val) => {
    if (isControlled) externalOnToggle(id, !val);
    else setInternalOpen(val);
  }, [isControlled, externalOnToggle, id]);

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditModalOpen(true);
    handleOpenChange(false);
  };

  const handleCopyLink = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/space/${id}`;

    navigator.clipboard.writeText(link)
      .then(() => {
        toast({
          variant: "success",
          title: "Link copied!",
          description: "Space link has been copied to clipboard",
        });
        handleOpenChange(false);
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Copy failed",
          description: "Could not copy link to clipboard",
        });
      });
  }, [id, toast, handleOpenChange]);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-slate-300 w-6 h-6"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVertical
              size={16}
              className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuGroup>
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleEditClick}>
              <SquarePen className="w-4 h-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleCopyLink}>
              <Link2 className="w-4 h-4" />
              Copy Link
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <Delete
            fileId={id}
            fileType={type}
            wrapperClassName="px-4 py-3 font-medium"
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {isEditModalOpen && (
        <AddFileDialog
          id={id}
          type={type}
          isEdit={true}
          initialName={fileName}
          isOpen={isEditModalOpen}
          setIsOpen={setIsEditModalOpen}
        />
      )}
    </>
  );
}

export default SpaceMenu;