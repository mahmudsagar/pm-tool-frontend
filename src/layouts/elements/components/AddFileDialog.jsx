import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useForm, Controller } from "react-hook-form";
import useUserStore from "@/stores/useUserStore";
import useTeamStore from "@/stores/useTeamStore";
import useFolderStore from "@/stores/useFolderStore";
import useGroupStore from "@/stores/useGroupStore";
import { CheckIcon, ChevronsUpDown, Plus } from "lucide-react";
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
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const AddFileDialog = ({ id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFile, setIsFile] = useState('folder');

  const { userData } = useUserStore(state => state);
  const { teamData } = useTeamStore(state => state);
  const { addFile } = useFolderStore(state => state);
  const { getGroupId } = useGroupStore(state => state);  

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
            <div className="py-3 w-full flex items-start flex-col gap-4">
              { getGroupId(id) &&
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
              { isFile !== 'folder' || getGroupId(id) === false &&
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
                  <FormItem className="flex flex-col w-full">
                    <FormLabel>Shared Member</FormLabel>
                    <Popover
                      modal
                      onOpenChange={(open) => {
                        if (open) {
                          setTimeout(() => {
                            const input = document.querySelector("#command-input");
                            if (input) input.focus();
                          }, 0); // Ensure the input gets focused after the popover renders
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={true}
                            className={cn(
                              "justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? userData.find((user) => user._id === field.value)?.full_name
                              : "Select a Member"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[320px] p-0"
                        side="top"
                        align="center"
                      >
                        <Command>
                          <CommandInput placeholder="Search Member..."/>
                          <CommandList>
                            <CommandEmpty>No Member found.</CommandEmpty>
                            <CommandGroup>
                              {userData.map((user) => (
                                <CommandItem
                                  value={user._id}
                                  key={user._id}
                                  onSelect={() => {
                                    form.setValue("shared_members", user._id);
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      user._id === field.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {user.full_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shared_teams"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-full">
                    <FormLabel>Shared Team</FormLabel>
                    <Popover
                      modal
                      onOpenChange={(open) => {
                        if (open) {
                          setTimeout(() => {
                            const input = document.querySelector("#command-input");
                            if (input) input.focus();
                          }, 0); // Ensure the input gets focused after the popover renders
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={true}
                            className={cn(
                              "justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? teamData.find((team) => team._id === field.value)?.name
                              : "Select a Team"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[320px] p-0"
                        side="top"
                        align="center"
                      >
                        <Command>
                          <CommandInput placeholder="Search Team..."/>
                          <CommandList>
                            <CommandEmpty>No Team found.</CommandEmpty>
                            <CommandGroup>
                              {teamData.map((team) => (
                                <CommandItem
                                  value={team._id}
                                  key={team._id}
                                  onSelect={() => {
                                    form.setValue("shared_teams", team._id);
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      team._id === field.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {team.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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