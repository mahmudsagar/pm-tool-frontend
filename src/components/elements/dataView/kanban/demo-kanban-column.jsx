import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DemoKanbanCard from './demo-kanban-card';
import { cn } from '@/lib/utils';

function DemoKanbanColumn({ id, title, color, items, onAddTask, onEditStatus, isDragOverlay = false }) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    disabled: isDragOverlay,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Combine refs for both droppable and sortable
  const setNodeRef = (node) => {
    setDroppableRef(node);
    setSortableRef(node);
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-80 flex-shrink-0 h-fit transition-colors",
        isOver && !isDragOverlay && "ring-2 ring-blue-500 ring-opacity-50",
        isDragging && "opacity-50"
      )}
    >
      <CardHeader className="pb-3" {...attributes} {...listeners}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300 cursor-grab active:cursor-grabbing">
              {title}
            </h3>
            {!isDragOverlay && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Settings className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onEditStatus?.({ id, title, color })}>
                    Edit Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <Badge variant="secondary" className={cn("text-xs", color)}>
            {items.length}
          </Badge>
        </div>
        {!isDragOverlay && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => onAddTask?.(id)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add task
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)', minHeight: '300px' }}>
        {!isDragOverlay ? (
          <SortableContext items={items.map(item => item.kanbanId)} strategy={verticalListSortingStrategy}>
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-gray-400 dark:text-gray-600 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                Drop tasks here
              </div>
            ) : (
              items.map((item) => (
                <DemoKanbanCard key={item.kanbanId} item={item} />
              ))
            )}
          </SortableContext>
        ) : (
          // Simplified view for drag overlay
          <div className="space-y-2">
            {items.slice(0, 3).map((item) => (
              <div key={item.kanbanId} className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm opacity-75 truncate">
                {item.title || item.task_id}
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                +{items.length - 3} more tasks
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DemoKanbanColumn;
