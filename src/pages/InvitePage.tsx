import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MailCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/feedback/PageLoader';
import { ApiError, http } from '@/lib/api/client';
import useAuthStore from '@/stores/useAuthStore';
import type { Workspace } from '@/types/models';

interface InvitationLookup {
  workspace: { _id: string; name: string; logo?: string };
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
}

/** Landing page for invite links: /invite/:token */
export default function InvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => http.get<InvitationLookup>('/v1/invitation', { query: { token }, public: true }),
    retry: false,
  });

  const accept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const result = await http.post<{ workspace: Workspace }>('/v1/invitation/accept', { token });
      const { workspaces, setWorkspaces, setCurrentWorkspace } = useAuthStore.getState();
      const joined = { ...result.workspace, role: (data?.role as Workspace['role']) ?? 'member' };
      if (!workspaces.some((w) => w._id === joined._id)) setWorkspaces([...workspaces, joined]);
      setCurrentWorkspace(joined);
      navigate('/', { replace: true });
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Could not accept the invitation.');
    } finally {
      setAccepting(false);
    }
  };

  if (isPending) return <PageLoader fullscreen label="Checking invitation…" />;

  const gone = error instanceof ApiError && (error.status === 404 || error.status === 410);
  const emailMismatch = !!user && !!data && user.email?.toLowerCase() !== data.email.toLowerCase();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 text-center shadow-overlay">
        {error || !data ? (
          <>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning-foreground">
              <TriangleAlert className="size-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-foreground">{gone ? 'This invite is no longer valid' : 'Something went wrong'}</h1>
              <p className="text-sm text-muted-foreground">
                {gone ? 'It may have expired or been revoked. Ask a workspace admin for a new link.' : 'Please try the link again in a moment.'}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Go to the app
            </Button>
          </>
        ) : (
          <>
            {data.workspace.logo ? (
              <img src={data.workspace.logo} alt="" className="mx-auto size-14 rounded-xl border border-border object-cover" />
            ) : (
              <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-foreground text-2xl font-semibold text-background">
                {data.workspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-2xs font-medium uppercase tracking-wider text-subtle">You&apos;re invited</p>
              <h1 className="text-lg font-semibold text-foreground">Join {data.workspace.name}</h1>
              <p className="text-sm text-muted-foreground">
                This invitation is for <span className="text-foreground">{data.email}</span> as {data.role === 'admin' ? 'an admin' : `a ${data.role}`}.
              </p>
            </div>

            {data.status === 'accepted' ? (
              <Button className="w-full" onClick={() => navigate('/')}>
                <MailCheck /> Already accepted — open the app
              </Button>
            ) : isAuthenticated ? (
              emailMismatch ? (
                <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                  You&apos;re signed in as {user?.email}. Sign in with {data.email} to accept.
                </p>
              ) : (
                <Button className="w-full" disabled={accepting} onClick={() => void accept()}>
                  {accepting ? 'Joining…' : `Join ${data.workspace.name}`}
                </Button>
              )
            ) : (
              <div className="space-y-2">
                <Button className="w-full" onClick={() => navigate('/login')}>
                  Sign in or create an account
                </Button>
                <p className="text-2xs text-muted-foreground">Use {data.email}; you&apos;ll join the workspace automatically.</p>
              </div>
            )}
            {acceptError && <p className="text-xs text-danger-foreground">{acceptError}</p>}
            <p className="text-2xs text-subtle">Expires {new Date(data.expires_at).toLocaleDateString()}</p>
          </>
        )}
      </div>
    </div>
  );
}
