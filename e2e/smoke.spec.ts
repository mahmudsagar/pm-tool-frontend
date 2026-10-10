import { expect, test, type Page } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';

interface Session {
  token: string;
  user: { _id: string; name: string };
  currentWorkspace: { _id: string; name: string };
}

async function readSession(page: Page): Promise<Session> {
  const raw = await page.evaluate(() => localStorage.getItem('auth-storage'));
  return JSON.parse(raw ?? '{}').state;
}

async function api<T>(session: Session, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      'X-Workspace-ID': session.currentWorkspace._id,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(`${method} ${path} failed: ${JSON.stringify(json)}`);
  return json.data as T;
}

/** Fails the test on any uncaught error in the page. */
function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function openNav(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
}

test('register, browse the workspace, open a document, sign out', async ({ page, isMobile }) => {
  const errors = trackPageErrors(page);
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.dev`;

  // Unauthenticated users are sent to the login page.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);

  // Register through the UI.
  await page.getByRole('button', { name: 'Need an account? Register' }).click();
  await page.getByLabel('Name').fill('E2E Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('My Files')).toBeVisible();

  // Data created through the API appears in the sidebar via the space tree query.
  const session = await readSession(page);
  expect(session.token).toBeTruthy();
  const space = await api<{ _id: string }>(session, 'POST', '/v1/space', {
    name: 'E2E Space',
    description: '',
    user_id: session.user._id,
    is_private: false,
    is_default: false,
    shared_members: [],
    shared_teams: [],
  });
  const doc = await api<{ _id: string }>(session, 'POST', '/v1/page/document', {
    user_id: session.user._id,
    title: 'E2E Doc',
    page_type: 'document',
    entity_type: 'page',
    content: { text: '' },
    summary: '',
    last_updated_by: session.user._id,
    custom_meta: {},
    folder_id: '',
    group_id: '',
    space_id: space._id,
    attachments: [],
  });

  await page.reload();
  await openNav(page, isMobile);
  await expect(page.getByText('E2E Space').first()).toBeVisible();
  if (isMobile) await page.keyboard.press('Escape');

  // The document route lazy-loads the editor.
  await page.goto(`/document/${doc._id}`);
  await expect(page.locator('[contenteditable="true"]').first()).toBeVisible({ timeout: 30_000 });

  // Unknown routes render the in-app 404.
  await page.goto('/definitely-not-a-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

  // Other top-level pages render.
  await page.goto('/settings');
  await expect(page.getByRole('heading').first()).toBeVisible();
  await page.goto('/chat');
  await expect(page.locator('main')).toBeVisible();

  // Sign out returns to login and clears the session.
  await page.evaluate(async () => {
    const { default: useAuthStore } = await import('/src/stores/useAuthStore.ts');
    await useAuthStore.getState().logout();
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);

  expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('an invalid stored token signs the user out instead of breaking the app', async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          token: 'not-a-real-token',
          isAuthenticated: true,
          user: { _id: '000000000000000000000000', name: 'Ghost', email: 'ghost@test.dev' },
          workspaces: [],
          currentWorkspace: { _id: '000000000000000000000000', name: 'Ghost WS', owner_id: 'x' },
        },
        version: 0,
      }),
    );
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  expect(errors).toEqual([]);
});
