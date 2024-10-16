import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useFolderStore from "@/stores/useFolderStore";
import useUserStore from "@/stores/useUserStore";
import useTeamStore from "@/stores/useTeamStore";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { useEffect } from "react";

const AddFolderDialog = ({ spaceId }) => {
  const { addFolder } = useFolderStore(state => state);
  const { 
    userData, 
    loading: userLoading, 
    error: userError, 
    fetchUserData 
  } = useUserStore(state => state);
  const { 
    teamData, 
    loading: teamLoading, 
    error: teamError, 
    fetchTeamData 
  } = useTeamStore(state => state);

  console.log(teamData);
  

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
      name: ''
    }
  });

  const onSubmit = (data) => {
    // Handle form submission
    console.log(data);
    // Add your form submission logic here
  };
  
  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="ghost" size="icon" className="group hover:bg-slate-300 w-6 h-6">
          <Plus size={16} className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Please provide the necessary details to create a new folder.
              </DialogDescription>
            </DialogHeader>
            {/* Form Fields */}
            <div className="py-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormLabel>Type</FormLabel>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="option-one" id="option-one" />
                        <Label htmlFor="option-one">Group</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="option-two" id="option-two" />
                        <Label htmlFor="option-two">Folder</Label>
                      </div>
                    </div>
                  </RadioGroup>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="my-3">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="New Folder" {...field} />
                    </FormControl>
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