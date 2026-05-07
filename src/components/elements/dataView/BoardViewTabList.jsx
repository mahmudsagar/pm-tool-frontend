import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

function SortableTabTrigger({ id, icon: Icon, label }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`inline-flex items-center rounded-md ${isDragging ? 'opacity-80' : ''}`}
    >
      <button
        type="button"
        className="touch-none cursor-grab rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Reorder ${label}`}
        {...attributes}
        {...listeners}
        onClick={(e) => e.preventDefault()}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0" />
      </button>
      <TabsTrigger value={id} className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </TabsTrigger>
    </div>
  );
}

/**
 * Horizontal sortable row of board view tabs (Table, Kanban, …).
 * Drag via the grip handle; tab click still switches view.
 */
export default function BoardViewTabList({ orderedLayouts, onOrderChange }) {
  const itemIds = orderedLayouts.map((l) => l.type);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemIds.indexOf(active.id);
    const newIndex = itemIds.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onOrderChange(arrayMove(itemIds, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
        <TabsList className="inline-flex h-auto min-h-10 flex-wrap items-center gap-0.5">
          {orderedLayouts.map((layout) => (
            <SortableTabTrigger
              key={layout.type}
              id={layout.type}
              icon={layout.icon}
              label={layout.label}
            />
          ))}
        </TabsList>
      </SortableContext>
    </DndContext>
  );
}
