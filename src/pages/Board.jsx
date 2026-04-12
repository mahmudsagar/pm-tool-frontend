import { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  Table,
  Calendar,
  BarChart3,
  ChevronDown,
  Copy,
  Share,
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
import Delete from "@/layouts/elements/components/DropdownMenuItems/items/Delete"

// Dummy data for now - could be replaced with board-specific data
import { getDummyDataView } from "@/utils/dummyDataView"

const layouts = [
  {
    type: "kanban",
    label: "Kanban",
    icon: LayoutGrid,
    element: KanbanView,
  },
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

const Board = ({ _id, title, setTopMenu, custom_meta }) => {
  // Set the top menu for board pages
  useEffect(() => {
    if (!setTopMenu) return;
    const dropdownContent = <>
      <DropdownMenuItem className="cursor-pointer">
        <div className='flex items-center gap-1'>
          <Share size={12} /> Share
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/document/${_id}`)}>
        <div className='flex items-center gap-1'>
          <Copy size={12} /> Copy link
        </div>
      </DropdownMenuItem>
      <Delete fileId={_id} fileType="board" />
    </>;
    setTopMenu({ dropdownContent });
  }, [_id, setTopMenu]);

  // Get dynamic data with current status options
  const viewJSONData = getDummyDataView();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("kanban"); // Default to kanban for boards

  return (
    <div className="h-full w-full">
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
                boardId={_id}
                boardTitle={title}
                customMeta={custom_meta}
                {...(layout.type === "calendar" && { timePeriod: selectedPeriod })}
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
};

export default Board;
