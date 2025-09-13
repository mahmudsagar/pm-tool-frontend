import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TableFilter({ filters, onRemoveFilter, columns }) {
  if (!filters?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b">
      {filters.map(filter => {
        const column = columns.find(col => col.name === filter.column);
        return (
          <div
            key={filter.id}
            className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-1.5"
          >
            <span className="text-sm">
              {column?.label || filter.column}: {filter.type}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => onRemoveFilter(filter.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}