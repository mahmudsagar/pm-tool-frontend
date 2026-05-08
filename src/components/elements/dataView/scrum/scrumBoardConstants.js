/** @typedef {{ label: string, value: string }} BoardOption */

export const SCRUM_BOARD_KIND = 'scrum';

/** @param {{ board_kind?: string } | null | undefined} customMeta */
export function isScrumBoardKind(customMeta) {
  return customMeta?.board_kind === SCRUM_BOARD_KIND;
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
  team_health: {
    sentiment_samples: [],
  },
  test_coverage: {
    by_sprint: {},
  },
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
      { type: 'input', initialized: true, label: 'Epic', name: 'epic', hasOptions: false },
      { type: 'input', initialized: true, label: 'Labels (comma-separated)', name: 'labels', hasOptions: false },
      { type: 'input', initialized: true, label: 'Sprint', name: 'sprint', hasOptions: false },
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
      { type: 'input', initialized: true, label: 'Effort (1–10)', name: 'effort_score', hasOptions: false },
      { type: 'input', initialized: true, label: 'Value (1–10)', name: 'value_score', hasOptions: false },
      {
        type: 'input',
        initialized: true,
        label: 'DoD checklist (JSON array)',
        name: 'dod_checklist',
        hasOptions: false,
      },
      { type: 'daterange', initialized: true, label: 'Dates', name: 'dates', hasOptions: false },
    ],
  };
}
