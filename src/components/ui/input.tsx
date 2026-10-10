import * as React from "react"

import { cn } from "@/lib/utils"

export const inputBaseClass =
  "flex w-full rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors placeholder:text-subtle hover:border-border-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      inputBaseClass,
      "h-9 py-1 file:border-0 file:bg-transparent file:text-sm file:font-medium",
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = "Input"

export { Input }
