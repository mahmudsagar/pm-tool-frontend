import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import useApi from '@/lib/dataFetcher';
import useFileManagerStore from "@/stores/useFileManagerStore";
import { baseUrl } from '@/utils/constants';
import { ensureArray } from '@/utils/helper';
import { Plus } from "lucide-react";
import { useEffect, useState } from 'react';
import { Controller, useForm } from "react-hook-form";
import ButtonLoading from './ButtonLoading';

const AddFileDialog = ({
  id,
  type,
  space_visibility,
  isEdit = false,
  initialName = '',
  isOpen,
  setIsOpen,
  onEditSuccess
}) => {
  const defaultFileType = 'page'; // Always default to page instead of using type
  const [loading, setLoading] = useState(false); // Submitting Data loading
  const [fileName, setFileName] = useState(initialName || ''); // Track filename separately
  const { data: users, callApi: userCallApi } = useApi();
  const { data: teams, callApi: teamCallApi } = useApi();
  const usersData = ensureArray(users)
  const teamsData = ensureArray(teams)
  const { storeHandler, updateHandler } = useFileManagerStore(state => state);

  const form = useForm({
    defaultValues: {
      title: isEdit ? initialName : fileName,
      filetype: defaultFileType,
      page_type: 'document',
      shared_members: [],
      shared_teams: []
    }
  });

  // Update filename state when initialName changes
  useEffect(() => {
    if (isEdit && initialName) {
      setFileName(initialName);
    }
  }, [isEdit, initialName]);

  // Force set form values when component mounts
  useEffect(() => {
    const title = isEdit ? initialName : fileName;

    // Only reset if we have the needed data
    form.reset({
      title,
      filetype: defaultFileType,
      page_type: 'document',
      shared_members: [],
      shared_teams: []
    }, { keepValues: true });
  }, [fileName, form, initialName, isEdit, defaultFileType]);

  // Synchronize when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Force update form values when dialog opens
      form.setValue("filetype", defaultFileType);
      form.setValue("page_type", "document");

      // Preserve the title
      if (isEdit && initialName) {
        form.setValue("title", initialName);
      }
    }
  }, [isOpen, isEdit, initialName, form]);

  const { user, token } = useAuth();

  const userID = user?._id;
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
  }, [isOpen, userCallApi, teamCallApi, userID]);

  const onSubmit = async (data) => {
    setLoading(true);
    let endpoint, documentData, method;

    // Set method based on whether we're editing or creating
    method = isEdit ? 'PUT' : 'POST';

    if (data.filetype === "page") {
      // Handle board creation with special endpoint and payload
      if (data.page_type === "board") {
        endpoint = "/v1/board";
        documentData = isEdit ? {
          id: id,
          name: data.title,
        } : {
          name: data.title, // mandatory
          description: `Board: ${data.title}`,
          user_id: userID || "66cda5dac6886719e3345c19", // mandatory
          is_private: space_visibility ?? false,
          shared_teams: data.shared_teams || [],
          shared_members: data.shared_members || [],
          custom_meta: {
            fields: [
              {
                type: "select",
                initialized: true,
                label: "Status",
                name: "status",
                hasOptions: true,
                options: [
                  { label: "To Do", value: "todo" },
                  { label: "In Progress", value: "in-progress" },
                  { label: "Review", value: "review" },
                  { label: "Done", value: "done" }
                ]
              },
              {
                type: "select",
                initialized: true,
                label: "Assignee",
                name: "assignee",
                hasOptions: true,
                options: Array.isArray(usersData) ? usersData.map(user => ({ 
                  label: user.name || user.email, 
                  value: user._id 
                })) : []
              },
              {
                type: "select",
                initialized: true,
                label: "Priority",
                name: "priority",
                hasOptions: true,
                options: [
                  { label: "Low", value: "low" },
                  { label: "Medium", value: "medium" },
                  { label: "High", value: "high" },
                  { label: "Critical", value: "critical" }
                ]
              },
              {
                type: "input",
                initialized: true,
                label: "Type",
                name: "type",
                hasOptions: false
              },
              {
                type: "date",
                initialized: true,
                label: "Due Date",
                name: "due_date",
                hasOptions: false
              },
              {
                type: "date",
                initialized: true,
                label: "Start Date",
                name: "start_date",
                hasOptions: false
              }
            ]
          },
          space_id: type === "space" ? id : (type === "folder" ? null : (type === "group" ? null : id)) // mandatory - use parent container id
        };
      } else {
        endpoint = "/v1/page/document";
        documentData = isEdit ? {
          id: id,
          title: data.title,
        } : {
          user_id: userID || "66cda5dac6886719e3345c19",
          title: data.title,
          page_type: data.page_type,
          entity_type: data.filetype,
          content: {
            text: "This is the document content"
          },
          summary: "This is the document summary",
          last_updated_by: userID || "66cda5dac6886719e3345c19",
          custom_meta: {
            author: "John Doe",
            keywords: ["sample", "page", "meta"]
          },
          folder_id: type === "folder" ? id : '',
          group_id: type === "group" ? id : '',
          space_id: type === "space" ? id : '',
          attachments: []
        };
      }
    } else if (data.filetype === "folder" || data.filetype === "group") {
      endpoint = data.filetype === "folder" ? "/v1/folder" : "/v1/group";

      if (isEdit) {
        endpoint += `?id=${id}`;
        documentData = {
          name: data.title,
          shared_members: data.shared_members,
          shared_teams: data.shared_teams,
        };
      } else {
        documentData = {
          user_id: userID || "66cda5dac6886719e3345c19",
          entity_type: data.filetype,
          name: data.title,
          shared_members: data.shared_members,
          shared_teams: data.shared_teams,
          folder_id: type === "folder" ? id : '',
          group_id: type === "group" ? id : '',
          space_id: type === "space" ? id : '',
        };
      }
    } else {
      setLoading(false);
      return { error: "Invalid filetype specified" };
    }

    try {
      const response = await fetch(baseUrl + endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(documentData),
      });

      const res = await response.json();

      if (res.error) {
        console.error("Error saving document: ", res.error);
        setLoading(false);
        return;
      }

      if (isEdit) {
        // Update the store with edited data
        const updateData = {
          ...res.data,
          // Ensure we have the correct name/title property based on entity type
          ...(data.filetype === "page" ? { title: data.title } : { name: data.title })
        };
        updateHandler(id, data.filetype, updateData);
        // Call the edit success callback if provided
        if (onEditSuccess) {
          onEditSuccess(res.data);
        }
      } else {
        storeHandler(id, type, res.data);

      }
      // Close the modal and reset form after successful operation
      setLoading(false);
      setIsOpen(false);

      // Reset form with default values
      form.reset({
        title: '',
        filetype: defaultFileType,
        page_type: 'document',
        shared_members: [],
        shared_teams: []
      });

      // Reset local state        setFileName('');
      } catch (error) {
        setLoading(false);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Reset form when closing
        if (isEdit) {
          // For edit mode, keep the original values when canceling
          form.reset({
            title: initialName,
            filetype: defaultFileType,
            page_type: 'document',
            shared_members: [],
            shared_teams: []
          });
        } else {
          // For create mode, reset to empty values
          form.reset({
            title: '',
            filetype: defaultFileType,
            page_type: 'document',
            shared_members: [],
            shared_teams: []
          });
          setFileName('');
        }

        // Reset local state
      } else {
        // When opening, initialize form properly
        if (isEdit && initialName) {
          form.reset({
            title: initialName,
            filetype: defaultFileType,
            page_type: 'document',
            shared_members: [],
            shared_teams: []
          });
          setFileName(initialName);
        } else if (!isEdit) {
          // For create mode, ensure clean state
          form.setValue("filetype", defaultFileType);
          form.setValue("page_type", "document");
        }
      }

      setIsOpen(open);
    }}>
      {!isEdit && (
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
      )}
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Edit' : 'Create'}</DialogTitle>
              <DialogDescription>
                Please provide the necessary details to {isEdit ? 'update' : 'create'}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 w-full flex items-start flex-col gap-4">
              {!isEdit && (
                <FormField
                  control={form.control}
                  name="filetype"
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      defaultValue="page" // Hard-code "page" as the default
                      value={field.value}
                      className="w-full"
                    >
                      <FormLabel>Type</FormLabel>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="page" id="page" checked={field.value === "page"} />
                          <Label htmlFor="page" className="cursor-pointer">Page</Label>
                        </div>
                        {(type !== 'folder' && type !== 'group') && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="group" id="group" checked={field.value === "group"} />
                            <Label htmlFor="group" className="cursor-pointer">Group</Label>
                          </div>
                        )}
                        {type !== 'folder' && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="folder" id="folder" checked={field.value === "folder"} />
                            <Label htmlFor="folder" className="cursor-pointer">Folder</Label>
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                  )}
                />
              )}
              {form.getValues('filetype') === 'page' && !isEdit && (
                <FormField
                  control={form.control}
                  name="page_type"
                  render={() => (
                    <FormItem className="w-full">
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Controller
                          name="page_type"
                          control={form.control}
                          render={({ field }) => (
                            <Select
                              onValueChange={(value) => field.onChange(value)}
                              value={field.value || 'document'}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="File Format" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="document">Document</SelectItem>
                                <SelectItem value="sheet">Sheet</SelectItem>
                                <SelectItem value="whiteboard">Whiteboard</SelectItem>
                                <SelectItem value="board">Board</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
                        value={field.value ?? fileName ?? ''}
                        onChange={(e) => {
                          field.onChange(e);
                          setFileName(e.target.value);
                        }}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!space_visibility && (<>
                <FormField
                  control={form.control}
                  name="shared_members"
                  render={({ field }) => (
                    <FormItem className='w-full'>
                      <FormLabel>Shared Member</FormLabel>
                      <MultiSelect
                        options={Array.isArray(usersData) ? usersData.map(user => ({ value: user._id, label: user.email })) : []}
                        onValueChange={(value) => field.onChange(value)}
                        placeholder="Select Member"
                        variant="inverted"
                        animation={2}
                        maxCount={3}
                        handleFormChange={field.onChange}
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
                        options={Array.isArray(teamsData) ? teamsData?.map(team => ({ value: team._id, label: team.name })) : []}
                        onValueChange={(value) => field.onChange(value)}
                        placeholder="Select Team"
                        variant="inverted"
                        animation={2}
                        maxCount={3}
                        handleFormChange={field.onChange}
                      />
                    </FormItem>
                  )}
                />
              </>)}
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="submit">
                {loading ?
                  <ButtonLoading text={isEdit ? 'Updating...' : 'Creating...'} flex='row' btn={true} /> :
                  isEdit ? "Update" : "Create"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFileDialog;