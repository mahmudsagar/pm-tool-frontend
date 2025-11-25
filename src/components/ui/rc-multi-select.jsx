import { useState, useEffect } from 'react';
import Select from 'rc-select';
import 'rc-select/assets/index.css';
import { cn } from '@/lib/utils';
import './rc-multi-select.css';

export const RcMultiSelect = ({
  options = [],
  value = [],
  onChange,
  onSearchChange,
  placeholder = "Select options",
  searchPlaceholder = "Type to search...",
  className,
  ...props
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [internalValue, setInternalValue] = useState(value || []);

  // Sync internal value with external value
  useEffect(() => {
    setInternalValue(value || []);
  }, [value]);

  // Handle search with debouncing
  useEffect(() => {
    if (!searchValue || searchValue.length < 2) {
      if (onSearchChange) {
        onSearchChange('');
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(searchValue);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue, onSearchChange]);

  const handleSearch = (val) => {
    setSearchValue(val);
  };

  const handleChange = (selectedValues) => {
    const values = selectedValues || [];
    setInternalValue(values);
    if (onChange) {
      onChange(values);
    }
    // Don't clear search immediately after selection
  };

  const handleDropdownVisibleChange = (open) => {
    if (!open) {
      // Clear search when dropdown closes
      setSearchValue('');
      if (onSearchChange) {
        onSearchChange('');
      }
    }
  };

  return (
    <Select
      mode="multiple"
      value={internalValue}
      onChange={handleChange}
      onSearch={handleSearch}
      onDropdownVisibleChange={handleDropdownVisibleChange}
      placeholder={placeholder}
      notFoundContent={searchValue.length >= 2 ? "No results found" : "Type to search..."}
      showSearch
      filterOption={false}
      allowClear
      maxTagCount="responsive"
      className={cn("rc-multi-select-custom", className)}
      dropdownClassName="rc-multi-select-dropdown"
      listHeight={256}
      virtual={false}
      autoClearSearchValue={false}
      {...props}
    >
      {options.map((option) => (
        <Select.Option key={option.value} value={option.value}>
          {option.label}
        </Select.Option>
      ))}
    </Select>
  );
};
