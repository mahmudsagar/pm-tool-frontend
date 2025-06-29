// import useSyncStore from "@/stores/useSyncStore"
import { 
  LayoutGrid, 
  Table,
} from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import TableView from "@/components/elements/dataView/table"
import KanbanView from "@/components/elements/dataView/kanban"
import TimelineView from "@/components/elements/dataView/timeline"
import CalendarView from "@/components/elements/dataView/calendar"

import { TabsContent } from "@radix-ui/react-tabs"
import TableMainMenu from "@/components/elements/dataView/TableMainMenu"

// Dummy data for now
import { getDummyDataView } from "@/utils/dummyDataView"

const layouts = [
  {
    type: "table",
    label: "Table",
    icon: Table,
    element: TableView,
  },
  {
    type: "timeline",
    label: "Timeline",
    icon: LayoutGrid,
    element: TimelineView,
  },
  {
    type: "kanban",
    label: "Kanban",
    icon: LayoutGrid,
    element: KanbanView,
  },
  {
    type: "calendar",
    label: "Calendar",
    icon: LayoutGrid,
    element: CalendarView,
  },
]

export default function Data() {
  // Get dynamic data with current status options
  const viewJSONData = getDummyDataView();
  
  return (
    <section className="w-full flex flex-col items-center justify-center gap-4 text-center p-6">
      <Tabs defaultValue="table" className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-gray-300">
          <TabsList>
            {/* Tabs */}
            {layouts?.map((layout) => (
              <TabsTrigger key={layout.type} value={layout.type} className="flex items-center gap-2">
                <layout.icon className="h-4 w-4" />
                {layout.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TableMainMenu />
        </div>

        {/* Tabs Content */}
        {layouts?.map((layout) => (
          <TabsContent key={layout.type} value={layout.type}>
            <layout.element data={viewJSONData} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}