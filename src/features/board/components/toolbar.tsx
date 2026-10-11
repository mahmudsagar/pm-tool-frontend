import { forwardRef, useState } from 'react';
import {
  ArrowDownUp,
  CalendarDays,
  ChevronDown,
  Columns3,
  Filter,
  GanttChart,
  Layers,
  Plus,
  Search,
  SquareKanban,
  Table2,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/common/UserAvatar';
import useAuthStore from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { useBoard } from '../boardContext';
import { groupableFields, PRIORITY_LABEL, type BoardViewType, type FilterOp, type SortField, type ViewFilter } from '../view';

/* ------------------------------------------------------------- tabs */

const VIEW_TABS: { value: BoardViewType; label: string; icon: typeof Table2 }[] = [
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'kanban', label: 'Kanban', icon: SquareKanban },
  { value: 'timeline', label: 'Timeline', icon: GanttChart },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
];

export function ViewTabs({ count }: { count: number }) {
  const { view, setView } = useBoard();
  return (
    <div role="tablist" aria-label="Board views" className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
      {VIEW_TABS.map(({ value, label, icon: Icon }) => {
        const active = view.view === value;
        return (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setView({ view: value })}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active && 'bg-card text-foreground shadow-sm',
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
            {active && value === 'table' && <span className="rounded bg-muted px-1 font-mono text-2xs text-muted-foreground">{count}</span>}
            {active && value !== 'table' && <span className="size-1.5 rounded-full bg-brand" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- shared */

type ToolbarButtonProps = React.ComponentProps<typeof Button> & { icon: typeof Table2; label: string; value?: string; active?: boolean; count?: number };

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton({ icon: Icon, label, value, active, count, className, ...props }, ref) {
  return (
    <Button ref={ref} variant="outline" size="xs" className={cn('gap-1.5 font-normal', active && 'border-brand/40 text-foreground', className)} {...props}>
      <Icon className="text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      {value && <span className="font-medium text-brand">{value}</span>}
      {count ? <span className="flex size-4 items-center justify-center rounded-full bg-brand font-mono text-[10px] text-brand-foreground">{count}</span> : null}
      {value !== undefined && <ChevronDown className="text-subtle" />}
    </Button>
  );
});

/* ------------------------------------------------------------ group */

export function GroupMenu({ value, onChange, allowNone = true }: { value: string | null; onChange: (v: string | null) => void; allowNone?: boolean }) {
  const { fields, map } = useBoard();
  const options = groupableFields(fields, map);
  const current = options.find((o) => o.value === value)?.label ?? 'None';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton icon={Layers} label="Group:" value={current} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Group by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value ?? '__none'} onValueChange={(v) => onChange(v === '__none' ? null : v)}>
          {allowNone && <DropdownMenuRadioItem value="__none">None</DropdownMenuRadioItem>}
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------- sort */

const SORTS: { value: SortField; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'priority', label: 'Priority' },
  { value: 'due', label: 'Due date' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Name' },
  { value: 'points', label: 'Story points' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Last updated' },
];

export function SortMenu() {
  const { view, setView } = useBoard();
  const label = SORTS.find((s) => s.value === view.sort.field)?.label ?? 'Manual';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton icon={ArrowDownUp} label="Sort:" value={label} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={view.sort.field} onValueChange={(v) => setView({ sort: { ...view.sort, field: v as SortField } })}>
          {SORTS.map((s) => (
            <DropdownMenuRadioItem key={s.value} value={s.value}>
              {s.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {view.sort.field !== 'manual' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={view.sort.dir} onValueChange={(v) => setView({ sort: { ...view.sort, dir: v as 'asc' | 'desc' } })}>
              <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ----------------------------------------------------------- filter */

const OPS: { value: FilterOp; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

function useFilterFields() {
  const { fields, map, statuses, assignable } = useBoard();
  const base = [
    { value: 'status', label: 'Status', options: statuses.map((s) => ({ value: s.value, label: s.label })) },
    { value: 'priority', label: 'Priority', options: (Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] })) },
    { value: 'assignee', label: 'Assignee', options: assignable.map((m) => ({ value: m._id, label: m.name || m.email || m._id })) },
    { value: '__due', label: 'Due date', options: undefined },
    ...(map.labels ? [{ value: 'labels', label: 'Tags', options: undefined }] : []),
  ];
  const reserved = new Set([map.status, map.priority, map.assignee, map.labels, map.dates, map.checklist, 'depends_on', 'test_coverage_ref']);
  const custom = fields
    .filter((f) => !reserved.has(f.name) && !['daterange', 'date', 'dod_checklist'].includes(f.type))
    .map((f) => ({ value: f.name, label: f.label, options: f.options?.length ? f.options : undefined }));
  return [...base, ...custom];
}

export function FilterMenu() {
  const { view, setView } = useBoard();
  const fields = useFilterFields();
  const filters = view.filters;
  const set = (next: ViewFilter[]) => setView({ filters: next });
  const update = (i: number, patch: Partial<ViewFilter>) => set(filters.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton icon={Filter} label="Filter" count={filters.length} active={filters.length > 0} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(30rem,calc(100vw-2rem))] p-3">
        <p className="mb-2 text-xs font-medium text-foreground">Filters</p>
        {filters.length === 0 && <p className="mb-2 text-xs text-muted-foreground">No filters. Showing every task.</p>}
        <div className="space-y-2">
          {filters.map((f, i) => {
            const field = fields.find((x) => x.value === (f.op === 'overdue' ? '__due' : f.field)) ?? fields[0];
            const isDue = field.value === '__due';
            const ops = isDue ? [{ value: 'overdue' as FilterOp, label: 'is overdue' }, ...OPS.slice(3)] : OPS;
            const needsValue = !['is_empty', 'is_not_empty', 'overdue'].includes(f.op);
            return (
              <div key={i} className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
                <Select
                  value={field.value}
                  onValueChange={(v) => update(i, v === '__due' ? { field: '__due', op: 'overdue', value: '' } : { field: v, op: 'is', value: '' })}
                >
                  <SelectTrigger className="h-7 w-32 text-xs" aria-label="Filter field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((x) => (
                      <SelectItem key={x.value} value={x.value}>
                        {x.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={f.op} onValueChange={(v) => update(i, { op: v as FilterOp })}>
                  <SelectTrigger className="h-7 w-28 text-xs" aria-label="Filter condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ops.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {needsValue &&
                  (field.options && f.op !== 'contains' ? (
                    <Select value={f.value || undefined} onValueChange={(v) => update(i, { value: v })}>
                      <SelectTrigger className="h-7 min-w-0 flex-1 text-xs" aria-label="Filter value">
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={f.value ?? ''} onChange={(e) => update(i, { value: e.target.value })} placeholder="Value" aria-label="Filter value" className="h-7 min-w-0 flex-1 text-xs" />
                  ))}
                <Button variant="ghost" size="icon-xs" aria-label="Remove filter" onClick={() => set(filters.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="xs" onClick={() => set([...filters, { field: 'status', op: 'is', value: '' }])}>
            <Plus /> Add filter
          </Button>
          {filters.length > 0 && (
            <Button variant="ghost" size="xs" onClick={() => set([])}>
              Clear all
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* --------------------------------------------------------- assignee */

export function AssigneeFilter() {
  const { view, setView, assignable } = useBoard();
  const me = useAuthStore((s) => s.user?._id);
  const selected = new Set(view.assignees);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setView({ assignees: Array.from(next) });
  };
  const sorted = [...assignable].sort((a, b) => (a._id === me ? -1 : b._id === me ? 1 : (a.name ?? '').localeCompare(b.name ?? '')));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton icon={UserRound} label="Assignee" active={selected.size > 0} count={selected.size} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="max-h-72 overflow-y-auto">
          {sorted.map((m) => (
            <DropdownMenuCheckboxItem key={m._id} checked={selected.has(m._id)} onCheckedChange={() => toggle(m._id)} onSelect={(e) => e.preventDefault()}>
              <UserAvatar user={m} size="xs" /> <span className="truncate">{m._id === me ? 'Me' : m.name || m.email}</span>
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuCheckboxItem checked={selected.has('__none')} onCheckedChange={() => toggle('__none')} onSelect={(e) => e.preventDefault()}>
            <UserRound className="size-4 text-subtle" /> Unassigned
          </DropdownMenuCheckboxItem>
        </div>
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setView({ assignees: [] })}>Clear</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------------------------------------------------- columns */

export interface ColumnDef {
  id: string;
  label: string;
  /** Always shown (name column). */
  locked?: boolean;
}

/** Fields that can be added as columns from the Columns menu. */
const ADDABLE_FIELDS = [
  { name: 'labels', label: 'Tags', type: 'labels' },
  { name: 'story_points', label: 'Story points', type: 'number' },
  { name: 'estimate', label: 'Estimate', type: 'input' },
  { name: 'progress', label: 'Progress', type: 'number' },
] as const;

export function ColumnsMenu({ columns }: { columns: ColumnDef[] }) {
  const { view, setView, fields, map, board, patchBoard } = useBoard();
  const hidden = new Set(view.hidden_columns);
  const visible = columns.filter((c) => !hidden.has(c.id)).length;
  const missing = ADDABLE_FIELDS.filter((f) => {
    if (f.name === 'labels') return !map.labels;
    if (f.name === 'story_points') return !map.points;
    if (f.name === 'estimate') return !map.estimate;
    return !fields.some((x) => x.name === f.name);
  });
  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setView({ hidden_columns: Array.from(next) });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="xs" className="gap-1.5 font-normal">
          <Columns3 className="text-muted-foreground" />
          <span className="text-muted-foreground">Columns</span>
          <span className="font-mono text-2xs text-subtle">
            ({visible}/{columns.length})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <div className="max-h-72 overflow-y-auto">
          {columns.map((c) => (
            <DropdownMenuCheckboxItem key={c.id} disabled={c.locked} checked={!hidden.has(c.id)} onCheckedChange={() => toggle(c.id)} onSelect={(e) => e.preventDefault()}>
              {c.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        {missing.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Add a field</DropdownMenuLabel>
            {missing.map((f) => (
              <DropdownMenuItem
                key={f.name}
                onSelect={() =>
                  patchBoard({
                    custom_meta: {
                      ...(board.custom_meta ?? {}),
                      fields: [...fields, { name: f.name, label: f.label, type: f.type, hasOptions: false, initialized: true }],
                    },
                  })
                }
              >
                <Plus /> {f.label}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ----------------------------------------------------------- search */

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={cn('relative w-full sm:w-56', focused && 'sm:w-64')}>
      <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label="Search tasks"
        className="h-7 pl-7 text-xs transition-[width]"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

