import React, { useEffect, useState } from 'react';
import { Plus } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import useFolderStore from "@/stores/useFolderStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const AddFileDialog = ({ folderId }) => {
  const { addFile } = useFolderStore(state => state);
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      fileName: "",
      fileType: "",
    }
  });

  useEffect(() => {
    const mainContent = document.getElementById('main-content'); // Assuming your main content has this ID
    if (mainContent) {  // Check if element exists
      if (isOpen) {
        mainContent.setAttribute('inert', ''); // Add inert attribute
      } else {
        mainContent.removeAttribute('inert'); // Remove inert attribute
      }
    }
  }, [isOpen]);

  const onSubmit = (data) => {
    console.log("Form Data:", data);
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button 
          variant="ghost" 
          size="icon" 
          className="group hover:bg-slate-300 w-6 h-6"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <Plus size={16} className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New File</DialogTitle>
              <DialogDescription>
                Please provide the necessary details to create a new file.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3">
              <FormField
                control={form.control}
                name="fileName"
                render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>File Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="File Name" 
                        {...field} 
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fileType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select File Type</FormLabel>
                    <FormControl>
                      <Controller
                        name="fileType"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="File Format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="doc">Document</SelectItem>
                              <SelectItem value="sh">Sheet</SelectItem>
                              <SelectItem value="wb">Whiteboard</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFileDialog;