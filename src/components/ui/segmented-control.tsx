import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  /** Accessible name, required for icon-only options. */
  ariaLabel?: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedOption<T>[]
  size?: "sm" | "md"
  className?: string
  "aria-label"?: string
}

/** Compact pill switcher (view modes, theme, tabs-as-filters). Single selection, never empty. */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "md",
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5",
        size === "sm" ? "h-7" : "h-8",
        className
      )}
      {...props}
    >
      {options.map(({ value: optionValue, label, icon: Icon, ariaLabel }) => (
        <ToggleGroupPrimitive.Item
          key={optionValue}
          value={optionValue}
          aria-label={ariaLabel}
          className={cn(
            "inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm",
            size === "sm" ? "px-2 text-2xs" : "px-2.5 text-xs",
            !label && "aspect-square px-0"
          )}
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          {label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}
