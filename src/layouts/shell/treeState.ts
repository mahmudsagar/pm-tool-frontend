import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ShellState {
  /** Expanded nodes in the sidebar tree, by entity id (or section key). */
  expanded: Record<string, boolean>;
  toggle: (id: string, value?: boolean) => void;
  /** Desktop sidebar visibility (lg and up). Mobile always uses the drawer. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

export const useShellState = create<ShellState>()(
  persist(
    (set) => ({
      expanded: { 'section:private': true, 'section:team': true },
      toggle: (id, value) => set((s) => ({ expanded: { ...s.expanded, [id]: value ?? !s.expanded[id] } })),
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      mobileNavOpen: false,
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    {
      name: 'shell-state',
      partialize: (s) => ({ expanded: s.expanded, sidebarOpen: s.sidebarOpen }),
    },
  ),
);
