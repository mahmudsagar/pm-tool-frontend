import useAuthStore from '@/stores/useAuthStore';

/** The signed-in user's id, for code paths outside React render. */
export function getCurrentUserId(): string | null {
  return useAuthStore.getState().user?._id ?? null;
}
