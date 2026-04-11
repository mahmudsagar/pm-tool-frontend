import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { Plus, Check, XIcon } from "lucide-react";
import useApi from '@/lib/dataFetcher';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { baseUrl } from '@/utils/constants';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSearchWorkspaceMembers } from '@/hooks/queries/useSpacesQueries';
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
  const { data: teams, callApi: teamCallApi } = useApi();
  const [teamSearch, setTeamSearch] = useState('');
  const [debouncedTeamSearch, setDebouncedTeamSearch] = useState('');
  const [searchedTeams, setSearchedTeams] = useState([]);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [teamMap, setTeamMap] = useState({});
  const [fetchingTeams, setFetchingTeams] = useState(false);
  const teamsData = debouncedTeamSearch ? ensureArray(searchedTeams) : ensureArray(teams);
  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [memberMap, setMemberMap] = useState({});
  const { syncSpacesFromAPI, updateHandler } = useFileManagerStore(state => state);

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

  const { user, token, currentWorkspace } = useAuthStore();
  const userID = user?._id;
  
  // TanStack Query mutations and client
  const createSpaceMutation = useCreateSpace();
  const updateSpaceMutation = useUpdateSpace();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          await teamCallApi(baseUrl + '/v1/team?user_id=' + userID);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      })();
    }
  }, [isOpen, teamCallApi, userID]);

  // Debounced search for workspace members
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMemberSearch(memberSearch), 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  // Debounced search for teams
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTeamSearch(teamSearch), 300);
    return () => clearTimeout(timer);
  }, [teamSearch]);

  const { data: memberResults = [], isFetching: fetchingMembers } = useSearchWorkspaceMembers(debouncedMemberSearch);

  const toggleMemberInForm = (u) => {
    setMemberMap((prev) => ({ ...prev, [u._id]: u }));
    const current = form.getValues('shared_members');
    form.setValue(
      'shared_members',
      current.includes(u._id)
        ? current.filter((id) => id !== u._id)
        : [...current, u._id],
      { shouldDirty: true }
    );
  };

  const toggleTeamInForm = (team) => {
    setTeamMap((prev) => ({ ...prev, [team._id]: team }));
    const current = form.getValues('shared_teams');
    form.setValue(
      'shared_teams',
      current.includes(team._id)
        ? current.filter((id) => id !== team._id)
        : [...current, team._id],
      { shouldDirty: true }
    );
  };

  // Fetch teams when debouncedTeamSearch changes
  useEffect(() => {
    if (!debouncedTeamSearch || debouncedTeamSearch.length < 2) {
      setSearchedTeams([]);
      return;
    }

    const fetchTeams = async () => {
      setFetchingTeams(true);
      try {
        const response = await fetch(
          `${baseUrl}/v1/team?user_id=${userID}&search=${encodeURIComponent(debouncedTeamSearch)}`,
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
      } finally {
        setFetchingTeams(false);
      }
    };

    fetchTeams();
  }, [debouncedTeamSearch, userID, token]);

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
        await createSpaceMutation.mutateAsync(spaceData);

        // Sync the Zustand store so the sidebar reflects the new space
        await syncSpacesFromAPI(userID);
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
        setMemberSearch('');
        setDebouncedMemberSearch('');
        setMemberMap({});
        setTeamSearch('');
        setDebouncedTeamSearch('');
        setTeamMap({});
      }
      setIsOpen(open);
    }}>
      {!isEdit && (
        <DialogTrigger asChild>
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
              {!space_visibility && (
                <>
                  <FormField
                    control={form.control}
                    name="shared_members"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shared Members</FormLabel>
                        <div className="relative">
                          <Input
                            placeholder="Search workspace members..."
                            value={memberSearch}
                            onChange={(e) => { setMemberSearch(e.target.value); setMemberDropdownOpen(true); }}
                            onFocus={() => setMemberDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setMemberDropdownOpen(false), 150)}
                            autoComplete="off"
                          />
                          {memberDropdownOpen && debouncedMemberSearch.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                              {fetchingMembers ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                              ) : memberResults.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No members found.</div>
                              ) : (
                                <ul className="max-h-48 overflow-y-auto py-1">
                                  {memberResults.map((u) => (
                                    <li
                                      key={u._id}
                                      onMouseDown={(e) => { e.preventDefault(); toggleMemberInForm(u); }}
                                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                    >
                                      <Check
                                        className={cn(
                                          'h-4 w-4 shrink-0',
                                          field.value.includes(u._id) ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      <div className="flex flex-col min-w-0">
                                        <span className="truncate">{u.email}</span>
                                        {u.name && (
                                          <span className="text-xs text-muted-foreground truncate">{u.name}</span>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.value.map((memberId) => {
                              const u = memberMap[memberId];
                              return (
                                <Badge key={memberId} variant="secondary" className="flex items-center gap-1">
                                  {u?.email || u?.name || memberId}
                                  <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); field.onChange(field.value.filter((id) => id !== memberId)); }}
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
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
                        <div className="relative">
                          <Input
                            placeholder="Search teams..."
                            value={teamSearch}
                            onChange={(e) => { setTeamSearch(e.target.value); setTeamDropdownOpen(true); }}
                            onFocus={() => setTeamDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setTeamDropdownOpen(false), 150)}
                            autoComplete="off"
                          />
                          {teamDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                              {fetchingTeams ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                              ) : teamsData.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No teams found.</div>
                              ) : (
                                <ul className="max-h-48 overflow-y-auto py-1">
                                  {teamsData.map((team) => (
                                    <li
                                      key={team._id}
                                      onMouseDown={(e) => { e.preventDefault(); toggleTeamInForm(team); }}
                                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                    >
                                      <Check
                                        className={cn(
                                          'h-4 w-4 shrink-0',
                                          field.value.includes(team._id) ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      <span className="truncate">{team.name}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.value.map((teamId) => {
                              const t = teamMap[teamId];
                              return (
                                <Badge key={teamId} variant="secondary" className="flex items-center gap-1">
                                  {t?.name || teamId}
                                  <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); field.onChange(field.value.filter((id) => id !== teamId)); }}
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
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