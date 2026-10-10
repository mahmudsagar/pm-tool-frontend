import * as React from "react"

import { cn } from "@/lib/utils"

/** Keyboard shortcut hint, e.g. <Kbd>⌘K</Kbd>. */
function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted/60 px-1 font-mono text-2xs font-normal text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
