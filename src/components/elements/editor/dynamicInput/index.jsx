import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModal } from '../../modal/useModal';
import Modal from '../../modal';
import { DialogClose, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const InputNumber = () => {
  return <Input type="number" />;
};

const fieldTypes = [
  { type: 'input', label: 'Input', component: Input },
  { type: 'number', label: 'Number', component: InputNumber },
  // { type: 'select', label: 'Select', component: Select },
  // { type: 'checkbox', label: 'Checkbox', component: Checkbox },
];

const FieldPopup = ({ type, onConfirm }) => {
  const [label, setLabel] = useState('');
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
    </div>
    <DialogFooter className="sm:justify-start">
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

  const handleConfirmField = ({ label, type }) => {
    const newField = {
      label,
      component: fieldTypes.find(field => field.type === type).component,
    };

    setFields([...fields, newField]); // Add the new field to the list
  };

  return (
    <div className='ml-2'>
      <div className="">
        {fields.map((field, index) => (
          <div className="grid w-full max-w-sm items-center gap-1.5 mt-2" key={index}>
            <Label htmlFor="email" className="cursor-pointer">{field.label}</Label>
            <field.component />
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
                  content: <FieldPopup type={field.label} onConfirm={({ label }) => {
                    handleConfirmField({ label, type: field.type });
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