import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import KanbanCard from './kanban-card';
import { cn } from '@/lib/utils';

function KanbanColumn({ id, title, color, items }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "h-fit max-h-[calc(100vh-200px)] transition-colors",
        isOver && "ring-2 ring-blue-500 ring-opacity-50"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
            {title}
          </h3>
          <Badge variant="secondary" className={cn("text-xs", color)}>
            {items.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext items={items.map(item => item.kanbanId)} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-gray-400 dark:text-gray-600 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              Drop items here
            </div>
          ) : (
            items.map((item) => (
              <KanbanCard key={item.kanbanId} item={item} />
            ))
          )}
        </SortableContext>
      </CardContent>
    </Card>
  );
}

export default KanbanColumn;
