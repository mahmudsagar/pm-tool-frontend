import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import { useCreateDialog } from '@/features/create/createDialogStore';
import { useCommandPalette } from '@/features/search/commandPaletteStore';
import type { CreatableKind } from '@/features/create/useCreateResource';

export const useShortcutsDialog = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

/** Second key after "C" → resource to create. Avoids browser-reserved chords like ⌘W/⌘T. */
const CREATE_KEYS: Record<string, CreatableKind> = {
  d: 'document',
  s: 'sheet',
  w: 'whiteboard',
  p: 'scrum',
  b: 'board',
  f: 'folder',
};

/** Second key after "G" → route. */
const GO_KEYS: Record<string, string> = {
  h: '/',
  i: '/notifications',
  m: '/chat',
  s: '/settings',
};

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

/** Two-key sequences (C then D, G then H) and "?" for the shortcut sheet. */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const showCreate = useCreateDialog((s) => s.show);
  const setOpen = useShortcutsDialog((s) => s.setOpen);

  useEffect(() => {
    let leader: 'c' | 'g' | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      // Ignore keys while any dialog or menu is open.
      if (document.querySelector('[role="dialog"], [role="menu"]') || useCommandPalette.getState().open) return;
      const key = e.key.toLowerCase();

      if (leader) {
        const target = leader === 'c' ? CREATE_KEYS[key] : GO_KEYS[key];
        const wasCreate = leader === 'c';
        leader = null;
        clearTimeout(timer);
        if (!target) return;
        e.preventDefault();
        if (wasCreate) showCreate({ kind: target as CreatableKind });
        else navigate(target);
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setOpen(true);
      } else if (key === 'c' || key === 'g') {
        leader = key;
        timer = setTimeout(() => (leader = null), 1200);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [navigate, showCreate, setOpen]);
}

