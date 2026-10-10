import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

type ProgressTone = "brand" | "success" | "warning" | "danger" | "neutral"

const toneClass: Record<ProgressTone, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-foreground/70",
}

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  tone?: ProgressTone
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, tone = "neutral", ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, value ?? 0))
    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={pct}
        className={cn("relative h-1 w-full overflow-hidden rounded-full bg-muted", className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn("h-full w-full flex-1 rounded-full transition-transform", toneClass[tone])}
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </ProgressPrimitive.Root>
    )
  }
)
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
