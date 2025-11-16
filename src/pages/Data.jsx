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
import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { baseUrl } from "@/utils/constants"
import { Plus } from "lucide-react"
import TaskFormModal from "@/components/elements/dataView/kanban/task-form-modal"

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
  // Get board ID from URL params if available
  const { id: boardId } = useParams();
  
  const [selectedPeriod, setSelectedPeriod] = useState("5years");
  const [activeTab, setActiveTab] = useState("table");
  const [boardData, setBoardData] = useState(null);
  const [boardTasks, setBoardTasks] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Shared function to create a task (used by both modal and kanban)
  const createTask = async (taskData) => {
    if (!boardId) {
      console.log('No boardId, skipping task creation');
      return;
    }

    console.log('Creating task with data:', taskData);
    console.log('Board data:', boardData);

    try {
      // Create new document in the board with board's custom_meta structure
      const customMetaValues = {};
      
      // Populate custom_meta values from board's fields
      if (boardData?.custom_meta?.fields) {
        boardData.custom_meta.fields.forEach(field => {
          const fieldName = field.name;
          if (taskData[fieldName] !== undefined) {
            customMetaValues[fieldName] = taskData[fieldName];
          }
        });
      }

      console.log('Custom meta values:', customMetaValues);

      const requestBody = {
        user_id: localStorage.getItem('userId') || "68578b51b1325fc7c9b7b095",
        title: taskData.title,
        page_type: 'document',
        entity_type: 'page',
        content: {
          text: taskData.description || ''
        },
        summary: taskData.description || '',
        last_updated_by: localStorage.getItem('userId') || "68578b51b1325fc7c9b7b095",
        custom_meta: {
          fields: boardData?.custom_meta?.fields || [],
          values: customMetaValues
        },
        folder_id: boardData?.folder_id || '',
        group_id: boardData?.group_id || '',
        space_id: boardData?.space_id || '',
        board_id: boardId,
        shared_members: boardData?.shared_members || [],
        shared_teams: boardData?.shared_teams || [],
        attachments: []
      };

      console.log('Sending request to API:', requestBody);

      // Use the same API endpoint as folder/space document creation
      const response = await fetch(`${baseUrl}/v1/page/document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('API Response status:', response.status);
      const responseData = await response.json();
      console.log('API Response data:', responseData);

      if (response.ok) {
        // Refresh board data after successful creation
        const boardResponse = await fetch(`${baseUrl}/v1/board?id=${boardId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (boardResponse.ok) {
          const boardResult = await boardResponse.json();
          if (boardResult.status === 'success' && boardResult.data) {
            const newBoardData = Array.isArray(boardResult.data) ? boardResult.data[0] : boardResult.data;
            setBoardData(newBoardData);
            
            // Re-transform the data
            const transformBoardToTasks = (board) => {
              if (!board) {
                return null;
              }

              const customFields = board.custom_meta?.fields || [];
              
              const propertyNames = [
                { type: "text", label: "Task ID", name: "task_id" },
                { type: "text", label: "Title", name: "title" },
                { type: "text", label: "Description", name: "description" }
              ];

              customFields.forEach(field => {
                const propertyField = {
                  type: field.type === 'input' ? 'text' : field.type,
                  label: field.label,
                  name: field.name
                };

                if (field.hasOptions && field.options) {
                  propertyField.props = {
                    optionsData: field.options
                  };
                }

                propertyNames.push(propertyField);
              });

              const propertyValues = (board.documents || []).map((doc, index) => {
                const taskData = {
                  id: doc._id,
                  task_id: `TASK-${String(index + 1).padStart(3, '0')}`,
                  title: doc.title || doc.name || 'Untitled Task',
                  description: doc.description || '',
                };

                customFields.forEach(field => {
                  const value = doc.custom_meta?.values?.[field.name];
                  taskData[field.name] = value || (field.type === 'select' ? '' : null);
                });

                taskData.createdAt = doc.createdAt;
                taskData.updatedAt = doc.updatedAt;

                return taskData;
              });

              return {
                property_name: propertyNames,
                property_values: propertyValues,
                tasks: propertyValues,
                customFields,
              };
            };
            
            const transformedData = transformBoardToTasks(newBoardData);
            setBoardTasks(transformedData);
          }
        }
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };
  
  // Fetch board data if boardId is present
  useEffect(() => {
    if (boardId) {
      // Transform board documents into task format
      const transformBoardToTasks = (board) => {
        if (!board) {
          return null;
        }

        // Extract custom fields from board metadata
        const customFields = board.custom_meta?.fields || [];
        
        // Transform custom_meta.fields into property_name format
        const propertyNames = [
          {
            type: "text",
            label: "Task ID",
            name: "task_id"
          },
          {
            type: "text",
            label: "Title",
            name: "title"
          },
          {
            type: "text",
            label: "Description",
            name: "description"
          }
        ];

        // Add each custom field from board metadata
        customFields.forEach(field => {
          const propertyField = {
            type: field.type === 'input' ? 'text' : field.type,
            label: field.label,
            name: field.name
          };

          // Add options data for select fields
          if (field.hasOptions && field.options) {
            propertyField.props = {
              optionsData: field.options
            };
          }

          propertyNames.push(propertyField);
        });

        // Transform documents into property_values format (empty array if no documents)
        const propertyValues = (board.documents || []).map((doc, index) => {
          const taskData = {
            id: doc._id,
            task_id: `TASK-${String(index + 1).padStart(3, '0')}`,
            title: doc.title || doc.name || 'Untitled Task',
            description: doc.description || '',
          };

          // Add custom field values
          customFields.forEach(field => {
            const value = doc.custom_meta?.values?.[field.name];
            taskData[field.name] = value || (field.type === 'select' ? '' : null);
          });

          // Add timestamps
          taskData.createdAt = doc.createdAt;
          taskData.updatedAt = doc.updatedAt;

          return taskData;
        });

        return {
          property_name: propertyNames,
          property_values: propertyValues,
          // Keep these for backward compatibility
          tasks: propertyValues,
          customFields,
        };
      };

      const fetchBoardData = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${baseUrl}/v1/board?id=${boardId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.status === 'success' && result.data) {
              const boardDataArray = Array.isArray(result.data) ? result.data[0] : result.data;
              setBoardData(boardDataArray);
              
              // Transform board data into tasks
              const transformedData = transformBoardToTasks(boardDataArray);
              setBoardTasks(transformedData);
            }
          } else {
            console.error('Failed to fetch board data');
            setBoardData({
              _id: boardId,
              name: "Board",
              description: "Failed to load board details"
            });
            // Set empty structure instead of null
            setBoardTasks({
              property_name: [],
              property_values: [],
              tasks: [],
              customFields: []
            });
          }
        } catch (error) {
          console.error('Error fetching board data:', error);
          setBoardData({
            _id: boardId,
            name: "Board",
            description: "Error loading board"
          });
          // Set empty structure instead of null
          setBoardTasks({
            property_name: [],
            property_values: [],
            tasks: [],
            customFields: []
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchBoardData();
    }
  }, [boardId]);
  
  return (
    <section className="w-full flex flex-col items-center justify-center gap-4 text-center p-6">
      {boardId && (
        <div className="w-full text-left mb-2 border-b pb-4">
          {boardData ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {boardData.name}
              </h1>
              {boardData.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {boardData.description}
                </p>
              )}
            </>
          ) : (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          )}
        </div>
      )}
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
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Task
            </Button>
            <TableMainMenu />
          </div>
        </div>

        {/* Tabs Content */}
        {layouts?.map((layout) => (
          <TabsContent key={layout.type} value={layout.type}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <layout.element 
                data={boardId && boardTasks ? boardTasks : getDummyDataView()} 
                {...(layout.type === "calendar" && { timePeriod: selectedPeriod })}
                boardId={boardId}
                onTaskCreate={createTask}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Task Form Modal */}
      <TaskFormModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        onSave={createTask}
      />
    </section>
  )
}