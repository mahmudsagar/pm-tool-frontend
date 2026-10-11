import { createContext, useContext } from 'react';
import type { User } from '@/types/models';
import type { BoardField, FieldMap, RawBoard, StatusOption, Task } from './model';
import type { NewTask, TaskUpdate, usePatchBoard } from './queries';
import type { DataboardView } from './view';

export interface BoardContextValue {
  board: RawBoard;
  fields: BoardField[];
  map: FieldMap;
  statuses: StatusOption[];
  tasks: Task[];
  taskById: Map<string, Task>;
  /** People who can be assigned (respects the board's sharing). */
  assignable: User[];
  member: (id: string) => User | undefined;
  memberName: (id: string) => string;
  view: DataboardView;
  setView: (next: Partial<DataboardView> | ((prev: DataboardView) => DataboardView)) => void;
  labelRegistry: Record<string, { name: string; color: string }>;
  /** Edit one task's field values (runs board automations). */
  setValues: (task: Task, values: Record<string, unknown>) => void;
  /** Raw multi-task update (reorder, bulk edit). */
  updateMany: (updates: TaskUpdate[]) => void;
  remove: (ids: string[]) => void;
  create: (task: NewTask) => Promise<unknown>;
  patchBoard: ReturnType<typeof usePatchBoard>['mutate'];
  /** Opens the task in the side panel, or as a full page. */
  openTask: (id: string, full?: boolean) => void;
  readOnly: boolean;
}

export const BoardCtx = createContext<BoardContextValue | null>(null);

export function useBoard() {
  const value = useContext(BoardCtx);
  if (!value) throw new Error('useBoard must be used inside <BoardProvider>');
  return value;
}

