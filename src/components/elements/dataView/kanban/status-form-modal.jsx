import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const colorOptions = [
  { label: "Slate", value: "bg-slate-100", preview: "bg-slate-100" },
  { label: "Blue", value: "bg-blue-100", preview: "bg-blue-100" },
  { label: "Green", value: "bg-green-100", preview: "bg-green-100" },
  { label: "Yellow", value: "bg-yellow-100", preview: "bg-yellow-100" },
  { label: "Orange", value: "bg-orange-100", preview: "bg-orange-100" },
  { label: "Red", value: "bg-red-100", preview: "bg-red-100" },
  { label: "Purple", value: "bg-purple-100", preview: "bg-purple-100" },
  { label: "Pink", value: "bg-pink-100", preview: "bg-pink-100" },
  { label: "Indigo", value: "bg-indigo-100", preview: "bg-indigo-100" },
  { label: "Cyan", value: "bg-cyan-100", preview: "bg-cyan-100" },
];

function StatusFormModal({ open, onOpenChange, status = null, onSave, onDelete }) {
  const isEditing = !!status;
  const form = useForm({
    defaultValues: {
      title: '',
      color: 'bg-slate-100'
    }
  });

  // Reset form when status changes or modal opens
  useEffect(() => {
    if (status) {
      // Editing existing status
      form.reset({
        title: status.title || '',
        color: status.color || 'bg-slate-100'
      });
    } else if (open) {
      // Creating new status
      form.reset({
        title: '',
        color: 'bg-slate-100'
      });
    }
  }, [status, open, form]);

  const onSubmit = (data) => {
    // Generate status ID for new statuses
    const id = status?.id || data.title.toLowerCase().replace(/\s+/g, '-');

    const statusData = {
      ...data,
      id
    };

    onSave(statusData, isEditing);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (status && onDelete) {
      onDelete(status.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Status' : 'Create New Status'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter status name" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${option.preview} border`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <div>
                {isEditing && onDelete && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                  >
                    Delete Status
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Update Status' : 'Create Status'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default StatusFormModal;
