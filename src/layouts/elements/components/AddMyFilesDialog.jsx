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
import { RcMultiSelect } from '@/components/ui/rc-multi-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import useAuthStore from '@/stores/useAuthStore';
import useApi from '@/lib/dataFetcher';
import useFileManagerStore from "@/stores/useFileManagerStore";
import { baseUrl } from '@/utils/constants';
import { ensureArray } from '@/utils/helper';
import { Plus } from "lucide-react";
import { useEffect, useState, useMemo } from 'react';
import { Controller, useForm } from "react-hook-form";
import ButtonLoading from './ButtonLoading';
import { useQueryClient } from '@tanstack/react-query';

const AddMyFilesDialog = ({
  id,
  type,
  space_visibility,
  isEdit = false,
  initialName = '',
  isOpen,
  setIsOpen,
  onEditSuccess
}) => {
  console.log("🚀 ~ AddMyFilesDialog ~ id:", id)
  console.log("🚀 ~ AddMyFilesDialog ~ type:", type)
  console.log("🚀 ~ AddMyFilesDialog ~ space_visibility:", space_visibility)
  const defaultFileType = 'page'; // Always default to page instead of using type
  const [loading, setLoading] = useState(false); // Submitting Data loading
  const [fileName, setFileName] = useState(initialName || ''); // Track filename separately
  const [spaceId, setSpaceId] = useState(''); // Track space ID separately
  const [selectedSpace, setSelectedSpace] = useState({}) // Track selected space object
  console.log("🚀 ~ selectedSpace:", selectedSpace)
  console.log("🚀 ~ spaceId:", spaceId)
  const { data: users, callApi: userCallApi } = useApi();
  const { data: teams, callApi: teamCallApi } = useApi();
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchedTeams, setSearchedTeams] = useState([]);
  const usersData = userSearchQuery ? ensureArray(searchedUsers) : ensureArray(users);
  const teamsData = teamSearchQuery ? ensureArray(searchedTeams) : ensureArray(teams);
  const { storeHandler, updateHandler, publicSpaces,
    privateSpaces, } = useFileManagerStore(state => state);
  const allSpaces = useMemo(() => [...(publicSpaces || []), ...(privateSpaces || [])], [publicSpaces, privateSpaces]);
  const queryClient = useQueryClient();
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
  // fined the space based on user selection
  useEffect(() => {
    if (spaceId) {
      const selectedSpace = allSpaces.find(space => space._id === spaceId);
      if (selectedSpace) {
        setSelectedSpace(selectedSpace);
      }
    }
  }, [spaceId, allSpaces])

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
  }, [fileName, form, initialName, isEdit]);

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

  const { user, token, currentWorkspace } = useAuthStore();

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
  }, [isOpen, teamCallApi, userCallApi, userID]);

  // Debounced search for users
  useEffect(() => {
    if (!userSearchQuery || userSearchQuery.length < 2) {
      setSearchedUsers([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `${baseUrl}/v1/user?search=${encodeURIComponent(userSearchQuery)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              ...(currentWorkspace?._id ? { 'X-Workspace-ID': currentWorkspace._id } : {})
            }
          }
        );
        const result = await response.json();
        if (result.data) {
          setSearchedUsers(result.data);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery, token]);

  // Debounced search for teams
  useEffect(() => {
    if (!teamSearchQuery || teamSearchQuery.length < 2) {
      setSearchedTeams([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `${baseUrl}/v1/team?user_id=${userID}&search=${encodeURIComponent(teamSearchQuery)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              ...(currentWorkspace?._id ? { 'X-Workspace-ID': currentWorkspace._id } : {})
            }
          }
        );
        const result = await response.json();
        if (result.data) {
          setSearchedTeams(result.data);
        }
      } catch (error) {
        console.error('Error searching teams:', error);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [teamSearchQuery, userID, token]);

  const onSubmit = async (data) => {
    setLoading(true);
    let endpoint = '';
    let documentData = {};
    const method = isEdit ? 'PUT' : 'POST';

    try {
      if (data.filetype === 'page') {
        if (data.page_type === 'board') {
          endpoint = '/v1/board';
          if (isEdit) {
            documentData = { id, name: data.title };
          } else {
            documentData = {
              name: data.title,
              description: `Board: ${data.title}`,
              user_id: userID || '66cda5dac6886719e3345c19',
              is_private: selectedSpace?.is_private ?? false,
              shared_teams: data.shared_teams || [],
              shared_members: data.shared_members || [],
              custom_meta: {
                fields: [
                  {
                    type: 'select',
                    initialized: true,
                    label: 'Status',
                    name: 'status',
                    hasOptions: true,
                    options: [
                      { label: 'To Do', value: 'todo' },
                      { label: 'In Progress', value: 'in-progress' },
                      { label: 'Review', value: 'review' },
                      { label: 'Done', value: 'done' },
                    ],
                  },
                  {
                    type: 'select',
                    initialized: true,
                    label: 'Assignee',
                    name: 'assignee',
                    hasOptions: true,
                    options: Array.isArray(usersData)
                      ? usersData.map((u) => ({ label: u.name || u.email, value: u._id }))
                      : [],
                  },
                  {
                    type: 'select',
                    initialized: true,
                    label: 'Priority',
                    name: 'priority',
                    hasOptions: true,
                    options: [
                      { label: 'Low', value: 'low' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'High', value: 'high' },
                      { label: 'Critical', value: 'critical' },
                    ],
                  },
                  { type: 'input', initialized: true, label: 'Type', name: 'type', hasOptions: false },
                  { type: 'date', initialized: true, label: 'Due Date', name: 'due_date', hasOptions: false },
                  { type: 'date', initialized: true, label: 'Start Date', name: 'start_date', hasOptions: false },
                ],
              },
              space_id: type === 'space' ? id : (selectedSpace?._id || spaceId),
              folder_id: type === 'folder' ? id : '',
              group_id: type === 'group' ? id : '',
            };
          }
        } else {
          // regular document/sheet/whiteboard
          endpoint = '/v1/page/document';
          if (isEdit) {
            documentData = { id, title: data.title };
          } else {
            documentData = {
              user_id: userID || '66cda5dac6886719e3345c19',
              title: data.title,
              page_type: data.page_type,
              entity_type: data.filetype,
              content: { text: 'This is the document content' },
              summary: 'This is the document summary',
              last_updated_by: userID || '66cda5dac6886719e3345c19',
              custom_meta: { author: user?.name || user?.email || ''},
              folder_id: type === 'folder' ? id : '',
              group_id: type === 'group' ? id : '',
              space_id: type === 'space' ? id : (selectedSpace?.entity_type === 'space' ? selectedSpace._id : ''),
              attachments: [],
            };
          }
        }
      } else if (data.filetype === 'folder' || data.filetype === 'group') {
        endpoint = data.filetype === 'folder' ? '/v1/folder' : '/v1/group';
        if (isEdit) {
          endpoint += `?id=${id}`;
          documentData = { name: data.title, shared_members: data.shared_members, shared_teams: data.shared_teams };
        } else {
          documentData = {
            user_id: userID || '66cda5dac6886719e3345c19',
            entity_type: data.filetype,
            name: data.title,
            shared_members: data.shared_members,
            shared_teams: data.shared_teams,
            folder_id: type === 'folder' ? id : '',
            group_id: type === 'group' ? id : '',
            space_id: type === 'space' ? id : (selectedSpace?.entity_type === 'space' ? selectedSpace._id : ''),
          };
        }
      } else {
        setLoading(false);
        return { error: 'Invalid filetype specified' };
      }

      const response = await fetch(baseUrl + endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(currentWorkspace?._id ? { 'X-Workspace-ID': currentWorkspace._id } : {})
        },
        body: JSON.stringify(documentData),
      });

      const res = await response.json();
      if (res.error) {
        console.error('Error saving document: ', res.error);
        setLoading(false);
        return;
      }

      if (isEdit) {
        const updateData = { ...res.data, ...(data.filetype === 'page' ? { title: data.title } : { name: data.title }) };
        updateHandler(id, data.filetype, updateData);
        if (onEditSuccess) onEditSuccess(res.data);
      } else {
        storeHandler(id, type, res.data);
      }

      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['spaces', userID] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });

      setLoading(false);
      setIsOpen(false);

      form.reset({ title: '', filetype: defaultFileType, page_type: 'document', shared_members: [], shared_teams: [] });
      setFileName('');
    } catch (error) {
      console.error(error);
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
              <DialogDescription className="!mb-4">
                Please provide the necessary details to {isEdit ? 'update' : 'create'}.
              </DialogDescription>
            </DialogHeader>
            {!type && (<>
              {/* <Label className="text-sm font-medium mb-2">
                Space
              </Label> */}
              <Select onValueChange={setSpaceId}
                value={spaceId}
                className="w-full"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a space" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {allSpaces?.map((option, index) => (
                      <SelectItem key={index} value={option?._id}>{option?.name}</SelectItem>
                    ))}

                    {allSpaces?.length === 0 && <SelectItem disabled>No options available</SelectItem>}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </>)}

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
                        {/* Page option - always available */}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="page" id="page" checked={field.value === "page"} />
                          <Label htmlFor="page" className="cursor-pointer">Page</Label>
                        </div>
                        
                        {/* Folder option - available in group and space contexts */}
                        {type !== 'folder' && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="folder" id="folder" checked={field.value === "folder"} />
                            <Label htmlFor="folder" className="cursor-pointer">Folder</Label>
                          </div>
                        )}
                        
                        {/* Group option - only available in space context (not in folder or group) */}
                        {type !== 'folder' && type !== 'group' && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="group" id="group" checked={field.value === "group"} />
                            <Label htmlFor="group" className="cursor-pointer">Group</Label>
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
              {!selectedSpace?.is_private && (<>
                <FormField
                  control={form.control}
                  name="shared_members"
                  render={({ field }) => (
                    <FormItem className='w-full'>
                      <FormLabel>Shared Member</FormLabel>
                      <RcMultiSelect
                        options={Array.isArray(usersData) ? usersData.map(user => ({ value: user._id, label: user.email })) : []}
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        onSearchChange={setUserSearchQuery}
                        placeholder="Search and select members"
                        searchPlaceholder="Type to search members..."
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
                      <RcMultiSelect
                        options={Array.isArray(teamsData) ? teamsData?.map(team => ({ value: team._id, label: team.name })) : []}
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        onSearchChange={setTeamSearchQuery}
                        placeholder="Search and select teams"
                        searchPlaceholder="Type to search teams..."
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

export default AddMyFilesDialog;