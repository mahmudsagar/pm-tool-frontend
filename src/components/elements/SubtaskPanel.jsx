import { useState } from 'react';
import { Plus, Circle, ListTodo, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from '@/BetterRouter/Link';
import { useCreateSubtask } from '@/hooks/mutations/useBoardsMutations';
import { useToast } from '@/components/ui/use-toast';

/**
 * Reusable subtask panel — shows existing subtasks and an inline create form.
 *
 * Props:
 *   parentTaskId  — the _id of the parent page/task
 *   boardId       — the board this task belongs to (needed for cache updates)
 *   subtasks      — array of subtask objects (from server or optimistic cache)
 *   onCreated     — optional callback(newSubtask) after creation
 */
export default function SubtaskPanel({ parentTaskId, boardId, subtasks = [], onCreated, boardFields = [] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const createSubtask = useCreateSubtask();
  const { toast } = useToast();

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed || !parentTaskId || !boardId) return;
    try {
      const userId = (() => {
        try {
          const u = JSON.parse(localStorage.getItem('user') || '{}');
          return u._id || u.id || localStorage.getItem('userId') || '';
        } catch { return localStorage.getItem('userId') || ''; }
      })();

      await createSubtask.mutateAsync({
        boardId,
        parentTaskId,
        taskData: {
          user_id: userId,
          title: trimmed,
          page_type: 'document',
          entity_type: 'page',
          content: { text: '' },
          summary: '',
          last_updated_by: userId,
          custom_meta: { fields: boardFields, values: {} },
          board_id: boardId,
          shared_members: [],
          shared_teams: [],
          attachments: [],
        },
      });
      setTitle('');
      setAdding(false);
      onCreated?.();
    } catch {
      // error toast already handled in mutation
    }
  };

  return (
    <div className="mt-6 border rounded-lg bg-muted/20">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none hover:bg-muted/40 rounded-t-lg transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        {collapsed
          ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Subtasks</span>
        <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {subtasks.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(false);
            setAdding(true);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="divide-y border-t">
          {subtasks.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground px-4 py-3">
              No subtasks yet.{' '}
              <button
                className="underline hover:text-foreground transition-colors"
                onClick={() => setAdding(true)}
              >
                Add one
              </button>
            </p>
          )}

          {subtasks.map(sub => (
            <Link key={sub._id || sub.id} to={`/document/${sub._id || sub.id}`} target="_sidebar">
              <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <Circle className="h-3 w-3 shrink-0 text-blue-400 fill-blue-400" />
                <span className="text-sm truncate">{sub.title || 'Untitled Subtask'}</span>
              </div>
            </Link>
          ))}

          {adding && (
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Subtask title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setAdding(false); setTitle(''); }
                }}
                className="h-7 text-sm flex-1"
              />
              <Button size="sm" className="h-7 px-3 text-xs" onClick={handleCreate} disabled={!title.trim() || createSubtask.isPending}>
                Save
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setAdding(false); setTitle(''); }}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
