import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTrigger, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';

const TableShareDialog = ({ isOpen, setIsOpen, title, icon, fileName, type }) => {
  const { handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log(data);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        { 
          type === 'button' ? 
          (
            <Button 
              variant="ghost" 
              size="sm" 
              className="group-hover:opacity-100 data-[state=open]:opacity-100 opacity-0 transition-opacity"
            >
              {icon}
              {/* <ExternalLink className="w-4 h-4" /> */}
              {title}
            </Button>
          ):(
            <>
              {icon}
              {title}
            </>
          ) 
        }
        
      </DialogTrigger>
      <DialogContent>
        <form 
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Sharing File ({fileName})</DialogTitle>
            <DialogDescription className="pt-1">
              Please select the users you want to share this file with.
            </DialogDescription>
          </DialogHeader>

          {/* Form Fields */}
          <div className="py-3">
            Multi Select input will be here
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="submit">Share</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TableShareDialog;