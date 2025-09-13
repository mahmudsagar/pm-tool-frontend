// import useSyncStore from "@/stores/useSyncStore"
import { 
  LayoutGrid, 
  Table,
  Calendar,
  BarChart3,
  ChevronDown,
} from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

import TableView from "@/components/elements/dataView/table"
import KanbanView from "@/components/elements/dataView/kanban"
import TimelineView from "@/components/elements/dataView/timeline"
import CalendarView from "@/components/elements/dataView/calendar"

import { TabsContent } from "@radix-ui/react-tabs"
import TableMainMenu from "@/components/elements/dataView/TableMainMenu"

// Dummy data for now
import { getDummyDataView } from "@/utils/dummyDataView"
import { useState } from "react"

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
    icon: BarChart3,
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
    icon: Calendar,
    element: CalendarView,
  },
]

const timePeriods = [
  { value: "hours", label: "Hours" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "biweek", label: "Bi-week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "5years", label: "5 Years" },
]

export default function Data() {
  // Get dynamic data with current status options
  const viewJSONData = getDummyDataView();
  const [selectedPeriod, setSelectedPeriod] = useState("5years");
  const [activeTab, setActiveTab] = useState("table");
  
  return (
    <section className="w-full flex flex-col items-center justify-center gap-4 text-center p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-gray-300">
          <div className="flex items-center gap-4">
            <TabsList>
              {/* Tabs */}
              {layouts?.map((layout) => (
                <TabsTrigger key={layout.type} value={layout.type} className="flex items-center gap-2">
                  <layout.icon className="h-4 w-4" />
                  {layout.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Time Period Dropdown - only show for calendar view */}
            {activeTab === "calendar" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {timePeriods.find(p => p.value === selectedPeriod)?.label}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  {timePeriods.map((period) => (
                    <DropdownMenuItem
                      key={period.value}
                      onClick={() => setSelectedPeriod(period.value)}
                      className={selectedPeriod === period.value ? "bg-accent" : ""}
                    >
                      {period.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <TableMainMenu />
        </div>

        {/* Tabs Content */}
        {layouts?.map((layout) => (
          <TabsContent key={layout.type} value={layout.type}>
            <layout.element 
              data={viewJSONData} 
              {...(layout.type === "calendar" && { timePeriod: selectedPeriod })}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}