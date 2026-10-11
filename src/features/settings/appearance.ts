import { useEffect } from 'react';
import useAuthStore from '@/stores/useAuthStore';
import type { UserPreferences } from './queries';

const STORAGE_KEY = 'appearance';

export const ACCENTS: { value: NonNullable<UserPreferences['accent']>; label: string; swatch: string }[] = [
  { value: 'indigo', label: 'Indigo', swatch: '#6366f1' },
  { value: 'emerald', label: 'Emerald', swatch: '#10b981' },
  { value: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { value: 'cyan', label: 'Cyan', swatch: '#06b6d4' },
  { value: 'amber', label: 'Amber', swatch: '#f59e0b' },
  { value: 'slate', label: 'Slate', swatch: '#64748b' },
];

function readLocal(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Applies accent and density to <html> and remembers them for the next load. */
export function applyAppearance(prefs: UserPreferences) {
  const root = document.documentElement;
  if (prefs.accent && prefs.accent !== 'indigo') root.dataset.accent = prefs.accent;
  else delete root.dataset.accent;
  if (prefs.density === 'compact') root.dataset.density = 'compact';
  else delete root.dataset.density;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable; the server copy still applies on next sign-in.
  }
}

/** Keeps the document in sync with the signed-in user's saved appearance. */
export function useAppearanceSync() {
  const prefs = useAuthStore((s) => (s.user as { preferences?: UserPreferences } | null)?.preferences);
  useEffect(() => {
    applyAppearance({ ...readLocal(), ...(prefs ?? {}) });
  }, [prefs]);
}
