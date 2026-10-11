import { expect, test, type Browser, type Page } from '@playwright/test';

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

async function open(browser: Browser, auth: Auth, ws: { _id: string; name: string }, role: string, path: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.evaluate(({ token, user, ws, role }) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token, user, workspaces: [{ ...ws, role }], currentWorkspace: { ...ws, role }, isAuthenticated: true }, version: 0 }));
  }, { token: auth.token, user: auth.user_info, ws, role });
  await page.goto(path);
  return page;
}

async function typeAndSend(page: Page, label: RegExp | string, text: string) {
  const box = page.getByRole('textbox', { name: label });
  await box.click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

test('chat: live messages, typing, reactions, threads, edit, pin, bookmarks, search, delete', async ({ browser, isMobile }) => {
  test.skip(isMobile, 'Two-person realtime flow runs on desktop.');
  test.setTimeout(150_000);
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  const pat = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Pat Sender', email: `pat-${stamp}@test.dev`, password: 'Password123!' });
  const quinn = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Quinn Reader', email: `quinn-${stamp}@test.dev`, password: 'Password123!' });
  const ws = pat.workspaces[0];
  await call(pat.token, ws._id, 'POST', '/v1/workspace/invitation', { emails: [quinn.user_info.email], role: 'member' });
  const dm = await call<{ _id: string }>(pat.token, ws._id, 'POST', '/v1/chat/conversation', { type: 'dm', target_user_id: quinn.user_info._id });

  const a = await open(browser, pat, ws, 'owner', `/chat?c=${dm._id}`);
  const b = await open(browser, quinn, ws, 'member', `/chat?c=${dm._id}`);
  const errors: string[] = [];
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));
  await expect(a.getByRole('textbox', { name: /^Message / })).toBeVisible();
  await expect(b.getByRole('textbox', { name: /^Message / })).toBeVisible();

  // Typing indicator, then live delivery.
  await a.getByRole('textbox', { name: /^Message / }).click();
  await a.keyboard.type('Hello Quinn, the deploy is');
  await expect(b.getByText(/Pat is typing/)).toBeVisible({ timeout: 10_000 });
  await a.keyboard.type(' green');
  await a.keyboard.press('Enter');
  const msgB = b.getByRole('article', { name: /Pat Sender/ }).filter({ hasText: 'Hello Quinn, the deploy is green' });
  await expect(msgB).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText(/Pat is typing/)).toHaveCount(0);

  // Reaction shows up for the sender.
  await msgB.hover();
  await msgB.getByRole('button', { name: 'React with 👍' }).click();
  const msgA = a.getByRole('article').filter({ hasText: 'Hello Quinn, the deploy is green' }).first();
  await expect(msgA.getByRole('button', { name: /👍 1/ })).toBeVisible({ timeout: 10_000 });

  // Thread reply from Quinn appears as a reply count for Pat.
  await msgB.hover();
  await msgB.getByRole('button', { name: 'Reply in thread' }).click();
  const thread = b.getByRole('complementary', { name: 'Thread' });
  await expect(thread).toBeVisible();
  await typeAndSend(b, 'Reply to thread', 'Nice, shipping notes next');
  await expect(thread.getByText('Nice, shipping notes next')).toBeVisible();
  await expect(msgA.getByRole('button', { name: /1 reply/ })).toBeVisible({ timeout: 10_000 });

  // Edit and pin own message.
  await msgA.hover();
  await msgA.getByRole('button', { name: 'More message actions' }).click();
  await a.getByRole('menuitem', { name: 'Edit message' }).click();
  await a.getByRole('textbox', { name: 'Edit message' }).fill('Hello Quinn, the deploy is green (prod)');
  await a.keyboard.press('Enter');
  await expect(b.getByRole('log', { name: 'Messages' }).getByText('Hello Quinn, the deploy is green (prod)')).toBeVisible({ timeout: 10_000 });
  await expect(b.getByRole('log', { name: 'Messages' }).getByText('(edited)')).toBeVisible();
  const edited = a.getByRole('article').filter({ hasText: '(prod)' }).first();
  await edited.hover();
  await edited.getByRole('button', { name: 'More message actions' }).click();
  await a.getByRole('menuitem', { name: 'Pin message' }).click();
  await expect(a.getByRole('button', { name: 'Pinned messages (1)' })).toBeVisible({ timeout: 10_000 });

  // Bookmark and search.
  await a.getByRole('button', { name: 'Bookmark' }).click();
  await a.getByRole('textbox', { name: 'Title', exact: true }).fill('Release board');
  await a.getByRole('textbox', { name: 'Link', exact: true }).fill('/');
  await a.getByRole('button', { name: 'Add bookmark' }).click();
  await expect(b.getByRole('button', { name: 'Release board', exact: true })).toBeVisible({ timeout: 10_000 });
  await a.getByRole('button', { name: 'Search messages' }).click();
  await a.getByRole('textbox', { name: 'Search messages' }).fill('shipping');
  await expect(a.getByText('Nice, shipping notes next')).toBeVisible();
  await a.keyboard.press('Escape');

  // Delete: replaced for both people, thread survives.
  await typeAndSend(a, /^Message /, 'oops wrong chat');
  const oops = a.getByRole('article').filter({ hasText: 'oops wrong chat' }).first();
  await expect(b.getByText('oops wrong chat')).toBeVisible({ timeout: 10_000 });
  await oops.hover();
  await oops.getByRole('button', { name: 'More message actions' }).click();
  await a.getByRole('menuitem', { name: 'Delete message' }).click();
  await a.getByRole('button', { name: 'Delete' }).click();
  await expect(b.getByText('oops wrong chat')).toHaveCount(0, { timeout: 10_000 });
  await expect(b.getByText('This message was deleted.')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});
