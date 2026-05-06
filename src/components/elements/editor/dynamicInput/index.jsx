import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { CopyPlus, List, Plus, Trash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Modal from '../../modal';
import { DatePicker } from './datepicker';
import { DatePickerWithRange } from './daterangepicker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { debounce, sanitize } from '@/utils/helper';

const InputNumber = ({ ...props }) => {
  return <Input type="number" {...props} />;
};

const normalizeSelectLikeValue = (value) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "object") {
    return String(value.value ?? value.id ?? value.key ?? value.label ?? "");
  }
  return String(value);
};

const SelectField = ({ options, onChange, value, ...props }) => {
  return <Select onValueChange={onChange} value={normalizeSelectLikeValue(value)}>
    <SelectTrigger {...props}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {options?.map((option, index) => (
          <SelectItem key={index} value={normalizeSelectLikeValue(option?.value)}>{option?.label}</SelectItem>
        ))}

        {options?.length === 0 && <SelectItem disabled>No options available</SelectItem>}
      </SelectGroup>
    </SelectContent>
  </Select>
};

// Wrapper so dynamic-select fields can receive live options injected from outside.
const DynamicSelectField = ({ dynamicOptions = [], onChange, value, ...props }) => (
  <SelectField options={dynamicOptions} onChange={onChange} value={value} {...props} />
);

const DependencySelectField = React.forwardRef(/** @param {any} allProps */ (allProps, ref) => {
  const { dependencyOptions = [], onChange, value, className, ...props } = allProps;
  const [query, setQuery] = useState("");
  const current = dependencyOptions.find((opt) => String(opt.value) === String(value || "")) || null;
  const filteredDependencyOptions = useMemo(() => dependencyOptions.filter((opt) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    return (
      String(opt.label || "").toLowerCase().includes(q) ||
      String(opt.taskId || "").toLowerCase().includes(q) ||
      String(opt.value || "").toLowerCase().includes(q)
    );
  }), [dependencyOptions, query]);
  useEffect(() => {
    if (!query) return;
  }, [query, dependencyOptions.length, filteredDependencyOptions.length]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          className={`outline-none w-full h-8 justify-start text-left font-normal ${className || ""}`}
          {...props}
        >
          {current ? current.label : (value || "Select task")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search task..."
            value={query}
            onValueChange={(next) => setQuery(next)}
          />
          <CommandList>
            <CommandEmpty>No tasks found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => onChange("")}>
                <span className="mr-2 h-4 w-4" />
                Clear
              </CommandItem>
              {filteredDependencyOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.taskId || ""}`}
                  onSelect={() => {
                    console.log("[DependencyPicker][Document] select", {
                      selected: { label: opt.label, taskId: opt.taskId, value: opt.value },
                    });
                    onChange(String(opt.value));
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${String(current?.value || "") === String(opt.value) ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
DependencySelectField.displayName = "DependencySelectField";


const fieldTypes = [
  { type: 'input', label: 'Input', hasOptions: false },
  { type: 'number', label: 'Number', hasOptions: false },
  { type: 'select', label: 'Select', hasOptions: true },
  { type: 'multiSelect', label: 'Multi Select', hasOptions: true },
  { type: 'date', label: 'Date', hasOptions: false },
  { type: 'daterange', label: 'Date Range', hasOptions: false },
];

const fields = {
  input: Input,
  number: InputNumber,
  select: SelectField,
  'dynamic-select': DynamicSelectField,
  multiSelect: MultiSelect,
  date: DatePicker,
  daterange: DatePickerWithRange
}

const isDependencyField = (field) => {
  const name = String(field?.name || '').toLowerCase();
  const label = String(field?.label || '').toLowerCase();
  if (name === 'depends_on') return true;
  return label.includes('depend') || label.includes('block');
};

const Field = ({ field, control, onChange, handleFormChange, assigneeOptions = [], dependencyOptions = [] }) => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [actionType, setActionType] = useState('edit');
  /** options array for select, radio, checkbox */
  const [options, setOptions] = useState(field?.options || []);
  const [showFieldList, setShowFieldList] = useState(false);
  const [changedField, setChangedField] = useState({});

  const dependencyField = isDependencyField(field);
  const Component = dependencyField ? DependencySelectField : (fields[field.type] || Input);
  const { hasOptions, initialized, source, ...passableProps } = field;

  // For dynamic-select fields, inject the live options via a dedicated prop
  // so the component doesn't need to know about the board context itself.
  const extraProps = (field.type === 'dynamic-select')
    ? { dynamicOptions: assigneeOptions }
    : dependencyField
      ? { dependencyOptions }
      : {};

  useEffect(() => {
    // Auto-open only for freshly created fields in the current session.
    // Persisted board fields often have `initialized` undefined and should not pop open on load.
    if (field.initialized === false) {
      setOpen(true);
    }
  }, [])

  return <tr className=''>
    <td className='w-[150px]'>
      <DropdownMenu open={open} onOpenChange={state => {
        setOpen(state);
        if (!state) {
          setShowFieldList(false);
          onChange({
            ...field, label, actionType, initialized: true,
            ...(field.hasOptions ?
              { options } : {}),
            ...(changedField ? { ...changedField } : {})
          });
        }
      }}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-blue-500 justify-start">{field.label}</Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent >

          {!showFieldList && <>
            <DropdownMenuItem className="items-center justify-between cursor-pointer" onClick={e => {
              e.preventDefault();
              setShowFieldList(true);
            }}>
              <h5 className="text-sm">Field Type</h5>
              <div className='flex items-center gap-1'>
                <List size={12} />
                {field.type}
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>}

          {showFieldList ?

            <FieldList handleCreateField={setChangedField} />
            :
            <>
              <DropdownMenuLabel>
                <Input
                  className="h-8"
                  id="field-label-input"
                  placeholder="Enter label"
                  onChange={e => setLabel(e.target.value)}
                  value={label}
                />
              </DropdownMenuLabel>

              {field?.hasOptions && <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex-col gap-2 items-start focus:bg-transparent" onClick={e => { e.preventDefault() }}>
                  <h5 className="text-sm mt-2">Options</h5>
                  <div className="flex flex-col gap-2 items-start p-1 max-h-40 overflow-y-auto better-scrollbar">
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-1 justify-between items-center">
                        <Input
                          onKeyDown={e => e.stopPropagation()}
                          className="h-8"
                          onChange={e => {
                            const updatedOptions = [...options];
                            updatedOptions[index] = {
                              value: e.target.value,
                              label: e.target.value
                            };
                            setOptions(updatedOptions);
                          }}
                          value={option.label}
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
                </DropdownMenuItem>
              </>
              }
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setActionType('duplicate')}>
                  <div className='flex items-center gap-1'>
                    <CopyPlus size={12} /> Duplicate property
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:text-red-600" onClick={() => setActionType('delete')}>
                  <div className='flex items-center gap-1'>
                    <Trash size={12} /> Delete property
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>}
        </DropdownMenuContent>
      </DropdownMenu>
    </td>
    <td>
      <FormField
        control={control}
        name={field.name}
        render={({ field: formField }) => {
          if (['date', 'daterange', 'multiSelect'].includes(field.type)) {
            formField.handleFormChange = handleFormChange;
          }
          return <FormItem>
            <FormControl>
              <Component className="outline-none w-full h-8" {...passableProps} {...formField} {...extraProps} />
            </FormControl>
          </FormItem>
        }}
      />
    </td>
  </tr>
}

const FieldList = ({ handleCreateField }) => {
  const [searchValue, setSearchValue] = useState('');
  return <>
    <DropdownMenuItem className="mb-1.5" onClick={e => e.preventDefault()} asChild>
      <Input className="py-1 h-8 cursor-auto focus-visible:ring-0" placeholder="Search a property" onKeyDown={e => e.stopPropagation()} onChange={e => setSearchValue(e.target.value)} />
    </DropdownMenuItem>

    {fieldTypes.filter(field => field.label.toLowerCase().includes(searchValue.toLowerCase()))
      .map((field, index) => (
        <DropdownMenuItem key={index} className="cursor-pointer" onClick={() => {
          handleCreateField(field);
        }}>
          {field.label}
        </DropdownMenuItem>
      ))}
  </>
}


const DynamicInput = ({ initialData, onChange, assigneeOptions = [], dependencyOptions = [] }) => {
  const { fields = [], values = {} } = sanitize(initialData);
  const [customFields, setCustomFields] = useState(fields); // List of added fields
  const form = useForm({
    defaultValues: values
  })

  const handleCreateField = ({ type, label, ...rest }) => {
    /** store the new field in the list by a random id */
    const newField = {
      type,
      initialized: false,
      label,
      name: Math.random().toString(36).substring(7),
      ...rest
    };

    setCustomFields([...customFields, newField]); // Add the new field to the list
  };

  const handleEditField = ({ name, label, actionType, ...rest }) => {
    if (actionType === 'delete') {
      setCustomFields(customFields.filter(field => field.name !== name));
    }
    else if (actionType === 'duplicate') {
      const field = customFields.find(field => field.name === name);
      const newField = {
        ...field,
        name: Math.random().toString(10).substring(7),
        initialized: false
      }
      setCustomFields([...customFields, newField]);
    }
    else {
      const updatedFields = customFields.map(field => {
        if (field.name === name) {
          return { ...field, label, ...rest };
        }
        return field;
      })

      setCustomFields(updatedFields);
    }
  }

  useEffect(() => {
    handleFormChange();
  }, [customFields.length]);

  const handleFormChange = debounce(() => {
    const values = form.getValues();

    const fields = customFields.map(({ ...rest }) => ({ ...rest }));
    onChange({ values, fields });
  }, 1000);

  return (

    <Form {...form}>
      <form onChange={handleFormChange} onSubmit={e => e.preventDefault()}>
        <table className='w-full mt-3'>
          <tbody>
            {customFields.map((customField, index) => <Field key={index} field={customField} control={form.control} onChange={handleEditField} handleFormChange={handleFormChange} assigneeOptions={assigneeOptions} dependencyOptions={dependencyOptions} />
            )}
          </tbody>
        </table>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="opacity-60">
              <Plus size={16} className='mr-1' />
              Add a property
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <FieldList handleCreateField={handleCreateField} />
          </DropdownMenuContent>
        </DropdownMenu>
        <Modal />
      </form >
    </Form >
  );
};

export default DynamicInput;