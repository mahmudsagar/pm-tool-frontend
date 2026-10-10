import { useMemo } from 'react';
import { useWorkspaceMembers } from '@/hooks/queries/useSpacesQueries';
import useAuthStore from '@/stores/useAuthStore';
import { ensureArray } from '@/utils/helper';
import type { User } from '@/types/models';

/** Workspace members indexed by id, including the current user. */
export function useMemberDirectory() {
  const me = useAuthStore((s) => s.user);
  const { data, isPending } = useWorkspaceMembers();
  const byId = useMemo(() => {
    const map = new Map<string, User>();
    for (const member of ensureArray(data) as User[]) map.set(member._id, member);
    if (me) map.set(me._id, { ...map.get(me._id), ...me });
    return map;
  }, [data, me]);
  return { byId, members: Array.from(byId.values()), isPending };
}

/** Short display name: "Alex R." */
export function shortName(user?: Pick<User, 'name' | 'email'> | null) {
  if (!user) return 'Unknown';
  const parts = (user.name || user.email || '').trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || 'Unknown';
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
