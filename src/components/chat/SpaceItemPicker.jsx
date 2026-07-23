import { useState } from 'react';
import { Link2, Search, ListTodo, BookOpen, GitBranch, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useSpaceItemSearch } from '@/hooks/queries/useSpaceItemSearch';
import { cn } from '@/lib/utils';

const KIND_CONFIG = {
  task: { label: 'Task', icon: ListTodo, color: 'text-blue-600' },
  story: { label: 'Story', icon: BookOpen, color: 'text-purple-600' },
  subtask: { label: 'Subtask', icon: GitBranch, color: 'text-slate-500' },
};

function KindIcon({ kind, className }) {
  const config = KIND_CONFIG[kind] || KIND_CONFIG.task;
  const Icon = config.icon;
  return <Icon size={14} className={cn(config.color, className)} />;
}

export function EntityLinkCard({ entityRef, isOwn }) {
  const config = KIND_CONFIG[entityRef.type] || KIND_CONFIG.task;
  const href = entityRef.url || `/document/${entityRef.id}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block rounded-lg border transition-colors hover:bg-background/80 min-w-[200px] max-w-[280px]',
        isOwn
          ? 'border-purple-400/40 bg-purple-700/30 hover:bg-purple-700/40'
          : 'border-border bg-background hover:bg-muted/50'
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <KindIcon kind={entityRef.type} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium text-sm truncate', isOwn ? 'text-white' : 'text-foreground')}>
            {entityRef.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', isOwn && 'border-purple-300/50 text-purple-100')}>
              {config.label}
            </Badge>
            {entityRef.status && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {entityRef.status}
              </Badge>
            )}
          </div>
          {entityRef.board_name && (
            <p className={cn('text-[10px] mt-1 truncate', isOwn ? 'text-purple-200' : 'text-muted-foreground')}>
              {entityRef.board_name}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

export function SelectedEntityChips({ refs, onRemove }) {
  if (!refs?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-4 pt-3">
      {refs.map((ref) => (
        <div
          key={ref.id}
          className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5 text-xs max-w-[220px]"
        >
          <KindIcon kind={ref.type} />
          <span className="truncate">{ref.title}</span>
          <button
            type="button"
            onClick={() => onRemove(ref.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function SpaceItemPicker({ spaceId, selectedIds = [], onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useSpaceItemSearch(spaceId, search, open && !!spaceId);
  const selectedSet = new Set(selectedIds);

  const handleSelect = (item) => {
    if (selectedSet.has(item._id)) return;
    onSelect?.({
      type: item.kind,
      id: item._id,
      title: item.title,
      url: item.url,
      board_id: item.board_id,
      board_name: item.board_name,
      status: item.status,
    });
    setOpen(false);
    setSearch('');
  };

  if (!spaceId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          title="Share task or story"
        >
          <Link2 size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="p-3 border-b">
          <p className="text-sm font-medium mb-2">Share task or story</p>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks & stories..."
              className="pl-8 h-9"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[240px] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Searching...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              {search ? 'No tasks or stories found' : 'Type to search space items'}
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item._id}
                type="button"
                disabled={selectedSet.has(item._id)}
                onClick={() => handleSelect(item)}
                className={cn(
                  'w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted transition-colors',
                  selectedSet.has(item._id) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <KindIcon kind={item.kind} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground capitalize">{item.kind}</span>
                    {item.status && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{item.status}</span>
                      </>
                    )}
                    {item.board_name && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground truncate">{item.board_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
