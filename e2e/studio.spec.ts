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

type Auth = { token: string; user_info: { _id: string; email: string; name: string }; workspaces: { _id: string; name: string; owner_id: string }[] };

async function signIn(page: Page, auth: Auth, ws: Auth['workspaces'][number], role: 'owner' | 'member') {
  await page.goto('/login');
  await page.evaluate(({ token, user, ws, role }) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token, user, workspaces: [{ ...ws, role }], currentWorkspace: { ...ws, role }, isAuthenticated: true },
      version: 0,
    }));
  }, { token: auth.token, user: auth.user_info, ws, role });
}

async function newSignedInPage(browser: Browser, auth: Auth, ws: Auth['workspaces'][number], role: 'owner' | 'member') {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, auth, ws, role);
  return page;
}

test('side panel tabs, document studio editing, lock and presence', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'Desktop flow; the panel is full screen on phones.');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;

  const owner = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Olivia Owner', email: `own-${stamp}@test.dev`, password: 'Password123!' });
  const mate = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Max Mate', email: `mate-${stamp}@test.dev`, password: 'Password123!' });
  const ws = owner.workspaces[0];
  await call(owner.token, ws._id, 'POST', '/v1/workspace/invitation', { emails: [mate.user_info.email], role: 'member' });
  const space = await call<{ _id: string }>(owner.token, ws._id, 'POST', '/v1/space', {
    name: 'Studio Space', description: '', user_id: owner.user_info._id, is_private: false, is_default: false, shared_members: [], shared_teams: [],
  });
  const folder = await call<{ _id: string }>(owner.token, ws._id, 'POST', '/v1/folder', {
    user_id: owner.user_info._id, entity_type: 'folder', name: 'Specs Folder', shared_members: [], shared_teams: [], space_id: space._id, folder_id: '', group_id: '',
  });
  const doc = await call<{ _id: string }>(owner.token, ws._id, 'POST', '/v1/page/document', {
    user_id: owner.user_info._id, title: 'Studio Spec', page_type: 'document', entity_type: 'page', content: { text: '' }, summary: '',
    last_updated_by: owner.user_info._id, custom_meta: {}, attachments: [], space_id: space._id, folder_id: '', group_id: '',
  });

  await signIn(page, owner, ws, 'owner');

  // Open the document, then the folder, in the side panel from the file list.
  // Clicking a page in the main list opens it in side peek, keeping the list in place.
  await page.goto('/');
  await page.getByRole('row', { name: /Studio Spec/ }).getByText('Studio Spec').click();
  const panel = page.getByRole('complementary', { name: 'Side panel' });
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(/\/\?/);
  await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Studio Spec');
  await panel.getByRole('button', { name: 'Close panel' }).click();
  await expect(panel).toHaveCount(0);

  await page.getByRole('row', { name: /Studio Spec/ }).getByRole('button', { name: 'More actions for Studio Spec' }).click();
  await page.getByRole('menuitem', { name: 'Open in side panel' }).click();
  await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Studio Spec');

  await page.goto(`/?${encodeURIComponent(`/document/${doc._id}`)}=_sidebar&${encodeURIComponent(`/folder/${folder._id}`)}=_sidebar`);
  const tabs = panel.getByRole('tab');
  await expect(tabs).toHaveCount(2);
  await expect(panel.getByRole('heading', { name: 'Specs Folder' })).toBeVisible();
  await tabs.filter({ hasText: 'Studio Spec' }).getByRole('button').first().click();
  await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Studio Spec');

  // Rename inside the panel; it saves, and the full page shows the new title.
  await panel.getByLabel('Title', { exact: true }).fill('Studio Spec v2');
  await expect(panel.getByText('Saved').first()).toBeVisible({ timeout: 10_000 });
  await panel.getByRole('button', { name: 'Open full page' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/document/${doc._id}$`));
  await expect(panel).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Studio Spec v2');

  // Status and lock.
  await page.getByRole('button', { name: 'Document status' }).click();
  await page.getByRole('menuitem', { name: 'Approved' }).click();
  await expect(page.getByRole('button', { name: 'Document status' })).toContainText('Approved');
  await page.getByRole('button', { name: 'Lock page' }).click();
  await expect(page.getByRole('button', { name: 'Unlock page' })).toHaveAttribute('aria-pressed', 'true');

  // A teammate opening the page shows up in presence; the locked page is read-only for them.
  const matePage = await newSignedInPage(browser, mate, ws, 'member');
  await matePage.goto(`/document/${doc._id}`);
  await expect(matePage.getByLabel('Title', { exact: true })).toBeDisabled();
  await expect(page.getByLabel(/1 other person here/)).toBeVisible({ timeout: 15_000 });
  await matePage.context().close();
  await expect(page.getByLabel(/1 other person here/)).toHaveCount(0, { timeout: 15_000 });

  await page.getByRole('button', { name: 'Unlock page' }).click();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('sheet and whiteboard studios render and rename', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Canvas studios are checked on desktop.');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  const owner = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Cara Canvas', email: `canvas-${stamp}@test.dev`, password: 'Password123!' });
  const ws = owner.workspaces[0];
  const space = await call<{ _id: string }>(owner.token, ws._id, 'POST', '/v1/space', {
    name: 'Canvas Space', description: '', user_id: owner.user_info._id, is_private: false, is_default: false, shared_members: [], shared_teams: [],
  });
  const make = (title: string, page_type: string) =>
    call<{ _id: string }>(owner.token, ws._id, 'POST', '/v1/page/document', {
      user_id: owner.user_info._id, title, page_type, entity_type: 'page', content: {}, summary: '',
      last_updated_by: owner.user_info._id, custom_meta: {}, attachments: [], space_id: space._id, folder_id: '', group_id: '',
    });
  const sheet = await make('Budget Sheet', 'sheet');
  const board = await make('Flow Board', 'whiteboard');
  await signIn(page, owner, ws, 'owner');

  await page.goto(`/document/${sheet._id}`);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Budget Sheet');
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  await page.getByLabel('Title', { exact: true }).fill('Budget Sheet 2026');
  await page.getByLabel('Title', { exact: true }).press('Enter');
  await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 10_000 });

  await page.goto(`/document/${board._id}`);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Flow Board');
  await expect(page.getByRole('button', { name: 'Present' })).toBeVisible();
  await expect(page.locator('.excalidraw canvas').first()).toBeVisible({ timeout: 20_000 });

  const renamed = await call<{ title: string }[]>(owner.token, ws._id, 'GET', `/v1/page/document?id=${sheet._id}`);
  expect(JSON.stringify(renamed)).toContain('Budget Sheet 2026');
  expect(errors, errors.join('\n')).toEqual([]);
});
