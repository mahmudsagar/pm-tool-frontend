import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, ExternalLink, Hash, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/feedback/ErrorState';
import NotFound from '@/BetterRouter/NotFound';
import AutomationsPanelJs from '@/components/elements/dataView/AutomationsPanel';
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';
import useDialog from '@/hooks/useDialog';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useRecordView } from '@/features/library/queries';
import { BoardProvider } from '@/features/board/BoardContext';
import { useBoard } from '@/features/board/boardContext';
import { useBoardData, useBoardView } from '@/features/board/queries';
import { filterTasks, sortTasks } from '@/features/board/view';
import { AssigneeFilter, ColumnsMenu, FilterMenu, GroupMenu, SearchBox, SortMenu, ViewTabs } from '@/features/board/components/toolbar';
import { NewTaskDialog } from './NewTaskDialog';
import { TableView } from './views/TableView';
import { useTableColumns } from './views/columns';
import { KanbanView } from './views/KanbanView';
import { CalendarView } from './views/CalendarView';
import { TimelineView } from './views/TimelineView';

type TopMenu = { inlineContent?: React.ReactNode; dropdownContent?: React.ReactNode };

const AutomationsPanel = AutomationsPanelJs as unknown as React.ComponentType<{
  automations: Record<string, unknown> | null | undefined;
  fields: { name: string; label: string }[];
  assigneeOptions: { label: string; value: string }[];
  onChange: (next: Record<string, unknown>) => void;
  onSave: (next: Record<string, unknown>) => void;
}>;

/* ------------------------------------------------------------- header */

function InlineName() {
  const { board, patchBoard } = useBoard();
  const [draft, setDraft] = useState(board.name);
  const [editing, setEditing] = useState(false);
  const shown = editing ? draft : board.name;
  return (
    <input
      value={shown}
      aria-label="Board name"
      maxLength={120}
      onFocus={() => {
        setDraft(board.name);
        setEditing(true);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const next = draft.trim();
        if (next && next !== board.name) patchBoard({ name: next });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(board.name);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="-ml-1.5 w-full min-w-0 truncate rounded-md bg-transparent px-1.5 text-xl font-semibold tracking-tight text-foreground outline-none hover:bg-accent/60 focus:bg-accent sm:text-2xl"
    />
  );
}

function KeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { board, patchBoard } = useBoard();
  const [value, setValue] = useState(board.key ?? '');
  const valid = /^[A-Z][A-Z0-9]{1,5}$/.test(value);
  return (
    <Dialog open={open} onOpenChange={(o) => (o && setValue(board.key ?? ''), onOpenChange(o))}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Task key prefix</DialogTitle>
          <DialogDescription>Shown before every task number, like {value || 'ENG'}-42. Numbers stay the same when you change it.</DialogDescription>
        </DialogHeader>
        <Input value={value} onChange={(e) => setValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} aria-label="Key prefix" className="font-mono" autoFocus />
        <p className={cn('text-2xs', valid || !value ? 'text-muted-foreground' : 'text-danger-foreground')}>2–6 letters or digits, starting with a letter.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || value === board.key}
            onClick={() => {
              patchBoard({ key: value });
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- body */

function BoardBody({ peek, setTopMenu, path }: { peek: boolean; setTopMenu?: (m: TopMenu) => void; path: string }) {
  const ctx = useBoard();
  const { board, tasks, view, setView, statuses, map, assignable, patchBoard } = ctx;
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [automations, setAutomations] = useState<Record<string, unknown> | null | undefined>(board.automations);
  const columns = useTableColumns();
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };
  const deleteBoard = useDeleteEntity();

  const statusOrder = useMemo(() => new Map(statuses.flatMap((s, i) => [[s.value, i] as const, [s.label, i] as const])), [statuses]);
  const visible = useMemo(() => sortTasks(filterTasks(tasks, view, search), view.sort, statusOrder), [tasks, view, search, statusOrder]);

  const refs = useRef({ confirm, deleteBoard, navigate });
  refs.current = { confirm, deleteBoard, navigate };
  useEffect(() => {
    setTopMenu?.({
      dropdownContent: (
        <>
          <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(`${window.location.origin}${path}`)}>
            <Copy /> Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(path, '_blank', 'noopener')}>
            <ExternalLink /> Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setKeyOpen(true)}>
            <Hash /> Task key prefix
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger-foreground focus:text-danger-foreground"
            onSelect={() =>
              setTimeout(() => {
                const { confirm: ask, deleteBoard: del, navigate: go } = refs.current;
                ask({
                  title: `Delete “${board.name}”?`,
                  description: 'The board and its tasks move to trash. You can restore them from there.',
                  confirmLabel: 'Delete board',
                  onConfirm: async () => {
                    await (del.mutateAsync as (v: unknown) => Promise<unknown>)({ entityType: 'board', entityId: board._id });
                    go('/');
                  },
                });
              }, 120)
            }
          >
            <Trash2 /> Delete board
          </DropdownMenuItem>
        </>
      ),
    });
  }, [setTopMenu, path, board._id, board.name]);

  const kanbanSwimlanes = [
    { value: 'none' as const, label: 'None' },
    ...(map.epic ? [{ value: 'epic' as const, label: 'Epic' }] : []),
    { value: 'assignee' as const, label: 'Assignee' },
    { value: 'priority' as const, label: 'Priority' },
  ];

  return (
    <div className={cn('flex min-h-0 flex-col gap-4', peek ? 'h-full p-4' : 'mx-auto h-[calc(100dvh-3.5rem)] w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8')}>
      {!peek && (
        <header className="flex flex-wrap items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
            <LayoutGrid className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-2xs text-subtle">
              <span className="font-medium uppercase tracking-wider">Databoard</span>
              {board.key && (
                <button type="button" onClick={() => setKeyOpen(true)} className="rounded border border-border bg-muted/50 px-1.5 font-mono text-muted-foreground hover:text-foreground" title="Change the task key prefix">
                  {board.key}
                </button>
              )}
            </div>
            <InlineName />
            {board.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{board.description}</p>}
          </div>
        </header>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ViewTabs count={visible.length} />
          <div className="ml-auto flex items-center gap-2">
            <AutomationsPanel
              automations={automations}
              fields={ctx.fields.map((f) => ({ name: f.name, label: f.label }))}
              assigneeOptions={assignable.map((m) => ({ label: m.name || m.email || m._id, value: m._id }))}
              onChange={setAutomations}
              onSave={(next) => {
                setAutomations(next);
                patchBoard({ automations: next });
              }}
            />
            <Button size="xs" variant="brand" onClick={() => setNewOpen(true)}>
              <Plus /> New task
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder={`Search ${tasks.length} tasks…`} />
          {view.view === 'table' && (
            <>
              <GroupMenu value={view.group_by} onChange={(v) => setView({ group_by: v })} />
              <SortMenu />
            </>
          )}
          {view.view === 'kanban' && (
            <>
              <GroupMenu value={view.kanban.group_by} allowNone={false} onChange={(v) => setView({ kanban: { ...view.kanban, group_by: v } })} />
              <SegmentedControl
                size="sm"
                aria-label="Swimlanes"
                value={view.kanban.swimlane}
                onValueChange={(v) => setView({ kanban: { ...view.kanban, swimlane: v } })}
                options={kanbanSwimlanes}
              />
            </>
          )}
          <FilterMenu />
          <AssigneeFilter />
          {view.view === 'table' && <ColumnsMenu columns={columns} />}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
          <LayoutGrid className="mb-3 size-8 text-subtle" />
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">Create the first task, or add one straight into a column or group once there are some.</p>
          <Button className="mt-4" size="sm" variant="brand" onClick={() => setNewOpen(true)}>
            <Plus /> New task
          </Button>
        </div>
      ) : view.view === 'table' ? (
        <TableView tasks={visible} columns={columns} />
      ) : view.view === 'kanban' ? (
        <KanbanView tasks={visible} />
      ) : view.view === 'calendar' ? (
        <CalendarView tasks={visible} />
      ) : (
        <TimelineView tasks={visible} />
      )}

      <NewTaskDialog open={newOpen} onOpenChange={setNewOpen} />
      <KeyDialog open={keyOpen} onOpenChange={setKeyOpen} />
    </div>
  );
}

/* ---------------------------------------------------------------- page */

interface BoardPageProps {
  id?: string;
  peek?: boolean;
  peekPath?: string;
  setTopMenu?: (menu: TopMenu) => void;
}

export default function BoardPage({ id: propId, peek = false, peekPath, setTopMenu }: BoardPageProps) {
  const params = useParams();
  const boardId = propId ?? params.id ?? '';
  const { derived, isPending, error, refetch } = useBoardData(boardId);
  const [view, setView] = useBoardView(derived?.board);
  useRecordView('board', boardId);

  if (isPending) {
    return (
      <div className={cn('space-y-4', peek ? 'p-4' : 'mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8')}>
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-64" />
          </div>
        </div>
        <Skeleton className="h-8 w-full max-w-xl" />
        <Skeleton className="h-[60vh] w-full rounded-xl" />
      </div>
    );
  }
  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFound />;
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!derived) return <NotFound />;

  return (
    <BoardProvider board={derived.board} fields={derived.fields} map={derived.map} statuses={derived.statuses} tasks={derived.tasks} view={view} setView={setView}>
      <BoardBody peek={peek} setTopMenu={setTopMenu} path={peekPath ?? `/board/${boardId}`} />
    </BoardProvider>
  );
}
