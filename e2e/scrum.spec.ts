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

type Auth = { token: string; user_info: { _id: string; email: string; name: string }; workspaces: { _id: string }[] };
type Doc = { _id: string; title: string; custom_meta?: { values?: Record<string, unknown> }; subtasks?: Doc[] };
type Sprint = { _id: string; name: string; status: string; committed?: { points: number } | null };

const FIELDS = [
  { type: 'select', label: 'Status', name: 'status', hasOptions: true, options: [{ label: 'Backlog', value: 'backlog' }, { label: 'To Do', value: 'todo' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Review', value: 'review' }, { label: 'Done', value: 'done' }] },
  { type: 'dynamic-select', label: 'Assignee', name: 'assignee', hasOptions: true, source: 'board-members' },
  { type: 'select', label: 'Priority', name: 'priority', hasOptions: true, options: [{ label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }] },
  { type: 'input', label: 'Story points', name: 'story_points', hasOptions: false },
  { type: 'epic', label: 'Epic', name: 'epic', hasOptions: false },
  { type: 'input', label: 'Sprint', name: 'sprint', hasOptions: false },
];

async function drag(page: Page, from: Locator, to: Locator) {
  await from.scrollIntoViewIfNeeded();
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + Math.min(20, a.height / 2));
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + 25, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(30, b.height / 2), { steps: 15 });
  await page.mouse.up();
}

test('scrum: plan, start, work the board, reports, rebalance, complete', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Planning and drag flows are checked on desktop.');
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;

  const owner = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Pat Planner', email: `pat-${stamp}@test.dev`, password: 'Password123!' });
  const mate = await call<Auth>(null, null, 'POST', '/v1/auth/register', { name: 'Quinn Mate', email: `quinn-${stamp}@test.dev`, password: 'Password123!' });
  const ws = owner.workspaces[0]._id;
  const tk = owner.token;
  await call(tk, ws, 'POST', '/v1/workspace/invitation', { emails: [mate.user_info.email], role: 'member' });
  const space = await call<{ _id: string }>(tk, ws, 'POST', '/v1/space', { name: 'Team', description: '', user_id: owner.user_info._id, is_private: false, is_default: false, shared_members: [], shared_teams: [] });
  const created = await call<{ _id: string } | { _id: string }[]>(tk, ws, 'POST', '/v1/board', {
    name: 'Core Scrum', description: '', user_id: owner.user_info._id, is_private: false, shared_members: [], shared_teams: [], space_id: space._id, custom_meta: { board_kind: 'scrum', fields: FIELDS },
  });
  const boardId = (Array.isArray(created) ? created[0] : created)._id;
  const mk = (title: string, values: Record<string, unknown>) =>
    call<Doc>(tk, ws, 'POST', '/v1/page/document', {
      user_id: owner.user_info._id, title, page_type: 'document', entity_type: 'page', content: { text: '' }, summary: '', last_updated_by: owner.user_info._id,
      custom_meta: { fields: FIELDS, values }, board_id: boardId, attachments: [],
    });
  await mk('Design login API', { status: 'todo', story_points: 5, epic: 'Auth', assignee: owner.user_info._id, priority: 'high' });
  await mk('Rate limiter', { status: 'todo', story_points: 3, epic: 'Auth', assignee: owner.user_info._id });
  await mk('Docs refresh', { status: 'backlog', story_points: 2 });

  const tasks = async () => (await call<{ documents: Doc[] }[]>(tk, ws, 'GET', `/v1/board?id=${boardId}`))[0].documents;
  const valueOf = async (title: string, field: string) => (await tasks()).find((t) => t.title === title)?.custom_meta?.values?.[field];
  const sprints = () => call<Sprint[]>(tk, ws, 'GET', `/v1/board/sprint?board_id=${boardId}`);

  await page.goto('/login');
  await page.evaluate(({ token, user, ws }) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token, user, workspaces: [{ _id: ws, name: 'Pat Workspace', role: 'owner' }], currentWorkspace: { _id: ws, name: 'Pat Workspace', role: 'owner' }, isAuthenticated: true }, version: 0 }));
  }, { token: tk, user: owner.user_info, ws });

  // Empty state → create a sprint.
  await page.goto(`/scrum/${boardId}`);
  await expect(page.getByText('Plan your first sprint')).toBeVisible();
  await page.getByRole('button', { name: 'New sprint' }).first().click();
  await page.getByLabel('Name').fill('Sprint 1');
  await page.getByLabel('Sprint goal').fill('Ship login');
  await page.getByRole('button', { name: 'Create sprint' }).click();
  await expect.poll(async () => (await sprints()).map((s) => s.name)).toEqual(['Sprint 1']);

  // Backlog: move two issues into the sprint.
  await page.getByRole('tab', { name: /Backlog & sprints/ }).click();
  const sprintSection = page.locator('section[aria-label="Sprint 1"]');
  await expect(sprintSection).toBeVisible();
  for (const title of ['Design login API', 'Rate limiter']) {
    await page.getByRole('button', { name: `Move ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Sprint 1' }).click();
    await expect(sprintSection.getByText(title)).toBeVisible();
  }
  const sprintId = (await sprints())[0]._id;
  await expect.poll(() => valueOf('Rate limiter', 'sprint')).toBe(sprintId);

  // Start the sprint: commitment snapshot = 8 pts.
  await sprintSection.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Start sprint' }).click();
  await expect.poll(async () => (await sprints())[0].status).toBe('active');
  expect((await sprints())[0].committed?.points).toBe(8);

  // Sprint board: goal banner, drag to In progress.
  await page.getByRole('tab', { name: /Sprint board/ }).click();
  await expect(page.getByRole('region', { name: 'Sprint goal' })).toContainText('Ship login');
  const lane = page.locator('section[aria-label="Epic: Auth"]');
  await expect(lane).toBeVisible();
  const cells = lane.locator(':scope > div > div');
  await drag(page, lane.locator('article[aria-label="Rate limiter"]'), cells.nth(1));
  await expect.poll(() => valueOf('Rate limiter', 'status')).toBe('in_progress');

  // Reports render.
  for (const tab of [/Burndown & velocity/, /Flow \(CFD\)/, /Scope & epics/]) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('region').first()).toBeVisible();
  }
  await page.getByRole('tab', { name: /Burndown & velocity/ }).click();
  await expect(page.getByRole('img', { name: /burndown chart/ })).toBeVisible();

  // Capacity: set capacity so the owner is overloaded, then rebalance to the teammate.
  await call(tk, ws, 'PUT', `/v1/board?id=${boardId}`, { id: boardId, capacity: { members: { [owner.user_info._id]: { capacity_pts: 6 }, [mate.user_info._id]: { capacity_pts: 10 } }, policy: { safety_ceiling: 0.85 } } });
  await page.reload();
  await page.getByRole('tab', { name: /Capacity & workload/ }).click();
  await page.getByRole('button', { name: 'Auto-balance' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Rebalance workload');
  await dialog.getByRole('button', { name: /Confirm & transfer/ }).click();
  await expect.poll(async () => (await tasks()).filter((t) => t.custom_meta?.values?.assignee === mate.user_info._id).length).toBe(1);

  // Complete: unfinished work goes to the backlog.
  await page.getByRole('button', { name: 'Complete sprint' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Complete sprint' }).click();
  await expect.poll(async () => (await sprints())[0].status).toBe('closed');
  await expect.poll(() => valueOf('Rate limiter', 'sprint')).toBeFalsy();

  expect(errors, errors.join('\n')).toEqual([]);
});
