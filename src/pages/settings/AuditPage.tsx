import { useMemo, useState } from 'react';
import { Download, History, Loader2, Mail, MailCheck, MailWarning, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useMemberDirectory } from '@/features/members/useMemberDirectory';
import { MetaTag, SettingsHeader, SettingsSection } from '@/features/settings/components';
import { useIsWorkspaceAdmin } from '@/features/settings/queries';
import { AUDIT_CATEGORIES, AUDIT_LABELS, downloadFile, useAuditLog, useMailStatus, type AuditEntry, type AuditFilters } from '@/features/settings/governance';

function device(ua?: string | null) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /node|undici|curl/i.test(ua) ? 'API client' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' · ');
}

function details(e: AuditEntry) {
  const m = e.metadata ?? {};
  if (e.action === 'member.role_changed' && m.from && m.to) return `${String(m.from)} → ${String(m.to)}`;
  if (e.action === 'workspace.updated' && Array.isArray(m.fields)) return `Changed: ${(m.fields as string[]).join(', ')}`;
  if (e.action === 'storage.quota_changed') return m.to ? `New limit ${String(m.to_label ?? m.to)}` : 'Unlimited';
  if (e.action === 'auth.login' && m.method) return `via ${String(m.method)}`;
  if (m.role) return `as ${String(m.role)}`;
  return null;
}

function when(iso: string) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

function MailCard() {
  const { data, isPending, error } = useMailStatus(true);
  return (
    <SettingsSection icon={Mail} title="Email delivery" meta={data && <MetaTag>{data.configured ? data.transport.toUpperCase() : 'Not set up'}</MetaTag>}>
      {isPending ? (
        <p className="text-xs text-muted-foreground">Checking…</p>
      ) : error || !data ? (
        <p className="text-xs text-muted-foreground">Email status isn&apos;t available.</p>
      ) : data.configured ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-success-foreground" />
          <span>
            Invitations are emailed{data.from ? (
              <>
                {' '}from <span className="font-mono text-foreground">{data.from}</span>
              </>
            ) : null}
            .
          </span>
        </p>
      ) : (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <MailWarning className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            Invitations aren&apos;t emailed yet; people get in through their copyable invite link. A server admin can connect any SMTP provider (Amazon SES, Postmark, Resend, SendGrid, Gmail) with these settings:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-2xs text-foreground">
            {'MAIL_TRANSPORT=smtp\nSMTP_HOST=smtp.example.com\nSMTP_PORT=587\nSMTP_USER=…\nSMTP_PASS=…\nMAIL_FROM="Better Notion <no-reply@example.com>"'}
          </pre>
        </div>
      )}
    </SettingsSection>
  );
}

export default function AuditPage() {
  const isAdmin = useIsWorkspaceAdmin();
  const { toast } = useToast();
  const { members } = useMemberDirectory();
  const [filters, setFilters] = useState<AuditFilters>({});
  const [q, setQ] = useState('');
  const [exporting, setExporting] = useState(false);
  const applied = useMemo(() => ({ ...filters, q: q.trim() || undefined }), [filters, q]);
  const log = useAuditLog(applied, isAdmin);
  const entries = useMemo(() => log.data?.pages.flatMap((p) => p.entries) ?? [], [log.data]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <SettingsHeader eyebrow="Security & audit" title="Activity log" description="A record of sensitive changes across the workspace." />
        <EmptyState icon={ShieldCheck} title="Owners and admins only" description="Ask a workspace owner or admin if you need to review activity." />
      </div>
    );
  }

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile('/v1/workspace/audit/export', applied as Record<string, string | undefined>, 'audit-log.csv');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Export failed', description: (e as Error).message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        eyebrow="Security & audit"
        title="Activity log"
        description="Who changed what: members and roles, invitations, sharing, deletions, domains, storage and sign-ins."
        actions={
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />} Export CSV
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="space-y-3 xl:col-span-8" aria-label="Activity">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filters.action ?? ''} onValueChange={(v) => setFilters((f) => ({ ...f, action: v === 'all' ? undefined : v }))}>
              <SelectTrigger className="h-8 w-44 text-xs" aria-label="Activity type">
                <SelectValue placeholder="All activity" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value || 'all'} value={c.value || 'all'}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.actor_id ?? 'all'} onValueChange={(v) => setFilters((f) => ({ ...f, actor_id: v === 'all' ? undefined : v }))}>
              <SelectTrigger className="h-8 w-44 text-xs" aria-label="Person">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" aria-label="From" className="h-8 w-36 text-xs" value={filters.from?.slice(0, 10) ?? ''} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : undefined }))} />
            <Input type="date" aria-label="To" className="h-8 w-36 text-xs" value={filters.to?.slice(0, 10) ?? ''} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined }))} />
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity…" aria-label="Search activity" className="h-8 pl-7 text-xs" />
            </div>
          </div>

          {log.error ? (
            <ErrorState error={log.error} onRetry={() => void log.refetch()} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {log.isPending ? (
                <div className="space-y-px">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="h-14 animate-pulse bg-muted/30" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <EmptyState icon={History} title="No activity found" description={Object.values(applied).some(Boolean) ? 'Try a wider date range or another filter.' : 'Changes will be recorded here from now on.'} />
              ) : (
                <ul className="divide-y divide-border" aria-label="Activity entries">
                  {entries.map((e) => {
                    const verb = AUDIT_LABELS[e.action] ?? e.action;
                    const extra = details(e);
                    const dev = device(e.user_agent);
                    return (
                      <li key={e._id} className="flex items-start gap-3 px-4 py-3">
                        <UserAvatar user={e.actor ?? { name: 'System' }} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-relaxed text-foreground">
                            <span className="font-medium">{e.actor?.name || e.actor?.email || 'System'}</span> {verb}
                            {e.target_name && <span className="font-medium"> {e.target_name}</span>}
                            {extra && <span className="text-muted-foreground"> · {extra}</span>}
                          </p>
                          <p className="mt-0.5 flex flex-wrap gap-x-2 text-2xs text-subtle">
                            <span className="font-mono">{e.action}</span>
                            {e.ip && <span className="font-mono">{e.ip}</span>}
                            {dev && <span>{dev}</span>}
                          </p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <time dateTime={e.createdAt} className="shrink-0 text-2xs text-muted-foreground">
                              {when(e.createdAt)}
                            </time>
                          </TooltipTrigger>
                          <TooltipContent>{new Date(e.createdAt).toLocaleString()}</TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              )}
              {log.hasNextPage && (
                <div className="border-t border-border p-2 text-center">
                  <Button variant="ghost" size="sm" disabled={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
                    {log.isFetchingNextPage && <Loader2 className="animate-spin" />} Load older activity
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="space-y-6 xl:col-span-4">
          <MailCard />
          <SettingsSection icon={ShieldCheck} title="What's recorded" description="Kept for the life of the workspace. Only owners and admins can view or export it.">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Members, roles, suspensions and invitations</li>
              <li>Workspace settings, ownership, archive and exports</li>
              <li>Spaces, sharing, locks, trash and restores</li>
              <li>Verified domains and storage limits</li>
              <li>Sign-ins and password changes</li>
            </ul>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
