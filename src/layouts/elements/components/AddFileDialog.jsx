import React from 'react'
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import useFolderStore from "@/stores/folderStore";
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
  const form = useForm();
  const { addFile } = useFolderStore();

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="ghost" size="icon" className="group hover:bg-slate-300 w-6 h-6">
          <Plus size={16} className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New File</DialogTitle>
              <DialogDescription>
                Please provide the necessary details to create a new file.
              </DialogDescription>
            </DialogHeader>
            {/* Form Fields Moved Outside of DialogDescription */}
            <div className="py-3">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>File Name</FormLabel>
                    <FormControl>
                      <Input placeholder="File Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select File Type</FormLabel>
                    <FormControl>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="File Format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="png">png</SelectItem>
                          <SelectItem value="jpg">jpg</SelectItem>
                          <SelectItem value="pdf">pdf</SelectItem>
                        </SelectContent>
                      </Select>
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
  )
}

export default AddFileDialog