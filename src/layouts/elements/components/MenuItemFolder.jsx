import Link from "@/BetterRouter/Link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  Plus,
  EllipsisVertical,
  File,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../subnav-accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useSidebar } from "@/stores/store";
import { useEffect, useState } from "react";
import useFolderStore from "@/stores/folderStore";

const MenuItemFolder = ({ folder }) => {
  const form = useForm();
  const { isOpen } = useSidebar();
  const [openItem, setOpenItem] = useState("");
  const [lastOpenItem, setLastOpenItem] = useState("");
  const [dropdownOpenStates, setDropdownOpenStates] = useState({});
  const { deleteItem } = useFolderStore(state => state);

  useEffect(() => {
    if (isOpen) {
      setOpenItem(lastOpenItem);
    } else {
      setLastOpenItem(openItem);
      setOpenItem("");
    }
  }, [isOpen]);

  const handleDropdownToggle = (id) => {
    setDropdownOpenStates((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const onSubmit = (data) => {
    // Handle form submission
    console.log(data);
    // Add your form submission logic here
  };

  return (
    <Link to={`/file-manager/${folder._id}`}>
      <Accordion
        type="single"
        collapsible
        className="space-y-2"
        value={openItem}
        onValueChange={setOpenItem}
      >
        <AccordionItem value={folder._id} className="border-none ">
          <AccordionTrigger
            className={cn(
              'group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline',
            )}
          >
            <div className="flex justify-between items-center">
              <File size={18} className={cn('inline group-hover:hidden group-data-[state=open]:hidden')} />
              <ChevronDownIcon
                strokeWidth={2.5}
                size={20}
                className={cn(
                  'hidden group-hover:inline group-data-[state=open]:inline shrink-0 transition-transform duration-200',
                  { 'inline': openItem === folder._id }
                )}
              />

              <div className={cn('absolute left-10 text-sm duration-200', !isOpen && className)}>
                {folder.name}
              </div>
            </div>
            <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${openItem === folder._id || dropdownOpenStates[folder._id] ? 'opacity-100' : ''}`}>
              <div className="flex gap-1">
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
                        <DialogTitle>Create New File</DialogTitle>
                        <DialogDescription>
                          Please provide the necessary details to create a new file.
                        </DialogDescription>
                      </DialogHeader>
                      {/* Form Fields Moved Outside of DialogDescription */}
                      <div className="py-3">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem className="mb-3">
                              <FormLabel>File Name</FormLabel>
                              <FormControl>
                                <Input placeholder="File Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="categories"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select File Type</FormLabel>
                              <FormControl>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="File Format" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="png">png</SelectItem>
                                    <SelectItem value="jpg">jpg</SelectItem>
                                    <SelectItem value="pdf">pdf</SelectItem>
                                  </SelectContent>
                                </Select>
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
                <DropdownMenu open={dropdownOpenStates[folder._id]} onOpenChange={() => handleDropdownToggle(folder._id)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-slate-300 w-6 h-6" onClick={(e) => e.stopPropagation()}>
                      <EllipsisVertical
                        size={16}
                        className={cn(
                          'text-slate-500 hover:text-black dark:text-white dark:hover:text-black',
                          dropdownOpenStates[folder._id] ? 'opacity-100' : 'opacity-100'
                        )}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} >
                    <DropdownMenuItem className="cursor-pointer" onClick={() => deleteItem('folder', folder._id)} >Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pl-6 py-3">
            <p className="text-center">Empty</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Link>
  )
}

export default MenuItemFolder