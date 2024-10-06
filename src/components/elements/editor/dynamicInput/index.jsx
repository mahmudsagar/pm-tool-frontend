import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModal } from '../../modal/useModal';
import Modal from '../../modal';
import { DialogClose, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DatePicker } from './datepicker';
import { DatePickerWithRange } from './daterangepicker';

const InputNumber = () => {
  return <Input type="number" />;
};

const SelectField = ({ options }) => {
  if (!options.length) return null;
  return <Select>
    <SelectTrigger className="w-[180px] dark:bg-slate-100">
      <SelectValue placeholder="Select" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {options.map((option, index) => (
          <SelectItem key={index} value={option}>{option}</SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
};


const fieldTypes = [
  { type: 'input', label: 'Input', component: Input },
  { type: 'number', label: 'Number', component: InputNumber },
  { type: 'select', label: 'Select', component: SelectField, hasOptions: true },
  { type: 'date', label: 'Date', component: DatePicker },
  { type: 'daterange', label: 'Date Range', component: DatePickerWithRange },
];

const CreateFieldPopup = ({ type, hasOptions, onConfirm }) => {
  const [label, setLabel] = useState('');
  /** options array */
  const [options, setOptions] = useState([]);

  return <>
    <DialogHeader>
      <DialogTitle>Create a {type} field</DialogTitle>
    </DialogHeader>
    <div className="grid w-56 items-center gap-1.5">
      <Input
        placeholder="Enter label"
        onChange={e => setLabel(e.target.value)}
        value={label}
      />


      {hasOptions && <>
        <h5 className="text-sm mt-2">Options</h5>
        <div className="flex flex-col gap-2 items-start p-1 h-40 overflow-y-auto better-scrollbar">
          {options.map((option, index) => (
            <div key={index} className="flex gap-1 justify-between items-center">
              <Input
                className="h-8"
                onChange={e => {
                  const updatedOptions = [...options];
                  updatedOptions[index] = e.target.value;
                  setOptions(updatedOptions);
                }}
                value={option}
              />
              <Button variant="ghost" size="sm" className="px-2 py-1" onClick={() => {
                const updatedOptions = options.filter((_, i) => i !== index);
                setOptions(updatedOptions);
              }}>
                <Trash size={12} />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => setOptions([...options.filter(Boolean), ''])}
            className="h-8"
          >
            Add new
          </Button>
        </div>
      </>
      }
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button disabled={!label} onClick={() => onConfirm({ label, options: options.filter(Boolean) })}>
          Confirm
        </Button>
      </DialogClose>

    </DialogFooter>
  </>
};

const EditFieldPopup = ({ onConfirm, ...props }) => {
  const [label, setLabel] = useState(props.label);
  return <>
    <DialogHeader>
      <DialogTitle>Edit this field</DialogTitle>
    </DialogHeader>
    <div className="grid w-72 items-center gap-1.5">
      <Label htmlFor="field-label-input">Label</Label>
      <Input
        id="field-label-input"
        placeholder="Enter label"
        onChange={e => setLabel(e.target.value)}
        value={label}
      />
    </div>
    <DialogFooter className="sm:justify-start">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="destructive">
            <Trash size={16} />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This field will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <DialogClose asChild>
              <AlertDialogAction onClick={() => onConfirm({ actionType: 'delete' })}>Continue</AlertDialogAction>
            </DialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DialogClose asChild>
        <Button variant="outline">
          Cancel
        </Button>
      </DialogClose>
      <DialogClose asChild>
        <Button disabled={!label} onClick={() => onConfirm({ label })}>
          Confirm
        </Button>
      </DialogClose>
    </DialogFooter>
  </>
};


const DynamicInput = () => {
  const [fields, setFields] = useState([]); // List of added fields
  const { openModal } = useModal();

  const [searchValue, setSearchValue] = useState('');

  const handleCreateField = ({ type, ...rest }) => {
    /** store the new field in the list by a random id */

    const newField = {
      id: Math.random().toString(10).substring(7),
      component: fieldTypes.find(field => field.type === type).component,
      type,
      ...rest
    };

    setFields([...fields, newField]); // Add the new field to the list
  };

  const handleEditField = ({ id, label, actionType, ...rest }) => {
    if (actionType === 'delete') {
      setFields(fields.filter(field => field.id !== id));
    } else {
      const updatedFields = fields.map(field => {
        if (field.id === id) {
          return { ...field, label, ...rest };
        }
        return field;
      });

      setFields(updatedFields);
    }
  }

  return (
    <div className=''>
      <div className="">
        {fields.map((field, index) => (
          <div className="flex w-full max-w-sm items-center gap-1.5 mt-2" key={index}>
            <Button variant="ghost" className="text-blue-500 w-[150px] justify-start"
              onClick={() => {
                openModal({
                  content: <EditFieldPopup {...field} onConfirm={({ ...rest }) => {
                    handleEditField({ id: field.id, ...rest });
                  }} />
                });
              }}>{field.label}</Button>
            <field.component className="outline-none w-auto" {...field} />
          </div>
        ))}
      </div>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="opacity-60">
            <Plus size={16} className='mr-1' />
            Add a property</Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56">

          <DropdownMenuItem className="mb-1.5" onClick={e => e.preventDefault()} asChild>
            <Input className="py-1 h-8 cursor-auto" placeholder="Search a property" onChange={e => setSearchValue(e.target.value)} />
          </DropdownMenuItem>

          {fieldTypes.filter(field => field.label.toLowerCase().includes(searchValue.toLowerCase()))
            .map((field, index) => (
              <DropdownMenuItem key={index} className="cursor-pointer" onClick={() => {
                openModal({
                  content: <CreateFieldPopup {...field} onConfirm={({ ...rest }) => {
                    handleCreateField({ ...field, ...rest });
                  }} />
                });
              }}>
                {field.label}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Modal />
    </div>
  );
};

export default DynamicInput;