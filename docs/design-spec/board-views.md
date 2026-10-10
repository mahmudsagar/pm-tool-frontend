# Board views and side panel: implementation spec (from the Stitch exports)

**Shell deviation that applies to all four databoard screens:** the top bar repeats the view tabs (Table/Kanban/Tim…) and adds Filter, Group, Sort, Columns, ⋯ and New Task. Each page then has its own tab strip and toolbar below that, so the two overlap and get clipped ("Tim" is cut off). We should keep **one** row of view tabs and **one** toolbar, either in the page or in the top bar. The side-panel screen uses a different shell: a "Nexus Workspace" switcher, All Files/Recent/Starred/Inbox, a "Pro Team" breadcrumb chip, and a search bar in the top bar.

**Current data model:** a task is a `page_meta` row with `board_id`, `parent_id` (used for subtasks) and `custom_meta.values`. The fields are defined by the board in `board.custom_meta.fields`; the scrum template in `scrumBoardConstants.js` defines assignee, priority (low/medium/high), type, story_points, epic, labels, sprint, MoSCoW, plus start_date/due_date and a DoD checklist. Comments live in `inner_comments` / `comment_*` models and attachments in `page_meta.attachments`. The `board.saved_view` schema is passthrough, so it can store new view settings with no migration.

---

## 1. databoard_table_view
**Purpose:** a grouped spreadsheet of board tasks with inline status, priority, assignee, due date and tags, plus totals.

**Layout:**
- View tab strip (Table **24** count badge, Kanban, Timeline, Calendar).
- Toolbar row: `Group: Status ▾`, `Sort: Priority`, `Filter (2)`, `Assignee ▾`, `Columns (7/10)`, `Reference Spec` (a design artifact, ignore it), primary `+ New Task`.
- Full-width table. Header columns: checkbox, Task Name, Status, Priority, Assignee, Due Date, Tags, Story Pts, Progress, `+` (add column). The last three are off-screen, so the table scrolls horizontally.
- A sticky footer bar.

**Components:**
- **Group header row:** chevron, colored dot, uppercase name (IN PROGRESS / IN REVIEW / TO DO / DONE), a "8 tasks" chip, and on the right "Avg Velocity: 4.8 pts • 34 Story Points".
- **Row:**
  - Drag handle and checkbox.
  - A type icon (cube, bolt, bug, doc, palette, task_alt, block, check_circle).
  - The title, followed by an optional subtask chip `☰ 3/5` or a comment chip `💬 14`.
  - A `more_horiz` button on hover.
- **Status pill:**
  - In Progress: indigo dot.
  - Review: orange.
  - To Do: grey.
  - Blocked: red.
  - Done: grey.
  - Done rows are shown struck through and dimmed, with the checkbox ticked.
- **Priority pill:** Urgent (red, flame icon), High (orange text), Medium (amber), Low (grey).
- **Assignee:** an initials avatar plus the name.
- **Due date cell** (mono font): "Today, 6:00 PM" with a clock icon, "Oct 28 (Tomorrow)", and a red "⚠ Overdue (-1d)" block.
- **Tag chips:** small pastel chips that wrap onto two lines.
- **Add row:** `+ Add task to In Progress...` at the end of each group.
- **Footer:**
  - Left: "Total: 24 tasks", "Story Points: 76 pts", and "Completion Rate: 17%" with a mini progress bar.
  - Right: "Showing 1-24 of 24 tasks" and an `Export CSV` button.

**Interactions:** collapse groups, drag rows to reorder or to move them between groups, select rows (which implies bulk actions), inline add per group, a row menu, show/hide columns, an add-column button, and horizontal scroll.

**Data per row:** type, title, subtask count, comment count, status, priority, assignee, due date and time, tags, story points, progress %.
- Already have: status, priority, assignee, due date, labels, story points.
- Missing:
  - "Urgent" priority (the options stop at High).
  - Task type icon (we only have a free-text `type`).
  - Progress % field.
  - Due time of day.

**Gap:**
- We already have: grouping (`groupBy` in `table/index.jsx`), inline cell editing, the dependency picker, sort/filter (`BoardSubheaderControls`, `saved_view.sorts/filters`).
- New:
  - Row checkboxes and bulk actions. Needs a bulk endpoint, or many `PUT page/document` calls.
  - Manual row order. There is no `sort_order` field on `page_meta`, so this needs a new field.
  - Per-group aggregates and the footer stats, computed client-side.
  - Column visibility and order. Store in `saved_view.columns`; the passthrough schema already allows it.
  - Export CSV (client-side).
  - Overdue and relative-date formatting.
  - Inline add per group.
  - Progress: either derive it from subtasks/checklist or add a `progress` field.

---

## 2. databoard_kanban_view
**Purpose:** a sprint board of issue cards in columns, with WIP limits, swimlanes and quick actions.

**Layout:**
- Tab strip (the Kanban tab has an active dot).
- Toolbar row: search box "Search 28 issues…", `Group: Status ▾`, a swimlane segmented control `None | Epic | Assignee` (Epic selected), `Filter (2)`.
- The code also has a sprint chip, "Sprint 42 · 62% Done · Velocity: 48 pts", which is not visible in the PNG.
- Columns about 380px wide that scroll horizontally: Backlog 4, To Do 5, In Progress 6/8 WIP, In Review 4, Done 9.

**Components:**
- **Column header:** dot, uppercase name, count chip. When a WIP limit is set the chip reads `6 / 8 WIP`. Then `+` and `⋯`.
- **Card:**
  - Mono issue key (ENG-112, CORE-94, DOC-41) and one or two label chips.
  - A priority chip (`P0` in red, `High` in orange) or a priority glyph: `!` orange = high, `⓵` red = urgent, `—` = medium, a low_priority icon = low.
  - A 2-line title.
  - An optional "☑ Checklist 1/4" row with a progress bar.
  - A footer with:
    - a date chip: "Oct 28", "Tomorrow", red "⚠ Due Today", amber "⏰ Due in 2d", or the plain text "No due date";
    - in the In Review column, "PR #481" takes the place of the date;
    - comment count and attachment count;
    - one avatar or an avatar stack, or an empty-person placeholder.
- **Done cards:** compact, with a check icon and the date only. The column ends with "+ 5 more archived completed tasks".
- **Card context menu:** Move to In Review, Assign Contributor, Edit Labels…, Delete Task (red).
- **Drop placeholder:** a dashed box reading "Drop card to update stage".
- **Column footer:** `+ New Issue`.

**Interactions:** drag between columns (changes status) and within a column (reorder). The WIP limit is shown but not visibly enforced. Swimlanes by epic or assignee, search, card menu, quick add.

**Data per card:** key, labels, priority, title, checklist done/total, due date, comment count, attachment count, assignees (several), PR link.
- Already have: labels, priority, title, due date, DoD checklist, and attachments/comments, but only on the page document.
- Missing:
  - A persistent issue key. `task_id` is currently generated client-side from the row index (`Data.jsx:1123`).
  - Multiple assignees.
  - A PR link.
  - WIP limits.

**Gap:**
- We already have: dnd-kit kanban, group-by any select field, subtasks shown as cards.
- New:
  - **Swimlanes.**
  - WIP limit per column: store in `saved_view.kanban.wip`.
  - Comment and attachment counts on the card. `GET board` should return `inner_comments.length` and `attachments.length`.
  - A persistent sequential key. Needs a backend counter (a board prefix plus a sequence on `board`), assigned in `page/document/postRequest`.
  - Card context menu.
  - Archive collapse in Done.
  - In-board search. This exists in `saved_view.search` / `applyView` but has no UI here.
  - Manual order within a column (the same `sort_order` need as the table).

---

## 3. databoard_calendar_view
**Purpose:** a month calendar of scheduled tasks plus a tray of unscheduled tasks to drag onto it.

**Layout:**
- Header: `‹ July 2026 [Q3 Sprint 42] ›`, `Today`, and a segmented control `Month | Week | Day | List`.
- Filter row: `Assignee •`, `Priority ▾`, `Unscheduled (4)` toggle, `+ New Task`.
- Legend bar: P0 Critical (red), P1 High (orange), P2 Normal (indigo), P3 Low (grey). On the right: "Current cycle: Sprint 42 (Jul 13 – Jul 26)", "Capacity: 78%".
- A Mon–Sun grid about 810px wide, with the weekend columns dimmed.
- A right "Unscheduled" panel about 400px wide.

**Components:**
- **Day cell:** date number, a `+` on hover, and event chips. Each chip has a priority dot, a truncated title and an avatar.
- **"+3 more":** opens a day popover titled "Wednesday, July 8" that lists tasks as "NEX-8125 • High" with avatars.
- **Today cell:** the number in a filled indigo circle, plus a "TODAY" label.
- **Spanning bars:** "Sprint 42 Hardening Cycle • Regression tests & release freeze", Jul 20–26, with an avatar stack. An orange multi-day block reads "Architecture Review Cycle (Q3/Q4 Platform)", Jul 29–31.
- **Muted chip:** "Release Cut v2.4.0", drawn as a dashed or ghost chip.
- **Task quick-view popover** (in the code only): NEX-8140 with a P0 Critical tag, then Scheduled, Assignee "Alex L. (DevOps)", Sprint, Status, a description, and `Close` / `Open Full Details`.
- **Unscheduled panel:**
  - Helper text: "Drag tasks onto any calendar cell…".
  - Cards showing key, priority pill, title, "Est: 3d" and an avatar with a name.
  - `+ Draft Unscheduled Task` at the bottom.

**Interactions:** drag from the tray onto a date (sets the date), drag between cells, click a chip for the popover, "+N more", switch views, Today, previous/next month.

**Data:** key, priority P0–P3, title, assignee, start/due dates (spans), estimate, sprint, status, description.
- **Estimate** ("3d/4h") is not in our schema.
- Priority is 4-level P0–P3 here, versus Urgent/High/Medium/Low in the table and our current low/medium/high.
- Sprint dates and capacity: `saved_view.scrum` holds sprints, so check whether sprint start/end and capacity live there.

**Gap:**
- We already have: month and week modes with a "+N more" limit, dnd-kit dragging, and date-range fields.
- New:
  - Day and List modes.
  - The Unscheduled tray (filter on `due_date` is empty; client-side).
  - The day overflow popover.
  - Quick-view popover.
  - Multi-day spanning bars across week rows.
  - Sprint overlays in the grid and legend. Needs sprint date ranges, which may already be in `saved_view.scrum`.
  - Capacity %: needs estimate/points versus team capacity.
  - An `estimate` field, as a new board field definition. No backend change, because fields are dynamic.

---

## 4. databoard_timeline_view
**Purpose:** a Gantt roadmap with an epic hierarchy, progress, milestones, dependencies and a critical path.

**Layout:**
- Page header:
  - Mono chip `CORE-Q3-2026`, then "• Sprint 42 - 45 Delivery • ● 2 Milestones at Risk" (orange).
  - H1 "Timeline & Gantt Roadmap" and the subtitle "Q3 Distributed Consensus & Platform Engine".
- Right side of the header:
  - Segmented control `Days | Weeks | Months | Quarters`, `◎ Today`, and `Group: Epic ▾`.
  - The group options are By Epic, By Sprint, By Assignee and Flat List.
  - `Filters (2)` and `+ Add Task`.
- Card header: "Q3 2026 ROADMAP EXECUTION / July 01 — August 31, 2026". Legend: In Progress (indigo square), Backend Review (orange), Milestone (diamond). Then `Collapse Tree`.
- Left tree pane, about 425px:
  - Title "HIERARCHY & WORK ITEMS · 8 items".
  - Footer: "Sprint Scope: 38 Story Points · Velocity 94%".
- Right chart: month bands (JULY/AUGUST 2026), week labels W27–W35 with dates, and a TODAY (JUL 20) line.
- Bottom hint bar: `Drag` "Shift scheduled dates", `Alt + Connect` "Draw dependency link", and on the right "Critical Path Active ●".

**Components:**
- **Tree rows:**
  - An epic row has a chevron, an icon and a progress % pill (82%, 45%).
  - A child row has a status dot, a name, an avatar and a status dot.
  - A milestone row is orange, with a diamond icon and a date chip (July 27, Aug 18).
- **Bars:**
  - An epic summary bar, a thin grey progress track with "82% Overall Progress".
  - Task bars have a progress fill and % text. Indigo means in progress; orange is the "Backend Review" state; the grey-blue eBPF bar is undefined.
  - A done bar shows a check icon.
  - Milestone diamonds with labels such as "M1: Alpha Release v2.0".
- **Dependency arrows:** dotted orange or white curves for finish-to-start links; a solid indigo line for the critical path.
- **Hover tooltip:** name, `HIGH PRIORITY` tag, "Lead: Alex Rivera", "Jul 14 — Jul 28", "80% Completed".

**Interactions:** drag a bar to move it (and presumably resize it), Alt-drag to connect a dependency, zoom levels, collapse the tree, change grouping, jump to Today, hover tooltips.

**Data:** epic, start/due, progress %, assignee (lead), status, priority, dependencies, milestones (date, at-risk flag), story points, velocity.

**Gap:**
- We already have: `timeline/index.jsx` with week/month/quarter modes, dnd drag, dependency rendering via a depends/blocks field, and progress.
- New:
  - A Days zoom level.
  - Epic grouping as a collapsible tree. Epics exist via `EpicField` and the `epicRegistry`.
  - Group by sprint or assignee.
  - Milestones as an entity. Options: a task flag `is_milestone` (a dynamic field) or `saved_view.scrum` milestones; `ScrumMilestonesPanel.jsx` already exists, so reuse it.
  - "At risk" computation.
  - Alt-drag to create dependencies. It writes the dependency field, so no backend change.
  - Critical-path calculation (client-side).
  - Epic rollup of progress.
  - Hover tooltip.
  - Velocity: may come from the scrum reports.

---

## 5. universal_side_panel_drawer_doc_sheet_folder_whiteboard
**Purpose:** a tabbed peek drawer on the right that can preview a doc, sheet, folder or whiteboard without leaving the page.

**Layout:**
- **Shell deviation:** the sidebar uses a different variant (All Files, Recent, Starred, Inbox 3, Direct & Channels, nested tree, Storage 84% / "8 active contributors", Settings/Trash).
- The left content is a dimmed "Sprint Hub" dashboard. It is context only: stat cards, an artifact list and a live stream.
- Drawer, about 650px wide, full height:
  - Header: `DOC PEEK / Q3 Architecture RFC`, then the actions open_in_full (expand), vertical_split (dock or split), add_box (new artifact), ⋮, and ✕.
  - Tab strip: `RFC Doc`, `Capacity Sheet`, `02-RFCs Explorer`, `System Arch`, `+`, each with a type icon in its type color (the sheet is green).
  - A meta row: "Under Review", "RFC #108", "👁 12 readers".
  - The body.
  - A sticky footer: `Edit in Full Studio`, @mention, copy link, and "● Dock Synced".

**Components:** the body changes with the type of the active tab.
- **Doc:**
  - Cover image with a title overlay and a "v2.4 Final Draft" chip.
  - "QUICK JUMP / OUTLINE", a numbered TOC of anchor links.
  - Rendered H2s and paragraphs.
  - An info callout ("Consensus Invariant Warning").
  - A checklist with struck-through done items.
  - A code block with a filename tab and a language chip ("telemetry_stream.rs · Rust 1.78").
- **Sheet** (in the code): "Univer Engine Active · 40 Rows × 8 Columns", `Export CSV`, a mini grid (A: SPRINT ITEM, B: OWNER, C: PTS, D: STATUS with status pills), and the footer "Calculated Velocity: 29 / 38 Story Points Delivered".
- **Folder:** a breadcrumb "root / specs / 02-Architecture-RFCs", `+ Add File`, and a file list (icon, name, size).
- **Whiteboard:** "Infinite Canvas Peek: Node Mesh", a "Zoom: 100%" readout, nodes, a live cursor "Maya (Editing)", and the hint "Double-click canvas to focus node or pop into Full Infinite Canvas Studio."
- **"New Artifact in Sprint 42" menu:** RFC Document, Univer Grid, Infinite Canvas, Subfolder.

**Interactions:**
- Open several items as tabs, switch and close tabs, expand to full page, dock/split, create a new artifact into the current context.
- Outline anchors scroll the body; checkboxes toggle inline.
- Presence (readers count, cursors).

**Data:** title, status ("Under Review"), number ("RFC #108"), reader count, cover image, version label, last-editor presence, file sizes, child counts.

**Gap:**
- We already have: `ParallelRoute` opens any route as a `_sidebar` drawer from a search param and supports several at once. It already has a close (X) button and an "Open in full mode" expand button, and `page_type` covers document, sheet and whiteboard.
- New:
  - A single drawer with **tabs**. Today each param renders its own drawer, so this needs a tab manager over the search params.
  - Read-only or lightweight "peek" renderers for each type, plus a folder explorer peek (folder model, `GET folder`).
  - Outline/TOC extraction.
  - Doc status, number and version metadata. There is no field for these on `page_meta`; use `custom_meta.values` or add `status`/`version`.
  - Reader count: needs presence from the realtime socket.
  - Cover image: check `page_content`.
  - File sizes: from `media`/`attachment`.
  - Dock/split mode.

---

## Cross-screen

**Shared components to build once:**
- ViewTabs, with count badge and active dot.
- Toolbar controls: Group, Sort, Filter (with count) and Columns popovers.
- SegmentedControl: zoom, swimlane, calendar mode.
- StatusPill, PriorityPill and glyph (one canonical scale), DateChip (relative, overdue, due-today states), LabelChip, Avatar/AvatarStack, IssueKey (mono).
- Small blocks: ChecklistProgress (count + bar), Count chips (comments, attachments, subtasks), ProgressBar/percent pill.
- Containers and states: TaskCard (kanban and calendar tray variants), RowContextMenu, QuickViewPopover, DropPlaceholder, InlineAddRow, EmptyState ("No due date", unassigned).
- Layout: SidePanel (unscheduled tray / drawer tab shell) and KbdHint.

**Top risks and ambiguities:**
1. **Priority scale differs on each screen:**
   - Table: Urgent / High / Medium / Low.
   - Calendar: P0–P3.
   - Kanban: a P0 chip plus glyphs.
   - Current schema: low / medium / high.

   We need one canonical scale mapped onto the dynamic `priority` field. Existing boards will need their values migrated.
2. **Duplicated top-bar and page toolbars.** It is unclear which row owns view switching and filtering, and the overlap is broken in every board screen.
3. **Persistent task keys and manual ordering do not exist in the backend.** We need a board key prefix and sequence, and `page_meta.sort_order`. Drag-to-reorder in the table and kanban depends on them.
4. **New domain concepts with no home yet:** milestones, critical path, estimates, capacity, WIP limits, progress %, multiple assignees, PR link and doc status/version. We have to decide which become board dynamic fields, which go in `saved_view`, and which are real model fields. Rollups (velocity, capacity, at-risk) also need defined formulas.
5. **The tabbed peek drawer conflicts with the current multi-drawer `ParallelRoute` URL model.** The type-specific peek renderers are also substantial work: a Univer mini grid, a whiteboard canvas preview with live cursors, and reader presence over the socket.

**Smaller items:**
- The "Reference Spec" button in the table and the hidden popovers in the calendar and kanban code exist only in code.html; confirm which of them are intended.
- The side-panel screen's shell is a different variant from the others.

**Relevant files:**
- `/home/ocean/client/frontend/src/components/elements/dataView/{table,kanban,calendar,timeline}/index.jsx`
- `/home/ocean/client/frontend/src/components/elements/dataView/scrum/scrumBoardConstants.js`
- `/home/ocean/client/frontend/src/pages/Data.jsx`
- `/home/ocean/client/frontend/src/BetterRouter/ParallelRoute/Page.jsx`
- `/home/ocean/server/api-server/models/{board,page_meta}.js`
- `/home/ocean/server/api-server/modules/v1/board/{index.js,config/validation.js}`
