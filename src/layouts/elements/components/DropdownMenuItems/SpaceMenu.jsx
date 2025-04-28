import React, { useState, useEffect, useCallback } from 'react'
import { EllipsisVertical, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import useFileManagerStore from "@/stores/useFileManagerStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const SpaceMenu = ({ id, type, isPinned: initialIsPinned = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [pinLoading, setPinLoading] = useState(false);
  const { toast } = useToast();
  const { togglePinStatus } = useFileManagerStore();
  
  // Update pin status when dropdown opens or when initialIsPinned changes
  useEffect(() => {
    setIsPinned(initialIsPinned);
  }, [initialIsPinned, isOpen]);
  
  // Handle pin toggle with optimistic UI update
  const handlePinToggle = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setPinLoading(true);
    const newPinStatus = !isPinned;
    
    // Optimistically update UI
    setIsPinned(newPinStatus);
    
    try {
      const result = await togglePinStatus(id, type, newPinStatus);
      
      if (result?.error) {
        // Revert optimistic update if there was an error
        setIsPinned(!newPinStatus);
        toast({
          variant: "destructive",
          title: "Error updating pin status",
          description: result.error,
        });
      } else {
        toast({
          variant: "success",
          title: newPinStatus ? "Space pinned" : "Space unpinned",
          description: `Space has been ${newPinStatus ? "pinned to sidebar" : "unpinned"}.`,
        });
      }
    } catch (error) {
      // Revert optimistic update if there was an error
      setIsPinned(!newPinStatus);
      toast({
        variant: "destructive",
        title: "Error updating pin status",
        description: error.message,
      });
    } finally {
      setPinLoading(false);
      setIsOpen(false);
    }
  }, [id, type, isPinned, togglePinStatus, toast]);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-slate-300 w-6 h-6">
          <EllipsisVertical 
            size={16} 
            className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" 
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem 
          className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" 
          onSelect={handlePinToggle}
          disabled={pinLoading}
        >
          <Pin className="w-4 h-4" />
          {isPinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuItem>Team</DropdownMenuItem>
        <DropdownMenuItem>Subscription</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SpaceMenu;