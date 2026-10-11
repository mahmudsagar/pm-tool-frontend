import { createContext, useContext } from 'react';
import type { Task } from '@/features/board/model';
import type { Analytics, Sprint } from './api';
import type { sprintWindow } from './analytics';

export type ScrumTab = 'board' | 'backlog' | 'burndown' | 'capacity' | 'scope' | 'cfd';

export interface ScrumContextValue {
  sprints: Sprint[];
  /** The sprint the studios are looking at (defaults to the active one). */
  sprint: Sprint | null;
  activeSprint: Sprint | null;
  setSprintId: (id: string) => void;
  /** Top-level tasks in the selected sprint. */
  sprintTasks: Task[];
  /** Top-level tasks in no sprint. */
  backlog: Task[];
  window: ReturnType<typeof sprintWindow>;
  analytics: Analytics | undefined;
  analyticsLoading: boolean;
  /** Board members who have work or capacity in this sprint. */
  team: string[];
  tab: ScrumTab;
  setTab: (tab: ScrumTab) => void;
  openNewTask: (values?: Record<string, unknown>) => void;
  openComplete: () => void;
  openStart: (sprint: Sprint) => void;
}

export const ScrumCtx = createContext<ScrumContextValue | null>(null);

export function useScrum() {
  const value = useContext(ScrumCtx);
  if (!value) throw new Error('useScrum must be used inside the scrum page');
  return value;
}
