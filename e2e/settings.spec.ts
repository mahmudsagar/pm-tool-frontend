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

type Auth = { token: string; user_info: { _id: string; email: string }; workspaces: { _id: string; name: string; owner_id: string }[] };

test('profile, workspace and invitations', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Settings flows are covered on desktop.');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  const owner = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Owner Person', email: `owner-${stamp}@test.dev`, password: 'Password123!' });
  const ws = owner.workspaces[0];

  await page.goto('/login');
  await page.evaluate(({ token, user, ws }) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token, user, workspaces: [{ ...ws, role: 'owner' }], currentWorkspace: { ...ws, role: 'owner' }, isAuthenticated: true },
      version: 0,
    }));
  }, { token: owner.token, user: owner.user_info, ws });

  // Profile: change the title and save.
  await page.goto('/settings');
  await page.getByLabel('Title').fill('Head of Platform');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Owner Person' }).locator('..').locator('..')).toContainText('Head of Platform');

  // Workspace: rename; the sidebar switcher reflects it.
  await page.goto('/settings/workspace');
  const name = page.getByLabel('Workspace name');
  await name.fill(`Renamed ${stamp}`);
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await expect(page.getByText('Workspace settings saved').first()).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Main navigation' })).toContainText(`Renamed ${stamp}`);

  // Invite a brand-new email; it shows as pending.
  const invitee = `invitee-${stamp}@test.dev`;
  await page.goto('/settings/members');
  await page.getByRole('button', { name: 'Invite members' }).click();
  await page.getByLabel('Emails').fill(invitee);
  await page.getByRole('button', { name: /^Invite 1/ }).click();
  await expect(page.getByRole('dialog').getByText('Invited')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('row', { name: new RegExp(invitee) })).toBeVisible();

  // When that person signs up, they join the workspace automatically.
  const joined = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'New Teammate', email: invitee, password: 'Password123!' });
  expect(joined.workspaces.map((w) => w._id)).toContain(ws._id);
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByRole('row', { name: /New Teammate/ })).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});
