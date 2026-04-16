import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import KanbanColumn from './kanban-column';
import KanbanCard from './kanban-card';
import TaskFormModal from './task-form-modal';
import StatusFormModal from './status-form-modal';
import useStatusStore from '@/stores/useStatusStore';
import { useUpdateDocumentMeta } from '@/hooks/mutations/useFilesMutations';

const EMPTY_ASSIGNEE_OPTIONS = [];

export default function KanbanView({ data, boardId, onTaskCreate, assigneeOptions = EMPTY_ASSIGNEE_OPTIONS, groupBy = null, onSubtaskCreate }) {
  // Get status management functions from the global store
  const statuses = useStatusStore(state => state.statuses);
  const addStatus = useStatusStore(state => state.addStatus);
  const updateStatus = useStatusStore(state => state.updateStatus);
  const deleteStatus = useStatusStore(state => state.deleteStatus);
  const reorderStatuses = useStatusStore(state => state.reorderStatuses);

  const updateDocumentMeta = useUpdateDocumentMeta();
  
  const [activeId, setActiveId] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);

  // Ref to track where a drag started — needed because handleDragOver updates
  // item state (and status) before handleDragEnd runs, so we can't rely on
  // findItemById or findContainer to determine the original column at end time.
  const dragSourceRef = useRef(null);
  
  // When groupBy prop is active, derive columns from its unique values;
  // otherwise fall back to the status store.
  const columns = useMemo(() => {
    if (groupBy) {
      // Resolve full options list for this field
      const fieldDef = data.property_name?.find(f => f.name === groupBy.name);
      const options =
        groupBy.type === 'dynamic-select'
          ? assigneeOptions
          : (fieldDef?.props?.optionsData ?? []);

      // Start with every known option so empty groups still appear
      const seen = new Set();
      const cols = options.map(opt => {
        seen.add(String(opt.value));
        return { id: String(opt.value), title: opt.label, color: 'bg-slate-100' };
      });

      // Append any values found in data that aren't in the options list
      data.property_values.forEach(item => {
        const val = item[groupBy.name];
        const key = val != null && val !== '' ? String(val) : '__unset__';
        if (!seen.has(key)) {
          seen.add(key);
          const label = key === '__unset__' ? `No ${groupBy.label}` : key;
          cols.push({ id: key, title: label, color: 'bg-slate-100' });
        }
      });

      // Always include the unset bucket
      if (!seen.has('__unset__')) {
        cols.push({ id: '__unset__', title: `No ${groupBy.label}`, color: 'bg-slate-100' });
      }

      return cols.length === 0
        ? [{ id: '__unset__', title: `No ${groupBy.label}`, color: 'bg-slate-100' }]
        : cols;
    }
    return statuses.map(status => ({
      id: status.id || status.value,
      title: status.title || status.label,
      color: status.color || 'bg-slate-100',
    }));
  }, [groupBy, data.property_values, data.property_name, statuses, assigneeOptions]);
  
  const [items, setItems] = useState({});

  // Sync items with incoming data whenever data changes
  useEffect(() => {
    // Organize data into kanban columns
    const organizedItems = {};
    columns.forEach(column => {
      organizedItems[column.id] = [];
    });

    // Group items by the active groupBy field (or status as default)
    const groupField = groupBy ? groupBy.name : 'status';
    data.property_values.forEach((item) => {
      const val = item[groupField];
      const key = val != null && val !== '' ? String(val) : '__unset__';
      const kanbanItem = {
        ...item,
        kanbanId: `demo-${item.id}`, // Unique ID for drag and drop
      };

      if (organizedItems[key] !== undefined) {
        organizedItems[key].push(kanbanItem);
      } else {
        // Fallback to first column if value doesn't match any column
        organizedItems[columns[0]?.id || 'todo'].push(kanbanItem);
      }
    });

    setItems(organizedItems);
  }, [data.property_values, columns, groupBy]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Task management functions
  const handleAddTask = useCallback((columnId) => {
    setDefaultStatus(columnId);
    setTaskModalOpen(true);
  }, []);

  const handleSaveTask = useCallback(async (taskData, isEditing) => {
    if (isEditing) {
      // Update existing task in local state
      setItems(prev => {
        const newItems = { ...prev };
        
        // Find and remove the old task from its current column
        Object.keys(newItems).forEach(columnId => {
          newItems[columnId] = newItems[columnId].filter(item => item.id !== taskData.id);
        });
        
        // Add the updated task to the correct column
        if (!newItems[taskData.status]) {
          newItems[taskData.status] = [];
        }
        newItems[taskData.status].push(taskData);
        
        return newItems;
      });
      
      // Persist to API when in board context and custom_meta is available
      if (boardId && taskData.custom_meta) {
        try {
          await updateDocumentMeta.mutateAsync({
            documentId: taskData.id,
            custom_meta: taskData.custom_meta,
            boardId,
          });
        } catch (error) {
          console.error('Failed to update task:', error);
        }
      }
    } else {
      // Add new task
      if (boardId && onTaskCreate) {
        // If we're in a board context, use the parent's task creation logic
        // Optimistically add the task to local state immediately so it's visible
        // without waiting for the query refetch
        setItems(prev => ({
          ...prev,
          [taskData.status]: [...(prev[taskData.status] || []), {
            ...taskData,
            kanbanId: taskData.kanbanId || `demo-${taskData.id}`,
          }]
        }));
        await onTaskCreate(taskData);
        // Query refetch in onTaskCreate will sync canonical server data
      } else {
        // Demo mode - just update local state
        setItems(prev => ({
          ...prev,
          [taskData.status]: [...(prev[taskData.status] || []), taskData]
        }));
      }
    }
  }, [boardId, onTaskCreate, updateDocumentMeta]);

  // Status management functions
  const handleEditStatus = useCallback((status) => {
    setEditingStatus(status);
    setStatusModalOpen(true);
  }, []);

  const handleSaveStatus = useCallback((statusData, isEditing) => {
    if (isEditing) {
      // Update existing status
      updateStatus(statusData);
    } else {
      // Add new status
      addStatus(statusData);
      // Initialize empty items array for new status
      setItems(prev => ({
        ...prev,
        [statusData.id]: []
      }));
    }
  }, [updateStatus, addStatus]);

  const handleDeleteStatus = useCallback((statusId) => {
    // Don't allow deleting if there are tasks in the column
    if (items[statusId] && items[statusId].length > 0) {
      alert('Cannot delete status with existing tasks. Please move or delete all tasks first.');
      return;
    }
    
    // Remove the status column
    deleteStatus(statusId);
    setItems(prev => {
      const newItems = { ...prev };
      delete newItems[statusId];
      return newItems;
    });
    setStatusModalOpen(false);
  }, [items, deleteStatus]);

  const handleAddStatus = useCallback(() => {
    setEditingStatus(null);
    setStatusModalOpen(true);
  }, []);

  const findContainer = useCallback((itemId) => {
    if (itemId in items) {
      return itemId;
    }

    return Object.keys(items).find(key => 
      items[key].some(item => item.kanbanId === itemId)
    );
  }, [items]);

  const findItemById = useCallback((itemId) => {
    for (const container of Object.keys(items)) {
      const item = items[container].find(item => item.kanbanId === itemId);
      if (item) return item;
    }
    return null;
  }, [items]);

  const handleDragStart = useCallback((event) => {
    const id = event.active.id;
    setActiveId(id);
    // Record original container before handleDragOver mutates items state
    dragSourceRef.current = findContainer(id);
  }, [findContainer]);

  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Check if we're dragging a column
    const isActiveColumn = columns.some(col => col.id === activeId);
    const isOverColumn = columns.some(col => col.id === overId);

    if (isActiveColumn && isOverColumn) {
      // Column reordering - handle in handleDragEnd
      return;
    }

    // If dragging a column over a task, don't process as task movement
    if (isActiveColumn) {
      return;
    }

    // Find the containers for tasks
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setItems(prev => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];

      // Find the indexes for the items
      const activeIndex = activeItems.findIndex(item => item.kanbanId === activeId);
      const overIndex = overItems.findIndex(item => item.kanbanId === overId);

      let newIndex;
      if (overId in prev) {
        // Dropping on a container
        newIndex = overItems.length + 1;
      } else {
        // Dropping on an item
        const isBelowOverItem = over && 
          overIndex < overItems.length - 1 &&
          over.rect && 
          over.rect.offsetTop > over.rect.top + over.rect.height / 2;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      const activeItem = activeItems[activeIndex];
      const updatedItem = { ...activeItem, status: overContainer };

      return {
        ...prev,
        [activeContainer]: activeItems.filter(item => item.kanbanId !== activeId),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          updatedItem,
          ...overItems.slice(newIndex)
        ]
      };
    });
  }, [findContainer, columns]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;

    // Always consume the source ref
    const sourceContainer = dragSourceRef.current;
    dragSourceRef.current = null;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Check if we're reordering columns
    const isActiveColumn = columns.some(col => col.id === activeId);
    const isOverColumn = columns.some(col => col.id === overId);

    if (isActiveColumn && isOverColumn) {
      const oldIndex = columns.findIndex(col => col.id === activeId);
      const newIndex = columns.findIndex(col => col.id === overId);

      if (oldIndex !== newIndex) {
        reorderStatuses(oldIndex, newIndex);
      }

      setActiveId(null);
      return;
    }

    // Determine the destination container
    const overContainer = findContainer(overId) || overId;

    if (!sourceContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    if (sourceContainer === overContainer) {
      // Reordering within the same column — handleDragOver didn't touch items
      // for same-container moves, so we apply the final order here.
      const containerItems = items[overContainer] || [];
      const oldIndex = containerItems.findIndex(item => item.kanbanId === activeId);
      const newIndex = containerItems.findIndex(item => item.kanbanId === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setItems(prev => ({
          ...prev,
          [overContainer]: arrayMove(containerItems, oldIndex, newIndex)
        }));
      }
    } else if (boardId) {
      // Cross-column move — handleDragOver already updated items state visually.
      // Now persist the new status to the API.
      const activeItem = findItemById(activeId);
      if (activeItem) {
        try {
          await updateDocumentMeta.mutateAsync({
            documentId: activeItem.id,
            custom_meta: {
              ...activeItem.custom_meta,
              values: {
                ...activeItem.custom_meta?.values,
                status: overContainer,
              }
            },
            boardId,
          });
        } catch (error) {
          console.error('Failed to update task status:', error);
        }
      }
    }

    setActiveId(null);
  }, [items, findContainer, findItemById, columns, reorderStatuses, boardId, updateDocumentMeta]);

  const activeItem = activeId ? findItemById(activeId) : null;
  const activeColumn = activeId ? columns.find(col => col.id === activeId) : null;

  return (
    <div className="w-full h-full p-6">
      {/* <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold dark:text-white">Kanban Board - Demo Data</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddStatus}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Status
          </Button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Drag and drop tasks between columns, click &quot;Add task&quot; to create new tasks, manage statuses, or drag column headers to reorder them.
        </p>
      </div> */}
      
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-6 pb-6 w-max min-w-full">
              {columns.map(column => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  items={items[column.id] || []}
                  onAddTask={handleAddTask}
                  onEditStatus={handleEditStatus}
                  isDragOverlay={false}
                  assigneeOptions={assigneeOptions}
                  onSubtaskCreate={onSubtaskCreate}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeColumn ? (
            <div className="w-80 opacity-90 transform rotate-1 shadow-lg">
              <KanbanColumn
                id={activeColumn.id}
                title={activeColumn.title}
                color={activeColumn.color}
                items={items[activeColumn.id] || []}
                isDragOverlay={true}
              />
            </div>
          ) : activeItem ? (
            <Card className="opacity-90 transform rotate-3 shadow-lg">
              <KanbanCard item={activeItem} isDragOverlay assigneeOptions={assigneeOptions} />
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskFormModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        defaultStatus={defaultStatus}
        onSave={handleSaveTask}
        assigneeOptions={assigneeOptions}
      />

      <StatusFormModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        status={editingStatus}
        onSave={handleSaveStatus}
        onDelete={handleDeleteStatus}
      />
    </div>
  );
}