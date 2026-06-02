import { useState, useMemo, useRef } from 'react';
import {
  ArrowUpDown,
  Filter,
  Users,
  User,
  Search,
  Save,
  RotateCcw,
  X,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const FILTER_OPERATORS = [
  { value: 'is',           label: 'is' },
  { value: 'is_not',       label: 'is not' },
  { value: 'contains',     label: 'contains' },
  { value: 'is_empty',     label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const SELECT_TYPES = ['select', 'dynamic-select'];

function getOperatorsForType(type) {
  if (SELECT_TYPES.includes(type)) {
    return FILTER_OPERATORS.filter(op => ['is', 'is_not', 'is_empty', 'is_not_empty'].includes(op.value));
  }
  if (type === 'date') {
    return FILTER_OPERATORS.filter(op => ['is', 'is_not', 'is_empty', 'is_not_empty'].includes(op.value));
  }
  return FILTER_OPERATORS;
}

function FilterRow({ filter, fields, onUpdate, onRemove }) {
  const field = fields.find(f => f.name === filter.field);
  const operators = field ? getOperatorsForType(field.type) : FILTER_OPERATORS;
  const needsValue = !['is_empty', 'is_not_empty'].includes(filter.operator);
  const isSelectField = field && SELECT_TYPES.includes(field.type);
  const selectOptions = field?.props?.optionsData || [];

  return (
    <div className="flex items-center gap-1.5 p-1">
      <Select value={filter.field} onValueChange={val => onUpdate({ ...filter, field: val, value: '' })}>
        <SelectTrigger className="h-7 text-xs w-32">
          <SelectValue placeholder="Property" />
        </SelectTrigger>
        <SelectContent>
          {fields.map(f => (
            <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filter.operator} onValueChange={val => onUpdate({ ...filter, operator: val })}>
        <SelectTrigger className="h-7 text-xs w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map(op => (
            <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsValue && (
        isSelectField ? (
          <Select value={filter.value || ''} onValueChange={val => onUpdate({ ...filter, value: val })}>
            <SelectTrigger className="h-7 text-xs w-32">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map(opt => (
                <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-7 text-xs w-28"
            value={filter.value || ''}
            onChange={e => onUpdate({ ...filter, value: e.target.value })}
            placeholder="Value…"
          />
        )
      )}

      <button onClick={onRemove} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function BoardSubheaderControls({
  fields,             // property_name array from boardTasks
  assigneeOptions,    // { label, value }[]  — always required
  currentUserId,      // string | null
  viewState,          // { sorts, filters, search }
  savedView,          // boardData.saved_view (last persisted)
  onChange,           // (viewState) => void
  onSave,             // () => void
  onReset,            // () => void
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  const { sorts = [], filters = [], search = '' } = viewState;

  // Derive assignee field name — first dynamic-select or field named 'assignee'
  const assigneeFieldName = useMemo(() => {
    const f = fields.find(fld => fld.type === 'dynamic-select' || fld.name === 'assignee');
    return f?.name ?? 'assignee';
  }, [fields]);

  const sortableFields   = useMemo(() => fields.filter(f => f.name !== 'task_id'), [fields]);
  const filterableFields = useMemo(() => fields.filter(f => f.name !== 'task_id'), [fields]);

  const isMyTasks = !!(currentUserId && filters.some(
    f => f.field === assigneeFieldName && f.operator === 'is' && f.value === currentUserId
  ));

  const assigneeActiveCount = filters.filter(
    f => f.field === assigneeFieldName && f.operator === 'is'
  ).length;

  // Treat only sort/filter/search as the "view" — layout tab order is separate and saves on its own.
  const viewCore = (v) =>
    !v
      ? { sorts: [], filters: [], search: '' }
      : {
          sorts: v.sorts ?? [],
          filters: v.filters ?? [],
          search: v.search ?? '',
        };
  const viewIsDirty =
    JSON.stringify(viewCore(viewState)) !== JSON.stringify(viewCore(savedView ?? { sorts: [], filters: [], search: '' }));

  // ── helpers ──────────────────────────────────────────────────────
  function addSort() {
    const first = sortableFields[0];
    if (!first) return;
    onChange({ ...viewState, sorts: [...sorts, { field: first.name, direction: 'asc' }] });
  }
  function updateSort(idx, patch) {
    onChange({ ...viewState, sorts: sorts.map((s, i) => i === idx ? { ...s, ...patch } : s) });
  }
  function removeSort(idx) {
    onChange({ ...viewState, sorts: sorts.filter((_, i) => i !== idx) });
  }

  function addFilter() {
    const first = filterableFields[0];
    if (!first) return;
    onChange({ ...viewState, filters: [...filters, { field: first.name, operator: 'is', value: '' }] });
  }
  function updateFilter(idx, patch) {
    onChange({ ...viewState, filters: filters.map((f, i) => i === idx ? { ...f, ...patch } : f) });
  }
  function removeFilter(idx) {
    onChange({ ...viewState, filters: filters.filter((_, i) => i !== idx) });
  }

  function toggleMyTasks() {
    if (!currentUserId) return;
    if (isMyTasks) {
      onChange({
        ...viewState,
        filters: filters.filter(f => !(f.field === assigneeFieldName && f.value === currentUserId)),
      });
    } else {
      onChange({
        ...viewState,
        filters: [...filters, { field: assigneeFieldName, operator: 'is', value: currentUserId }],
      });
    }
  }

  function toggleAssigneeUser(userId) {
    const has = filters.some(f => f.field === assigneeFieldName && f.operator === 'is' && f.value === userId);
    if (has) {
      onChange({ ...viewState, filters: filters.filter(f => !(f.field === assigneeFieldName && f.value === userId)) });
    } else {
      onChange({ ...viewState, filters: [...filters, { field: assigneeFieldName, operator: 'is', value: userId }] });
    }
  }

  // ── render ───────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-1">

      {/* ── SORT ─────────────────────────── */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm"
            className={`h-7 px-2 text-xs gap-1 ${sorts.length ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort
            {sorts.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{sorts.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto min-w-[320px] p-2">
          <p className="text-xs font-medium text-muted-foreground px-1 pb-1">Sort by</p>
          {sorts.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-2">No sorts applied.</p>
          )}
          {sorts.map((sort, idx) => (
            <div key={idx} className="flex items-center gap-1.5 p-1">
              <Select value={sort.field} onValueChange={val => updateSort(idx, { field: val })}>
                <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sortableFields.map(f => (
                    <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort.direction} onValueChange={val => updateSort(idx, { direction: val })}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc" className="text-xs">Ascending</SelectItem>
                  <SelectItem value="desc" className="text-xs">Descending</SelectItem>
                </SelectContent>
              </Select>
              <button onClick={() => removeSort(idx)} className="p-0.5 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs w-full justify-start gap-1" onClick={addSort}>
            <Plus className="h-3.5 w-3.5" /> Add sort
          </Button>
        </PopoverContent>
      </Popover>

      {/* ── FILTER ───────────────────────── */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm"
            className={`h-7 px-2 text-xs gap-1 ${filters.length ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {filters.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{filters.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto min-w-[360px] p-2">
          <p className="text-xs font-medium text-muted-foreground px-1 pb-1">Filters</p>
          {filters.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-2">No filters applied.</p>
          )}
          {filters.map((filter, idx) => (
            <FilterRow
              key={idx}
              filter={filter}
              fields={filterableFields}
              onUpdate={patch => updateFilter(idx, patch)}
              onRemove={() => removeFilter(idx)}
            />
          ))}
          <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs w-full justify-start gap-1" onClick={addFilter}>
            <Plus className="h-3.5 w-3.5" /> Add filter
          </Button>
        </PopoverContent>
      </Popover>

      {/* ── ASSIGNEE FILTER ──────────────── always visible */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm"
            className={`h-7 px-2 text-xs gap-1 ${assigneeActiveCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Users className="h-3.5 w-3.5" />
            Assignee
            {assigneeActiveCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{assigneeActiveCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Filter by assignee</p>
          {assigneeOptions.filter(opt => String(opt.value) !== currentUserId).length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">No other members on this board.</p>
          )}
          {assigneeOptions.filter(opt => String(opt.value) !== currentUserId).map(opt => {
            const active = filters.some(
              f => f.field === assigneeFieldName && f.operator === 'is' && f.value === String(opt.value)
            );
            return (
              <button
                key={opt.value}
                onClick={() => toggleAssigneeUser(String(opt.value))}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-accent rounded-sm text-left"
              >
                {active
                  ? <Check className="h-3 w-3 text-primary shrink-0" />
                  : <span className="h-3 w-3 shrink-0" />}
                {opt.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* ── MY TASKS ─────────────────────── always visible when signed in */}
      {currentUserId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMyTasks}
          className={`h-7 px-2 text-xs gap-1 ${isMyTasks ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
        >
          <User className="h-3.5 w-3.5" />
          My tasks
        </Button>
      )}

      {/* ── SEARCH ───────────────────────── */}
      {searchOpen ? (
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            className="h-7 text-xs w-44"
            placeholder="Search tasks…"
            value={search}
            onChange={e => onChange({ ...viewState, search: e.target.value })}
          />
          <button
            onClick={() => { onChange({ ...viewState, search: '' }); setSearchOpen(false); }}
            className="p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className={`h-7 px-2 text-xs gap-1 ${search ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Search className="h-3.5 w-3.5" />
          {search ? <span className="max-w-[64px] truncate">{search}</span> : 'Search'}
        </Button>
      )}

      {/* ── SAVE / RESET ─────────────────── */}
      {viewIsDirty && (
        <>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-primary"
          >
            <Save className="h-3.5 w-3.5" />
            Save view
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </>
      )}

      {/* ── CLEAR ALL ────────────────────── */}
      {(filters.length > 0 || sorts.length > 0 || search) && (
        <button
          onClick={() => onChange({ ...viewState, sorts: [], filters: [], search: '' })}
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-0.5"
        >
          <X className="h-3 w-3" /> Clear all
        </button>
      )}
    </div>
  );
}
