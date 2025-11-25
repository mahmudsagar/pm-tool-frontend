import * as React from "react";
import { Check, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export const SearchableMultiSelect = React.forwardRef(
  (
    {
      options = [],
      value = [],
      onChange,
      onSearchChange,
      placeholder = "Select options",
      searchPlaceholder = "Search...",
      maxCount = 3,
      className,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] = React.useState(value);
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const inputRef = React.useRef(null);

    // Sync with external value changes
    React.useEffect(() => {
      setSelectedValues(value);
    }, [value]);

    // Handle search changes with debouncing
    const handleSearchChange = (e) => {
      const newValue = e.target.value;
      setSearchTerm(newValue);
      if (onSearchChange) {
        onSearchChange(newValue);
      }
    };

    const toggleOption = (optionValue) => {
      const newSelectedValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      
      setSelectedValues(newSelectedValues);
      if (onChange) {
        onChange(newSelectedValues);
      }
    };

    const removeOption = (optionValue, e) => {
      e.stopPropagation();
      const newSelectedValues = selectedValues.filter((v) => v !== optionValue);
      setSelectedValues(newSelectedValues);
      if (onChange) {
        onChange(newSelectedValues);
      }
    };

    const clearAll = (e) => {
      e.stopPropagation();
      setSelectedValues([]);
      if (onChange) {
        onChange([]);
      }
    };

    // Focus input when popover opens
    React.useEffect(() => {
      if (isOpen && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } else {
        setSearchTerm("");
        if (onSearchChange) {
          onSearchChange("");
        }
      }
    }, [isOpen, onSearchChange]);

    const displayOptions = searchTerm ? options : options.slice(0, 50); // Limit initial display

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "w-full justify-between h-auto min-h-10 px-3 py-2",
              className
            )}
            {...props}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedValues.length > 0 ? (
                <>
                  {selectedValues.slice(0, maxCount).map((val) => {
                    const option = options.find((o) => o.value === val);
                    return option ? (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="mr-1"
                      >
                        {option.label}
                        <button
                          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              removeOption(val, e);
                            }
                          }}
                          onMouseDown={(e) => removeOption(val, e)}
                          onClick={(e) => removeOption(val, e)}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                  {selectedValues.length > maxCount && (
                    <Badge variant="secondary">
                      +{selectedValues.length - maxCount} more
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {selectedValues.length > 0 && (
                <X
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={clearAll}
                />
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0" 
          align="start"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="p-2 border-b">
              <Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="h-9"
                autoFocus
              />
            </div>

            {/* Options List */}
            <ScrollArea className="h-64">
              <div className="p-1">
                {displayOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {searchTerm
                      ? "No results found."
                      : "Start typing to search..."}
                  </div>
                ) : (
                  displayOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent",
                          isSelected && "bg-accent"
                        )}
                        onClick={() => toggleOption(option.value)}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="flex-1">{option.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            {selectedValues.length > 0 && (
              <div className="border-t p-2 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-8"
                >
                  Clear all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

SearchableMultiSelect.displayName = "SearchableMultiSelect";
