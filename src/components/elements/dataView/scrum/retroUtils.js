import { getCurrentUserId } from '@/lib/currentUser';
export function normalizeSprintKey(sprint) {
  return String(sprint || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function resolveCurrentUserId() {
  return getCurrentUserId();
}
