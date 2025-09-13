import { EllipsisIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"

import { DATATABLE_MAINMENU } from "@/configs/app.settings"

export default function TableMainMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-8 h-8 p-0">
          <EllipsisIcon size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" sideOffset={4}>
        <DropdownMenuLabel className="font-black">{DATATABLE_MAINMENU.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DATATABLE_MAINMENU.items.map((item) => (
          <DropdownMenuItem key={item.name} className="py-1.5">
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}