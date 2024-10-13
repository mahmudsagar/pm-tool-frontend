import {
  Tooltip as TooltipRaw,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const Tooltip = ({ children, title }) => {
  return (
    <TooltipProvider delayDuration={200}>
      <TooltipRaw>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent align="start">
          {title}
        </TooltipContent>
      </TooltipRaw>
    </TooltipProvider>
  )
}
