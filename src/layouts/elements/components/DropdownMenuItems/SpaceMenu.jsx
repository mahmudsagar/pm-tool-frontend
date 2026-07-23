import { useState, useCallback } from 'react'
import { EllipsisVertical, Link2, SquarePen, Settings, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { useCreateSpaceChannel } from '@/hooks/mutations/useChatMutations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Delete from './items/Delete';
import AddFileDialog from '../AddFileDialog';
import SpaceSettingsSheet from '../SpaceSettingsSheet';

const SpaceMenu = ({ id, type = 'space', fileName, initialData, isOpen: externalIsOpen, onToggle: externalOnToggle }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const createSpaceChannel = useCreateSpaceChannel();

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

  const handleSettingsClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSettingsOpen(true);
    handleOpenChange(false);
  };

  const handleCreateChannel = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleOpenChange(false);

    try {
      const conversation = await createSpaceChannel.mutateAsync({
        spaceId: id,
        name: `${fileName || 'Space'} Channel`,
      });
      toast({
        variant: 'success',
        title: 'Channel created!',
        description: 'Space channel is ready for members.',
      });
      navigate(`/chat?c=${conversation._id}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to create channel',
        description: err.message || 'Could not create space channel',
      });
    }
  }, [id, fileName, createSpaceChannel, toast, navigate, handleOpenChange]);

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
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleCreateChannel}>
              <Hash className="w-4 h-4" />
              Create Channel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleSettingsClick}>
              <Settings className="w-4 h-4" />
              Settings
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
      <SpaceSettingsSheet
        spaceId={id}
        space={initialData}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  );
}

export default SpaceMenu;