/** @typedef {{ label: string, value: string }} BoardOption */

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;
export const SCORE_FIELD_NAMES = new Set(['effort_score', 'value_score']);

/** @param {string | undefined | null} name */
export function isScoreFieldName(name) {
  return SCORE_FIELD_NAMES.has(String(name || ''));
}

/** @param {unknown} raw @returns {string} */
export function clampScoreValue(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n);
  if (rounded < SCORE_MIN) return String(SCORE_MIN);
  if (rounded > SCORE_MAX) return String(SCORE_MAX);
  return String(rounded);
}

/** @param {unknown} raw */
export function validateScoreValue(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return true;
  const n = Number(trimmed);
  return Number.isFinite(n) && Number.isInteger(n) && n >= SCORE_MIN && n <= SCORE_MAX;
}

export const SCRUM_BOARD_KIND = 'scrum';

/** @param {{ board_kind?: string } | null | undefined} customMeta */
export function isScrumBoardKind(customMeta) {
  return customMeta?.board_kind === SCRUM_BOARD_KIND;
}

/** @param {{ entity_type?: string, page_type?: string, custom_meta?: { board_kind?: string } } | null | undefined} item */
export function resolveBoardListPageType(item) {
  if (!item) return null;
  if (item.page_type === 'scrum' || item.page_type === 'board') return item.page_type;
  if (item.entity_type === 'board' || item.custom_meta?.board_kind) {
    return isScrumBoardKind(item.custom_meta) ? 'scrum' : 'board';
  }
  return item.page_type || null;
}

export const DEFAULT_SCRUM_VIEW_BLOCK = {
  swimlane: null,
  wip_limits: {},
  sprint_management: {
    active_sprint: "",
    sprints: [],
    member_capacity: {},
  },
  backlog: {
    selected_story_ids: [],
    velocity_warning_enabled: true,
  },
  standups: [],
  release_plan: {
    milestones: [],
  },
  retro: {
    board_link: "",
    action_items: [],
  },
  retro_boards: {},
  team_health: {
    weekly_snapshots: {},
    escalations: [],
    digest: {
      email_enabled: false,
      slack_webhook: '',
      recipients: [],
      last_sent_at: null,
    },
    visibility_rules: [],
  },
  test_coverage: {
    by_sprint: {},
    integration: {
      enabled: false,
      token_preview: '',
      enabled_at: null,
      last_received_at: null,
    },
  },
  label_registry: {},
  epic_registry: {},
};

/** Default saved_view fragment for new scrum boards (merged into board.saved_view). */
export function defaultScrumSavedView() {
  return {
    sorts: [],
    filters: [],
    search: '',
    layout_tabs_order: ['scrum', 'table', 'kanban', 'timeline', 'calendar'],
    scrum: { ...DEFAULT_SCRUM_VIEW_BLOCK },
  };
}

/**
 * @param {BoardOption[]} memberOptions
 * @returns {{ board_kind: string, fields: object[] }}
 */
export function buildScrumBoardCustomMeta(memberOptions) {
  return {
    board_kind: SCRUM_BOARD_KIND,
    fields: [
      {
        type: 'select',
        initialized: true,
        label: 'Status',
        name: 'status',
        hasOptions: true,
        options: [
          { label: 'Backlog', value: 'backlog' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Review', value: 'review' },
          { label: 'Done', value: 'done' },
        ],
      },
      {
        type: 'dynamic-select',
        initialized: true,
        label: 'Assignee',
        name: 'assignee',
        hasOptions: true,
        source: 'board-members',
      },
      {
        type: 'select',
        initialized: true,
        label: 'Priority',
        name: 'priority',
        hasOptions: true,
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
        ],
      },
      { type: 'input', initialized: true, label: 'Type', name: 'type', hasOptions: false },
      { type: 'input', initialized: true, label: 'Story points', name: 'story_points', hasOptions: false },
      { type: 'epic', initialized: true, label: 'Epic', name: 'epic', hasOptions: false },
      { type: 'labels', initialized: true, label: 'Labels', name: 'labels', hasOptions: false },
      { type: 'input', initialized: true, label: 'Sprint', name: 'sprint', hasOptions: false },
      {
        type: 'input',
        initialized: true,
        label: 'Test coverage ref',
        name: 'test_coverage_ref',
        hasOptions: false,
      },
      {
        type: 'select',
        initialized: true,
        label: 'MoSCoW',
        name: 'moscow',
        hasOptions: true,
        options: [
          { label: 'Must', value: 'must' },
          { label: 'Should', value: 'should' },
          { label: 'Could', value: 'could' },
          { label: "Won't", value: 'wont' },
        ],
      },
      { type: 'number', initialized: true, label: 'Effort (1–10)', name: 'effort_score', hasOptions: false, min: 1, max: 10 },
      { type: 'number', initialized: true, label: 'Value (1–10)', name: 'value_score', hasOptions: false, min: 1, max: 10 },
      {
        type: 'dod_checklist',
        initialized: true,
        label: 'Definition of Done',
        name: 'dod_checklist',
        hasOptions: false,
      },
      { type: 'daterange', initialized: true, label: 'Dates', name: 'dates', hasOptions: false },
    ],
  };
}
