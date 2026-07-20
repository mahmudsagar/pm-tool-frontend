import React, { useState, useCallback } from 'react';
import { Link2, MoreVertical, SquareArrowOutUpRight, SquarePen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Delete from '@/layouts/elements/components/DropdownMenuItems/items/Delete';
import AddFileDialog from '@/layouts/elements/components/AddFileDialog';
import { useToast } from '@/components/ui/use-toast';
import { getDeleteEntityType, getRowAbsoluteUrl, getRowPath } from '../tableRowUtils';

const TableColumnsDropdown = ({ info, onDeleteSuccess, onEditSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  const fileId = info?.original?.id || '';
  const fileType = getDeleteEntityType(info);
  const fileName = info?.original?.name || '';
  const editName = info?.original?.rawName || fileName;
  const rowPath = getRowPath(info);

  const stopPropagation = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  const handleEditClick = (e) => {
    stopPropagation(e);
    setIsEditModalOpen(true);
    setIsOpen(false);
  };

  const handleOpenInNewTab = (e) => {
    stopPropagation(e);
    window.open(rowPath, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleCopyLink = useCallback((e) => {
    stopPropagation(e);

    navigator.clipboard.writeText(getRowAbsoluteUrl(info))
      .then(() => {
        toast({
          variant: 'success',
          title: 'Link copied!',
          description: 'File link has been copied to clipboard',
        });
        setIsOpen(false);
      })
      .catch((err) => {
        console.error('Failed to copy link: ', err);
        toast({
          variant: 'destructive',
          title: 'Copy failed',
          description: 'Could not copy link to clipboard',
        });
      });
  }, [info, toast]);

  const handleDeleteSuccess = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      if (typeof onDeleteSuccess === 'function') {
        onDeleteSuccess(fileId, fileType);
      }
    }, 10);
  }, [fileId, fileType, onDeleteSuccess]);

  const handleEditSuccess = useCallback((updatedItem) => {
    setIsOpen(false);
    if (typeof onEditSuccess === 'function') {
      onEditSuccess(fileId, fileType, updatedItem);
    }
  }, [fileId, fileType, onEditSuccess]);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild onClick={stopPropagation}>
          <button
            type="button"
            className="focus:outline-none opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            aria-label="Row actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" onClick={stopPropagation}>
          <DropdownMenuGroup>
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleOpenInNewTab}>
              <SquareArrowOutUpRight className="w-4 h-4" />
              Open in a new tab
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleCopyLink}>
              <Link2 className="w-4 h-4" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleEditClick}>
              <SquarePen className="w-4 h-4" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <Delete
              fileId={fileId}
              fileType={fileType}
              onSuccess={handleDeleteSuccess}
              wrapperClassName="px-4 py-3 font-medium"
            />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {isEditModalOpen && (
        <AddFileDialog
          id={fileId}
          type={info?.original?.type || fileType}
          isEdit
          initialName={editName}
          isOpen={isEditModalOpen}
          setIsOpen={setIsEditModalOpen}
          onEditSuccess={handleEditSuccess}
        />
      )}
    </>
  );
};

export default TableColumnsDropdown;
