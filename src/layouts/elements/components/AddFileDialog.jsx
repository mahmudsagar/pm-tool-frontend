import React, { useEffect, useState } from 'react';
import { Plus } from "lucide-react";
import { Label } from '@/components/ui/label';
import { useForm, Controller } from "react-hook-form";
import { MultiSelect } from '@/components/ui/multi-select';
import useFileManagerStore from "@/stores/useFileManagerStore";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import MenuItemLoading from './MenuItemLoading';

const AddFileDialog = ({ id, type }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFile, setIsFile] = useState('file');
  const [loading, setLoading] = useState(false);
  
  const {
    fetchUsers, 
    fetchTeams, 
    postDocument,
    formatUserInput, 
    formatTeamInput,
  } = useFileManagerStore(state => state); // Store area
  
  const form = useForm({
    defaultValues: {
      title: '',
      filetype: 'file',
      page_type: '',
      shared_members: [],
      shared_teams: []
    }
  });
  
  useEffect(() => {    
    document.getElementById('main-content')?.toggleAttribute('inert', isOpen);

    if (isOpen) {
      (async () => {
        try {
          await fetchUsers();
          await fetchTeams();
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      })();
    }
  }, [isOpen]);

  const onSubmit = async (data) => {
    setLoading(true);
    const newDocument = { id, type, ...data };
    
    console.log("Form Data:", newDocument);

    try {
      await postDocument(newDocument);
      setLoading(false)
      setIsOpen(false);
      form.reset();  
    } catch (error) {
      setLoading(false)
      console.error("Error fetching data: ", error);
    }
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
              <DialogTitle>Create</DialogTitle>
              <DialogDescription>
                Please provide the necessary details to create.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 w-full flex items-start flex-col gap-4">
              <FormField
                control={form.control}
                name="filetype"
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={(value) => {                      
                      field.onChange(value); // Update form value
                      setIsFile(value);      // Update local state
                    }}
                    defaultValue={isFile}
                    className="w-full"
                  >
                    <FormLabel>Type</FormLabel>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="file" id="file" />
                        <Label htmlFor="file" className="cursor-pointer">File</Label>
                      </div>
                      { type === 'folder' || type !== 'group' && 
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="group" id="group" />
                          <Label htmlFor="group" className="cursor-pointer">Group</Label>
                        </div>
                      }
                      { type !== 'folder' && 
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="folder" id="folder" />
                          <Label htmlFor="folder" className="cursor-pointer">Folder</Label>
                        </div> 
                      }
                    </div>
                  </RadioGroup>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="File Name"
                        {...field}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isFile === 'file' &&
                <FormField
                  control={form.control}
                  name="page_type"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Controller
                          name="page_type"
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
                                <SelectItem value="document">Document</SelectItem>
                                <SelectItem value="sheet">Sheet</SelectItem>
                                <SelectItem value="whiteboard">Whiteboard</SelectItem>                                  
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              }
              <FormField
                control={form.control}
                name="shared_members"
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Shared Member</FormLabel>
                    <MultiSelect
                      options={formatUserInput()}
                      onValueChange={(value) => field.onChange(value)}
                      placeholder="Select frameworks"
                      variant="inverted"
                      animation={2}
                      maxCount={3}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shared_teams"
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Shared Team</FormLabel>
                    <MultiSelect
                      options={formatTeamInput()}
                      onValueChange={(value) => field.onChange(value)}
                      placeholder="Select frameworks"
                      variant="inverted"
                      animation={2}
                      maxCount={3}
                    />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="submit">{loading ? <MenuItemLoading text='Creating...' flex='row' btn={true} /> : "Create"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFileDialog;