import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import useApi from '@/lib/dataFetcher';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { baseUrl } from '@/utils/constants';
import { MultiSelect } from '@/components/ui/multi-select';
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
import { useAuth } from '@/contexts/AuthContext';
import { ensureArray } from '@/utils/helper';

const AddSpaceDialog = ({
  id,
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
  const usersData = ensureArray(users);
  const teamsData = ensureArray(teams);
  const { storeHandler, updateHandler } = useFileManagerStore(state => state);

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
          console.error("Error fetching data:", error);
        }
      })();
    }
  }, [isOpen]);

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
    const endpoint = "/v1/space";
    const method = isEdit ? 'PUT' : 'POST';

    const spaceData = {
      name: data.name,
      description: data.description,
      user_id: userID || "66cda5dac6886719e3345c19",
      is_private: data.is_private ?? false,
      shared_members: data.shared_members,
      shared_teams: data.shared_teams,
      is_default: data.is_default ?? false
    };

    // For editing, add the ID parameter
    const url = isEdit ? `${baseUrl}${endpoint}?id=${id}` : `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(spaceData),
      });

      const result = await response.json();

      if (result.error) {
        console.error("Error saving space: ", result.error);
        setLoading(false);
        return;
      }

      if (isEdit) {
        // Update the store with edited data
        await updateHandler(id, 'space', result.data);

        // Call the edit success callback if provided
        if (onEditSuccess) {
          onEditSuccess(result.data);
        }
      } else {
        // For creation, use the existing storeHandler
        await storeHandler(parentId, 'space', result.data);
      }

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
                    <MultiSelect
                      options={Array.isArray(usersData) ? usersData.map(user => ({ value: user._id, label: user.email })) : []}
                      onValueChange={(value) => field.onChange(value)}
                      placeholder="Select members to share with"
                      variant="inverted"
                      animation={2}
                      maxCount={3}
                      handleFormChange={field.onChange}
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
                    <MultiSelect
                      options={Array.isArray(teamsData) ? teamsData?.map(team => ({ value: team._id, label: team.name })) : []}
                      onValueChange={(value) => field.onChange(value)}
                      placeholder="Select teams to share with"
                      variant="inverted"
                      animation={2}
                      maxCount={3}
                      handleFormChange={field.onChange}
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