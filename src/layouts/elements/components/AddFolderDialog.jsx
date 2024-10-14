import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useFolderStore from "@/stores/useFolderStore";
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

const AddFolderDialog = ({ spaceId }) => {
  const form = useForm();
  const { addFolder } = useFolderStore();

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
            {/* Form Fields Moved Outside of DialogDescription */}
            <div className="py-3">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Folder Name" {...field} />
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