import { useMemo } from 'react';
import { useBoard } from '@/features/board/boardContext';
import type { BoardField } from '@/features/board/model';
import type { ColumnDef } from '@/features/board/components/toolbar';

export interface Column extends ColumnDef {
  width: string;
  field?: BoardField;
}

const RESERVED = new Set(['title', 'description', 'depends_on', 'test_coverage_ref']);

export function useTableColumns(): Column[] {
  const { fields, map } = useBoard();
  return useMemo(() => {
    const cols: Column[] = [
      { id: 'name', label: 'Task name', locked: true, width: 'minmax(18rem, 2.4fr)' },
      { id: 'status', label: 'Status', width: '9.5rem' },
      { id: 'priority', label: 'Priority', width: '7.5rem' },
      { id: 'assignee', label: 'Assignee', width: '10rem' },
      { id: 'due', label: 'Due date', width: '9.5rem' },
    ];
    if (map.labels) cols.push({ id: 'labels', label: 'Tags', width: '11rem' });
    if (map.points) cols.push({ id: 'points', label: 'Story pts', width: '6rem' });
    if (map.estimate) cols.push({ id: 'estimate', label: 'Estimate', width: '6.5rem' });
    cols.push({ id: 'progress', label: 'Progress', width: '8rem' });
    const used = new Set(Object.values(map).filter(Boolean) as string[]);
    for (const f of fields) {
      if (used.has(f.name) || RESERVED.has(f.name) || f.type === 'dod_checklist' || f.name === 'progress') continue;
      cols.push({ id: `f:${f.name}`, label: f.label, width: '9rem', field: f });
    }
    return cols;
  }, [fields, map]);
}

