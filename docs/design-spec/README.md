# UI overhaul: design source and decisions

The visual source of truth is the Stitch export in `stitch_all_in_one_workspace_ui/` at the repo root. Each screen folder holds a `screen.png`, which is authoritative for visuals, and a `code.html`, which shows structure and labels. The design system is "Quiet Precision", described in `quiet_precision/DESIGN.md`. In code, it is implemented by the tokens in `src/index.css` and `tailwind.config.js`.

These per-area specs were derived from the screens:

| File | Covers |
|---|---|
| [shell-hub-settings.md](shell-hub-settings.md) | App shell (sidebar and top bar), workspace hub, profile, workspace, spaces and members settings |
| [board-views.md](board-views.md) | Databoard table, kanban, calendar and timeline views, and the universal side drawer |
| [scrum-analytics.md](scrum-analytics.md) | Sprint board, burndown and velocity, CFD, scope and epics, capacity, the rebalance modal |
| [editors-chat-create.md](editors-chat-create.md) | Document, sheet and whiteboard studios, chat, and the create and share modals |

## Product decisions (2026-10-11)

- **Shell.** `workspace_landing_hub_calm_dual_theme` is the layout for every page. Some screens (settings, chat, simplified create) draw a different sidebar or top bar; those variants are ignored. Settings render as a tab sub-layout inside the main shell.
- **Theme.** Dark is the default and light is fully supported. The primary action uses a neutral inverse color (slate-900 in light, white in dark). Indigo is the accent for focus, selection and active markers.
- **Realtime.** Presence only: show who is viewing or editing a doc, sheet or whiteboard, plus typing and online status in chat. There is no co-editing. Saves stay last-write-wins.
- **AI.** Use rules now and add AI later. Forecasts, Monte Carlo runs and rebalance suggestions use deterministic math. "Ask AI", "Copilot" and "AI Assist" stay hidden until a later phase.
- **Cut for now.** 2FA, SSO, personal access tokens, SSH/GPG keys and session management. Git, PR and CI chips on tasks are also cut.
- **Kept, to build in later phases.** Voice huddles (needs WebRTC and a media server), domain verification, the audit log and storage quotas.
- **Priority scale.** Urgent / High / Medium / Low, shown as P0–P3 chips where space is tight. Existing low, medium and high values map directly.
- **Shortcuts.** Do not use browser-reserved chords (⌘W, ⌘T, ⌘D, ⌘C, ⌘K is search). Create shortcuts use `C` followed by a letter.
- **Analytics history.** Burndown, CFD and cycle-time charts need a task event log. History starts when the log ships. Earlier sprints get a best-effort backfill from page history.

## Roadmap

1. **Foundations.** Done on `ui-overhaul/phase-1-foundations`.
2. **Design system, app shell, hub and settings.** Done on `ui-overhaul/phase-2-design-system` (frontend) and `ui-overhaul/phase-2-backend` (api-server). Settings were pulled forward from phase 7 at the user's request.
   - Frontend: tokens, primitives, sidebar, top bar, ⌘K search, the "New" menu and create/share modal, the hub page and mobile navigation.
   - Backend: per-user favorites, recent items, trash (soft delete), storage size.
3. **Board views.**
   - Frontend: table, kanban, calendar, timeline and the tabbed side drawer.
   - Backend: task keys, manual ordering, priority migration, estimates, WIP limits, milestones, bulk update.
4. **Scrum and analytics.**
   - Frontend: the sprint board and the analytics studios.
   - Backend: task event log, sprint objects (dates, goal, snapshot), member capacity, analytics endpoints, bulk reassign.
5. **Editors.**
   - Frontend: document, sheet and whiteboard studio chrome.
   - Backend: presence, per-item permissions, share links, templates.
6. **Chat.** Threads, reactions, typing indicators, unread counts, pins and bookmarks. Voice huddles come later.
7. **Settings extras.** Profile, workspace, spaces, members, teams and invitations shipped in phase 2. Still to do: audit log, storage quotas, domain verification, invite emails (needs a mail provider).
8. **Hardening.** Accessibility, end-to-end coverage, performance.
