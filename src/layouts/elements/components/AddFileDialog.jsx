import React, { useEffect, useState } from 'react';
import { useForm, Controller } from "react-hook-form";
import { Plus } from "lucide-react";
import useApi from '@/lib/dataFetcher';
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Button } from "@/components/ui/button";
import { baseUrl, userID } from '@/utils/constants';
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
import ButtonLoading from './ButtonLoading';

const AddFileDialog = ({ id, type }) => {  
  const [isOpen, setIsOpen] = useState(false);
  const [isFile, setIsFile] = useState('page');
  const [loading, setLoading] = useState(false); // Submitting Data loading
  const { data: users, callApi:userCallApi } = useApi();
  const { data: teams, callApi:teamCallApi } = useApi();
  
  const { storeHandler } = useFileManagerStore(state => state);
  
  const form = useForm({
    defaultValues: {
      title: '',
      filetype: 'page',
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
          await userCallApi(baseUrl + '/v1/user');
          await teamCallApi(baseUrl + '/v1/team?user_id=' + userID);
        } catch (error) {
          console.error("Error fetching User data:", error);
        }
      })();
    }
  }, [isOpen]);

  const onSubmit = async (data) => {
    setLoading(true);
    let endpoint, newDocumentData;

    if (data.filetype === "page") {
      endpoint = "/v1/page/document";
      newDocumentData = {
        user_id: "66cda5dac6886719e3345c19",
        title: data.title,
        page_type: data.page_type,
        entity_type: data.filetype,
        content: {
          text: "This is the document content"
        },
        summary: "This is the document summary",
        last_updated_by: "66cda5dac6886719e3345c19",
        custom_meta: {
          author: "John Doe",
          keywords: ["sample", "page", "meta"]
        },
        folder_id: type === "folder" ? id : '',
        group_id: type === "group" ? id : '',
        space_id: type === "space" ? id : '',
        attachments: []
      };
    } else if (data.filetype === "folder" || data.filetype === "group") {
      endpoint = data.filetype === "folder" ? "/v1/folder" : "/v1/group";
      newDocumentData = {
        user_id: "66cda5dac6886719e3345c19",
        entity_type: data.filetype,
        name: data.title,
        shared_members: data.shared_members,
        shared_teams: data.shared_teams,
        folder_id: type === "folder" ? id : '',
        group_id: type === "group" ? id : '',
        space_id: type === "space" ? id : '',
      };
    } else {
      return { error: "Invalid filetype specified" };
    }    

    try {
      await fetch(baseUrl + endpoint, {
        method: 'POST',
        body: JSON.stringify(newDocumentData),
      })
      .then( res => res.json())
      .then(async ()=>{
        await storeHandler(id, type, newDocumentData);
        setLoading(false)
        setIsOpen(false);
        form.reset();  
      }).catch((error)=>{
        setLoading(false)
        console.error("Error fetching data: ", error);
      });
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
                        <RadioGroupItem value="page" id="page" />
                        <Label htmlFor="page" className="cursor-pointer">Page</Label>
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
              {isFile === 'page' &&
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
                      options={users?.map(user => ({ value: user._id, label: user.full_name })) || []}
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
                      options={teams?.map(team => ({ value: team._id, label: team.name })) || []}
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
              <Button type="submit">{loading ? <ButtonLoading text='Creating...' flex='row' btn={true} /> : "Create"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFileDialog;