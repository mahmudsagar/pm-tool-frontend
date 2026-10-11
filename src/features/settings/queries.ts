import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/api/client';
import useAuthStore from '@/stores/useAuthStore';
import { useToast } from '@/components/ui/use-toast';
import type { User, Workspace } from '@/types/models';

/** Extra user fields edited in Profile settings. */
export interface UserPreferences {
  accent?: 'indigo' | 'emerald' | 'violet' | 'cyan' | 'amber' | 'slate';
  density?: 'compact' | 'comfortable';
}

export interface NotificationPrefs {
  mentions?: boolean;
  assignments?: boolean;
  updates?: boolean;
  digest?: 'daily' | 'instant' | 'off';
  snooze_until?: string | null;
}

export interface ProfileUser extends User {
  handle?: string;
  title?: string;
  pronouns?: string;
  timezone?: string;
  preferences?: UserPreferences;
  notification_prefs?: NotificationPrefs;
  last_seen_at?: string;
}

export type WorkspaceRoleName = 'owner' | 'admin' | 'member' | 'guest';

export interface WorkspaceSettings extends Workspace {
  description?: string;
  logo?: string;
  timezone?: string;
  date_format?: string;
  first_day_of_week?: string;
  working_days?: string[];
  slug?: string;
  language?: string;
  sprint_cadence?: '1w' | '2w' | '3w' | '4w' | 'monthly';
  issue_prefix?: string;
  features?: { sheets?: boolean; whiteboards?: boolean; databoards?: boolean; scrum?: boolean; chat?: boolean };
  auto_archive_days?: number;
  space_policies?: { allow_member_public_create?: boolean; default_space_id?: string | null };
  archived_at?: string | null;
}

export interface WorkspaceMember extends ProfileUser {
  workspace_role: WorkspaceRoleName;
  status?: 'active' | 'suspended';
  space_ids?: string[];
  joined_at?: string;
}

export interface Invitation {
  _id: string;
  email: string;
  role: Exclude<WorkspaceRoleName, 'owner'>;
  space_ids: string[];
  invited_by?: { _id: string; name?: string; email?: string };
  created_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  token?: string;
}

export interface InviteResult {
  email: string;
  outcome: 'added' | 'invited' | 'skipped';
  reason?: string;
  invitation?: Pick<Invitation, '_id' | 'token' | 'expires_at'>;
}

const useWorkspaceId = () => useAuthStore((s) => s.currentWorkspace?._id ?? '');

export const settingsKeys = {
  workspace: (id: string) => ['settings', 'workspace', id] as const,
  members: (id: string) => ['workspace-members', 'detailed', id] as const,
  invitations: (id: string) => ['settings', 'invitations', id] as const,
};

/** True when the current user can change workspace-level settings. */
export function useIsWorkspaceAdmin() {
  const workspace = useAuthStore((s) => s.currentWorkspace);
  const userId = useAuthStore((s) => s.user?._id);
  const { data: members } = useWorkspaceMembersDetailed();
  if (workspace?.role === 'owner' || workspace?.owner_id === userId) return true;
  return members?.some((m) => m._id === userId && m.workspace_role === 'admin') ?? false;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

// ── Profile ──────────────────────────────────────────────────────────────────

export function useUpdateProfile() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: Partial<ProfileUser>) => http.put<ProfileUser>('/v1/user', data),
    onSuccess: (user, variables) => {
      const current = useAuthStore.getState().user;
      useAuthStore.getState().setUser({ ...(current ?? {}), ...variables, ...(user ?? {}) } as User);
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not save profile', description: errorText(error) }),
  });
}

export function useChangePassword() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) => http.put('/v1/user/password', data),
    onSuccess: () => toast({ variant: 'success', title: 'Password updated' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not change password', description: errorText(error) }),
  });
}

export async function checkHandleAvailable(handle: string) {
  const result = await http.get<{ available: boolean }>('/v1/user/handle', { query: { handle } });
  return result?.available ?? false;
}

// ── Workspace ────────────────────────────────────────────────────────────────

export function useWorkspaceSettings() {
  const id = useWorkspaceId();
  return useQuery({
    queryKey: settingsKeys.workspace(id),
    queryFn: () => http.get<WorkspaceSettings>('/v1/workspace', { query: { id } }),
    enabled: !!id,
  });
}

export function useUpdateWorkspace() {
  const id = useWorkspaceId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: Partial<WorkspaceSettings>) => http.put<WorkspaceSettings>('/v1/workspace', { _id: id, ...data }),
    onSuccess: (_result, variables) => {
      const { currentWorkspace, workspaces, setCurrentWorkspace, setWorkspaces } = useAuthStore.getState();
      if (currentWorkspace && variables.name) {
        setCurrentWorkspace({ ...currentWorkspace, name: variables.name });
        setWorkspaces(workspaces.map((w) => (w._id === currentWorkspace._id ? { ...w, name: variables.name as string } : w)));
      }
      toast({ variant: 'success', title: 'Workspace settings saved' });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not save workspace', description: errorText(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKeys.workspace(id) }),
  });
}

export async function checkSlugAvailable(slug: string) {
  const result = await http.get<{ available: boolean }>('/v1/workspace/slug', { query: { slug } });
  return result?.available ?? false;
}

export function useTransferOwnership() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (userId: string) => http.put('/v1/workspace/owner', { user_id: userId }),
    onSuccess: () => {
      const { currentWorkspace, setCurrentWorkspace } = useAuthStore.getState();
      // We are now an admin, not the owner. The next /v1/auth refresh confirms it.
      if (currentWorkspace) setCurrentWorkspace({ ...currentWorkspace, role: 'member' });
      toast({ variant: 'success', title: 'Ownership transferred' });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not transfer ownership', description: errorText(error) }),
  });
}

export function useArchiveWorkspace() {
  const id = useWorkspaceId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (archived: boolean) => http.put('/v1/workspace/archive', { archived }),
    onSuccess: (_d, archived) => toast({ variant: 'success', title: archived ? 'Workspace archived' : 'Workspace restored' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not update workspace', description: errorText(error) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKeys.workspace(id) }),
  });
}

export function useDeleteWorkspace() {
  const id = useWorkspaceId();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => http.delete('/v1/workspace', { query: { id } }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not delete workspace', description: errorText(error) }),
  });
}

// ── Members & invitations ────────────────────────────────────────────────────

export function useWorkspaceMembersDetailed() {
  const id = useWorkspaceId();
  return useQuery({
    queryKey: settingsKeys.members(id),
    queryFn: async () => {
      const data = await http.get<{ owner?: WorkspaceMember; members?: WorkspaceMember[] }>('/v1/workspace/member');
      const list: WorkspaceMember[] = [];
      if (data?.owner) list.push({ ...data.owner, workspace_role: 'owner' });
      for (const m of data?.members ?? []) list.push({ ...m, workspace_role: m.workspace_role ?? 'member' });
      return list;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

function useInvalidateMembers() {
  const id = useWorkspaceId();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(id) }),
      queryClient.invalidateQueries({ queryKey: settingsKeys.invitations(id) }),
      // Older hooks cache the member list under these keys.
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
    ]);
}

export function useUpdateMember() {
  const invalidate = useInvalidateMembers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { user_id: string; role?: Exclude<WorkspaceRoleName, 'owner'>; status?: 'active' | 'suspended' }) => http.put('/v1/workspace/member', data),
    onSuccess: (_d, v) => toast({ variant: 'success', title: v.status ? (v.status === 'suspended' ? 'Access suspended' : 'Access restored') : 'Role updated' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not update member', description: errorText(error) }),
    onSettled: invalidate,
  });
}

export function useBulkUpdateMembers() {
  const invalidate = useInvalidateMembers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { user_ids: string[]; role?: Exclude<WorkspaceRoleName, 'owner'>; status?: 'active' | 'suspended' }) =>
      http.put<{ updated: number }>('/v1/workspace/member/bulk', data),
    onSuccess: (result) => toast({ variant: 'success', title: `Updated ${result?.updated ?? 0} member${result?.updated === 1 ? '' : 's'}` }),
    onError: (error) => toast({ variant: 'destructive', title: 'Bulk update failed', description: errorText(error) }),
    onSettled: invalidate,
  });
}

export function useRemoveMember() {
  const id = useWorkspaceId();
  const invalidate = useInvalidateMembers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (userId: string) => http.delete('/v1/workspace/member', { query: { workspace_id: id, user_id: userId } }),
    onSuccess: () => toast({ title: 'Member removed' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not remove member', description: errorText(error) }),
    onSettled: invalidate,
  });
}

export function useInvitations(enabled = true) {
  const id = useWorkspaceId();
  return useQuery({
    queryKey: settingsKeys.invitations(id),
    queryFn: async () => (await http.get<Invitation[]>('/v1/workspace/invitation')) ?? [],
    enabled: !!id && enabled,
    retry: false,
  });
}

export function useInviteMembers() {
  const invalidate = useInvalidateMembers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { emails: string[]; role: Exclude<WorkspaceRoleName, 'owner'>; space_ids?: string[] }) =>
      http.post<{ results: InviteResult[] }>('/v1/workspace/invitation', data),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not send invitations', description: errorText(error) }),
    onSettled: invalidate,
  });
}

export function useResendInvitation() {
  const invalidate = useInvalidateMembers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => http.post<Invitation>('/v1/workspace/invitation/resend', { id }),
    onSuccess: () => toast({ variant: 'success', title: 'Invitation renewed', description: 'The invite link was refreshed for 14 more days.' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not renew invitation', description: errorText(error) }),
    onSettled: invalidate,
  });
}

export function useRevokeInvitation() {
  const invalidate = useInvalidateMembers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => http.delete('/v1/workspace/invitation', { query: { id } }),
    onSuccess: () => toast({ title: 'Invitation revoked' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not revoke invitation', description: errorText(error) }),
    onSettled: invalidate,
  });
}

export function inviteLink(token: string) {
  return `${window.location.origin}/invite/${token}`;
}
