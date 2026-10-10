# Scrum analytics screens: implementation spec

I viewed every `screen.png` and read the text structure of every `code.html`. I did not modify any files.

## Shell deviations (all six screens)

- **Top bar additions.** Every screen adds these to the shared shell:
  - an "Active Sprint • 4d left" pill next to the breadcrumb
  - a `Reports ▾` dropdown
  - `+ Add Issue`
  - a primary `Complete Sprint` button
- **Studio tab strip.** A segmented sub-tab strip sits under the top bar. Its contents are inconsistent across the designs:
  - Sprint Board shows `Sprint Board · Burndown & Velocity · Team Capacity · Release Notes`.
  - Burndown, CFD and Scope show `Sprint Board · Burndown & Velocity · Capacity & Workload · Scope & Epic Delivery · CFD`.
  - **Recommendation:** use the 5-tab set everywhere and treat Release Notes as an extra tab.
- **Sprint Board only:** a fixed bottom status bar reading `Sprint 42 Active | Avg Velocity: 46 pts/sprint | Sprint Burnup: 84% | Scope Creep: +3 pts | Retro: Jul 28, 16:00 UTC`, plus keyboard hints `C New issue`, `B Burndown`, `? Shortcuts`.

## Current-app baseline (applies to every screen below)

- **Sprints are plain strings.** `saved_view.scrum.sprint_management.sprints` is a `string[]` with no start/end dates, goal, or committed snapshot.
- **`member_capacity: {}` is declared but never used.** It appears only in `scrumBoardConstants.js:55`.
- **Default task fields** (`scrumBoardConstants.js:buildScrumBoardCustomMeta`): status (backlog / in_progress / review / done), assignee, priority (low/med/high), type, story_points (text input), epic, labels, sprint (text input), moscow, effort_score, value_score, dod_checklist, dates.
  - There are no estimate or logged-hours fields, no blocked flag (only a `risk_reason` or a "blocked"/"stuck" status), no PR/branch fields, and no issue keys like `ENG-104`.
- **Burndown cannot be historically correct today.** `ScrumReportsSection.jsx:buildBurndownSeries` uses a done task's `updatedAt` as its completion date and the earliest `createdAt` as the sprint start.
- **History exists but is coarse.** `PageHistory` (`models/page_history.js`, written in `modules/v1/page/document/putRequest.js:196-245`) snapshots the whole `custom_meta` object on each change (`action: 'custom_meta_updated'`, `changes.custom_meta.{from,to}`).
  - Status and points transitions *could* be recovered by diffing `values.status` / `values.story_points` across entries.
  - That is O(history), there is no index by board, and it reads `GET /page/history` one page at a time.
  - **Recommendation:** add a dedicated, indexed event log (see the end of this report).
- **No chart library is installed.** `scrumReportCharts.jsx` is hand-rolled SVG/div charts: InteractiveBurndownChart (SVG polyline, viewBox 100×48), InteractiveVelocityChart and StatusBreakdownChart (div bar rows), AssigneeWorkloadChart, CompletionDonut, plus a custom ChartTooltip.
  - The deps that matter here are only `date-fns`, `dayjs`, `@dnd-kit/*`, the Radix primitives and `@tanstack/react-table`.

---

## 1. sprint_board_agile_studio

**Purpose:** the main sprint workspace. A goal header, KPI strip, mini burndown with team workload, then a Kanban board grouped into epic swimlanes.

**Layout, top to bottom**
1. **Sprint goal banner** (full width, about 76px):
   - flag icon, `SPRINT 42 GOAL • Jul 14 — Jul 28 (10 days)`
   - amber pill `4 Days Remaining`
   - goal text on one line, truncated
   - right side: `Goal Progression 72% Completed` with a ring progress, and an edit (pencil) button
2. **5 KPI tiles** (equal grid, about 120px tall):
   - `Velocity & Scope` 64 / 88 pts, `73%` chip and progress bar
   - `Sprint Health` ● On Track, Forecast buffer +4 pts
   - `WIP Health` 14 pts in flight, Limit: 18 pts max, 77% saturated
   - `Blockers` 1 Critical hold, `ENG-119 · SecOps review` (red text)
   - `Team Capacity` 142h / 160h committed, Allocation 88.7%
3. **Sub-tabs** (see shell note), then a filter toolbar:
   - `Group: Epic Swimlanes ▾`
   - toggles `Only My Issues`, `Urgent / P0`, `Has PR Linked`, `Blocked` (red)
   - `Filter issues…` search
4. **Analytics row** (about 2/3 + 1/3):
   - **"Sprint 42 Burndown Curve"**: `Day 7 of 10` chip, legend `Guideline (Ideal)` (dashed) and `Actual Remaining (Ahead)` (indigo with gradient fill).
     - X axis: `D1 (88 pts)` … `Today (D7: 24 pts rem)` in amber … `D10 (Jul 28)`.
     - A dashed vertical "today" marker with a dot; after today the projection is dotted.
     - Footer: `Velocity trend is +12% vs Sprint 41. Projected sprint completion: Jul 27 (1 day ahead).`
   - **"Team Workload — 4 Engineers"**: avatar, name, `22 / 24 pts (91%)` and a progress bar per person (indigo; orange when the person is near the limit). Footer: `Standup sync 09:30 UTC`.
5. **Column header bar**, each with a coloured dot:
   - `TO DO 4 issues • 12 pts`
   - `IN PROGRESS 14 / 18 WIP`
   - `REVIEW & QA 2 issues • 8 pts`
   - `DONE 6 issues • 26 pts`
6. **Epic swimlanes** (collapsible):
   - header: color square, `Epic: Distributed Consensus Core`, `ENG-EPIC-12`, `34 pts committed`, `Epic Progress` bar with %, `+`
   - then the cards in 4 columns

**Card variants**
- **Content:** key `ENG-132`, priority pill (`P0 CRITICAL` solid red, `P1 HIGH` red tint, `P2`/`P2 NORM`/`P3` neutral), points circle, title, and up to two footer rows. Footer contents:
  - tags (`Infra`, `DB`), PR `#412`, `1/3 subtasks`
  - Checklist progress bar `4/5 completed`
  - branch chip `feat/raft-v2`, `Due tomorrow`
  - comments count, `5h logged`
  - `2 Approvals`, `CI Passing`, `Ready to merge`
  - `Test Cov 94%`, `SecScan: Clean`, `QA Verified`
  - `Unassigned` with an assign icon, plus an assignee avatar
- **Blocked:** red left border, `BLOCKED` pill, red callout `Waiting on SecOps shader…`, `Blocked 18h`.
- **In-progress with P0:** red left border.
- **Done:** strikethrough title, check icon, `Shipped in v2.4.1-rc`, `Closed Jul 21`.

**Interactions**
- drag cards between columns and lanes (dnd-kit already used)
- collapse lanes; add an issue into a lane
- filter toggles; change the grouping
- hover the burndown
- edit the goal
- keyboard shortcuts C / B / ?
- Complete Sprint

**Data needed**
- sprint {start, end, goal, committed_points}
- per-day remaining points (same as screen 2)
- WIP = sum of points in in_progress + review; WIP limit from `wip_limits`
- blockers = tasks flagged blocked, with a blocked-since timestamp
- team capacity hours per member
- per-task: subtask counts (from `parent_id`), checklist (dod_checklist), comment count, logged hours, PR / branch / CI / approvals, due date, closed date

**Gap**
- **Exists:** swimlanes by epic/assignee/priority, WIP limits and breach, DnD, DoD, blocked styling, epic registry.
- **New:**
  - goal banner, KPI strip, inline burndown, workload panel, column point totals
  - quick-filter toggles; priority P0–P3 (the current options are low/med/high, so the field options must be migrated)
  - card meta: logged hours, PR / CI / approvals, closed date, "Blocked 18h"
  - status bar and shortcuts
- **Backend:**
  - sprint objects in `sprint_management.sprints` with dates and a goal
  - `member_capacity`
  - task fields `estimate_hours` and `logged_hours`
  - a `blocked` flag with a `blocked_reason` field
  - `completed_at`, written server-side on the status transition
  - Git integration does not exist. PR/CI chips should be manual fields or hidden for now.

---

## 2. burndown_velocity_analytics_studio

**Purpose:** sprint analytics. Burndown with a forecast cone, multi-sprint velocity, scope churn log, epic completion, and an AI synthesis.

**Layout**
1. **Toolbar row 1:**
   - unit segmented control `Story Points | Issues | Hours`
   - `Export ▾`, `Config`, `Share`
2. **Toolbar row 2:**
   - sprint picker `Sprint 42 Jul 14 - Jul 28 ▾`
   - `All Epics (4) ▾`, `Entire Team (9 devs) ▾`
   - `Compare baseline:` segmented `S41 (50pt) | S40 (46pt) | Rolling Avg (48.5pt)`
   - status line `● Sync engine active • Simulations: 5,000 iterations`
3. **5 KPI tiles:**
   - `SPRINT VELOCITY` 52 pts ↗ +12%, Target: 50 pts, Projected: 56 pts
   - `BURNDOWN PACE` -4.0 pts ahead (green), On Schedule, Day 7 of 10, 24 pts remaining (88)
   - `SCOPE CHURN` +6 net pts (orange), +6.8% churn, +9 pts added, -3 pts removed
   - `CYCLE & LEAD TIME` 2.4 days avg, -0.6d, P85: 3.8 days, Lead Time: 4.1d
   - `GOAL CONFIDENCE` 94% chance High, Monte Carlo sim, Jul 27 cutoff
4. **"Sprint 42 Burndown"** card (about 420px chart):
   - green pill `Ahead of Schedule`; subtitle `Tracking daily story points burned vs guideline trajectory and Monte Carlo forecast cone`
   - legend chips: `Guideline` (dashed grey), `Actual Remaining` (indigo #c0c1ff line with dot markers and gradient area), `Scope Committed (94 pt)` (orange dashed horizontal step line, annotated `+6 pt added` on Day 3), `Forecast Cone` (shaded wedge after today)
   - Y axis 0–100 pt with gridlines; X axis `Day 1 (Jul 14)` … `Day 7 (Today)` … `Day 10 (Jul 28)`
   - Rich tooltip:
     - `● Day 7 (Today)` with green chip `4 pts ahead`
     - Remaining: 24 pts; Burned today: 8 pts
     - the issues completed that day: `ENG-104 (…) 5pt`
   - 3 insight chips below:
     - `Daily Burn Run-rate: 9.1 pts/day (Target: 8.8 pts/day)`
     - `Predicted Completion: Day 9 (Jul 27 at 16:30)`
     - `Capacity Runway: 3 work days remaining (68 dev-hours)`
5. **"Multi-Sprint Velocity & Predictability"** (`Past 6 Sprints`):
   - grouped vertical bars per sprint: `Committed` (dark grey) and `Completed` (indigo); `Spillover` (red) is in the legend
   - horizontal `Capacity Target: 50 pt` line; orange `Rolling Avg (48.5)` line with label `Rolling Ø: 48.5 pt`
   - x labels `Sprint 37`… with `87% pred.` (green when ≥ 90%)
   - active sprint column highlighted with an `ACTIVE` tag; hover labels like `42/48`
6. **Two-column row:**
   - **"Mid-Sprint Scope Churn"** (`+6 pts net`, `Audit Log` button). Rows have an icon (add / blocked / remove), key, title, `Added Day 3 • Product Lead (Alex V.) • Reason: …`, a ±pts pill and a chevron. Footer: `Healthy sprint threshold: ≤ 10% churn (… 6.8%)`, `Stability Score: 93/100`.
   - **"Epic Completion Rates"** (`64 / 88 pts (72%)`). Per epic: coloured dot, name, `28 / 34 pts 82%`, coloured bar. Footer: avatar stack and `All 9 assignees within healthy load (≤ 12pt/dev)`.
7. **"Agile Engine Synthesis"** banner: `Predicted Finish: +1 Day Early`, narrative text, `Add to Retro Notes`, `Apply Recommendations`.

**Interactions:** unit switch (pts / issues / hours); sprint, epic and team filters; baseline compare; burndown hover (crosshair and tooltip); velocity bar hover; open a churn row; audit log; export / share; add to retro.

**Data needed**
- **Burndown:** for each sprint day d, remaining = Σ points of in-sprint tasks not done at end of d. This needs:
  - a per-task timeline of status → done
  - sprint membership over time (added / removed dates)
  - points changes over time
- **Scope line:** committed points per day, which needs scope-change events.
- **Ideal line:** linear from the start scope to 0 over working days (weekends excluded).
- **Forecast cone:** Monte Carlo from historical daily throughput (sample the past N days' burn).
- **Velocity:** per sprint committed (snapshot at sprint start) vs completed (done by sprint end); spillover = committed − completed; rolling avg = mean of the last 3; predictability = completed / committed.
- **Cycle time:** first in_progress → done. **Lead time:** created (or added to sprint) → done. Both need status timestamps.
- **Churn log:** events {task, ±pts, day, actor, reason}.
- **Hours mode:** estimates or logged hours.

**Gap**
- **Exists:** a simple burndown (wrong history), a velocity bar list, an epic progress bar, the existing ScrumReportsSection sprint selector, and SprintRetroButton (for "Add to Retro").
- **New:** forecast cone, scope line, rich tooltip, baseline compare, cycle/lead time, churn log, Monte Carlo, unit switch, synthesis.
- **Backend:**
  - a status/points/sprint change event log
  - sprint dates
  - a committed snapshot at sprint start (`sprints[].committed_snapshot` set on "Start sprint")
  - a churn `reason` captured when a task enters or leaves an active sprint
  - "AI synthesis" needs an LLM endpoint or a rules-based placeholder

---

## 3. cumulative_flow_diagram_cfd_studio

**Purpose:** flow analytics. A stacked-area CFD, lead/cycle time, per-stage queue times, and Little's Law.

**Layout**
1. **Header strip:** tabs, plus `● LIVE` and `Throughput: 6.6 pts/day` in the tab bar.
2. **Toolbar row:**
   - sprint picker `Sprint 42 (Jul 14 - Jul 28) ▾`
   - range segmented `Sprint 42 | 30D | 60D | 90D`
   - unit `Story Points (pts) | Issues`
   - mode `Daily | Cumulative`
3. **Toggle row:** checkboxes `WIP Band Width`, `Lead Time Vectors`, `Detect Bottlenecks`, and `Export`.
4. **`VISIBLE STATES:` legend-filter chips:**
   - `Done 64 pts` green
   - `Review & QA 8 pts` amber
   - `In Progress 14 pts` indigo
   - `To Do 8 pts` slate
   - `Backlog (Scope) 94 pts` purple
5. **Info line:** `Stepped +6 pts scope adjustment logged on Day 3`.
6. **5 KPI tiles:**
   - `AVERAGE LEAD TIME` 4.8 days, -0.6d vs Sprint 41 (Optimal)
   - `AVERAGE CYCLE TIME` 2.1 days, P85: 3.4d, Predictable & stable
   - `FLOW EFFICIENCY` 68.4%, +4.2%, Lean ratio benchmark
   - `WIP SATURATION` 14 pts / 18 ceiling with a bar
   - `WORK VARIANCE` 0.18 σ², `Little's Law Stable` chip
7. **"Cumulative Flow State Transitions"** (pill `Sprint 42 Flow Profile`; summary `Day 7 (Today): 64 pts Done • 14 pts WIP • 94 pts Total`). The chart is about 380px.
   - **Bands** (stacked areas, bottom → top): Done #34d399-ish green, Review & QA amber #f59e0b, In Progress indigo #8083ff, To Do slate. The Total Scope baseline is a purple step line (#a855f7 / #c084fc) annotated `+6 pts scope change`.
   - **Overlays:** a horizontal dashed amber `Lead Time = 4.8d` vector; a dashed today marker with a `TODAY` pill on the x axis; future days shown as a hatched projection (`url(#projected-hatch)`).
   - **Tooltip:** `Day 7 (Jul 21) • Today`, green `BALANCED` badge, per-state rows with values and %, `WIP Saturation: 77%`, `0 Bottlenecks`.
   - **Footer:** a legend with long labels (`Done (Shipped to Production)`…), plus `Flow Profile: Parallel Cadence (No WIP Bulges)`.
   - **Colour note:** the green, amber and purple bands go beyond the DESIGN.md token set, so chart categorical tokens need to be added.
8. **Two-column row:**
   - **"Stage Transition & Queue Bottlenecks"** (`Flow Health: 96/100`): 4 rows such as `Backlog → To Do (Sprint Planning)`, `Queue wait time: 0.4 days`, with a value pill `0.4d` and a status (`Optimal` / `Healthy` / `Resolved` amber / `Passing`). Footer `Zero widening bottleneck bands detected over past 72h.` and `Audit Stage Queues →`.
   - **"Little's Law & Flow Predictability"** (`THEORETICAL LEAN VALIDITY`):
     - formula card `Current WIP 14 pts = Throughput (λ) 6.6 pts/d × Cycle Time (W) 2.1 days`
     - `Monte Carlo Delivery Probability 98.2%`
     - `Lean Cadence Insight` text
     - buttons `Adjust WIP Limits`, `Add Note to Retro`, `Export CFD Report` (primary)
9. **Footer:** `Telemetry Source … Synchronized 2m ago`, `Sprint 42 Target: 94 pts`, `Burndown on track (+1.2d buffer)`, `Configure Little's Law Parameters`.

**Interactions:** range and unit switch; daily vs cumulative; toggle states on/off via the chips; overlay toggles; hover tooltip; adjust WIP limits (the existing wip_limits editor); export PDF; add to retro.

**Data needed**
- **CFD:** for each day and each status, the count or points of tasks whose status at end of day = s. This **strictly requires status history** (status-at-time reconstruction), plus scope history for the total line.
- **Flow efficiency:** active time / (active + wait time). This requires stage durations and a definition of which statuses are "active" vs "queue". The design implies queue sub-states (waiting for pickup, waiting for review) that the 4 current statuses do not have. The ratio can be approximated.
- **Stage queue wait:** mean time from entering status A to entering status B, per transition.
- **Throughput:** done pts per day (rolling).
- **Work variance:** variance of daily throughput.
- **30/60/90D ranges:** history across sprints, using status as of each date.

**Gap:** entirely **new**. The current `StatusBreakdownChart` shows only the current snapshot. The backend needs the event log (status transitions with timestamps and points at transition) plus a server-side aggregation endpoint, for example `GET /board/analytics/cfd?board_id&from&to&unit`.

---

## 4. scope_epic_delivery_studio

**Purpose:** release- and epic-level planning. Roadmap matrix across sprints, scope creep, slippage simulation, bandwidth, and a per-epic traceability table.

**Layout**
1. **Header row:**
   - tabs, plus `RELEASE TARGET: ● Aug 18 Hard Freeze`
   - release picker `Q3 Release: v2.4 Enterprise Hardening` (`Active` pill) ▾
   - unit segmented `Story Points (pts) | Progress (%) | Issues (Count)`
   - `Owner: All Epics (4 Active) ▾`
   - buttons `Monte Carlo Forecast`, `Audit Scope Creep`, `Export Roadmap`
2. **5 KPI tiles:**
   - `OVERALL SCOPE COMPLETION` 72.4%, 68 / 94 pts, bar, Target 90% by Sp 43, +4.8% sp/sp
   - `STRATEGIC EPICS` 4 Active in-flight, coloured dots, `2 On Track • 1 Risk • 1 Blocked`
   - `SCOPE CREEP / VOLATILITY` +9.2 pts mid-quarter, Churn rate 8.4%, < 10% limit
   - `PROJECTED DELIVERY` Aug 12, P85: 91%, Ahead of Aug 18 cutoff by 6 days, Schedule Buffer: Safe
   - `UNMAPPED SCOPE` 14 items 18 pts (warning icon), Unparented backlog issues, `Triage backlog →`
3. **"Epic Roadmap & Delivery Forecast Matrix"**:
   - legend: Completed Scope, Remaining Backlog, Current Sprint (Sp 42)
   - grid header: `EPIC & CORE ARCHITECTURE | Sp 40 (Jul 07) | Sp 41 (Jul 14) | ● Sp 42 (Jul 21 - Active) | Sp 43 (Jul 28) | Sp 44 (Aug 04 Freeze)`
   - per-epic row:
     - icon, key `ENG-EPIC-12`, status pill (`On Track` indigo, `Minor Friction` amber, `Ahead of Sched` indigo, `At Risk (Scope+)` red)
     - name; owner `Alex Rivera (Staff IC) • 34 pts (82%)`
     - Gantt-like progress bar across the sprint columns, labelled `82% Burned | 28 pts`, then `6 pts left` and a forecast end marker (`Jul 28` ✓, `Mid Sp 43`, `Sp 42 D8`, `Sp 44 Slip` / `+5 pts HSM creep`)
     - the bar colour follows epic status
4. **Three-column row:**
   - **"Scope Churn Analysis"** (Q3 Milestone Baseline): `Baseline: 85 pts / Current: 94 pts (+9 Net)`, a stacked bar `Planned (85) | Injected (+15) | Deferred (-6)`, and a `SCOPE MUTATION EVENTS` list of ±pts.
   - **"Slippage Risk & Simulation"** (`1,000 Runs`): P50 / P85 / P95 rows with dates and bars, plus a red `Critical Path Friction` callout.
   - **"Bandwidth Distribution"** (Sprint 42 Load): a segmented horizontal bar and a 2×2 legend `Consensus 38% (140h)`…, `Active Engineers: 8 ICs`, `Rebalance allocation` (link to Capacity).
5. **"Deliverable Traceability: Distributed Consensus Core (ENG-EPIC-12)"**:
   - status filter tabs `All (6) | In Progress (2) | Review & QA (1) | Done (3)`
   - table columns: `ISSUE ID & TITLE | TYPE | PTS | ASSIGNEE | SPRINT | GIT & PR STATUS | DELIVERY STATUS`
   - type icons for Story / Task / Spike; status pills `Done` / `Review & QA` / `In Progress`
   - footer `Showing 6 linked child issues (34 story points total)`, `+ Link Backlog Issue`, `Open in Issue Tracker`

**Interactions:** release picker, owner/epic filter, unit switch, click an epic row to drive the traceability table, run Monte Carlo, scope-creep audit, export, link an issue to the epic, rebalance link.

**Data needed**
- **Releases:** {name, target/freeze date, sprints[], baseline_points snapshot}.
- **Epic:** {key, owner, status/health, icon}.
- **Completed vs remaining per epic over time**, which needs history for "burned" per sprint.
- **Forecast end:** remaining / epic throughput per sprint.
- **Scope churn:** baseline snapshot vs current, plus injected/deferred events.
- **P50/P85/P95:** Monte Carlo on sprint velocity.
- **Bandwidth hours by epic:** needs hour estimates or capacity.
- **Unmapped scope:** tasks with no epic.

**Gap**
- **Exists:** `epic_registry` (name, colour, goal via ScrumEpicHub), epic progress (committed / completed), and `release_plan.milestones` (ScrumMilestonesPanel).
- **New:** roadmap matrix, release entity with freeze date, epic key/owner/health, churn analysis, simulation, bandwidth, traceability table, unit switch.
- **Backend:**
  - extend `epic_registry` entries with `key`, `owner`, `status`, `target_sprint`
  - extend `release_plan` with releases {target_date, sprint list, baseline_points, baseline_at}
  - the sprint-dates requirement from screen 1
  - the event log, for churn
  - PR status needs a Git integration (absent)

---

## 5. capacity_workload_studio

**Purpose:** per-contributor capacity vs load, a day-by-day hours heatmap, rebalancing recommendations, and epic allocation.

**Layout**
1. **Toolbar:**
   - unit `Story Points (pts) | Hours (hrs)`
   - `Squad: Consensus Core ▾`
   - primary `Auto-Balance`, download button
2. **5 KPI tiles:**
   - `COMMITTED CAPACITY` 142h / 160h cap, `88.7%`, bar, Optimal load bandwidth
   - `STORY POINTS LOAD` 88 pts assigned, 6 Active ICs, multi-colour segmented bar (one segment per person, with title tooltips `Alex 22pt`), Target: 90 pts, Δ -2 pts
   - `WORKLOAD BALANCE` Stable, 0 critical, `1 Watchlist`, `Alex Rivera (92% load)` (orange), `Sara Chen under-alloc (66%)`
   - `DEEP WORK INDEX` 72% focus ratio, Calendar Telemetry, Focus: 28.8h/wk, Syncs: 11.2h
   - `BUFFER RUNWAY` 18h unassigned, 11.3% Safe, Reserved for triage & hotfix
3. **Recommendation banner "Agile Telemetry Engine Recommendation"** (`Optimal Rebalance`):
   - text: `Shift ENG-112: Raft Invariant Audit (3 pts) from Alex Rivera (92% load) to Sara Chen (66% capacity)…`
   - buttons `Dismiss`, `Apply 3pt Transfer`
4. **"Contributor Capacity & Day-by-Day Load"** table (`Sprint 42 (D1 - D10)`):
   - legend `Balanced (<7.5h)`, `Heavy (8h)` (amber), `Overcap (>8.5h)` (salmon), `Off/PTO`
   - columns: `CONTRIBUTOR & ROLE | CAPACITY & STATUS | COMMITTED EPICS & TASKS | SPRINT DAY HEATMAP (D1 - D10) | ACTIONS`
   - **Contributor:** avatar with status dot; name, seniority tag (`Staff` / `Senior` / `Mid`); title; availability (`Full 10d • On-Call D4-D6`, `1d PTO (Jul 25) • 9d Avail`, `Spikes D8-D10`)
   - **Capacity:** status label and % (`Warning 92%` amber, `Optimal 82%`, `Healthy 80%`, `Available 66%`, `Balanced 71%`); `22 / 24 pts (38h)`; bar; `In-Flight: 14 pts`; `Buffer: 2 pts (2h)` / `PTO Adj: -4h` / `+4 pts runway` / `Reserve: 4 pts`
   - **Tasks:** chips `ENG-104 8pt` (dot colour = epic; orange when a task is a rebalance candidate) and a domain tag line
   - **Heatmap:** 12 small cells of about 18×22px. 10 working days of hours (`7h`, `9.5h`), with `WE` cells for weekends and a `PTO` cell. Cells are coloured by threshold and have hover titles (`D5: Consensus PR review bottleneck`). Axis labels `D1 (Mon)`, `D5 (Fri)`, `D10 (Freeze)`.
   - **Actions:** a rebalance (⇄) button that opens screen 6, and a settings button. The under-allocated row is highlighted and gets a `+ Assign` button.
   - **Footer:** `Squad Allocation: 6 Contributors | Total Cap Limit: 108 pts (160h) | Sprint Commitment: 88 pts (81.4% total) | ✓ No over-allocated engineers exceeding 100% hard limit`
5. **Bottom row:**
   - **"Epic & Domain Allocation Breakdown"** (4 Epics Active): a segmented bar and 2×2 cards `Consensus & Replication 34 pts (38%)`, `Allocated: Alex R., Sven K.`, `4 Issues In-Flight`. Footer: std-dev note, `View Epic Roadmap`.
   - **"Daily Bottleneck Radar"** (`Freeze: Day 9`): a mini column chart of team load per day D1–D10. D5, D8 and D9 are highlighted; D6/D7 are dimmed weekends at 5% height. Callouts `Day 5 PR Crunch`, `Day 9 Pre-Freeze Run`, plus a `Surge Protection Active` card (`Sprint commitment capped at 90% team limit`) with `Policy Rules`.
   - **Rendering issue:** in the PNG the radar bars barely show. Build it as a real bar chart.

**Interactions:** unit switch, squad filter, Auto-Balance, apply or dismiss a recommendation, hover heatmap cells, open the rebalance modal, assign to an under-allocated member, edit per-member capacity, policy rules.

**Data needed**
- **Member capacity:** per member per sprint {capacity_points, hours_per_day, PTO dates, on-call ranges, role/seniority, skills}.
- **Load %:** assigned pts / capacity pts.
- **Heatmap hours per person per day:** needs either per-task estimate hours spread across days (from task dates) or a planned/logged hours ledger. The design implies planned daily hours.
- **Deep Work / Syncs:** needs calendar integration. Out of scope; hide the tile or make it manual.
- **Squad:** maps to `Team` (`models/team.js`: `shared_members`, `team_lead`).
- **Recommendation:** a heuristic. Move the smallest non-locked task from the highest-load member to the lowest-load member with a skill match, without exceeding the policy ceiling (85–90%).

**Gap**
- **Exists:** AssigneeWorkloadChart (pts per assignee) and the teamHealthUtils workload signal.
- **New:** almost everything.
- **Backend:** populate `sprint_management.member_capacity` as `{[userId]: {capacity_pts, hours_per_day, pto:[dates], on_call:[ranges], skills:[], role}}`; task `estimate_hours` / `logged_hours`; a policy config (`capacity_policy: {safety_ceiling: 0.85, hard_cap: 1.0, commitment_cap: 0.9}`); weekend/working-day calendar config.

---

## 6. task_rebalancing_modal_alex_rivera_workload

**Purpose:** a modal to move selected tasks from an overloaded member to another member, with a live before/after simulation. It opens over screen 5 (the backdrop is the capacity studio dimmed).

**Structure** (centered dialog, about 780px wide, max-height with a scrolling body)
1. **Header:**
   - orange ⇄ icon tile; `Rebalance Workload — Alex Rivera`; amber pill `Staff IC`; close ×
   - sub-line `Current allocation: 22 / 24 pts (92% • Warning load) — 38h committed. On-Call shift active D4–D6.` (the values are amber)
2. **Simulation card** `ALEX RIVERA — CAPACITY TRANSITION SIMULATION` (right side: `↘ -3 pts reallocation`). It holds two side-by-side boxes:
   - `Current State 22 / 24 pts (92% Warning)` with an orange bar, `38h committed`, `On-Call active`
   - `✓ Projected After Transfer 19 / 24 pts (79% Optimal)` with an indigo bar and indigo border, `33h load (-5h)`, `Healthy buffer`
3. **"Select tasks to reassign from Alex Rivera"** (`1 of 4 selected (3 pts)`). Checkbox rows: key, context tag, title, and pts with an hours estimate on the right. Row states:
   - selected: indigo border and tint, plus the pill `Recommended Rebalance` (amber)
   - locked: lock icon and dimmed, `Core architect dependency`, `8 pts (P0)`; cannot be selected
   - normal: `ENG-108 … 6 pts (P0)`, `ENG-119 … 5 pts (~7h)`
4. **"Reassign selected task(s) to"** (right side: `Sorted by capacity runway`, amber). A 2-column grid of candidate cards:
   - **Selected (Sara Chen):** indigo border, avatar, `Staff SecOps`, `Current: 8 / 12 pts (66% • Available)`, pill `+3 pts`, `After transfer: 11 / 12 pts (91%)`, `+5h impact`, a bar split current (indigo) / added (orange), and `Skill Match:` chips `GraphQL`, `Backend`, `Security Audit`.
   - **Warning (Maya Lin):** `⚠ +3 pts would exceed 85% safety ceiling (21/22 pts)` in amber.
   - **Others:**
     - Sven Karlsson: `1d PTO on Jul 25 (Day 8)` (event_busy)
     - Liam Vance: `Near capacity limit (only 2 pt buffer remaining)` (block icon)
5. **Below the fold** (in the HTML): an `Impact & Safeguard Telemetry` section:
   - `Sprint delivery commitment remains intact at 88 pts total.`
   - `Alex Rivera's Day 5 Overcap bottleneck (-2.5h) relieved prior to code freeze.`
   - checkbox `Notify Alex Rivera and Sara Chen via Slack & Nexus Activity Feed`
   - `Audit Log #REL-429`
6. **Footer:** `Reset Selection` (left), `Cancel`, primary `Confirm & Transfer 3 pts (⌘↵)`.

**Interactions**
- multi-select tasks (locked rows are disabled)
- single-select the target; the simulation recalculates live for source and target (pts, %, hours, status label)
- warnings computed per candidate
- ⌘↵ submits; reset clears the selection
- confirm runs a batch assignee update, writes the audit entry and sends notifications
- multi-task moves to a single assignee only

**Data needed**
- source/target capacity (screen 5)
- per-task points, estimate hours, priority, lock reason
- member skills vs task labels/epic (for the skill match)
- PTO and on-call
- per-day hours for "Day 5 Overcap relieved"
- safety ceiling (85%) from policy

**Gap**
- **New.** The current app only changes the assignee per task.
- **Backend:**
  - a bulk reassign endpoint, or N `PUT /page/document` calls (there are no bulk task updates today, and multi-task atomicity matters for the audit)
  - task `locked` / `lock_reason` (or derive locks from P0 + dependency)
  - member `skills`
  - an audit-log record
  - notifications already exist (`createNotification` in putRequest); Slack does not, apart from the team_health digest `slack_webhook`

---

## Cross-screen: build once

1. **`StudioTabs` + `AnalyticsToolbar`**: sprint/release picker, unit segmented control (pts / issues / hours), range segmented control, filter dropdowns, Export/Share. Persist the choices in the URL or `saved_view.scrum.analytics_prefs`.
2. **`KpiTile`**: label in caps, icon, big number, unit, delta (±, coloured), sub-line(s), optional bar / ring / segmented bar / chip. Used about 25 times across 5 screens.
3. **Chart primitives** (one SVG kit): `ChartFrame` (responsive width via ResizeObserver, padding, gridlines, axes with tick formatters), `LineSeries` (with dashed/dotted variants and markers), `AreaSeries` (gradient), `StackedArea` (for the CFD), `GroupedBars`, `RefLine` (target, rolling avg, today marker, scope step), `Cone/Band`, `HatchProjection`, `Crosshair` + `RichTooltip` (a Radix-free positioned div, extending the existing ChartTooltip), and `Legend` / `LegendFilterChips` (toggling series).
4. **Small viz:** `SegmentedBar` (pts by person, epic, churn), `ProgressBar` with threshold colouring, `ProgressRing`, `Heatmap` (cells with threshold scale and tooltips), and `MiniColumnChart` (bottleneck radar).
5. **Domain pieces:** `StatusPill` / `PriorityPill` / `EpicDot` / `AvatarStack`, `IssueKey`, `ScopeEventRow`, `InsightCallout` (info / success / warning variants), `RecommendationBanner`.
6. **Pure analytics module** (`scrumAnalytics.ts`, unit-testable with vitest), as in the sketch below. Ideally the same logic runs server-side in an aggregation endpoint.

```
reconstructTimeline(tasks, events) -> per-day status/points/sprint snapshot
burndown(), scopeLine(), idealLine(), cfd(), velocityBySprint(), rollingAvg()
cycleLeadTimes(), stageQueueTimes(), throughput(), littlesLaw()
monteCarlo(throughputSamples, remaining, runs, seed) -> P50/P85/P95 dates + probability
capacity(memberCapacity, tasks, calendar) -> load %, hours per day
recommendRebalance(capacityModel, policy)
```

7. **`RebalanceDialog`**: built on `@radix-ui/react-dialog` with checkbox rows and a candidate card grid.

**Chart library recommendation:** stay with **hand-rolled SVG plus d3-style math helpers**. Optionally add **`d3-scale` + `d3-shape`** (about 30KB, tree-shakable, no React coupling) for scales, the `stack()` used by the CFD, `area()` / `line()`, and curve interpolation.
- recharts is not installed, and its styling fights hairline / token theming.
- The existing charts are already custom SVG (`scrumReportCharts.jsx`) with Tailwind tokens. This keeps bundle size low, gives full control over the bespoke overlays (forecast cone, lead-time vector, hatch, step scope line, rich tooltips with issue lists), and themes via CSS vars across dark and light.
- If the team wants zero custom axis code, `@visx/*` is the next-best fit, since it is low-level and token-friendly. Avoid recharts and nivo for these designs.
- Add chart categorical tokens (green, amber, indigo, slate, purple, salmon) to DESIGN.md and Tailwind for both themes. The CFD and heatmap colours exceed the current token set.

**Backend changes, consolidated**
- `TaskEvent` (or `board_activity`) collection, indexed by board_id + timestamp. Fields: {board_id, task_id, field (status | story_points | sprint | assignee | epic | blocked), from, to, at, actor, reason}.
  - Write it in `page/document` POST/PUT when `custom_meta.values` change.
  - Backfill once from `PageHistory` `custom_meta_updated` diffs.
- `sprint_management.sprints` → objects: {name, start, end, goal, status, committed_snapshot, started_at, closed_at}. Keep the string form for back-compat.
- `member_capacity`, `capacity_policy`, and a working calendar (weekends).
- Task fields: `estimate_hours`, `logged_hours`, `blocked` / `blocked_reason` / `blocked_at`, `completed_at`, `issue_key`, P0–P3 priority.
- Epic registry: key, owner, status. Releases with freeze dates and baselines.
- Aggregation endpoints under `modules/v1/board/analytics/` (burndown, velocity, cfd, flow, capacity), plus a bulk-reassign PUT.

## Top 5 risks and ambiguities

1. **No status/scope history.** Burndown, CFD, cycle/lead time, churn, velocity commitments and queue times are all impossible to compute accurately without the event log. Past sprints cannot be backfilled reliably: PageHistory only covers edits made through PUT, and it snapshots whole `custom_meta` objects. Decide whether historical charts start at the deploy date.
2. **Hours vs points.** The capacity heatmap, "68 dev-hours", hours unit modes and "5h logged" all assume estimates, time logging and daily distribution, none of which exist. A time-tracking model must be defined, or Hours mode deferred.
3. **Speculative or "AI" content:**
   - Monte Carlo confidence, "Agile Engine Synthesis" / "Telemetry Engine Recommendation", Deep Work Index (calendar), Git/PR/CI status, SecScan, "Synchronized 2m ago", Slack notify
   - each needs an explicit decision to build (heuristic), integrate, or drop
4. **Status model mismatch.** The designs use To Do / In Progress / Review & QA / Done, plus Backlog and Blocked. The app's default is backlog / in_progress / review / done, with custom statuses allowed.
   - Analytics need a configurable status→stage mapping (`todo`, `active`, `queue`, `done`) for CFD bands, flow efficiency and cycle-time start/end.
   - Priority must migrate from low/med/high to P0–P3.
5. **Information density and navigation consistency.**
   - The tab sets differ between screens. Decide whether these studios replace or merge into ScrumBoardShell's "Board / Reports" tabs and the ScrumReportsSection.
   - The screens are desktop-dense: 5-tile KPI rows, a 5-column table with a heatmap, a sprint-column roadmap matrix. The responsive behaviour (stacking, horizontal scroll for the heatmap and matrix, plus reflowing the KPI rows) is unspecified and needs design calls at phone width.
