import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { LoaderIcon, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn("flex h-full w-full flex-col overflow-hidden rounded-xl bg-elevated text-popover-foreground", className)}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

interface CommandDialogProps extends React.ComponentProps<typeof Dialog> {
  commandProps?: React.ComponentPropsWithoutRef<typeof CommandPrimitive>
  title?: string
}

const CommandDialog = ({ children, commandProps, title = "Command menu", ...props }: CommandDialogProps) => (
  <Dialog {...props}>
    <DialogContent
      className="top-[15vh] max-w-xl translate-y-0 overflow-hidden p-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2"
      onOpenAutoFocus={(e: Event) => e.preventDefault()}
    >
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <Command
        className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:py-2"
        {...commandProps}
      >
        {children}
      </Command>
    </DialogContent>
  </Dialog>
)

interface CommandInputProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {
  loading?: boolean
}

const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, CommandInputProps>(
  ({ className, loading = false, disabled = false, ...props }, ref) => (
    // eslint-disable-next-line react/no-unknown-property -- cmdk styling hook attribute
    <div className="relative flex items-center gap-2 border-b border-border px-3" cmdk-input-wrapper="">
      <Search className="size-4 shrink-0 text-subtle" aria-hidden="true" />
      <CommandPrimitive.Input
        ref={ref}
        disabled={disabled}
        autoFocus
        className={cn(
          "flex h-10 w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {loading && <LoaderIcon role="status" aria-label="Loading" className="size-4 shrink-0 animate-spin text-subtle" />}
    </div>
  )
)
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List ref={ref} className={cn("max-h-[360px] overflow-y-auto overflow-x-hidden", className)} {...props} />
))
CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => <CommandPrimitive.Empty ref={ref} className="py-8 text-center text-xs text-muted-foreground" {...props} />)
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-subtle",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto font-mono text-2xs text-subtle", className)} {...props} />
)
CommandShortcut.displayName = "CommandShortcut"

const CommandLoading = CommandPrimitive.Loading

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
  CommandLoading,
}
