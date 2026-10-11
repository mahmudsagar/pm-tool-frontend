import { expect, test } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';

async function call<T>(token: string | null, ws: string | null, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...(ws && { 'X-Workspace-ID': ws }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.status !== 'success') throw new Error(`${method} ${path}: ${JSON.stringify(json)}`);
  return json.data as T;
}

type Auth = { token: string; user_info: { _id: string; email: string; name: string }; workspaces: { _id: string; name: string }[] };

test('desktop notifications: turn on, DM alert, click opens the chat, turn off', async ({ browser, isMobile }) => {
  test.skip(isMobile, 'Desktop notification settings are checked on desktop.');
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  const me = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Nia Notified', email: `nia-${stamp}@test.dev`, password: 'Password123!' });
  const mate = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Omar Sender', email: `omar-${stamp}@test.dev`, password: 'Password123!' });
  const ws = me.workspaces[0];
  await call(me.token, ws._id, 'POST', '/v1/workspace/invitation', { emails: [mate.user_info.email], role: 'member' });
  const dm = await call<{ _id: string }>(me.token, ws._id, 'POST', '/v1/chat/conversation', { type: 'dm', target_user_id: mate.user_info._id });

  const context = await browser.newContext();
  await context.grantPermissions(['notifications']);
  // Record notifications instead of showing them; keep permission semantics.
  await context.addInitScript(() => {
    const shown: { title: string; body?: string; n: { onclick: null | (() => void) } }[] = [];
    (window as unknown as { __shown: typeof shown }).__shown = shown;
    class FakeNotification {
      static permission: NotificationPermission = 'granted';
      static requestPermission = async () => 'granted' as NotificationPermission;
      onclick: null | (() => void) = null;
      constructor(title: string, opts?: NotificationOptions) {
        shown.push({ title, body: opts?.body, n: this });
      }
      close() {}
    }
    (window as unknown as { Notification: unknown }).Notification = FakeNotification;
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  await page.evaluate(({ token, user, ws }) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token, user, workspaces: [{ ...ws, role: 'owner' }], currentWorkspace: { ...ws, role: 'owner' }, isAuthenticated: true }, version: 0 }));
  }, { token: me.token, user: me.user_info, ws });

  // Turn on in profile settings; alert while focused so headless tabs still show them.
  await page.goto('/settings/');
  const toggle = page.getByRole('switch', { name: 'Desktop notifications' });
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shown: { title: string }[] }).__shown.map((s) => s.title))).toContain('Desktop notifications are on');
  await page.getByRole('switch', { name: 'Alert while this tab is open' }).click();

  // Somewhere other than the DM: a direct message alerts.
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
  await page.waitForTimeout(1500);
  await call(mate.token, ws._id, 'POST', '/v1/chat/message', { conversation_id: dm._id, body: 'Can you review my PR?', attachments: [] });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __shown: { title: string; body?: string }[] }).__shown.find((s) => s.title === 'Omar Sender')?.body), { timeout: 15_000 })
    .toBe('Can you review my PR?');

  // Clicking the alert opens the conversation.
  await page.evaluate(() => (window as unknown as { __shown: { title: string; n: { onclick: null | (() => void) } }[] }).__shown.find((s) => s.title === 'Omar Sender')?.n.onclick?.());
  await expect(page).toHaveURL(new RegExp(`/chat\\?c=${dm._id}`));
  await expect(page.getByRole('log', { name: 'Messages' }).getByText('Can you review my PR?')).toBeVisible();

  // Turning it off from the bell stops alerts.
  await page.getByRole('button', { name: 'Notifications' }).click();
  const bellToggle = page.getByRole('dialog').getByRole('switch', { name: 'Desktop notifications' });
  await expect(bellToggle).toBeChecked();
  await bellToggle.click();
  await expect(bellToggle).not.toBeChecked();
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => (window as unknown as { __shown: unknown[] }).__shown.length);
  await call(mate.token, ws._id, 'POST', '/v1/chat/message', { conversation_id: dm._id, body: 'ping again', attachments: [] });
  await expect(page.getByRole('log', { name: 'Messages' }).getByText('ping again')).toBeVisible({ timeout: 10_000 });
  expect(await page.evaluate(() => (window as unknown as { __shown: unknown[] }).__shown.length)).toBe(before);

  expect(errors, errors.join('\n')).toEqual([]);
  await context.close();
});
