import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GripVertical, Calendar, User } from 'lucide-react';

function KanbanCard({ item, isDragOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.kanbanId,
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'folder':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'document':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'spreadsheet':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
        isDragOverlay && "shadow-lg scale-105"
      )}
      {...attributes}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-purple-700" />
            </div>
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {item.name}
            </h4>
          </div>
          <div 
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="space-y-2">
          <Badge variant="outline" className={cn("text-xs", getTypeColor(item.type))}>
            {item.type}
          </Badge>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{item.modified}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <User className="w-3 h-3" />
            <span className="truncate">{item.modifiedBy}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge 
              variant={item.sharing === 'Public' ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {item.sharing}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default KanbanCard;
