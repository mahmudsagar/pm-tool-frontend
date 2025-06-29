import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GripVertical, Calendar, User, Flag } from 'lucide-react';

function DemoKanbanCard({ item, isDragOverlay = false, onEdit }) {
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'backend':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'frontend':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'testing':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'security':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'documentation':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300';
    }
  };

  const getAssigneeName = (assigneeValue) => {
    const assigneeMap = {
      'muhtasim_fuad_fahim': 'Muhtasim F.',
      'mahmudul_hasan': 'Mahmudul H.',
      'sarah_johnson': 'Sarah J.',
      'alex_chen': 'Alex C.',
    };
    return assigneeMap[assigneeValue] || assigneeValue;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
        isDragOverlay && "shadow-lg scale-105",
        "group" // Add group class for hover effects
      )}
      {...attributes}
      onClick={(e) => {
        // Don't trigger edit when dragging or clicking the drag handle
        if (!isDragging && !e.target.closest('[data-drag-handle]')) {
          onEdit?.(item);
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {item.task_id}
              </span>
              <Badge variant="outline" className={cn("text-xs", getPriorityColor(item.priority))}>
                <Flag className="w-3 h-3 mr-1" />
                {item.priority}
              </Badge>
            </div>
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
              {item.title}
            </h4>
            {item.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {item.description}
              </p>
            )}
          </div>
          <div 
            data-drag-handle // Add data attribute for drag handle
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ml-2"
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={cn("text-xs", getTypeColor(item.type))}>
              {item.type}
            </Badge>
            {item.sprint && (
              <Badge variant="secondary" className="text-xs">
                {item.sprint.replace('-', ' ')}
              </Badge>
            )}
          </div>
          
          {item.due_date && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>{new Date(item.due_date).toLocaleDateString()}</span>
            </div>
          )}
          
          {item.assignee && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <User className="w-3 h-3" />
              <span className="truncate">{getAssigneeName(item.assignee)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DemoKanbanCard;
