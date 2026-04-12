import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({ className = '', onChange, handleFormChange, value, ...props }) {
  return (
    <Popover onOpenChange={open => {
      if (!open) {
        handleFormChange()
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !value && "text-muted-foreground", className
          )}
          {...props}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd-MM-yyyy") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={e => onChange(e)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
