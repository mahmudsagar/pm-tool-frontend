import { expect, test, type Locator, type Page } from '@playwright/test';

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
type Doc = { _id: string; title: string; task_key?: string; custom_meta?: { values?: Record<string, unknown> }; subtasks?: Doc[] };

const FIELDS = [
  { type: 'select', label: 'Status', name: 'status', hasOptions: true, options: [{ label: 'To Do', value: 'todo' }, { label: 'In Progress', value: 'in-progress' }, { label: 'Review', value: 'review' }, { label: 'Done', value: 'done' }] },
  { type: 'dynamic-select', label: 'Assignee', name: 'assignee', hasOptions: true, source: 'board-members' },
  { type: 'select', label: 'Priority', name: 'priority', hasOptions: true, options: [{ label: 'Urgent', value: 'urgent' }, { label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }] },
  { type: 'input', label: 'Type', name: 'type', hasOptions: false },
  { type: 'daterange', label: 'Dates', name: 'dates', hasOptions: false },
];

async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(40, b.height / 2), { steps: 15 });
  await page.mouse.up();
}

test('databoard views: table edits, bulk, kanban drag, calendar scheduling, timeline, side panel', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Drag and drop flows are checked on desktop.');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;

  const owner = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Bo Board', email: `board-${stamp}@test.dev`, password: 'Password123!' });
  const ws = owner.workspaces[0];
  const tk = owner.token;
  const space = await call<{ _id: string }>(tk, ws._id, 'POST', '/v1/space', { name: 'Ops', description: '', user_id: owner.user_info._id, is_private: false, is_default: false, shared_members: [], shared_teams: [] });
  const created = await call<{ _id: string } | { _id: string }[]>(tk, ws._id, 'POST', '/v1/board', {
    name: 'Release Train', description: 'Board for e2e', user_id: owner.user_info._id, is_private: false, shared_members: [], shared_teams: [], space_id: space._id, custom_meta: { fields: FIELDS },
  });
  const boardId = (Array.isArray(created) ? created[0] : created)._id;
  const mk = (title: string, values: Record<string, unknown>) =>
    call<Doc>(tk, ws._id, 'POST', '/v1/page/document', {
      user_id: owner.user_info._id, title, page_type: 'document', entity_type: 'page', content: { text: '' }, summary: '', last_updated_by: owner.user_info._id,
      custom_meta: { fields: FIELDS, values }, board_id: boardId, attachments: [],
    });
  const today = new Date().toISOString().slice(0, 10);
  await mk('Ship login flow', { status: 'todo', priority: 'high', dates: { from: today, to: today } });
  await mk('Fix flaky upload', { status: 'todo', priority: 'low' });
  await mk('Write release notes', { status: 'in-progress', priority: 'medium' });

  const tasks = async () => {
    const data = await call<{ documents: Doc[] }[]>(tk, ws._id, 'GET', `/v1/board?id=${boardId}`);
    return data[0].documents.flatMap((d) => [d, ...(d.subtasks ?? [])]);
  };
  const valueOf = async (title: string, field: string) => (await tasks()).find((t) => t.title === title)?.custom_meta?.values?.[field];

  await page.goto('/login');
  await page.evaluate(({ token, user, ws }) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token, user, workspaces: [{ ...ws, role: 'owner' }], currentWorkspace: { ...ws, role: 'owner' }, isAuthenticated: true }, version: 0 }));
  }, { token: tk, user: owner.user_info, ws });

  // Table: keys, grouping, inline add.
  await page.goto(`/board/${boardId}`);
  await expect(page.getByLabel('Board name')).toHaveValue('Release Train');
  const grid = page.getByRole('grid', { name: 'Tasks' });
  await expect(grid.getByRole('row', { name: /Ship login flow/ })).toContainText(/RT-\d+/);
  await page.getByRole('button', { name: 'Add task to To Do…' }).click();
  await page.getByPlaceholder('Task name, then Enter').fill('Rotate API keys');
  await page.keyboard.press('Enter');
  await expect(grid.getByRole('row', { name: /Rotate API keys/ })).toBeVisible();
  await expect.poll(() => valueOf('Rotate API keys', 'status')).toBe('todo');
  await page.keyboard.press('Escape');

  // Inline status edit.
  await grid.getByRole('row', { name: /Fix flaky upload/ }).getByRole('button', { name: /^Status:/ }).click();
  await page.getByRole('menuitem', { name: 'Review' }).click();
  await expect.poll(() => valueOf('Fix flaky upload', 'status')).toBe('review');

  // Bulk priority.
  await page.getByRole('checkbox', { name: 'Select Ship login flow' }).click();
  await page.getByRole('checkbox', { name: 'Select Rotate API keys' }).click();
  const bulk = page.getByRole('toolbar', { name: 'Bulk actions' });
  await expect(bulk).toContainText('2 selected');
  await bulk.getByRole('button', { name: 'Priority' }).click();
  await page.getByRole('menuitem', { name: 'Urgent' }).click();
  await expect.poll(() => valueOf('Rotate API keys', 'priority')).toBe('urgent');
  await expect.poll(() => valueOf('Ship login flow', 'priority')).toBe('urgent');
  await bulk.getByRole('button', { name: 'Clear selection' }).click();

  // Row opens the side panel.
  await grid.getByRole('row', { name: /Write release notes/ }).getByText('Write release notes').click();
  const panel = page.getByRole('complementary', { name: 'Side panel' });
  await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Write release notes');
  await panel.getByRole('button', { name: 'Close panel' }).click();

  // Kanban: drag a card to In Progress.
  await page.getByRole('tab', { name: 'Kanban' }).click();
  await expect(page.getByRole('tab', { name: 'Kanban' })).toHaveAttribute('aria-selected', 'true');
  const inProgress = page.getByRole('region', { name: 'In Progress' }).or(page.locator('section[aria-label="In Progress"]')).first();
  await drag(page, page.locator('article[aria-label="Rotate API keys"]'), inProgress);
  await expect.poll(() => valueOf('Rotate API keys', 'status')).toBe('in-progress');

  // Calendar: schedule an unscheduled task from the tray.
  await page.getByRole('tab', { name: 'Calendar' }).click();
  const tray = page.getByRole('complementary', { name: 'Unscheduled tasks' });
  await expect(tray).toContainText('Fix flaky upload');
  const target = page.getByRole('gridcell', { name: new Date().toDateString() });
  await drag(page, tray.getByRole('button', { name: /Fix flaky upload/ }), target);
  await expect.poll(async () => JSON.stringify(await valueOf('Fix flaky upload', 'dates'))).toContain(today);

  // Timeline renders bars and switches zoom.
  await page.getByRole('tab', { name: 'Timeline' }).click();
  await expect(page.getByRole('button', { name: /Ship login flow, / })).toBeVisible();
  await page.getByRole('radio', { name: 'Days' }).click();
  await expect(page.getByRole('button', { name: /Fix flaky upload, / })).toBeVisible();

  // The chosen tab is remembered in this browser.
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');

  expect(errors, errors.join('\n')).toEqual([]);
});
