import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import useApi from '@/lib/dataFetcher';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { baseUrl } from '@/utils/constants';
import { RcMultiSelect } from '@/components/ui/rc-multi-select';
import useFileManagerStore from "@/stores/useFileManagerStore";
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
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import ButtonLoading from './ButtonLoading';
import useAuthStore from '@/stores/useAuthStore';
import { ensureArray } from '@/utils/helper';
import { useCreateSpace, useUpdateSpace } from '@/hooks/mutations/useSpacesMutations';
import { useQueryClient } from '@tanstack/react-query';

const AddSpaceDialog = ({
  id,
  space_visibility,
  isEdit = false,
  initialData = {},
  isOpen,
  setIsOpen,
  onEditSuccess,
  parentId = null
}) => {
  const [loading, setLoading] = useState(false);
  const { data: users, callApi: userCallApi } = useApi();
  const { data: teams, callApi: teamCallApi } = useApi();
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchedTeams, setSearchedTeams] = useState([]);
  const usersData = userSearchQuery ? ensureArray(searchedUsers) : ensureArray(users);
  const teamsData = teamSearchQuery ? ensureArray(searchedTeams) : ensureArray(teams);
  const { createSpaceAndSync, storeHandler, updateHandler } = useFileManagerStore(state => state);

  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      is_private: initialData?.is_private ?? false,
      is_default: initialData?.is_default ?? false,
      shared_members: initialData?.shared_members || [],
      shared_teams: initialData?.shared_teams || []
    }
  });

  const { user } = useAuthStore();
  const userID = user?._id;
  
  // TanStack Query mutations and client
  const createSpaceMutation = useCreateSpace();
  const updateSpaceMutation = useUpdateSpace();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.getElementById('main-content')?.toggleAttribute('inert', isOpen);

    if (isOpen) {
      (async () => {
        try {
          await userCallApi(baseUrl + '/v1/user');
          await teamCallApi(baseUrl + '/v1/team?user_id=' + userID);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      })();
    }
  }, [isOpen, userCallApi, teamCallApi, userID]);

  const { token } = useAuthStore();

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
              'Authorization': `Bearer ${token}`
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
              'Authorization': `Bearer ${token}`
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

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (isEdit && initialData) {
      form.reset({
        name: initialData?.name || '',
        description: initialData?.description || '',
        is_private: initialData?.is_private ?? false,
        is_default: initialData?.is_default ?? false,
        shared_members: initialData?.shared_members || [],
        shared_teams: initialData?.shared_teams || []
      });
    }
  }, [isEdit, initialData, form]);

  const onSubmit = async (data) => {
    setLoading(true);

    const spaceData = {
      name: data.name,
      description: data.description,
      user_id: userID || "66cda5dac6886719e3345c19",
      is_private: data.is_private ? data.is_private : space_visibility ?? false,
      shared_members: data.shared_members,
      shared_teams: data.shared_teams,
      is_default: data.is_default ?? false
    };

    try {
      if (isEdit) {
        // Update existing space using TanStack Query mutation
        await updateSpaceMutation.mutateAsync({ 
          spaceId: id, 
          data: spaceData 
        });
        
        // Update the file manager store
        await updateHandler(id, 'space', spaceData);

        // Call the edit success callback if provided
        if (onEditSuccess) {
          onEditSuccess(spaceData);
        }
      } else {
        // Create new space using TanStack Query mutation
        const result = await createSpaceMutation.mutateAsync(spaceData);
        
        // Update the file manager store with the new space
        await storeHandler(parentId, 'space', result);
        
        // Also sync spaces from API to ensure consistency
        await createSpaceAndSync(spaceData);
      }

      // Invalidate and refetch queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['spaces', userID] });

      setLoading(false);
      setIsOpen(false);
      form.reset();
    } catch (error) {
      setLoading(false);
      console.error("Error processing request: ", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isEdit) {
        form.reset({
          name: '',
          description: '',
          is_private: false,
          is_default: false,
          shared_members: [],
          shared_teams: []
        });
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
      <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Edit Space' : 'Create Space'}</DialogTitle>
              <DialogDescription>
                {isEdit ? 'Update your workspace settings.' : 'Create a new workspace for your team.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Space name"
                        {...field}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your workspace..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shared_members"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shared Members</FormLabel>
                    <RcMultiSelect
                      options={Array.isArray(usersData) ? usersData.map(user => ({ value: user._id, label: user.email })) : []}
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      onSearchChange={setUserSearchQuery}
                      placeholder="Search and select members"
                      searchPlaceholder="Type to search members..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shared_teams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shared Teams</FormLabel>
                    <RcMultiSelect
                      options={Array.isArray(teamsData) ? teamsData?.map(team => ({ value: team._id, label: team.name })) : []}
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      onSearchChange={setTeamSearchQuery}
                      placeholder="Search and select teams"
                      searchPlaceholder="Type to search teams..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {loading ?
                  <ButtonLoading text={isEdit ? 'Updating...' : 'Creating...'} flex='row' btn={true} /> :
                  isEdit ? "Update Space" : "Create Space"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSpaceDialog;