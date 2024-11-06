import React, { useEffect, useState } from 'react';
import { useForm, Controller } from "react-hook-form";
import useUserStore from "@/stores/useUserStore";
import useTeamStore from "@/stores/useTeamStore";
import useFolderStore from "@/stores/useFolderStore";
import useGroupStore from "@/stores/useGroupStore";
import { Plus } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import useApi from '@/lib/dataFetcher';

const AddFileDialog = ({ id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFile, setIsFile] = useState('folder');

  const { formattedUserData } = useUserStore(state => state);
  const { formattedTeamData } = useTeamStore(state => state);
  const { getGroupId } = useGroupStore(state => state);
  const { loading, callApi, data } = useApi();
  const form = useForm({
    defaultValues: {
      type: "",
      fileName: "",
      fileType: "",
      shared_teams: "",
      shared_members: "",
    }
  });

  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      if (isOpen) {
        mainContent.setAttribute('inert', '');
      } else {
        mainContent.removeAttribute('inert');
      }
    }
  }, [isOpen]);

  const onSubmit = async (data) => {
    console.log("Form Data:", data);

    const newDocumentData = {
      user_id: "66cda5dac6886719e3345c19",
      content: {
        text: "This is the document content"
      },
      summary: "This is the document summary",
      page_type: data.fileType,
      title: "Sample Page Title",
      folder_id: "66e404cf089aef7c495015f4",
      custom_meta: {
        author: "John Doe",
        keywords: ["sample", "page", "meta"]
      },
      shared_teams: [
        "66cda5dac6886719e3345c19",
        "66e404cf089aef7c495015f4"
      ],
      shared_members: [
        "66cda5dac6886719e3345c19",
        "66e404cf089aef7c495015f4"
      ],
      space_id: "66e4064f658c25f499aa9d63",
      group_id: "66e4064f658c25f499aa9d63",
      attachments: "attachment_url"
    }
    callApi('https://api-server-1lmd.onrender.com/v1/page/document?id=' + id, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newDocumentData)
    })
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
            <div className="py-3 w-full flex items-start flex-col gap-4">
              {getGroupId(id) &&
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value); // Update form value
                        setIsFile(value);      // Update local state
                      }}
                      defaultValue='folder'
                      className="w-full"
                    >
                      <FormLabel>Type</FormLabel>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="folder" id="folder" />
                          <Label htmlFor="folder" className="cursor-pointer">Folder</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="file" id="file" />
                          <Label htmlFor="file" className="cursor-pointer">File</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  )}
                />
              }
              <FormField
                control={form.control}
                name="fileName"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Name</FormLabel>
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
              {isFile !== 'folder' || getGroupId(id) === false &&
                <FormField
                  control={form.control}
                  name="fileType"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Type</FormLabel>
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
              }
              <FormField
                control={form.control}
                name="shared_members"
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Shared Member</FormLabel>
                    <MultiSelect
                      options={formattedUserData()}
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
                      options={formattedTeamData()}
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
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFileDialog;