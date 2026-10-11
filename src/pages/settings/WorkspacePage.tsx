import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Building2,
  CalendarClock,
  Cloud,
  LayoutGrid,
  MessageSquare,
  PenTool,
  Sheet,
  SlidersHorizontal,
  SquareKanban,
  ToggleRight,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ErrorState } from '@/components/feedback/ErrorState';
import { UserAvatar } from '@/components/common/UserAvatar';
import { http } from '@/lib/api/client';
import useAuthStore from '@/stores/useAuthStore';
import { formatBytes, useStorageUsage } from '@/features/library/queries';
import { ActionRow, Field, FieldGrid, MetaTag, SettingsHeader, SettingsSection, ToggleRow, UnsavedBar } from '@/features/settings/components';
import {
  checkSlugAvailable,
  useArchiveWorkspace,
  useDeleteWorkspace,
  useIsWorkspaceAdmin,
  useTransferOwnership,
  useUpdateWorkspace,
  useWorkspaceMembersDetailed,
  useWorkspaceSettings,
  type WorkspaceSettings,
} from '@/features/settings/queries';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const WORKWEEKS: Record<string, string[]> = {
  'mon-fri': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  'sun-thu': ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
  'mon-sat': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  all: [...DAYS],
};
const DATE_FORMATS = ['MMM d, yyyy', 'd MMM yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy'];
const TIMEZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
})();

const FEATURES = [
  { key: 'sheets', title: 'Spreadsheets', description: 'Formula grids powered by Univer', icon: Sheet },
  { key: 'whiteboards', title: 'Whiteboards', description: 'Infinite canvas and diagrams', icon: PenTool },
  { key: 'databoards', title: 'Databoards', description: 'Task boards in table, kanban, calendar and timeline', icon: LayoutGrid },
  { key: 'scrum', title: 'Sprint boards', description: 'Sprints, backlog, epics and reports', icon: SquareKanban },
  { key: 'chat', title: 'Chat', description: 'Direct messages, groups and space channels', icon: MessageSquare },
] as const;

type FeatureKey = (typeof FEATURES)[number]['key'];

interface FormState {
  name: string;
  description: string;
  slug: string;
  timezone: string;
  workweek: string;
  first_day_of_week: string;
  date_format: string;
  sprint_cadence: NonNullable<WorkspaceSettings['sprint_cadence']>;
  issue_prefix: string;
  language: string;
  features: Record<FeatureKey, boolean>;
  auto_archive_days: number;
}

function workweekOf(days?: string[]) {
  if (!days?.length) return 'mon-fri';
  const key = Object.entries(WORKWEEKS).find(([, d]) => d.length === days.length && d.every((x) => days.includes(x)))?.[0];
  return key ?? 'custom';
}

function formFrom(ws?: WorkspaceSettings): FormState {
  return {
    name: ws?.name ?? '',
    description: ws?.description ?? '',
    slug: ws?.slug ?? '',
    timezone: ws?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    workweek: workweekOf(ws?.working_days),
    first_day_of_week: ws?.first_day_of_week ?? 'monday',
    date_format: ws?.date_format ?? 'MMM d, yyyy',
    sprint_cadence: ws?.sprint_cadence ?? '2w',
    issue_prefix: ws?.issue_prefix ?? '',
    language: ws?.language ?? 'en-US',
    features: {
      sheets: ws?.features?.sheets ?? true,
      whiteboards: ws?.features?.whiteboards ?? true,
      databoards: ws?.features?.databoards ?? true,
      scrum: ws?.features?.scrum ?? true,
      chat: ws?.features?.chat ?? true,
    },
    auto_archive_days: ws?.auto_archive_days ?? 0,
  };
}

function LogoUploader({ workspace, disabled }: { workspace?: WorkspaceSettings; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const update = useUpdateWorkspace();
  const { toast } = useToast();
  const name = workspace?.name ?? 'W';

  const upload = async (file: File) => {
    if (!workspace) return;
    if (!/^image\/(png|svg\+xml|jpeg|webp)$/.test(file.type)) return toast({ variant: 'destructive', title: 'Use a PNG, SVG, JPG or WebP image' });
    if (file.size > 5 * 1024 * 1024) return toast({ variant: 'destructive', title: 'Image must be under 5 MB' });
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('media_type', 'icon');
      fd.append('reference_id', workspace._id);
      fd.append('reference_for', 'workspace');
      fd.append('caption', ' ');
      const media = await http.upload<{ url?: string }>('/v1/upload/media', fd);
      if (!media?.url) throw new Error('Upload failed');
      await update.mutateAsync({ logo: media.url });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not upload logo', description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-background/40 p-3">
      {workspace?.logo ? (
        <img src={workspace.logo} alt="" className="size-16 shrink-0 rounded-lg border border-border object-cover" />
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-foreground text-2xl font-semibold text-background">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-xs font-medium text-foreground">Workspace logo</p>
          <p className="text-2xs text-muted-foreground">Shown in the sidebar and on invitations. PNG, SVG, JPG or WebP, up to 5 MB.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="xs" disabled={disabled || busy} onClick={() => input.current?.click()}>
            <Upload /> {busy ? 'Uploading…' : 'Upload'}
          </Button>
          {workspace?.logo && (
            <Button variant="ghost" size="xs" className="text-danger-foreground" disabled={disabled || busy} onClick={() => update.mutate({ logo: '' })}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void upload(file);
        }}
      />
    </div>
  );
}

function StorageCard() {
  const { data, isPending, error } = useStorageUsage();
  const segments = data
    ? [
        { label: 'Images', bytes: data.by_type.images, className: 'bg-brand' },
        { label: 'Documents', bytes: data.by_type.documents, className: 'bg-warning' },
        { label: 'Other', bytes: data.by_type.other, className: 'bg-muted-foreground' },
      ]
    : [];
  const total = data?.used_bytes || 1;
  return (
    <SettingsSection icon={Cloud} title="Storage" meta={data && <MetaTag>{formatBytes(data.used_bytes)}</MetaTag>}>
      {isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : error || !data ? (
        <p className="text-xs text-muted-foreground">Storage usage isn&apos;t available yet.</p>
      ) : (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label="Storage by type">
            {segments.map((s) => (
              <span key={s.label} className={s.className} style={{ width: `${(s.bytes / total) * 100}%` }} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-2 text-2xs text-muted-foreground sm:grid-cols-3">
            {segments.map((s) => (
              <li key={s.label} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-sm ${s.className}`} />
                {s.label}: <span className="font-mono text-foreground">{formatBytes(s.bytes)}</span>
              </li>
            ))}
          </ul>
          <p className="text-2xs text-muted-foreground">
            {data.file_count} file{data.file_count === 1 ? '' : 's'} · {data.active_contributors} active contributor{data.active_contributors === 1 ? '' : 's'} this week
          </p>
        </>
      )}
    </SettingsSection>
  );
}

function TransferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: members = [] } = useWorkspaceMembersDetailed();
  const me = useAuthStore((s) => s.user?._id);
  const transfer = useTransferOwnership();
  const [target, setTarget] = useState('');
  const candidates = members.filter((m) => m._id !== me && m.workspace_role !== 'guest' && m.status !== 'suspended');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>The new owner gets full control, including deleting the workspace. You&apos;ll stay on as an admin.</DialogDescription>
        </DialogHeader>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger aria-label="New owner">
            <SelectValue placeholder="Choose a member" />
          </SelectTrigger>
          <SelectContent>
            {candidates.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Invite a member first.</div>}
            {candidates.map((m) => (
              <SelectItem key={m._id} value={m._id}>
                <span className="flex items-center gap-2">
                  <UserAvatar user={m} size="xs" />
                  {m.name || m.email}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!target || transfer.isPending}
            onClick={async () => {
              await transfer.mutateAsync(target).catch(() => null);
              onOpenChange(false);
            }}
          >
            Transfer ownership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ open, onOpenChange, name }: { open: boolean; onOpenChange: (open: boolean) => void; name: string }) {
  const [typed, setTyped] = useState('');
  const remove = useDeleteWorkspace();
  const navigate = useNavigate();
  const { workspaces, currentWorkspace, setWorkspaces, setCurrentWorkspace } = useAuthStore();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setTyped('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-danger-foreground">Delete workspace</DialogTitle>
          <DialogDescription>
            This permanently deletes <strong>{name}</strong>, all of its spaces, documents, boards and files for every member. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <Field label={`Type “${name}” to confirm`} htmlFor="delete-confirm">
          <Input id="delete-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={typed !== name || remove.isPending}
            onClick={async () => {
              try {
                await remove.mutateAsync();
                const rest = workspaces.filter((w) => w._id !== currentWorkspace?._id);
                setWorkspaces(rest);
                setCurrentWorkspace(rest[0] ?? null);
                onOpenChange(false);
                navigate('/');
              } catch {
                // Toast already shown.
              }
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Delete workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkspacePage() {
  const { data: workspace, isPending, error, refetch } = useWorkspaceSettings();
  const isAdmin = useIsWorkspaceAdmin();
  const isOwner = useAuthStore((s) => s.currentWorkspace?.role === 'owner' || (!!workspace && workspace.owner_id === s.user?._id));
  const update = useUpdateWorkspace();
  const archive = useArchiveWorkspace();
  const initial = useMemo(() => formFrom(workspace), [workspace]);
  const [form, setForm] = useState<FormState>(initial);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const slugError =
    form.slug && !/^[a-z0-9-]{3,48}$/.test(form.slug) ? '3–48 lowercase letters, numbers and dashes' : slugStatus === 'taken' ? 'That address is taken' : null;
  const prefixError = form.issue_prefix && !/^[A-Z][A-Z0-9]{0,7}$/.test(form.issue_prefix) ? '1–8 capital letters or digits, starting with a letter' : null;

  useEffect(() => {
    if (!form.slug || form.slug === (workspace?.slug ?? '') || !/^[a-z0-9-]{3,48}$/.test(form.slug)) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        setSlugStatus((await checkSlugAvailable(form.slug)) ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.slug, workspace?.slug]);

  const save = () => {
    if (!form.name.trim() || slugError || prefixError) return;
    update.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      ...(form.slug ? { slug: form.slug } : {}),
      timezone: form.timezone,
      ...(form.workweek !== 'custom' ? { working_days: WORKWEEKS[form.workweek] } : {}),
      first_day_of_week: form.first_day_of_week,
      date_format: form.date_format,
      sprint_cadence: form.sprint_cadence,
      ...(form.issue_prefix ? { issue_prefix: form.issue_prefix } : {}),
      language: form.language,
      features: form.features,
      auto_archive_days: form.auto_archive_days,
    });
  };

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const readOnly = !isAdmin;

  return (
    <div className="space-y-6">
      <SettingsHeader
        eyebrow="Workspace configuration"
        title="Workspace settings"
        description="Identity, regional defaults, enabled modules and data controls for everyone in this workspace."
        actions={
          !readOnly && (
            <Button size="sm" disabled={!dirty || update.isPending || !!slugError || !!prefixError} onClick={save}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          )
        }
      />
      {readOnly && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          Only workspace owners and admins can change these settings.
        </p>
      )}

      {isPending ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-96 rounded-xl lg:col-span-7" />
          <Skeleton className="h-96 rounded-xl lg:col-span-5" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <SettingsSection icon={Building2} title="Identity" meta={workspace?._id && <MetaTag>{workspace._id.slice(-6)}</MetaTag>}>
              <LogoUploader workspace={workspace} disabled={readOnly} />
              <Field label="Workspace name" htmlFor="ws-name" error={!form.name.trim() ? 'Name is required' : null}>
                <Input id="ws-name" value={form.name} onChange={(e) => set('name', e.target.value)} disabled={readOnly} maxLength={80} />
              </Field>
              <Field label="Description" htmlFor="ws-desc">
                <Textarea id="ws-desc" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} disabled={readOnly} maxLength={300} />
              </Field>
              <Field
                label="Workspace address"
                htmlFor="ws-slug"
                error={slugError}
                hint={slugStatus === 'checking' ? 'Checking…' : slugStatus === 'available' ? 'Available' : 'A short, unique name for links and invites.'}
              >
                <div className="flex h-9 items-center rounded-md border border-input bg-background focus-within:border-ring">
                  <span className="truncate pl-3 font-mono text-2xs text-subtle">{window.location.host}/w/</span>
                  <input
                    id="ws-slug"
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value.toLowerCase())}
                    disabled={readOnly}
                    maxLength={48}
                    placeholder="my-team"
                    className="h-full min-w-0 flex-1 bg-transparent pr-3 font-mono text-xs text-foreground outline-none placeholder:text-subtle"
                  />
                </div>
              </Field>
            </SettingsSection>

            <SettingsSection icon={SlidersHorizontal} title="Preferences & work cadence" meta={<MetaTag>Locale &amp; sprints</MetaTag>}>
              <FieldGrid>
                <Field label="Time zone">
                  <Select value={form.timezone} onValueChange={(v) => set('timezone', v)} disabled={readOnly}>
                    <SelectTrigger aria-label="Time zone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]).map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Work week" hint={form.workweek === 'custom' ? 'Custom days are kept as they are.' : undefined}>
                  <Select value={form.workweek} onValueChange={(v) => set('workweek', v)} disabled={readOnly}>
                    <SelectTrigger aria-label="Work week">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mon-fri">Monday – Friday</SelectItem>
                      <SelectItem value="sun-thu">Sunday – Thursday</SelectItem>
                      <SelectItem value="mon-sat">Monday – Saturday</SelectItem>
                      <SelectItem value="all">Every day</SelectItem>
                      {form.workweek === 'custom' && <SelectItem value="custom">Custom</SelectItem>}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Week starts on">
                  <Select value={form.first_day_of_week} onValueChange={(v) => set('first_day_of_week', v)} disabled={readOnly}>
                    <SelectTrigger aria-label="Week starts on">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={d} className="capitalize">
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Date format">
                  <Select value={form.date_format} onValueChange={(v) => set('date_format', v)} disabled={readOnly}>
                    <SelectTrigger aria-label="Date format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!DATE_FORMATS.includes(form.date_format) && <SelectItem value={form.date_format}>{form.date_format}</SelectItem>}
                      <SelectItem value="MMM d, yyyy">Jul 23, 2026</SelectItem>
                      <SelectItem value="d MMM yyyy">23 Jul 2026</SelectItem>
                      <SelectItem value="yyyy-MM-dd">2026-07-23</SelectItem>
                      <SelectItem value="MM/dd/yyyy">07/23/2026</SelectItem>
                      <SelectItem value="dd/MM/yyyy">23/07/2026</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default sprint length">
                  <Select value={form.sprint_cadence} onValueChange={(v) => set('sprint_cadence', v as FormState['sprint_cadence'])} disabled={readOnly}>
                    <SelectTrigger aria-label="Default sprint length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1w">1 week</SelectItem>
                      <SelectItem value="2w">2 weeks</SelectItem>
                      <SelectItem value="3w">3 weeks</SelectItem>
                      <SelectItem value="4w">4 weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Issue key prefix" htmlFor="ws-prefix" error={prefixError} hint={form.issue_prefix ? `e.g. ${form.issue_prefix}-409` : 'e.g. ENG → ENG-409'}>
                  <Input
                    id="ws-prefix"
                    value={form.issue_prefix}
                    onChange={(e) => set('issue_prefix', e.target.value.toUpperCase())}
                    disabled={readOnly}
                    maxLength={8}
                    className="font-mono"
                    placeholder="ENG"
                  />
                </Field>
                <Field label="Language" className="md:col-span-2">
                  <Select value={form.language} onValueChange={(v) => set('language', v)} disabled={readOnly}>
                    <SelectTrigger aria-label="Language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGrid>
            </SettingsSection>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <SettingsSection
              icon={ToggleRight}
              title="Modules"
              description="Turn tools on or off for everyone. Existing items stay; they're just hidden from create menus."
              meta={<MetaTag>{Object.values(form.features).filter(Boolean).length}/{FEATURES.length} on</MetaTag>}
            >
              <div className="space-y-2">
                {FEATURES.map((f) => (
                  <ToggleRow
                    key={f.key}
                    icon={f.icon}
                    title={f.title}
                    description={f.description}
                    checked={form.features[f.key]}
                    onCheckedChange={(v) => set('features', { ...form.features, [f.key]: v })}
                    disabled={readOnly}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2.5">
                  <CalendarClock className="size-4 text-muted-foreground" />
                  <span>
                    <span className="block text-xs font-medium text-foreground">Auto-archive inactive items</span>
                    <span className="block text-2xs text-muted-foreground">Channels and docs untouched for a while.</span>
                  </span>
                </span>
                <Select value={String(form.auto_archive_days)} onValueChange={(v) => set('auto_archive_days', Number(v))} disabled={readOnly}>
                  <SelectTrigger className="h-8 w-32 text-xs" aria-label="Auto-archive after">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Off</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SettingsSection>

            <StorageCard />

            <SettingsSection icon={TriangleAlert} title="Danger zone" tone="danger" description="These actions affect every member of the workspace.">
              <ActionRow
                title="Transfer ownership"
                description="Give another member full control of this workspace."
                action={
                  <Button variant="outline" size="xs" disabled={!isOwner} onClick={() => setTransferOpen(true)}>
                    Transfer
                  </Button>
                }
              />
              <ActionRow
                title={workspace?.archived_at ? 'Restore workspace' : 'Archive workspace'}
                description={workspace?.archived_at ? 'This workspace is archived.' : 'Mark the workspace as archived for everyone.'}
                action={
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={!isOwner || archive.isPending}
                    onClick={() => archive.mutate(!workspace?.archived_at)}
                  >
                    <Archive /> {workspace?.archived_at ? 'Restore' : 'Archive'}
                  </Button>
                }
              />
              <ActionRow
                tone="danger"
                title="Delete workspace"
                description="Permanently delete all spaces, documents, boards and files."
                action={
                  <Button variant="destructive" size="xs" disabled={!isOwner} onClick={() => setDeleteOpen(true)}>
                    Delete
                  </Button>
                }
              />
              {!isOwner && <p className="text-2xs text-muted-foreground">Only the workspace owner can use these.</p>}
            </SettingsSection>
          </div>
        </div>
      )}

      {!readOnly && <UnsavedBar visible={dirty} saving={update.isPending} onReset={() => setForm(initial)} onSave={save} />}
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} />
      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} name={workspace?.name ?? ''} />
    </div>
  );
}
