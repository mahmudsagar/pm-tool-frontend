import * as React from "react"

import { cn } from "@/lib/utils"
import { inputBaseClass } from "./input"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea className={cn(inputBaseClass, "min-h-[80px] py-2", className)} ref={ref} {...props} />
))
Textarea.displayName = "Textarea"

export { Textarea }
