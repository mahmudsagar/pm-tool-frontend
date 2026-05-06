// import useSyncStore from "@/stores/useSyncStore"

const EMPTY_ASSIGNEE_OPTIONS = [];
const DEFAULT_VIEW = { sorts: [], filters: [], search: '' };
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
import BoardSubheaderControls from "@/components/elements/dataView/BoardSubheaderControls"
import AutomationsPanel from "@/components/elements/dataView/AutomationsPanel"

// Dummy data for now
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import TaskFormModal from "@/components/elements/dataView/kanban/task-form-modal"
import { useBoard } from "@/hooks/queries/useBoardsQueries"
import { useCreateBoardTask, useUpdateBoard, useUpdateBoardTask, useCreateSubtask } from "@/hooks/mutations/useBoardsMutations"
import { normalizeEntityAccess } from "@/utils/entityAccessUtils"
import { useToast } from "@/components/ui/use-toast"
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

const DONE_STATUSES = ["done", "complete", "completed", "closed"];
const BLOCKED_STATUSES = ["blocked", "stuck"];
const BACKLOG_STATUSES = ["backlog", "todo", "to do", "open"];
const IN_PROGRESS_STATUSES = ["in progress", "in-progress", "doing", "active"];
const HIGH_PRIORITIES = ["high", "urgent", "critical", "p1"];

const toComparableDate = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object") {
    return toComparableDate(value.to || value.end || value.date || value.from || value.start || null);
  }
  return null;
};

const dateDiffInDays = (a, b) => {
  const start = toComparableDate(a);
  const end = toComparableDate(b);
  if (!start || !end) return null;
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const normalizedText = (value) => String(value || "").trim().toLowerCase();
const isDoneStatus = (value) => DONE_STATUSES.includes(normalizedText(value));
const isBlockedStatus = (value) => BLOCKED_STATUSES.includes(normalizedText(value));
const isBacklogStatus = (value) => BACKLOG_STATUSES.includes(normalizedText(value));
const isInProgressStatus = (value) => IN_PROGRESS_STATUSES.includes(normalizedText(value));
const isHighPriority = (value) => HIGH_PRIORITIES.includes(normalizedText(value));
const isUrgentPriority = (value) => ["urgent", "critical", "p1"].includes(normalizedText(value));

const resolveFieldName = (fields = [], keyword) => {
  const needle = normalizedText(keyword);
  const exact = fields.find((f) => normalizedText(f?.name) === needle);
  if (exact) return exact.name;
  const byLabel = fields.find((f) => normalizedText(f?.label).includes(needle));
  if (byLabel) return byLabel.name;
  const byName = fields.find((f) => normalizedText(f?.name).includes(needle));
  return byName?.name || keyword;
};
const DEPENDENCY_FIELD_DEFS = [
  { name: "blocked_by", label: "Blocking task", type: "text" },
  { name: "depends_on", label: "Dependent on", type: "text" },
];

const normalizeSelectLikeValue = (rawValue, options = []) => {
  if (rawValue === undefined || rawValue === null) return rawValue;
  const base =
    typeof rawValue === "object"
      ? (rawValue.value ?? rawValue.id ?? rawValue.key ?? rawValue.label ?? "")
      : rawValue;
  const text = String(base).trim();
  if (!text) return "";
  const byValue = (options || []).find((opt) => String(opt?.value ?? "").trim() === text);
  if (byValue) return byValue.value;
  const lowered = text.toLowerCase();
  const byLabel = (options || []).find((opt) => String(opt?.label ?? "").trim().toLowerCase() === lowered);
  if (byLabel) return byLabel.value;
  return text;
};

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
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [automationState, setAutomationState] = useState({
    status: true,
    dates: true,
    assignment: true,
    priority: true,
    typeBased: true,
    dependency: true,
    notifications: true,
    recurring: true,
    workflowRules: [],
  });

  const [viewState, setViewState] = useState(DEFAULT_VIEW);
  // Debounce viewState sent to API so typing doesn't fire a request per keystroke
  const [debouncedView, setDebouncedView] = useState(DEFAULT_VIEW);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedView(viewState), 350);
    return () => clearTimeout(t);
  }, [viewState]);

  // Use TanStack Query to fetch board data (with server-side sort/filter/search)
  const { data: rawBoardData, isLoading } = useBoard(boardId, debouncedView);
  // Unfiltered board snapshot for dependency selectors (independent from current view filters/search)
  const { data: rawBoardDataUnfiltered } = useBoard(boardId, DEFAULT_VIEW);
  const createTaskMutation = useCreateBoardTask();
  const updateBoardMutation = useUpdateBoard();
  const updateTaskMutation = useUpdateBoardTask();
  const createSubtaskMutation = useCreateSubtask();
  const { toast } = useToast();
  const { data: allUsers } = useUsers();
  const { data: allTeams } = useTeams();

  // Extract board data from array if needed and normalize access format
  const boardData = useMemo(() => {
    if (!rawBoardData) return null;
    const board = Array.isArray(rawBoardData) ? rawBoardData[0] : rawBoardData;
    // Normalize old format (objects with user_id/role) to new (separate arrays)
    return normalizeEntityAccess(board);
  }, [rawBoardData]);
  const boardDataUnfiltered = useMemo(() => {
    if (!rawBoardDataUnfiltered) return null;
    const board = Array.isArray(rawBoardDataUnfiltered) ? rawBoardDataUnfiltered[0] : rawBoardDataUnfiltered;
    return normalizeEntityAccess(board);
  }, [rawBoardDataUnfiltered]);

  const boardDataId = boardData?._id;
  const boardDataSavedView = boardData?.saved_view;
  const boardDataAutomations = boardData?.automations;
  const boardFieldDefs = boardData?.custom_meta?.fields || [];
  const resolvedStatusField = useMemo(() => resolveFieldName(boardFieldDefs, "status"), [boardFieldDefs]);
  const resolvedAssigneeField = useMemo(() => resolveFieldName(boardFieldDefs, "assignee"), [boardFieldDefs]);
  const resolvedPriorityField = useMemo(() => resolveFieldName(boardFieldDefs, "priority"), [boardFieldDefs]);
  const resolvedTypeField = useMemo(() => resolveFieldName(boardFieldDefs, "type"), [boardFieldDefs]);
  const loadedBoardRef = useRef(null);
  const dependencyFieldsInitRef = useRef({});
  // Load saved view from board when the board changes (once per board)
  useEffect(() => {
    if (boardDataId && boardDataId !== loadedBoardRef.current) {
      loadedBoardRef.current = boardDataId;
      if (boardDataSavedView) {
        setViewState(boardDataSavedView);
      }
    }
  }, [boardDataId, boardDataSavedView]);

  useEffect(() => {
    if (!boardDataId) return;
    setAutomationState((prev) => ({
      ...prev,
      ...(boardDataAutomations || {}),
      workflowRules: boardDataAutomations?.workflowRules || [],
    }));
  }, [boardDataId, boardDataAutomations]);

  useEffect(() => {
    if (!boardId || !boardData?.custom_meta?.fields) return;
    if (dependencyFieldsInitRef.current[boardId]) return;
    if (updateBoardMutation.isPending) return;
    const fields = boardData.custom_meta.fields || [];
    const missing = DEPENDENCY_FIELD_DEFS.filter((def) => !fields.some((f) => f?.name === def.name));
    if (!missing.length) {
      dependencyFieldsInitRef.current[boardId] = true;
      return;
    }

    dependencyFieldsInitRef.current[boardId] = true;
    const nextFields = [...fields, ...missing];
    updateBoardMutation.mutate({
      boardId,
      data: {
        id: boardId,
        custom_meta: {
          ...(boardData.custom_meta || {}),
          fields: nextFields,
        },
      },
    });
  }, [boardData?.custom_meta?.fields, boardId, updateBoardMutation]);

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

  // Handle inline cell edits from the table — persist changed custom_meta value to the server
  const handleCellChange = useCallback((rowData, fieldName, newValue) => {
    if (!rowData?.id || !boardId) return;
    const existingMeta = rowData.custom_meta || { fields: boardData?.custom_meta?.fields || [], values: {} };
    const updatedMeta = {
      ...existingMeta,
      values: {
        ...(existingMeta.values || {}),
        [fieldName]: newValue,
      },
    };
    updateTaskMutation.mutate({ boardId, taskId: rowData.id, custom_meta: updatedMeta });

    const normalizedField = normalizedText(fieldName);
    const documents = boardData?.documents || [];
    const parentDoc = rowData.parent_id
      ? documents.find((doc) => doc._id === rowData.parent_id)
      : documents.find((doc) => doc._id === rowData.id);
    const parentSubtasks = parentDoc?.subtasks || [];

    // Status automations
    const isStatusField = normalizedField === normalizedText(resolvedStatusField) || normalizedField === "status";
    const isAssigneeField = normalizedField === normalizedText(resolvedAssigneeField) || normalizedField === "assignee";
    const isPriorityField = normalizedField === normalizedText(resolvedPriorityField) || normalizedField === "priority";
    const isTypeField = normalizedField === normalizedText(resolvedTypeField) || normalizedField === "type";

    if (automationState.status && isStatusField) {
      const prevStatus = rowData?.custom_meta?.values?.status;
      const nextStatus = newValue;
      const taskType = normalizedText(rowData?.custom_meta?.values?.type);

      if (rowData.parent_id && isDoneStatus(nextStatus) && parentSubtasks.length > 0) {
        const allDone = parentSubtasks.every((sub) => {
          const targetStatus = sub._id === rowData.id ? nextStatus : sub?.custom_meta?.values?.status;
          return isDoneStatus(targetStatus);
        });
        if (allDone && !isDoneStatus(parentDoc?.custom_meta?.values?.status)) {
          updateTaskMutation.mutate({
            boardId,
            taskId: rowData.parent_id,
            custom_meta: {
              ...(parentDoc?.custom_meta || { fields: boardData?.custom_meta?.fields || [], values: {} }),
              values: { ...(parentDoc?.custom_meta?.values || {}), status: "Done" },
            },
          });
        }
      }

      if (rowData.parent_id && isBlockedStatus(nextStatus) && !isBlockedStatus(parentDoc?.custom_meta?.values?.status)) {
        updateTaskMutation.mutate({
          boardId,
          taskId: rowData.parent_id,
          custom_meta: {
            ...(parentDoc?.custom_meta || { fields: boardData?.custom_meta?.fields || [], values: {} }),
            values: {
              ...(parentDoc?.custom_meta?.values || {}),
              status: parentDoc?.custom_meta?.values?.status || "In progress",
              risk_flag: true,
              risk_reason: "Blocked subtask",
            },
          },
        });
      }

      if (!rowData.parent_id && isDoneStatus(nextStatus) && parentSubtasks.length > 0) {
        parentSubtasks.forEach((sub) => {
          const subStatus = sub?.custom_meta?.values?.status;
          if (isBacklogStatus(subStatus)) {
            updateTaskMutation.mutate({
              boardId,
              taskId: sub._id,
              custom_meta: {
                ...(sub?.custom_meta || { fields: boardData?.custom_meta?.fields || [], values: {} }),
                values: { ...(sub?.custom_meta?.values || {}), status: "Done" },
              },
            });
          }
        });
      }

      if (!rowData.parent_id && isDoneStatus(prevStatus) && !isDoneStatus(nextStatus) && !isInProgressStatus(nextStatus)) {
        updateTaskMutation.mutate({
          boardId,
          taskId: rowData.id,
          custom_meta: {
            ...updatedMeta,
            values: { ...(updatedMeta.values || {}), status: "In progress" },
          },
        });
      }

      if (!rowData.parent_id && taskType === "milestone" && isDoneStatus(nextStatus)) {
        toast({
          title: "Milestone completed",
          description: "Summary notification sent to project members.",
        });
      }

      if (isDoneStatus(nextStatus)) {
        const dueDate = toComparableDate(rowData?.custom_meta?.values?.due_date || rowData?.custom_meta?.values?.dates?.to);
        if (dueDate && dueDate > new Date()) {
          updateTaskMutation.mutate({
            boardId,
            taskId: rowData.id,
            custom_meta: {
              ...updatedMeta,
              values: {
                ...(updatedMeta.values || {}),
                early_completion_logged_at: new Date().toISOString(),
              },
            },
          });
        }
      }

      if (isDoneStatus(nextStatus)) {
        const dependentTasks = documents.filter((doc) => {
          const dep = doc?.custom_meta?.values?.depends_on || doc?.custom_meta?.values?.blocked_by;
          return dep && String(dep) === String(rowData.id);
        });
        dependentTasks.forEach((depTask) => {
          toast({
            title: "Dependency unblocked",
            description: `${depTask.title || "A dependent task"} can now start.`,
          });
        });
      }
    }

    // Date and deadline automations
    if (automationState.dates && (normalizedField === "due_date" || normalizedField === "dates" || normalizedField === "start_date")) {
      const dueDate = toComparableDate(newValue?.to || newValue?.end || newValue);
      const taskStatus = normalizedText((normalizedField === "status" ? newValue : rowData?.custom_meta?.values?.status) || rowData?.status);
      if (!isDoneStatus(taskStatus) && dueDate) {
        const daysUntilDue = dateDiffInDays(new Date(), dueDate);
        if (daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && !isHighPriority(rowData?.custom_meta?.values?.priority)) {
          updateTaskMutation.mutate({
            boardId,
            taskId: rowData.id,
            custom_meta: {
              ...updatedMeta,
              values: { ...(updatedMeta.values || {}), priority: "High" },
            },
          });
        }
      }

      if (rowData.parent_id) {
        const parentDueDate = toComparableDate(parentDoc?.custom_meta?.values?.due_date || parentDoc?.custom_meta?.values?.dates?.to);
        if (dueDate && parentDueDate && dueDate.getTime() > parentDueDate.getTime()) {
          toast({
            title: "Subtask due date conflict",
            description: "Subtask due date is beyond parent due date.",
          });
          updateTaskMutation.mutate({
            boardId,
            taskId: rowData.id,
            custom_meta: {
              ...updatedMeta,
              values: { ...(updatedMeta.values || {}), date_conflict: true },
            },
          });
        }
      } else if (normalizedField === "due_date" && parentSubtasks.length) {
        const shouldShift = window.confirm("Shift subtask due dates proportionally with the parent due-date change?");
        if (shouldShift) {
          const prevDue = toComparableDate(rowData?.custom_meta?.values?.due_date);
          const nextDue = toComparableDate(newValue);
          const deltaDays = prevDue && nextDue ? dateDiffInDays(prevDue, nextDue) : null;
          if (deltaDays) {
            parentSubtasks.forEach((sub) => {
              const subDue = toComparableDate(sub?.custom_meta?.values?.due_date);
              if (!subDue) return;
              const shiftedDue = new Date(subDue);
              shiftedDue.setDate(shiftedDue.getDate() + deltaDays);
              updateTaskMutation.mutate({
                boardId,
                taskId: sub._id,
                custom_meta: {
                  ...(sub.custom_meta || { fields: boardData?.custom_meta?.fields || [], values: {} }),
                  values: {
                    ...(sub.custom_meta?.values || {}),
                    due_date: shiftedDue.toISOString().split("T")[0],
                  },
                },
              });
            });
          }
        }
      }

      if (normalizedField === "due_date") {
        const dependentTasks = documents.filter((doc) => {
          const dep = doc?.custom_meta?.values?.depends_on || doc?.custom_meta?.values?.blocked_by;
          return dep && String(dep) === String(rowData.id);
        });
        const previousDue = toComparableDate(rowData?.custom_meta?.values?.due_date);
        const nextDue = toComparableDate(newValue);
        const slipDays = previousDue && nextDue ? dateDiffInDays(previousDue, nextDue) : null;
        if (slipDays && slipDays > 0) {
          dependentTasks.forEach((depTask) => {
            const depStart = toComparableDate(depTask?.custom_meta?.values?.start_date);
            if (!depStart) return;
            const shiftedStart = new Date(depStart);
            shiftedStart.setDate(shiftedStart.getDate() + slipDays);
            updateTaskMutation.mutate({
              boardId,
              taskId: depTask._id,
              custom_meta: {
                ...(depTask.custom_meta || { fields: boardData?.custom_meta?.fields || [], values: {} }),
                values: {
                  ...(depTask.custom_meta?.values || {}),
                  start_date: shiftedStart.toISOString().split("T")[0],
                },
              },
            });
          });
        }
      }
    }

    // Assignment automations
    if (automationState.assignment && isAssigneeField) {
      const previous = rowData?.custom_meta?.values?.assignee;
      const next = newValue;
      if (next && next !== previous) {
        const target = assigneeOptions.find((o) => o.value === next);
        toast({
          title: "Task assigned",
          description: `${target?.label || "Assignee"} was notified.`,
        });
      }
      if (!next && previous) {
        const prevUser = assigneeOptions.find((o) => o.value === previous);
        toast({
          title: "Assignee removed",
          description: `${prevUser?.label || "Previous assignee"} notified. Task is now unassigned.`,
        });
        updateTaskMutation.mutate({
          boardId,
          taskId: rowData.id,
          custom_meta: {
            ...updatedMeta,
            values: { ...(updatedMeta.values || {}), unassigned_flag: true },
          },
        });
      }
    }

    // Priority automations
    if (automationState.priority && isPriorityField) {
      if (isUrgentPriority(newValue)) {
        toast({
          title: "Urgent task alert",
          description: "Assignee and project lead were notified.",
        });
      }
      if (isHighPriority(newValue) && isBlockedStatus(rowData?.custom_meta?.values?.status)) {
        toast({
          title: "Blocked high-priority task",
          description: "Project lead was notified.",
        });
      }
    }

    // Type-based automations
    if (automationState.typeBased && isTypeField) {
      const typeValue = normalizedText(newValue);
      if (typeValue === "bug" && !isHighPriority(rowData?.custom_meta?.values?.priority)) {
        updateTaskMutation.mutate({
          boardId,
          taskId: rowData.id,
          custom_meta: {
            ...updatedMeta,
            values: { ...(updatedMeta.values || {}), priority: "High" },
          },
        });
      }
      if (typeValue === "review") {
        toast({
          title: "Review task updated",
          description: "Reviewer notification sent.",
        });
      }
      if (typeValue === "approval") {
        const approver = assigneeOptions[0]?.value || "";
        if (approver) {
          updateTaskMutation.mutate({
            boardId,
            taskId: rowData.id,
            custom_meta: {
              ...updatedMeta,
              values: { ...(updatedMeta.values || {}), assignee: approver },
            },
          });
        }
      }
    }
  }, [assigneeOptions, automationState, boardId, boardData, resolvedAssigneeField, resolvedPriorityField, resolvedStatusField, resolvedTypeField, toast, updateTaskMutation]);

  // Create a subtask under a parent task
  const createSubtask = useCallback(async (parentTaskId, taskData) => {
    if (!boardId || !parentTaskId) return;
    try {
      const customMetaValues = {};
      const coreFields = ['title', 'description', 'id', 'task_id', 'kanbanId', 'custom_meta'];
      Object.keys(taskData).forEach(key => {
        if (!coreFields.includes(key) && taskData[key] !== undefined) {
          customMetaValues[key] = taskData[key];
        }
      });
      const parentDoc = (boardData?.documents || []).find((d) => d._id === parentTaskId);
      const inheritedAssignee = taskData.assignee ?? parentDoc?.custom_meta?.values?.assignee;
      const requestBody = {
        user_id: localStorage.getItem('userId') || "68578b51b1325fc7c9b7b095",
        title: taskData.title,
        page_type: 'document',
        entity_type: 'page',
        content: { text: taskData.description || '' },
        summary: taskData.description || '',
        last_updated_by: localStorage.getItem('userId') || "68578b51b1325fc7c9b7b095",
        custom_meta: {
          fields: boardData?.custom_meta?.fields || [],
          values: { ...customMetaValues, ...(inheritedAssignee ? { assignee: inheritedAssignee } : {}) },
        },
        board_id: boardId,
        shared_members: boardData?.shared_members || [],
        shared_teams: boardData?.shared_teams || [],
        attachments: [],
      };
      await createSubtaskMutation.mutateAsync({ boardId, parentTaskId, taskData: requestBody });
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  }, [boardId, boardData, createSubtaskMutation]);

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

      // Create-time automations
      const dueInDays = dateDiffInDays(new Date(), customMetaValues.due_date);
      if (automationState.assignment && !customMetaValues.assignee && dueInDays !== null && dueInDays <= 2) {
        toast({
          title: "Unassigned near-deadline task",
          description: "Team lead was notified because due date is within 48 hours.",
        });
      }
      if (automationState.typeBased && normalizedText(customMetaValues.type) === "bug" && !isHighPriority(customMetaValues.priority)) {
        customMetaValues.priority = "High";
      }
      if (automationState.typeBased && normalizedText(customMetaValues.type) === "approval" && !customMetaValues.assignee && assigneeOptions.length) {
        customMetaValues.assignee = assigneeOptions[0].value;
      }

      // Use TanStack Query mutation to create task
      await createTaskMutation.mutateAsync({ boardId, taskData: requestBody });
      console.log('Task created successfully via TanStack Query');
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  useEffect(() => {
    if (!automationState.dates || !boardData?.documents?.length || !boardId) return;
    const today = new Date();
    const updates = [];
    const docs = boardData.documents;

    docs.forEach((doc) => {
      const values = doc?.custom_meta?.values || {};
      const status = values.status;
      const startDate = toComparableDate(values.start_date || values.dates?.from);
      const dueDate = toComparableDate(values.due_date || values.dates?.to);

      if (startDate && startDate <= today && isBacklogStatus(status)) {
        updates.push({
          taskId: doc._id,
          custom_meta: {
            ...(doc.custom_meta || { fields: boardData?.custom_meta?.fields || [], values: {} }),
            values: { ...values, status: "In progress" },
          },
        });
      }

      if (dueDate && dueDate < today && !isDoneStatus(status) && !values.overdue) {
        updates.push({
          taskId: doc._id,
          custom_meta: {
            ...(doc.custom_meta || { fields: boardData?.custom_meta?.fields || [], values: {} }),
            values: { ...values, overdue: true },
          },
        });
      }
    });

    updates.slice(0, 20).forEach((update) => {
      updateTaskMutation.mutate({ boardId, taskId: update.taskId, custom_meta: update.custom_meta });
    });
  }, [automationState.dates, boardData, boardId, updateTaskMutation]);

  // Transform boardData into task format using useMemo
  const boardTasks = useMemo(() => {
    if (!boardData) {
      return null; // return null so TableView keeps its previous data prop
    }

    const customFieldsBase = boardData.custom_meta?.fields || [];
    const customFields = [
      ...customFieldsBase,
      ...DEPENDENCY_FIELD_DEFS.filter((def) => !customFieldsBase.some((f) => f?.name === def.name)),
    ];
    const statusFieldName = resolveFieldName(customFields, "status");
    const normalizeDateValue = (raw) => {
      if (!raw) return null;
      if (typeof raw === 'string') {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
      }
      if (raw instanceof Date) {
        return Number.isNaN(raw.getTime()) ? null : raw.toISOString().split('T')[0];
      }
      if (typeof raw === 'object') {
        const from = raw.from || raw.start || raw.date || null;
        const to = raw.to || raw.end || null;
        return {
          from: normalizeDateValue(from),
          to: normalizeDateValue(to),
        };
      }
      return null;
    };

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
    const propertyValues = [];
    (boardData.documents || []).forEach((doc, index) => {
      const subtasks = (doc.subtasks || []).map((sub, si) => {
        const subData = {
          id: sub._id,
          task_id: `TASK-${String(index + 1).padStart(3, '0')}.${si + 1}`,
          title: sub.title || 'Untitled Subtask',
          description: sub.description || '',
          parent_id: sub.parent_id,
          custom_meta: sub.custom_meta || { fields: [], values: {} },
          overdue: Boolean(sub.custom_meta?.values?.overdue),
          subtasks: [],
        };
        customFields.forEach(field => {
          const rawValue = sub.custom_meta?.values?.[field.name];
          const fieldOptions =
            field.type === "dynamic-select"
              ? assigneeOptions
              : (field?.options || []);
          const normalizedValue =
            field.type === "select" || field.type === "dynamic-select"
              ? normalizeSelectLikeValue(rawValue, fieldOptions)
              : rawValue;
          subData[field.name] = normalizedValue ?? ((field.type === 'select' || field.type === 'dynamic-select') ? '' : null);

          // Normalize daterange values so all views can rely on start_date / due_date.
          if (field.type === 'daterange') {
            const norm = normalizeDateValue(normalizedValue);
            if (norm && typeof norm === 'object') {
              if (norm.from) subData.start_date = norm.from;
              if (norm.to) subData.due_date = norm.to;
            }
          }
        });
        subData.status = subData[statusFieldName] || sub.custom_meta?.values?.status || "";
        subData.createdAt = sub.createdAt;
        subData.updatedAt = sub.updatedAt;
        return subData;
      });

      const taskData = {
        id: doc._id,
        task_id: `TASK-${String(index + 1).padStart(3, '0')}`,
        title: doc.title || doc.name || 'Untitled Task',
        description: doc.description || '',
        // Preserve raw custom_meta so drag-and-drop can merge values correctly
        custom_meta: doc.custom_meta || { fields: [], values: {} },
        overdue: Boolean(doc.custom_meta?.values?.overdue),
        // Subtasks nested under this task (for table expand)
        subtasks,
      };

      // Add custom field values
      customFields.forEach(field => {
        const value = doc.custom_meta?.values?.[field.name];
        const fieldOptions =
          field.type === "dynamic-select"
            ? assigneeOptions
            : (field?.options || []);
        const normalizedValue =
          field.type === "select" || field.type === "dynamic-select"
            ? normalizeSelectLikeValue(value, fieldOptions)
            : value;
        taskData[field.name] = normalizedValue ?? ((field.type === 'select' || field.type === 'dynamic-select') ? '' : null);

        // Normalize daterange values so all views can rely on start_date / due_date.
        if (field.type === 'daterange') {
          const norm = normalizeDateValue(normalizedValue);
          if (norm && typeof norm === 'object') {
            if (norm.from) taskData.start_date = norm.from;
            if (norm.to) taskData.due_date = norm.to;
          }
        }
      });
      taskData.status = taskData[statusFieldName] || doc.custom_meta?.values?.status || "";

      // Add timestamps
      taskData.createdAt = doc.createdAt;
      taskData.updatedAt = doc.updatedAt;

      propertyValues.push(taskData);
      // Also push subtasks as flat items so they appear in kanban/timeline/calendar
      subtasks.forEach(sub => propertyValues.push(sub));
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
    return (boardTasks?.property_name || []).filter(f => !excluded.includes(f.name));
  }, [boardTasks?.property_name]);

  const currentUserId = useMemo(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return u?._id || u?.id || null;
      }
    } catch (_) { /* ignore */ }
    return null;
  }, []);

  const dependencyTaskOptions = useMemo(() => {
    const byId = new Map();
    (boardDataUnfiltered?.documents || []).forEach((doc, index) => {
      if (!doc?._id) return;
      const parentTaskId = `TASK-${String(index + 1).padStart(3, '0')}`;
      byId.set(String(doc._id), {
        value: String(doc._id),
        label: doc.title || doc.name || parentTaskId,
        taskId: parentTaskId,
      });
      (doc.subtasks || []).forEach((sub, si) => {
        if (!sub?._id) return;
        byId.set(String(sub._id), {
          value: String(sub._id),
          label: sub.title || `Untitled Subtask ${si + 1}`,
          taskId: `${parentTaskId}.${si + 1}`,
        });
      });
    });
    return Array.from(byId.values());
  }, [boardDataUnfiltered?.documents]);

  function handleSaveView() {
    if (!boardId) return;
    updateBoardMutation.mutate({ boardId, data: { id: boardId, saved_view: viewState } });
  }

  function handleResetView() {
    const saved = boardData?.saved_view || DEFAULT_VIEW;
    setViewState(saved);
  }

  function handleSaveAutomations(nextAutomations) {
    if (!boardId) return;
    setAutomationState(nextAutomations);
    updateBoardMutation.mutate({ boardId, data: { id: boardId, automations: nextAutomations } });
    toast({ title: "Automation settings saved" });
  }

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

        {/* Sub-toolbar: group-by (left) + sort/filter/search controls (right) */}
        <div className="flex items-center justify-between py-2 border-b mb-4 text-sm">
          {/* Group By */}
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            {/* Sort / Filter / Assignee / My Tasks / Search / Save */}
            <BoardSubheaderControls
              fields={boardTasks?.property_name || []}
              assigneeOptions={assigneeOptions}
              currentUserId={currentUserId}
              viewState={viewState}
              savedView={boardData?.saved_view}
              onChange={setViewState}
              onSave={handleSaveView}
              onReset={handleResetView}
            />
            <AutomationsPanel
              fields={boardTasks?.property_name || []}
              assigneeOptions={assigneeOptions}
              automations={automationState}
              onChange={setAutomationState}
              onSave={handleSaveAutomations}
            />
          </div>
        </div>

        {/* Tabs Content */}
        {layouts?.map((layout) => (
          <TabsContent key={layout.type} value={layout.type}>
            {isLoading || !boardTasks ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <layout.element
                data={boardTasks}
                boardId={boardId}
                onTaskCreate={() => setIsTaskModalOpen(true)}
                onSubtaskCreate={createSubtask}
                onCellChange={handleCellChange}
                assigneeOptions={assigneeOptions}
                groupBy={groupBy}
                dependencyOptions={dependencyTaskOptions}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
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