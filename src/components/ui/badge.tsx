import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Pill badges: desaturated wash + matching hairline border, never solid fills. */
const badgeVariants = cva(
  "inline-flex h-5 max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 text-2xs font-medium leading-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-muted/60 text-muted-foreground",
        secondary: "border-border bg-muted/60 text-muted-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        success: "border-success/25 bg-success/10 text-success-foreground",
        warning: "border-warning/25 bg-warning/10 text-warning-foreground",
        info: "border-info/20 bg-info/10 text-info-foreground",
        destructive: "border-destructive/25 bg-destructive/10 text-danger-foreground",
        /** Square tag used for entity types in tables ("Databoard", "Sheet"). */
        tag: "rounded-md border-border bg-muted/50 px-2 text-xs font-normal text-foreground/80",
        /** Monospace marker ("Active", "v2.4"). */
        mono: "rounded border-border bg-muted/50 px-1.5 font-mono text-2xs font-normal text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Leading status dot in the badge's own color. */
  dot?: boolean
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true" />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
