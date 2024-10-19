import { useEffect, useState } from "react";
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
import { Plus } from "lucide-react";
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
import MenuItemLoading from "./MenuItemLoading";
import { MultiSelect } from "@/components/ui/multi-select";

const AddFolderDialog = ({ spaceId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { addNewFolder, loading } = useFolderStore(state => state);
  const { userData, fetchUserData } = useUserStore(state => state);
  const { teamData, fetchTeamData } = useTeamStore(state => state);
  
  const form = useForm({
    defaultValues: {
      type : '',
      name: '',
      shared_teams: '',
      shared_members: '',
    }
  });
  
  const { formState: { errors } } = form;
  const frameworksList = [
    { value: "react", label: "React" },
    { value: "angular", label: "Angular"},
    { value: "vue", label: "Vue"},
    { value: "svelte", label: "Svelte"},
    { value: "ember", label: "Ember"},
  ];

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

  const onSubmit = async (data) => {
    try {
      await addNewFolder(data, spaceId);
      setIsOpen(false);      
    } catch (error) {
      console.error(error);
    }
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
                rules={{ required: "Please select a type." }}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="w-full"
                  >
                    <FormLabel className={errors.type?.message && 'text-red-500'}>Type</FormLabel>
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
                    <FormMessage className="text-red-500">{errors.type?.message}</FormMessage>
                  </RadioGroup>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Please provide a name." }}
                render={({ field }) => (
                  <FormItem className="w-full" >
                    <FormLabel className={errors.name?.message && 'text-red-500'}>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Folder Name" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-500">{errors.name?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shared_members"
                render={({ field }) => (
                  <FormItem className='w-full'>
                    <FormLabel>Shared Member</FormLabel>
                    <MultiSelect
                      options={frameworksList}
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
                      options={frameworksList}
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
              <Button type="submit">
                { loading.add ? <MenuItemLoading text='Creating' flex='row' btn={true} /> : 'Create' }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddFolderDialog;
