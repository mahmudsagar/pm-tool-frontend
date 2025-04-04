import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTrigger, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';

const TableColumnsShare = ({ title }) => {
  const { handleSubmit } = useForm();
  const [isOpen, setIsOpen] = useState(false);

  const onSubmit = (data) => {
    console.log(data);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="group-hover:opacity-100 data-[state=open]:opacity-100 opacity-0 transition-opacity"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sharing File ({title})</DialogTitle>
          <DialogDescription className="pt-1">
            Please select the users you want to share this file with.
          </DialogDescription>
        </DialogHeader>
        <form 
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        >
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
};

export default TableColumnsShare;
