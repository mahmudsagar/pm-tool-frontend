import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useUserStore from "@/stores/useUserStore";
import useTeamStore from "@/stores/useTeamStore";
import useFolderStore from "@/stores/useFolderStore";
import { Label } from "@/components/ui/label";
import { 
  RadioGroup, 
  RadioGroupItem 
} from "@/components/ui/radio-group";
import { 
  CheckIcon, 
  Plus, 
  ChevronsUpDown 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription 
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
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";

const AddFolderDialog = ({ spaceId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { addFolder } = useFolderStore(state => state);
  const { userData, fetchUserData } = useUserStore(state => state);
  const { teamData, fetchTeamData } = useTeamStore(state => state);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchUserData(), fetchTeamData()]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [fetchUserData, fetchTeamData]);
  

  const form = useForm({
    defaultValues: {
      type : '',
      name: '',
      shared_teams: '',
      shared_members: '',
    }
  });

  const onSubmit = (data) => {
    // Handle form submission
    console.log(data);
    // Add your form submission logic here
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button variant="ghost" size="icon" className="group hover:bg-slate-300 w-6 h-6">
          <Plus size={16} className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Please provide the necessary details to create a new folder.
              </DialogDescription>
            </DialogHeader>
            {/* Form Fields */}
            <div className="py-3 w-full flex items-start flex-col gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="w-full"
                  >
                    <FormLabel>Type</FormLabel>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="group" id="group" />
                        <Label htmlFor="group" className="cursor-pointer">Group</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="folder" id="folder" />
                        <Label htmlFor="folder" className="cursor-pointer">Folder</Label>
                      </div>
                    </div>
                  </RadioGroup>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full" >
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Folder Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
  )
}

export default AddFolderDialog;
