"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, CheckSquare, Type, SwitchCamera, Activity } from "lucide-react"

export default function SwitchTable({ data }) {
  const [selected, setSelected] = useState([])

  const toggleSelect = (id) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selected.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Type className="h-4 w-4 mr-2" />
              Type
            </Button>
            <Button variant="ghost" size="sm">
              <SwitchCamera className="h-4 w-4 mr-2" />
              Switch Brand
            </Button>
            <Button variant="ghost" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Status
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="relative flex gap-2">
        {/* Row Actions */}
        <div className="flex flex-col pt-10">
          <div className="flex flex-col gap-[1px]">
            {data.map((row) => (
              <div key={row.id} className="flex items-center h-10 group">
                <DropdownMenu>
                  <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className={`px-2 ${!selected.includes(row.id) ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                  <Checkbox
                    checked={selected.includes(row.id)}
                    onCheckedChange={() => toggleSelect(row.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Table */}
        <Table className="border flex-1">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Brand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.brand}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
