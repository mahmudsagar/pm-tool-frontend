
import { format } from "date-fns"
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { sanitize } from "@/utils/helper"

export function DatePickerWithRange({
  className,
  handleFormChange,
  onChange,
  value,
  ...props
}) {
  const date = sanitize(value)

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover onOpenChange={open => {
        if (!open && handleFormChange) {
          handleFormChange()
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal gap-0 px-2",
              className
            )}
            {...props}
          >
            {/* Start section */}
            <span className="flex items-center gap-1.5 px-2 py-0.5">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Start</span>
              {date?.from
                ? <span className="text-xs font-medium">{format(date.from, "MMM d, y")}</span>
                : <span className="text-xs text-muted-foreground italic">—</span>
              }
            </span>

            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mx-1" />

            {/* Due section */}
            <span className="flex items-center gap-1.5 px-2 py-0.5">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Due</span>
              {date?.to
                ? <span className="text-xs font-medium">{format(date.to, "MMM d, y")}</span>
                : <span className="text-xs text-muted-foreground italic">—</span>
              }
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
