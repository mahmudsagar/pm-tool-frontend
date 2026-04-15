// import useSyncStore from "@/stores/useSyncStore"

const EMPTY_ASSIGNEE_OPTIONS = [];
import { 
  LayoutGrid, 
  Table,
  Calendar,
  BarChart3,
  ChevronDown,
  Copy,
  Share,
  Layers,
  X,
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
import { useState, useMemo, useEffect } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import TaskFormModal from "@/components/elements/dataView/kanban/task-form-modal"
import { useBoard } from "@/hooks/queries/useBoardsQueries"
import { useCreateBoardTask } from "@/hooks/mutations/useBoardsMutations"
import Delete from "@/layouts/elements/components/DropdownMenuItems/items/Delete"
import { useUsers } from "@/hooks/queries/useSpacesQueries"
import { useTeams } from "@/hooks/queries/useTeamsQueries"

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

export default function Data({ id: propId, setTopMenu }) {
  // Get board ID from URL params or props (for parallel routes)
  const { id: paramBoardId } = useParams();
  const [searchParams] = useSearchParams();
  
  // Use prop ID if provided (from parallel route), otherwise use URL param
  let boardId = propId || paramBoardId;
  
  if (!boardId) {
    // Search for board route in query params as fallback
    for (const [key, value] of searchParams.entries()) {
      if (value === '_sidebar' && key.startsWith('/board/')) {
        boardId = key.replace('/board/', '');
        break;
      }
    }
  }
  
  const [activeTab, setActiveTab] = useState("table");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [groupBy, setGroupBy] = useState(null); // null = no grouping | { name, label, type }
  
  // Use TanStack Query to fetch board data
  const { data: rawBoardData, isLoading } = useBoard(boardId);
  const createTaskMutation = useCreateBoardTask();
  const { data: allUsers } = useUsers();
  const { data: allTeams } = useTeams();
  
  // Extract board data from array if needed
  const boardData = useMemo(() => {
    if (!rawBoardData) return null;
    return Array.isArray(rawBoardData) ? rawBoardData[0] : rawBoardData;
  }, [rawBoardData]);

  // Derive assignee options based on board visibility and sharing:
  // - Private board: only the owner (auto-assigned)
  // - Public board with shared_members or shared_teams: only those members + team members
  // - Public board with no sharing restrictions: all workspace users
  const assigneeOptions = useMemo(() => {
    const usersArray = Array.isArray(allUsers) ? allUsers : [];
    if (!usersArray.length) return EMPTY_ASSIGNEE_OPTIONS;

    // Private board: only the owner
    if (boardData?.is_private) {
      return usersArray
        .filter(u => u._id === boardData?.user_id)
        .map(u => ({ label: u.name || u.email, value: u._id }));
    }

    // Public board: check if restricted to specific members/teams
    const hasSharedMembers = (boardData?.shared_members?.length ?? 0) > 0;
    const hasSharedTeams = (boardData?.shared_teams?.length ?? 0) > 0;

    if (!hasSharedMembers && !hasSharedTeams) {
      // No restrictions — all workspace users
      return usersArray.map(u => ({ label: u.name || u.email, value: u._id }));
    }

    // Collect allowed user IDs from shared_members + members of shared_teams
    const allowedIds = new Set(boardData?.shared_members || []);
    const teamsArray = Array.isArray(allTeams) ? allTeams : [];
    for (const teamId of (boardData?.shared_teams || [])) {
      const team = teamsArray.find(t => t._id === teamId);
      if (team?.shared_members) {
        team.shared_members.forEach(id => allowedIds.add(id));
      }
    }

    return usersArray
      .filter(u => allowedIds.has(u._id))
      .map(u => ({ label: u.name || u.email, value: u._id }));
  }, [boardData, allUsers, allTeams]);

  // Register Share / Copy link / Delete in the page-level header (sidebar or full-page)
  useEffect(() => {
    if (!setTopMenu) return;

    const dropdownContent = <>
      <DropdownMenuItem className="cursor-pointer">
        <div className='flex items-center gap-1'>
          <Share size={12} /> Share
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`)}>
        <div className='flex items-center gap-1'>
          <Copy size={12} /> Copy link
        </div>
      </DropdownMenuItem>
      <Delete fileId={boardId} fileType="board" />
    </>;

    setTopMenu({ dropdownContent });
  }, [boardId, setTopMenu]);

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
      
      // Get all task data fields except the core fields
      const coreFields = ['title', 'description', 'id', 'task_id', 'kanbanId', 'custom_meta'];
      Object.keys(taskData).forEach(key => {
        if (!coreFields.includes(key) && taskData[key] !== undefined) {
          customMetaValues[key] = taskData[key];
        }
      });

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
        board_id: boardId,
        shared_members: boardData?.shared_members || [],
        shared_teams: boardData?.shared_teams || [],
        attachments: []
      };

      console.log('Sending request to API:', requestBody);

      // Use TanStack Query mutation to create task
      await createTaskMutation.mutateAsync({ boardId, taskData: requestBody });
      console.log('Task created successfully via TanStack Query');
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // Transform boardData into task format using useMemo
  const boardTasks = useMemo(() => {
    if (!boardData) {
      return {
        property_name: [],
        property_values: [],
        tasks: [],
        customFields: []
      };
    }

    const customFields = boardData.custom_meta?.fields || [];
    
    // Transform custom_meta.fields into property_name format
    const propertyNames = [
      { type: "text", label: "Task ID", name: "task_id" },
      { type: "text", label: "Title", name: "title" },
      { type: "text", label: "Description", name: "description" }
    ];

    // Add each custom field from board metadata
    customFields.forEach(field => {
      const propertyField = {
        // Keep original type ('dynamic-select', 'select', 'date', etc.)
        // 'input' is the legacy name for a text field
        type: field.type === 'input' ? 'text' : field.type,
        label: field.label,
        name: field.name
      };

      // Resolve dynamic-select fields based on their source
      if (field.type === 'dynamic-select' && field.source === 'board-members') {
        // Assignee-like fields: options derived from board visibility/sharing
        propertyField.props = { optionsData: assigneeOptions };
      } else if (field.name === 'assignee' && field.hasOptions) {
        // Backward compat: old boards with static assignee options
        propertyField.props = { optionsData: assigneeOptions };
      } else if (field.hasOptions && field.options) {
        propertyField.props = {
          optionsData: field.options
        };
      }

      propertyNames.push(propertyField);
    });

    // Transform documents into property_values format
    const propertyValues = (boardData.documents || []).map((doc, index) => {
      const taskData = {
        id: doc._id,
        task_id: `TASK-${String(index + 1).padStart(3, '0')}`,
        title: doc.title || doc.name || 'Untitled Task',
        description: doc.description || '',
        // Preserve raw custom_meta so drag-and-drop can merge values correctly
        custom_meta: doc.custom_meta || { fields: [], values: {} },
      };

      // Add custom field values
      customFields.forEach(field => {
        const value = doc.custom_meta?.values?.[field.name];
        taskData[field.name] = value || ((field.type === 'select' || field.type === 'dynamic-select') ? '' : null);
      });

      // Add timestamps
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
  }, [boardData, assigneeOptions]);

  // Fields that can be used as group-by options (exclude identity/text fields)
  const groupByOptions = useMemo(() => {
    const excluded = ['task_id', 'title', 'description'];
    return boardTasks.property_name.filter(f => !excluded.includes(f.name));
  }, [boardTasks.property_name]);
  
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
        <div className="flex items-center justify-between border-gray-300 mb-5">
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

        {/* Sub-toolbar: group-by selector shown below the tabs strip */}
        <div className="flex items-center gap-3 py-2 border-b mb-4 text-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 h-7 px-2 text-xs ${groupBy ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Layers className="h-3.5 w-3.5" />
                Group by
                {groupBy && <span className="font-semibold ml-1">{groupBy.label}</span>}
                <ChevronDown className="h-3 w-3 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={() => setGroupBy(null)}
                className={!groupBy ? 'bg-accent' : ''}
              >
                No grouping
              </DropdownMenuItem>
              {groupByOptions.map(opt => (
                <DropdownMenuItem
                  key={opt.name}
                  onClick={() => setGroupBy(opt)}
                  className={groupBy?.name === opt.name ? 'bg-accent' : ''}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {groupBy && (
            <button
              onClick={() => setGroupBy(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
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
                data={boardTasks} 
                boardId={boardId}
                onTaskCreate={createTask}
                assigneeOptions={assigneeOptions}
                groupBy={groupBy}
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
        assigneeOptions={assigneeOptions}
      />
    </section>
  )
}