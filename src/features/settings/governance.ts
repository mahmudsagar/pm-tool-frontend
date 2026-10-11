import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, ApiError, extractMessages, http } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import useAuthStore from '@/stores/useAuthStore';

const useWs = () => useAuthStore((s) => s.currentWorkspace?._id ?? '');
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/* ---------------------------------------------------------------- audit */

export interface AuditEntry {
  _id: string;
  action: string;
  actor_id?: string | null;
  actor?: { _id: string; name?: string; email?: string; avatar?: string } | null;
  target_type?: string | null;
  target_id?: string | null;
  target_name?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  user_agent?: string | null;
  createdAt: string;
}

export interface AuditFilters {
  action?: string;
  actor_id?: string;
  from?: string;
  to?: string;
  q?: string;
}

export function useAuditLog(filters: AuditFilters, enabled: boolean) {
  const ws = useWs();
  return useInfiniteQuery({
    queryKey: ['audit', ws, filters],
    enabled: enabled && !!ws,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => http.get<{ entries: AuditEntry[]; next_cursor: string | null }>('/v1/workspace/audit', { query: { ...filters, cursor: pageParam, limit: 50 } }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}

/** Authenticated file download (CSV / JSON exports). */
export async function downloadFile(path: string, query: Record<string, string | undefined>, fallbackName: string) {
  const { token, currentWorkspace } = useAuthStore.getState();
  const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]);
  const res = await fetch(`${API_BASE_URL}${path}${params.toString() ? `?${params}` : ''}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(currentWorkspace?._id ? { 'X-Workspace-ID': currentWorkspace._id } : {}) },
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Not JSON.
    }
    throw new ApiError(extractMessages(body)[0] || res.statusText || 'Download failed.', res.status, body);
  }
  const blob = await res.blob();
  const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Human wording for audit actions; unknown actions fall back to the raw key. */
export const AUDIT_LABELS: Record<string, string> = {
  'member.invited': 'invited',
  'member.auto_joined': 'joined via verified domain',
  'invitation.resent': 'resent an invitation to',
  'invitation.revoked': 'revoked the invitation for',
  'invitation.accepted': 'accepted an invitation',
  'member.removed': 'removed',
  'member.role_changed': 'changed the role of',
  'member.suspended': 'suspended',
  'member.reactivated': 'reactivated',
  'workspace.updated': 'updated workspace settings',
  'workspace.logo_changed': 'changed the workspace logo',
  'workspace.ownership_transferred': 'transferred ownership to',
  'workspace.archived': 'archived the workspace',
  'workspace.unarchived': 'restored the workspace',
  'workspace.exported': 'exported workspace data',
  'space.created': 'created space',
  'space.deleted': 'deleted space',
  'space.archived': 'archived space',
  'space.restored': 'restored space',
  'space.sharing_changed': 'changed sharing for',
  'page.deleted': 'moved to trash',
  'board.deleted': 'moved to trash',
  'trash.restored': 'restored from trash',
  'trash.purged': 'permanently deleted',
  'page.locked': 'locked',
  'page.unlocked': 'unlocked',
  'domain.added': 'added domain',
  'domain.verified': 'verified domain',
  'domain.removed': 'removed domain',
  'domain.auto_join_changed': 'changed auto-join for',
  'storage.quota_changed': 'changed the storage limit',
  'auth.login': 'signed in',
  'auth.password_changed': 'changed their password',
};

export const AUDIT_CATEGORIES = [
  { value: '', label: 'All activity' },
  { value: 'member.', label: 'Members' },
  { value: 'invitation.', label: 'Invitations' },
  { value: 'workspace.', label: 'Workspace' },
  { value: 'space.', label: 'Spaces' },
  { value: 'page.', label: 'Pages' },
  { value: 'trash.', label: 'Trash' },
  { value: 'domain.', label: 'Domains' },
  { value: 'storage.', label: 'Storage' },
  { value: 'auth.', label: 'Sign-ins & security' },
];

/* -------------------------------------------------------------- domains */

export interface WorkspaceDomain {
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  auto_join: boolean;
  role: 'member' | 'guest';
  record_name: string;
  record_value: string;
  verified_at?: string | null;
  last_checked_at?: string | null;
  last_error?: string | null;
}

function useInvalidateWorkspace() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['settings'] });
    void qc.invalidateQueries({ queryKey: ['audit'] });
  };
}

export function useDomainMutations() {
  const invalidate = useInvalidateWorkspace();
  const { toast } = useToast();
  const onError = (e: unknown) => toast({ variant: 'destructive', title: 'Domain update failed', description: message(e) });
  return {
    add: useMutation({ mutationFn: (domain: string) => http.post<WorkspaceDomain>('/v1/workspace/domain', { domain }), onSuccess: invalidate, onError }),
    verify: useMutation({
      mutationFn: (domain: string) => http.post<WorkspaceDomain>('/v1/workspace/domain/verify', { domain }),
      onSuccess: (d) => {
        invalidate();
        if (d?.status === 'verified') toast({ variant: 'success', title: `${d.domain} is verified` });
        else toast({ variant: 'destructive', title: 'TXT record not found yet', description: d?.last_error || 'DNS changes can take a few minutes to an hour to appear. Try again shortly.' });
      },
      onError,
    }),
    update: useMutation({ mutationFn: (v: { domain: string; auto_join?: boolean; role?: 'member' | 'guest' }) => http.put<WorkspaceDomain>('/v1/workspace/domain', v), onSuccess: invalidate, onError }),
    remove: useMutation({ mutationFn: (domain: string) => http.delete('/v1/workspace/domain', { query: { domain } }), onSuccess: invalidate, onError }),
  };
}

/* ----------------------------------------------------------------- mail */

export interface MailStatus {
  configured: boolean;
  transport: string;
  from?: string | null;
}

export function useMailStatus(enabled: boolean) {
  const ws = useWs();
  return useQuery({
    queryKey: ['settings', 'mail-status', ws],
    enabled: enabled && !!ws,
    queryFn: () => http.get<MailStatus>('/v1/workspace/mail-status'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/* --------------------------------------------------------------- quotas */

export function useSetQuota() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (bytes: number | null) => http.put('/v1/workspace', { storage_quota_bytes: bytes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['storage'] });
      void qc.invalidateQueries({ queryKey: ['settings'] });
      toast({ variant: 'success', title: 'Storage limit updated' });
    },
    onError: (e) => toast({ variant: 'destructive', title: 'Could not change the limit', description: message(e) }),
  });
}

export const GiB = 1024 ** 3;
