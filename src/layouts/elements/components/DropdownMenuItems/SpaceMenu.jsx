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
  
  // Update pin status when dropdown opens or when initialIsPinned changes
  useEffect(() => {
    setIsPinned(initialIsPinned);
  }, [initialIsPinned, isOpen]);
  

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
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuItem>Team</DropdownMenuItem>
        <DropdownMenuItem>Subscription</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SpaceMenu;