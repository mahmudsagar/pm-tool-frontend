import { useState, useCallback, useEffect } from 'react';
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
import DemoKanbanColumn from './demo-kanban-column';
import DemoKanbanCard from './demo-kanban-card';
import TaskFormModal from './task-form-modal';
import StatusFormModal from './status-form-modal';
import useStatusStore from '@/stores/useStatusStore';
import { documentBaseUrl } from '@/utils/constants';
import { api } from '@/utils/api';

export default function KanbanView({ data, boardId, onTaskCreate }) {
  console.log({ data, boardId });
  
  // Get status management functions from the global store
  const { 
    getKanbanColumns, 
    addStatus, 
    updateStatus, 
    deleteStatus,
    reorderStatuses
  } = useStatusStore();
  
  const [activeId, setActiveId] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  
  // Use dynamic columns from the status store instead of static DEFAULT_COLUMNS
  const columns = getKanbanColumns();
  
  const [items, setItems] = useState({});

  // Sync items with incoming data whenever data changes
  useEffect(() => {
    // Organize data into kanban columns
    const organizedItems = {};
    columns.forEach(column => {
      organizedItems[column.id] = [];
    });

    // Group items by status
    data.property_values.forEach((item) => {
      const status = item.status || 'todo';
      const kanbanItem = {
        ...item,
        kanbanId: `demo-${item.id}`, // Unique ID for drag and drop
      };

      if (organizedItems[status]) {
        organizedItems[status].push(kanbanItem);
      } else {
        // Fallback to first column if status doesn't exist
        organizedItems[columns[0]?.id || 'todo'].push(kanbanItem);
      }
    });

    setItems(organizedItems);
  }, [data.property_values, columns]);

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
      // Update existing task
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
      
      // TODO: Call API to update task in board if boardId exists
    } else {
      // Add new task
      if (boardId && onTaskCreate) {
        // If we're in a board context, use the parent's task creation logic
        console.log('Calling parent onTaskCreate from kanban');
        await onTaskCreate(taskData);
        // The parent will handle API call and data refresh
      } else {
        // Demo mode - just update local state
        setItems(prev => ({
          ...prev,
          [taskData.status]: [...(prev[taskData.status] || []), taskData]
        }));
      }
    }
  }, [boardId, onTaskCreate]);

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
    setActiveId(event.active.id);
  }, []);

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

    if (isActiveColumn || isOverColumn) {
      // Don't allow mixing column and task dragging
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
        console.log(`Column ${activeId} reordered from position ${oldIndex} to ${newIndex}`);
      }

      setActiveId(null);
      return;
    }

    // Handle task reordering
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    if (activeContainer === overContainer) {
      // Reordering within the same container
      const items_in_container = items[activeContainer];
      const oldIndex = items_in_container.findIndex(item => item.kanbanId === activeId);
      const newIndex = items_in_container.findIndex(item => item.kanbanId === overId);

      if (oldIndex !== newIndex) {
        setItems(prev => ({
          ...prev,
          [overContainer]: arrayMove(items_in_container, oldIndex, newIndex)
        }));
      }
    }

    // If task moved to a different status, update via API
    const activeItem = findItemById(activeId);
    if (activeItem && activeItem.status !== overContainer && boardId) {
      console.log(`Task ${activeItem.task_id} moved from ${activeContainer} to ${overContainer}`);
      
      try {
        // Update task status in the database
        await api.put(documentBaseUrl, {
          id: activeItem.id,
          custom_meta: {
            ...activeItem.custom_meta,
            values: {
              ...activeItem.custom_meta?.values,
              status: overContainer
            }
          }
        });
        console.log('Task status updated successfully');
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    }

    setActiveId(null);
  }, [items, findContainer, findItemById, columns, reorderStatuses, boardId]);

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
                <DemoKanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  items={items[column.id] || []}
                  onAddTask={handleAddTask}
                  onEditStatus={handleEditStatus}
                  isDragOverlay={false}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeColumn ? (
            <div className="w-80 opacity-90 transform rotate-1 shadow-lg">
              <DemoKanbanColumn
                id={activeColumn.id}
                title={activeColumn.title}
                color={activeColumn.color}
                items={items[activeColumn.id] || []}
                isDragOverlay={true}
              />
            </div>
          ) : activeItem ? (
            <Card className="opacity-90 transform rotate-3 shadow-lg">
              <DemoKanbanCard item={activeItem} isDragOverlay />
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskFormModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        defaultStatus={defaultStatus}
        onSave={handleSaveTask}
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