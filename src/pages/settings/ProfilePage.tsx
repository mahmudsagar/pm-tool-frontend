import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { BellRing, Camera, Clock, Github, KeyRound, Link2, Mail, Monitor, Moon, Palette, Sun, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useToast } from '@/components/ui/use-toast';
import { useTheme, type Theme } from '@/components/theme-provider';
import { http } from '@/lib/api/client';
import useAuthStore from '@/stores/useAuthStore';
import { Field, FieldGrid, LockedValue, MetaTag, SettingsSection, UnsavedBar } from '@/features/settings/components';
import { ACCENTS, applyAppearance } from '@/features/settings/appearance';
import {
  checkHandleAvailable,
  useChangePassword,
  useUpdateProfile,
  type NotificationPrefs,
  type ProfileUser,
  type UserPreferences,
} from '@/features/settings/queries';

const TIMEZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
})();
const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface FormState {
  name: string;
  handle: string;
  title: string;
  pronouns: string;
  phone: string;
  timezone: string;
  notifications: Required<Omit<NotificationPrefs, 'snooze_until'>> & { snooze_until: string | null };
}

function formFromUser(user: ProfileUser | null): FormState {
  const n = user?.notification_prefs ?? {};
  return {
    name: user?.name ?? '',
    handle: user?.handle ?? '',
    title: user?.title ?? '',
    pronouns: user?.pronouns ?? '',
    phone: user?.phone ?? '',
    timezone: user?.timezone || BROWSER_TZ,
    notifications: {
      mentions: n.mentions ?? true,
      assignments: n.assignments ?? true,
      updates: n.updates ?? false,
      digest: n.digest ?? 'daily',
      snooze_until: n.snooze_until ?? null,
    },
  };
}

function localTime(timezone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: timezone, timeZoneName: 'short' }).format(new Date());
  } catch {
    return '';
  }
}

function AvatarUploader({ user }: { user: ProfileUser | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const { toast } = useToast();

  const upload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) return toast({ variant: 'destructive', title: 'Choose an image file' });
    if (file.size > 5 * 1024 * 1024) return toast({ variant: 'destructive', title: 'Image must be under 5 MB' });
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('media_type', 'icon');
      fd.append('reference_id', user._id);
      fd.append('reference_for', 'user');
      fd.append('caption', ' ');
      const media = await http.upload<{ url?: string }>('/v1/upload/media', fd);
      if (!media?.url) throw new Error('Upload failed');
      await http.put('/v1/user', { avatar: media.url });
      setUser({ ...user, avatar: media.url });
      toast({ variant: 'success', title: 'Profile photo updated' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not upload photo', description: (error as Error).message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <UserAvatar user={user} size="xl" className="rounded-xl [&>*]:rounded-xl" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={uploading}
        className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:opacity-100"
        aria-label="Change profile photo"
      >
        {uploading ? <span className="text-2xs">Uploading…</span> : <Camera className="size-5" />}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
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

function AppearanceCard({ user }: { user: ProfileUser | null }) {
  const { theme, setTheme } = useTheme();
  const updateProfile = useUpdateProfile();
  const prefs: UserPreferences = user?.preferences ?? {};
  const accent = prefs.accent ?? 'indigo';
  const density = prefs.density ?? 'comfortable';

  // Appearance applies immediately and saves in the background.
  const save = (next: UserPreferences) => {
    const merged = { ...prefs, ...next };
    applyAppearance(merged);
    const current = useAuthStore.getState().user as ProfileUser | null;
    if (current) useAuthStore.getState().setUser({ ...current, preferences: merged });
    updateProfile.mutate({ preferences: merged });
  };

  return (
    <SettingsSection icon={Palette} title="Appearance" description="Applies to this account on every device.">
      <Field label="Theme">
        <SegmentedControl<Theme>
          aria-label="Theme"
          value={theme}
          onValueChange={setTheme}
          className="w-full [&>*]:flex-1"
          options={[
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'system', label: 'System', icon: Monitor },
          ]}
        />
      </Field>
      <Field label="Accent color" hint={ACCENTS.find((a) => a.value === accent)?.label}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={accent === a.value}
              aria-label={a.label}
              onClick={() => save({ accent: a.value })}
              className={cn(
                'size-7 rounded-full ring-offset-2 ring-offset-card transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                accent === a.value && 'ring-2 ring-foreground/60',
              )}
              style={{ backgroundColor: a.swatch }}
            />
          ))}
        </div>
      </Field>
      <Field label="Density">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Density">
          {(
            [
              { value: 'compact', title: 'Compact', hint: 'More on screen' },
              { value: 'comfortable', title: 'Comfortable', hint: 'Roomier spacing' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={density === option.value}
              onClick={() => save({ density: option.value })}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                density === option.value ? 'border-brand/50 bg-brand/10' : 'border-border hover:bg-accent/50',
              )}
            >
              <span className="block text-xs font-medium text-foreground">{option.title}</span>
              <span className="block text-2xs text-muted-foreground">{option.hint}</span>
            </button>
          ))}
        </div>
      </Field>
    </SettingsSection>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z" />
    </svg>
  );
}

function ConnectedAccounts({ user }: { user: ProfileUser | null }) {
  const accounts = [
    { id: 'google', name: 'Google', icon: GoogleMark, connected: !!user?.google_id },
    { id: 'github', name: 'GitHub', icon: () => <Github className="size-4" />, connected: !!user?.github_id },
  ];
  const connect = (provider: string) => {
    // The OAuth flow links the provider to this account when the email matches.
    window.location.href = `${import.meta.env.BN_BASE_URL}/v1/auth/${provider}`;
  };
  return (
    <SettingsSection icon={Link2} title="Connected accounts" meta={<MetaTag>{accounts.filter((a) => a.connected).length} connected</MetaTag>}>
      <ul className="space-y-2">
        {accounts.map(({ id, name, icon: Icon, connected }) => (
          <li key={id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
            <span className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/40">
              <Icon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-foreground">{name}</span>
              <span className={cn('block text-2xs', connected ? 'text-success-foreground' : 'text-muted-foreground')}>
                {connected ? 'Connected for sign-in' : 'Not connected'}
              </span>
            </span>
            {connected ? (
              <Badge variant="success" dot>
                Active
              </Badge>
            ) : (
              <Button variant="outline" size="xs" onClick={() => connect(id)}>
                Connect
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-2xs text-muted-foreground">Connecting works when the provider account uses {user?.email ?? 'your email'}.</p>
    </SettingsSection>
  );
}

function PasswordCard() {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mismatch || tooShort || !current || !next) return;
    try {
      await change.mutateAsync({ current_password: current, new_password: next });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch {
      // Toast already shown.
    }
  };

  return (
    <SettingsSection icon={KeyRound} title="Password" description="Accounts created with Google or GitHub may not have a password.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password" htmlFor="pw-current">
          <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <FieldGrid>
          <Field label="New password" htmlFor="pw-new" error={tooShort ? 'At least 8 characters' : null}>
            <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-invalid={tooShort} />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm" error={mismatch ? "Passwords don't match" : null}>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch} />
          </Field>
        </FieldGrid>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" size="sm" disabled={!current || !next || mismatch || tooShort || change.isPending}>
            {change.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user) as ProfileUser | null;
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const initial = useMemo(() => formFromUser(user), [user]);
  const [form, setForm] = useState<FormState>(initial);
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  useEffect(() => setForm(initial), [initial]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setNotif = (patch: Partial<FormState['notifications']>) => setForm((f) => ({ ...f, notifications: { ...f.notifications, ...patch } }));

  const handleError =
    form.handle && !/^[a-z0-9._-]{2,32}$/.test(form.handle)
      ? '2–32 characters: lowercase letters, numbers, dots, dashes, underscores'
      : handleStatus === 'taken'
        ? 'That handle is taken'
        : null;

  // Debounced availability check for the handle.
  useEffect(() => {
    if (!form.handle || form.handle === (user?.handle ?? '') || !/^[a-z0-9._-]{2,32}$/.test(form.handle)) {
      setHandleStatus('idle');
      return;
    }
    setHandleStatus('checking');
    const timer = setTimeout(async () => {
      try {
        setHandleStatus((await checkHandleAvailable(form.handle)) ? 'available' : 'taken');
      } catch {
        setHandleStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.handle, user?.handle]);

  const save = async () => {
    if (!form.name.trim() || handleError) return;
    try {
      await updateProfile.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim(),
        title: form.title.trim(),
        pronouns: form.pronouns.trim(),
        timezone: form.timezone,
        notification_prefs: form.notifications,
        ...(form.handle ? { handle: form.handle } : {}),
      });
      toast({ variant: 'success', title: 'Profile saved' });
    } catch {
      // Toast already shown.
    }
  };

  const snoozed = form.notifications.snooze_until && new Date(form.notifications.snooze_until) > new Date();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-xl border border-border bg-gradient-to-br from-card to-brand/[0.04] p-5 sm:flex-row sm:items-center">
        <AvatarUploader user={user} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{user?.name || 'Your profile'}</h1>
            {user?.handle && <Badge variant="mono">@{user.handle}</Badge>}
            {(user?.google_id || user?.github_id) && (
              <Badge variant="info" dot>
                SSO linked
              </Badge>
            )}
          </div>
          {user?.title && <p className="text-sm text-muted-foreground">{user.title}</p>}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {localTime(form.timezone)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3.5" /> {user?.email}
            </span>
            {user?.pronouns && <span>{user.pronouns}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={!dirty || updateProfile.isPending} onClick={() => setForm(initial)}>
            Reset
          </Button>
          <Button size="sm" disabled={!dirty || !!handleError || !form.name.trim() || updateProfile.isPending} onClick={() => void save()}>
            {updateProfile.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <SettingsSection icon={UserRound} title="Identity" description="How you appear to teammates across the workspace.">
            <FieldGrid>
              <Field label="Full name" htmlFor="p-name" error={!form.name.trim() ? 'Name is required' : null}>
                <Input id="p-name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={100} />
              </Field>
              <Field
                label="Handle"
                htmlFor="p-handle"
                error={handleError}
                hint={handleStatus === 'checking' ? 'Checking…' : handleStatus === 'available' ? 'Available' : 'Used for @mentions'}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">@</span>
                  <Input
                    id="p-handle"
                    className="pl-7"
                    value={form.handle}
                    onChange={(e) => set('handle', e.target.value.toLowerCase())}
                    maxLength={32}
                    aria-invalid={!!handleError}
                  />
                </div>
              </Field>
              <Field label="Title" htmlFor="p-title">
                <Input id="p-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={100} placeholder="e.g. Staff engineer" />
              </Field>
              <Field label="Pronouns" htmlFor="p-pronouns">
                <Input id="p-pronouns" value={form.pronouns} onChange={(e) => set('pronouns', e.target.value)} maxLength={40} placeholder="e.g. she/her" />
              </Field>
              <Field label="Email" hint="Your sign-in email can't be changed here.">
                <LockedValue value={user?.email ?? ''} label="Email" />
              </Field>
              <Field label="Phone" htmlFor="p-phone">
                <Input id="p-phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={20} />
              </Field>
              <Field label="Time zone" className="md:col-span-2">
                <Select value={form.timezone} onValueChange={(v) => set('timezone', v)}>
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
            </FieldGrid>
          </SettingsSection>

          <SettingsSection icon={BellRing} title="Notifications" meta={<MetaTag>{snoozed ? 'Snoozed' : 'Active'}</MetaTag>}>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['mentions', 'Mentions', 'When someone @mentions you'],
                  ['assignments', 'Assignments', 'Tasks assigned to you'],
                  ['updates', 'Updates', 'Changes to items you follow'],
                ] as const
              ).map(([key, title, hint]) => (
                <label key={key} className="flex cursor-pointer gap-2.5 rounded-lg border border-border bg-background/40 p-3">
                  <Checkbox checked={form.notifications[key]} onCheckedChange={(v) => setNotif({ [key]: v === true })} className="mt-0.5" />
                  <span>
                    <span className="block text-xs font-medium text-foreground">{title}</span>
                    <span className="block text-2xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-xs font-medium text-foreground">Email digest</span>
                <span className="block text-2xs text-muted-foreground">A summary of what you missed.</span>
              </span>
              <SegmentedControl
                aria-label="Email digest"
                size="sm"
                value={form.notifications.digest}
                onValueChange={(v) => setNotif({ digest: v })}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'instant', label: 'Instant' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-xs font-medium text-foreground">Focus mode</span>
                <span className="block text-2xs text-muted-foreground">
                  {snoozed
                    ? `Notifications paused until ${new Date(form.notifications.snooze_until as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Pause non-urgent notifications for a while.'}
                </span>
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setNotif({ snooze_until: snoozed ? null : new Date(Date.now() + 2 * 3_600_000).toISOString() })}
              >
                {snoozed ? 'Resume now' : 'Snooze for 2 hours'}
              </Button>
            </div>
          </SettingsSection>

          <PasswordCard />
        </div>

        <div className="space-y-6 lg:col-span-5">
          <AppearanceCard user={user} />
          <ConnectedAccounts user={user} />
        </div>
      </div>

      <UnsavedBar visible={dirty} saving={updateProfile.isPending} onReset={() => setForm(initial)} onSave={() => void save()} />
    </div>
  );
}
