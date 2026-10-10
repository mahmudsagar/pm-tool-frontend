import { expect, test, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';

async function call<T>(token: string | null, ws: string | null, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(ws && { 'X-Workspace-ID': ws }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.status !== 'success') throw new Error(`${method} ${path}: ${JSON.stringify(json)}`);
  return json.data as T;
}

/** Registers a user with one space and one document, and signs the browser in. */
async function seed(page: Page) {
  const email = `lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.dev`;
  const auth = await call<{ token: string; user_info: { _id: string }; workspaces: { _id: string; name: string; owner_id: string }[] }>(
    null, null, 'POST', '/v1/auth/register', { name: 'Library Tester', email, password: 'Password123!' },
  );
  const ws = auth.workspaces[0];
  const space = await call<{ _id: string }>(auth.token, ws._id, 'POST', '/v1/space', {
    name: 'Library Space', description: '', user_id: auth.user_info._id, is_private: false, is_default: false, shared_members: [], shared_teams: [],
  });
  const doc = await call<{ _id: string }>(auth.token, ws._id, 'POST', '/v1/page/document', {
    user_id: auth.user_info._id, title: 'Quarterly Plan', page_type: 'document', entity_type: 'page', content: { text: '' }, summary: '',
    last_updated_by: auth.user_info._id, custom_meta: {}, attachments: [], space_id: space._id, folder_id: '', group_id: '',
  });
  await page.goto('/login');
  await page.evaluate(({ token, user, ws }) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token, user, workspaces: [{ ...ws, role: 'owner' }], currentWorkspace: { ...ws, role: 'owner' }, isAuthenticated: true },
      version: 0,
    }));
  }, { token: auth.token, user: auth.user_info, ws });
  return { doc };
}

test('recent, starred, trash and restore', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Covered on desktop; the flow is the same on phones.');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const { doc } = await seed(page);

  // Opening a document records it in Recent.
  await page.goto(`/document/${doc._id}`);
  await expect(page.locator('[contenteditable="true"]').first()).toBeVisible({ timeout: 30_000 });
  await page.goto('/recent');
  await expect(page.getByRole('row', { name: /Quarterly Plan/ })).toBeVisible();

  // Star it from the hub file list, then find it in Starred.
  await page.goto('/');
  const row = page.getByRole('row', { name: /Quarterly Plan/ });
  await row.hover();
  await row.getByRole('button', { name: 'Star Quarterly Plan' }).click();
  await expect(row.getByRole('button', { name: 'Unstar Quarterly Plan' })).toBeVisible();
  await page.goto('/starred');
  await expect(page.getByRole('row', { name: /Quarterly Plan/ })).toBeVisible();

  // Delete it from its menu; it moves to Trash.
  await page.goto('/');
  await page.getByRole('row', { name: /Quarterly Plan/ }).getByRole('button', { name: 'More actions for Quarterly Plan' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('row', { name: /Quarterly Plan/ })).toHaveCount(0);

  await page.goto('/trash');
  const trashed = page.getByRole('listitem').filter({ hasText: 'Quarterly Plan' });
  await expect(trashed).toBeVisible();
  await trashed.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText('Trash is empty')).toBeVisible();

  // Restored items are back in the workspace.
  await page.goto('/');
  await expect(page.getByRole('row', { name: /Quarterly Plan/ })).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});
