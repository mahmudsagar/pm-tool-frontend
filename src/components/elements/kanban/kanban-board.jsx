import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@dnd-kit/sortable';
import useFileManagerStore from '@/stores/useFileManagerStore';
import KanbanColumn from './kanban-column';
import KanbanCard from './kanban-card';
import { Card } from '@/components/ui/card';
import Spinner from '@/components/elements/spinner';

// Default kanban columns
const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-100' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' },
];

function KanbanBoard() {
  const { id, type } = useParams();
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const { formatTableData } = useFileManagerStore(state => state);

  // Initialize items with random status for demo purposes
  const [items, setItems] = useState({});

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

  // Fetch data and organize into kanban structure
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const result = await formatTableData(id, type);
        
        // Organize data into kanban columns
        // For demo, randomly assign status to items
        // In a real app, you'd get this from the backend
        const organizedItems = {};
        DEFAULT_COLUMNS.forEach(column => {
          organizedItems[column.id] = [];
        });

        result.forEach((item, index) => {
          // Add status property if it doesn't exist
          const statusIndex = index % DEFAULT_COLUMNS.length;
          const status = item.status || DEFAULT_COLUMNS[statusIndex].id;
          
          const kanbanItem = {
            ...item,
            status,
            kanbanId: `${item.id}-${status}`, // Unique ID for drag and drop
          };

          if (organizedItems[status]) {
            organizedItems[status].push(kanbanItem);
          } else {
            // Fallback to first column if status doesn't exist
            organizedItems[DEFAULT_COLUMNS[0].id].push(kanbanItem);
          }
        });

        setItems(organizedItems);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id, type, formatTableData]);

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the containers
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
  }, [findContainer]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

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

    setActiveId(null);

    // Here you would typically save the new status to your backend
    const activeItem = findItemById(activeId);
    if (activeItem && activeItem.status !== overContainer) {
      console.log(`Item ${activeItem.name} moved from ${activeContainer} to ${overContainer}`);
      // You can add an API call here to update the item status in your backend
      // updateItemStatus(activeItem.id, overContainer);
    }
  }, [items, findContainer, findItemById]);

  const activeItem = activeId ? findItemById(activeId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 dark:text-white">Kanban Board</h2>
      
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEFAULT_COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              items={items[column.id] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem ? (
            <Card className="opacity-90 transform rotate-3 shadow-lg">
              <KanbanCard item={activeItem} isDragOverlay />
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default KanbanBoard;
