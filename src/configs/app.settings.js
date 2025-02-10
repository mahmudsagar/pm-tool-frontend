import { 
  Layout, 
  Filter, 
  ArrowUpDown, 
  Group, 
  Loader, 
  Pencil, 
  Copy, 
  Trash2 
} from "lucide-react"

export const DATATABLE_MAINMENU = {
  label: "View Options",
  items: [
      { name: "layout", label: "Layout", icon: Layout, },
      { name: "filter", label: "Filter", icon: Filter, },
      { name: "sort", label: "Sort", icon: ArrowUpDown, },
      { name: "group", label: "Group", icon: Group, },
      { name: "limit", label: "Load limit", icon: Loader, },
      { name: "customize", label: "Customize", icon: Pencil, },
      { name: "duplicate", label: "Duplicate", icon: Copy, },
      { name: "delete", label: "Delete", icon: Trash2, },
  ]
}