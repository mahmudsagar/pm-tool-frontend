# Design Spec: App Shell, Workspace Hub, and Settings Screens

Implementation spec for the 6 assigned screens, derived from the Stitch exports.

Design files are under `/home/ocean/client/frontend/stitch_all_in_one_workspace_ui/`. Six cross-cutting findings first:

- **Light vs dark hub are the same screen.** `diff` of the two `code.html` files shows one difference: `<html class="dark">` vs `<html class="">`. The light-mode export is the same design with the theme toggled.
- **Light-theme visual deltas** (all handled by `dark:` variants in the markup):
  - Canvas is `#f8fafc` in light and `#0b0d13` in dark. The sidebar is white in light and `#0f1118` in dark.
  - The New button is slate-900 in light and white in dark.
  - The theme toggle shows `dark_mode` (moon) in light and `light_mode` (sun) in dark.
  - The bell's unread dot is slate-800 in light and slate-200 in dark.
  - Row checkboxes are white in dark.
  - Nothing else differs: same layout, labels and data.
- **The settings screens use a different shell from the hub.**
  - Members, Profile, Team Spaces and Workspace use a "Nexus OS v3.4" sidebar: Quick Views (Chat, Databoard, Sprint Board, Univer Sheet, Rich Doc, Whiteboard), Spaces (Private Spaces, Team Spaces), a Cloud Storage meter and a "Settings Suite" link.
  - Their top bar has a static breadcrumb ("Nexus > Settings > Workspace & Members" on every tab), a search box, a bolt icon, a bell and an avatar.
  - They are styled with Material 3 tokens (`surface-container-*`, `primary #c0c1ff`), have no `dark:` variants (dark only), and set the radius scale to DEFAULT 0.125rem.
  - The hub uses slate/hex utilities with full `dark:` support.
  - **Recommendation:** use the hub shell everywhere and render settings as a tab sub-layout inside it, with all colours from Quiet Precision tokens.
- **Monospace font fallback.** The settings exports never load JetBrains Mono, so `font-mono` text (pills, IDs, counts) renders in a serif fallback in the screenshots. Treat that as an export artifact and use JetBrains Mono.
- **Broken icon.** The first private-space item uses the invalid icon name `folder_outlined`, which renders as "_OUTLINED". It should be a folder icon.
- **Missing sidebar hover actions.** The design shows no hover actions on sidebar tree rows. The current app has them (the SpaceMenu dropdown in `MenuItemSpace`), so keep them as hover-revealed `+` and `…` buttons.

---

## 1. workspace_landing_hub_calm_dual_theme (main layout = app shell)

**Purpose:** the workspace home ("All Files"): a greeting, quick-create tiles, space overview cards and a file explorer table. Its sidebar and top bar become the shell for every page.

### 1A. Sidebar
Fixed, `w-64`, full height, `border-r`, scrolls vertically. Rows are 12px text with 17px icons, `px-2.5 py-1.5 rounded-md`. Hover is `bg-slate-100/70` (dark `slate-800/50`). Active is `bg-slate-100/90` (dark `slate-800/70`), medium weight, `aria-current="page"`.

| Region | Item | Material → lucide | Notes |
|---|---|---|---|
| Header (h-14, border-b) | Workspace switcher: 24px rounded-md monogram "N" (inverted colours), name "Nexus Workspace", `unfold_more` | `ChevronsUpDown` | Whole row is a button that opens the existing `WorkspaceSwitcher` popover |
| Main nav | All Files | `home` → `House` | Route `/` |
| | Recent | `schedule` → `Clock` | **NEW** |
| | Starred | `star` → `Star` | **NEW** |
| | Inbox + mono count badge "3" | `inbox` → `Inbox` | Map to notifications (`/notifications`) |
| | Direct & Channels + green presence dot | `chat_bubble_outline` → `MessageSquare` | Map to `/chat`; dot = unread or online |
| Section "PRIVATE SPACES" | 11px uppercase tracking-wider header with collapse chevron and `add` button | `expand_more` → `ChevronDown`, `add` → `Plus` | Header collapses the section; `+` opens AddSpaceDialog (private) |
| | Items indented `pl-5`: "My Personal Notes" (folder), "Draft Specs & Research" (`article`) | `Folder`, `FileText` | |
| Section "TEAM & PUBLIC" | Same header pattern | | |
| | Space row: `dns` icon, medium weight, no link styling | `dns` → `Server` | Use `space.icon` and `space.color` (fields exist) |
| | Group row (`pl-3`): 11px muted text, chevron, no icon ("Frontend Infra") | `ChevronDown` | Groups are collapsible headers |
| | Group children: `pl-3 ml-2 border-l` guide line. Items: folder "Component Library", `view_kanban` "Sprint 42 Board", `draw` "Architecture Board", `table_rows` "Product Metrics" | `Folder`, `SquareKanban`, `PenTool`, `Rows3` | Row is `py-1`, 14px icons |
| | Sibling folder "Backend & APIs" | `folder_open` → `FolderOpen` | |
| | More spaces: "Product Design" (`design_services`), "Growth & Marketing" (`trending_up`) | `PencilRuler`, `TrendingUp` | Per-space custom icon |
| Footer (border-t, p-3) | Storage card: "Storage 84%" (mono), 4px progress bar, "8 active contributors" plus green dot | | **NEW data** |
| | Settings link and Trash link, side by side | `settings` → `Settings`, `delete_outline` → `Trash2` | Trash is **NEW** |

**Tree rules:**
- Indentation steps are 12px per level, with a vertical hairline guide under expanded groups.
- Icon size steps down by depth: 15px, then 14px.
- Item types: space, group, folder, document, sheet, whiteboard, databoard (board), sprint board (scrum).
- **Proposed hover actions** (to keep current functionality): a trailing `+` (add child) and `…` (rename, settings, delete). Reveal with `opacity-0 group-hover:opacity-100`, and keep them always visible on touch devices.
- Show a chevron on any node that has children.

**Current code:**
- `SidebarMenu.jsx` has a 3-icon row (Home, Chat, Settings) plus CommandMenu plus a "Spaces" list.
- `SidebarMenuItems.jsx` renders the fixed roots "Private Space" (owner-only gate) and "Team Space".
- The user avatar, workspace name and logout sit in the sidebar footer. The design moves the avatar to the top bar and the workspace to the sidebar header.
- **Gap:** the design shows Private Spaces for everyone, but the current code gates them with `isOwner`. Decide which is correct.

### 1B. Top bar
Fixed, h-14, `bg-white/80` (dark `#0b0d13/80`), `backdrop-blur-md`, border-b, `px-6`.

- **Left (breadcrumb):**
  - "Nexus" (workspace, medium weight) / a "Pro Team" chip (11px, bordered pill; likely the team or plan context).
  - Then a vertical divider and the trail "Engineering Core › Sprint Hub" (`chevron_right` → `ChevronRight`). The last crumb is medium weight; earlier crumbs are clickable.
  - The trail is `hidden md:flex`.
  - Build the trail from the current route plus the space tree (space › folder/group › item).
- **Center:** a full-width search trigger button (`max-w-md`): `search` → `Search`, placeholder "Search docs, sprints, whiteboards...", and a `⌘K` kbd. It opens the existing `commandMenu` dialog, which is backed by `/v1/search` (folders, pages, groups, teams, spaces).
- **Right:**
  - **"New" button** (`add` → `Plus`, primary inverted). It should open a dropdown or the create modal listing the same 6 resource types as the hub tiles, plus Space and Folder. See the `create_space_folder_resource_modal_experience` screen; the existing `AddFileDialog`, `AddSpaceDialog` and `AddMyFilesDialog` cover this.
  - Vertical divider.
  - Theme toggle: `light_mode`/`dark_mode` → `Sun`/`Moon`. The existing `ThemeToggle` can be re-skinned.
  - Notifications: `notifications_none` → `Bell`, with a 6px dot when unread. Existing `NotificationCenter` popover.
  - Help: `help_outline` → `CircleHelp`. **NEW**: a menu with shortcuts, docs and what's new.
  - Avatar (28px round). **NEW** dropdown: profile, settings, theme, logout.
- **Current code:** `header.jsx` shows the hard-coded title "Better Notion", the ThemeToggle, NotificationCenter and an optional kebab. Breadcrumb, search trigger, New, help and avatar are all new.

### 1C. Hub body
Main area is `max-w-[1360px] px-8 py-8`, sections separated by `gap-10`.

1. **Greeting header** (bottom border):
   - Eyebrow: dot · "WORKSPACE HUB" • "SPRINT CYCLE 42 ACTIVE".
   - H1 "Good morning, Mahmudul" (text-2xl semibold; time-of-day aware).
   - Subtext summary: "You have 2 pending RFC reviews…".
   - Right side: 4 stat chips (bordered, 12px): `check_circle` 14 Tasks, `view_kanban` 3 Sprints, `chat` 2 Unread, `cloud_done` (emerald) Synced. Lucide: `CircleCheck`, `SquareKanban`, `MessageSquareText`, `CloudCheck`.
   - Data:
     - Tasks: items assigned to me across boards. Needs an aggregate endpoint.
     - Sprints: active scrum boards.
     - Unread: chat unread count. The conversation model exists; check for an unread aggregate.
     - Synced: realtime socket connection state (client-side).
     - "RFC reviews" has no backend. Make the subtext generic, e.g. "N items updated since your last visit".
2. **Create Resource:**
   - Label "CREATE RESOURCE" with a "Configure shortcuts" link on the right.
   - Grid of 6 tiles: 2 columns, 3 at `md`, 6 at `xl`. Each tile is h-24, with the icon top-left, a mono shortcut top-right, then a title and a subtitle. Hover changes the background and darkens the icon.
   - Tiles: Doc ⌘D "Wiki & specs" (`FileText`) · Sprint Board ⌘S "Agile lanes & issues" (`SquareKanban`) · Databoard ⌘K "KPI telemetry" (`ChartLine`) · Sheet ⌘T "Table database" (`Sheet`) · Whiteboard ⌘W "Vector diagrams" (`PenTool`) · Chat Room ⌘C "Async thread" (`MessageSquare`).
   - Each tile opens the create flow preset to its type, with a space/folder picker.
   - "Configure shortcuts" is **NEW** (per-user prefs). It can be deferred.
3. **Spaces & Hierarchy:**
   - Title, plus subtitle "Organized spaces, groups, and permissions across your team."
   - Segmented tabs: All Spaces / Private / Team & Public / Favorites.
   - Card grid: 1 column, 2 at `md`, 4 at `xl`. Each card has:
     - A 40px icon tile and the space name.
     - "Team Space • 18 Members" or "Private Space • Only You".
     - A `…` menu: open, settings (opens `SpaceSettingsSheet`), favorite, delete.
     - An inset preview box: the top folder/group name with "4 items" (mono) or a "Folder" tag, then a 2×2 (or list) of child items with type icons. Items can carry right-side meta: version "v2.4", progress "92%", "Private/Draft", trend "+18%" (green), a date.
     - Footer: avatar stack with "+6", and "Active 12m ago" / "Updated 1h ago". The private card shows a lock icon with "Encrypted" instead.
   - Data: spaces, member counts, children and `updatedAt` all come from `useSpaceTree`.
   - Item meta (version, %, trend) has no backend. Drop it, or use the item type plus `updatedAt`.
   - Favorites tab needs per-user favorites (**NEW**).
4. **Files explorer:**
   - **Toolbar card:** filter input "Filter files or paths..."; Type select (All Types, Documents, Sprint Boards, Whiteboards, Databoards, Sheets, Folders & Groups); Space select (All Spaces, Private Space, Team & Public Space); "Sort: Last Modified" (`xl` only; make it a sort dropdown); list/grid segmented toggle (`List`, `LayoutGrid`).
   - **Table** (`overflow-x-auto`, rounded-xl bordered). Columns:
     - Header checkbox (select all).
     - Name: type icon, bold title, 11px subtitle, optional inline "Active" mono tag, optional lock icon.
     - Type: neutral pill.
     - Space & Path: e.g. "Team Space / Engineering / Metrics".
     - Permissions: `Globe` Public or `Lock` Private.
     - Last Modified: date plus "by Name".
     - Collaborators: 20px initials avatars, `-space-x-1.5`, "+5".
     - Row `…` menu, revealed on hover.
   - Rows highlight on hover and are clickable to open. Row types include Folder ("Contains 12 Docs & specs") and Group ("Group • 3 Folders, 8 Files", `folder_special` → `FolderKanban`).
   - **Footer:** "Showing 7 items across 4 spaces • ● Autosaved in real-time" (green), and Previous / "1 of 1" / Next.
   - **Bulk select:** checkboxes are shown but no bulk bar. Reuse the Members bulk bar (n selected, Move, Delete, Deselect).
   - **Current code:** `Home.jsx` already uses tanstack table with sorting, row selection, filters and pagination over `useSpaceTree().files`. This is a re-skin plus new columns.
   - **Backend:**
     - `page_meta` has `last_updated_by`, `shared_members`, `page_type` (document/sheet/whiteboard only) and `pinned`.
     - Boards are a separate collection (`board.js`), so the unified list must merge pages, boards, folders and groups. It already does this client-side.
     - `page_meta` has no description field (folders have one), so subtitles need a new `description` field or a derived value.

### 1D. Hub gaps and backend needs
| Feature | Status | Backend |
|---|---|---|
| Recent | NEW | Needs per-user view tracking: a new `user_activity`/`recent_items` collection, written on open, plus `GET /v1/recent` |
| Starred / Favorites | NEW | `pinned` on `page_meta`/`folder` is global, not per-user, and `space` has none. Needs a `favorite` collection (user_id, entity_type, entity_id) and GET/POST/DELETE |
| Inbox | Exists as notifications | `notification` model and `NotificationCenter`/`Notifications.jsx` exist. Needs an unread count endpoint if one isn't present |
| Trash | NEW | No soft delete anywhere (grep found no `deleted_at`/`is_deleted`). Needs `deleted_at`/`deleted_by` on page_meta, board, folder, group and space, list/restore/purge endpoints, and delete changed to a soft delete |
| Storage meter | NEW | `media` has no byte size and `workspace` has no quota. Needs `size` on media and a storage aggregate endpoint |
| Active contributors | NEW | Socket presence count, or `last_seen_at` on user |
| Space member counts / activity | Partial | `shared_members` and `updatedAt` exist |
| Tasks / Sprints stats | NEW | Aggregate endpoint |

### 1E. Responsive (the design only partly covers this; the rest is proposed)
The design itself only specifies: breadcrumb trail `hidden md:flex`, tiles 2/3/6, cards 1/2/4, toolbar stacks below `sm`, table scrolls horizontally. Everything below is proposed.

- **Below 640px:**
  - Sidebar becomes an off-canvas Sheet opened from a hamburger at the left of the top bar (reuse `mobile-sidebar.jsx`).
  - Top bar: hamburger, workspace chip only (crumbs hidden), a search icon button that opens the command menu, an icon-only `+` New button, the bell, and the avatar. Move theme and help into the avatar menu.
  - Body padding `px-4`. The greeting H1 uses the headline-lg-mobile size.
  - Stat chips become a 2×2 grid or a horizontal scroll strip.
  - Tiles: 2 columns, shortcut kbd hidden.
  - Space cards: a horizontal scroll-snap carousel, or 1 column.
  - Table becomes a card list: icon + name + type pill on line 1, "path · date" on line 2, `…` always visible. Hide Permissions and Collaborators.
  - Toolbar: full-width search, then filters on a row below, with the view toggle beside them.
  - Pagination: Prev/Next only.
- **640–1024px:**
  - Sidebar as a 64–72px icon rail with flyout, or collapsed with a toggle. The current `isOpen` gives a 272/78px collapse; keep it.
  - Search trigger shrinks, with the placeholder truncated.
  - Tiles: 3 columns. Cards: 2 columns.
  - Table hides the Collaborators and Permissions columns.
- **1024px and up:** full layout as designed.

---

## 2. workspace_landing_hub_light_mode
Same screen and markup as section 1; only the theme class differs (see the theme deltas at the top). Nothing further to build beyond theme tokens. Note that the light accent in DESIGN.md is `#4f46e5`, while the export uses slate-900 for the primary button. Pick one: I'd keep the neutral inverted button for "New" and use the indigo accent for focus and selection states.

---

## 3. members_and_roles_management (Settings › Members & Roles)

**Purpose:** a workspace member directory with roles, invites and bulk governance.

**Regions:**
- Settings tab bar: Profile · Workspace · Team Spaces · Members & Roles · Integrations · Security & Audit.
- Page header:
  - Eyebrow "DIRECTORY & GOVERNANCE / RBAC TIER 4", H1 "Members & Permissions", description.
  - Actions: "Manage Custom Roles" (`tune` → `SlidersHorizontal`), "Export CSV" (`download` → `Download`), primary "+ Invite Members" (`person_add` → `UserPlus`).
- 5 stat cards: Total Members 42; Admins 6 (14.2%); Members 31 "Standard"; Guests 5 "Limited"; Pending Invites 3 "Awaiting". Each has an icon tile: `Users`, `ShieldCheck`, `IdCard`, `User`, `Mail`.
- Toolbar:
  - Search "Search by name, email, or role..." with a ⌘F kbd.
  - Dropdowns "Role: All Roles", "Space: All Spaces", "Status: Active (42)".
  - Refresh (`restart_alt` → `RotateCcw`).
- Bulk bar (when rows are selected): "● 3 selected | Apply bulk directive…", then Change Role · Reassign Spaces · Suspend Access (danger) · Deselect.
- Table columns:
  - Checkbox.
  - Member: 36px avatar with a presence dot, name, "YOU" tag, "Title · email".
  - Access tier / Role: a pill dropdown with a colour dot (Admin = indigo, SecOps Admin, Space Manager, Member = grey, Guest (Read) = amber).
  - Assigned team spaces: stacked chips with "+2".
  - 2FA security: icon plus text, e.g. "FIDO2 / Hardware", "Enforced / Active", or "SMS Fallback" in amber with `gpp_maybe`.
  - Activity: "Active now" in accent, otherwise relative time.
  - Kebab (`more_vert` → `EllipsisVertical`).
- **Pending invite row:**
  - Disabled checkbox, mail-icon avatar with an amber dot.
  - Email as the name, with an amber "PENDING INVITE" tag.
  - "Contract Design Auditor · Invited 2 days ago".
  - "Not configured" for 2FA, "Invited 48h ago" in amber, and a "Resend Invite" button.
- Pagination: "Showing 1–7 of 42 roster records", rows per page 10/25/50, Prev, numbered pages, Next.
- **"Role Hierarchy & Permission Boundaries"** panel (with an "Edit RBAC policy schema ↗" link) holding 4 cards:
  - Enterprise Admin: "Root Access", 6 Active.
  - Space Manager: "Scoped Lead", 8.
  - Member: "Read / Write", 23.
  - Guest: "Sandboxed", 5.
  - Each card has a description and a colour dot.

**Interactions:** select-all and per-row selection; changing the role inline triggers `PUT` member role; the kebab menu offers view profile, change role, manage spaces, remove from workspace, resend/revoke invite; filters and search; CSV export (can be done client-side); the Invite modal takes emails, role and spaces.

**Current code:** `pages/settings/Members.jsx` (276 lines) and `pages/users/index.jsx` (681 lines) both exist. Merge them into this page.

**Backend:**
- **Exists:**
  - `workspace/member` index, POST, PUT and DELETE, and `member/count`.
  - Roles `admin|member|guest`, plus owner via `owner_id`.
  - Space roles `manager|contributor|viewer` on `space.member_roles`.
- **Gaps:**
  - **Invitations:** `POST member` returns 404 "User not found with this email" if the user doesn't exist. Needs an `invitation` model (email, role, space_ids, token, invited_by, expires_at, status), an email send step, an accept route, and resend/revoke endpoints.
  - **Job title** on user (new field).
  - **Last active:** `user.last_seen_at`, or presence from the socket.
  - **Suspend:** a member `status` (active/suspended) in `member_roles`.
  - **Member → spaces mapping:** derive from `space.shared_members`/`member_roles`. Needs an aggregate endpoint or client join.
  - **2FA:** nothing exists. Drop the column, or show "SSO: Google/GitHub" from `google_id`/`github_id`.
  - **Custom roles / RBAC schema editor:** out of scope. Make the hierarchy cards static and read-only.
  - **Role naming:** "Space Manager" is a space-level role, not a workspace tier. Map the cards to Owner / Admin / Member / Guest.

**Responsive:**
- Stat cards: 2 columns below `sm`, 3 at `md`, 5 at `lg`.
- Toolbar filters wrap and scroll.
- Table becomes member cards below `md`: avatar, name, role pill, kebab, and a spaces/activity line.
- Bulk bar becomes a sticky bottom bar on mobile.
- Role cards: 1 column, 2 at `md`, 4 at `xl`.

---

## 4. profile_settings (Settings › Profile)

**Purpose:** personal identity, appearance, notifications, connected accounts, tokens and sessions.

**Regions:**
- **Hero card:**
  - 96px avatar with presence, and an upload overlay (`photo_camera` → `Camera`).
  - Name, "@alex.rivera" chip, "SSO Verified" badge (`verified` → `BadgeCheck`).
  - Title · org unit.
  - Meta row: local time "14:42 PST (UTC-8)", email, pronouns.
  - Actions "Reset Changes" (ghost) and "Save Preferences" (primary). These imply a page-level dirty state.
- **Left column (lg: 7/12):**
  - **Identity & Organizational Coordinates** (meta tag "SEC-L3 AUTH"): Legal Full Name; Handle (@ prefix); Work Title; Primary Guild/Domain select; Enterprise Email (read-only with lock); Pronouns. Below the fields, an "Okta Universal Directory" sync banner tagged "SYNC OK".
  - **Telemetry & Alert Routing** (tag "DND Preset: Off"):
    - 3 checkbox cards: Direct @Mentions, Sprint Burndowns, Telemetry Alerts.
    - "Digest Schedule & Email Delivery" row with a "Daily 09:00 AM | Instant Batch" segmented control.
    - "Active Snooze / Focus Horizon" row with a "Snooze for 2 Hours" button.
  - **Personal Access Tokens & Keys:** "+ Generate Token". Token rows: icon, name, masked id · expiry, "Active" success pill, trash. Then SSH Keys "2 Active" and GPG Signatures "1 Verified" tiles.
- **Right column:**
  - **Appearance & Surface Flow:** Theme segmented control (Quiet Dark / Editorial Light / OS Sync); Accent swatches (indigo, emerald, violet, cyan, amber, slate) with the hex label "Indigo Subdued (#6366F1)"; Density radio cards (Compact / Comfortable); "Spatial Huddle & Micro-Audios" checkbox.
  - **Federated Identities** ("3 Integrated"): GitHub Enterprise, GitLab Self-Hosted, Google Workspace "Primary SSO". Each has a handle, a status line (green "Synced…") and a Configure button.
  - **Audit Telemetry Session:** IP, current device row (laptop icon, "MacBook Pro 16" · …", location, green dot).

**Current code:** `pages/settings/Profile.jsx` has a photo upload, Name, Email, Phone, and a password change form. Password change is **not in the design. Keep it**, either as a card or under the Security tab.

**Backend:**
- **Exists:** `user` has name, email, phone, avatar, google_id, github_id. `PUT /v1/user` accepts name/phone/avatar. `user/password` exists. Upload via `upload/media`.
- **NEW user fields:** `handle` (unique per workspace), `title`, `pronouns`, `timezone`, `preferences` JSON (theme, accent, density, sound), `notification_prefs` JSON (mentions, digest, snooze_until).
  - Appearance can ship client-side (localStorage) first.
- **Connected accounts:** read `google_id`/`github_id` to show "Connected". Connect and disconnect are new; OAuth routes exist.
- **Sessions:** auth is stateless JWT (login uses `session:false`). A sessions list and revoke needs a session/refresh-token store, so it's a backend change. Otherwise show "current device" from the user agent only.
- **Defer or drop:** PAT/SSH/GPG, Okta/SAML, GitLab, "Primary Guild".

**Responsive:**
- Two columns at `lg`, one column below.
- Hero actions stack below the identity block below `md`.
- Form grids: 2 columns at `md`, 1 below.
- Notification cards: 3 columns at `md`, 1 below.

---

## 5. team_space_settings (Settings › Team Spaces)

**Purpose:** admin governance of all spaces: policies, a list of spaces, and an inspector to edit the selected one.

**Regions:**
- **Header:** eyebrow "NEXUS OS // DOMAIN PARTITIONING & POLICY", H1 "Team Spaces Governance", description. Actions "Policy Ledger" and primary "Create New Space" (`add_box` → `SquarePlus`).
- **3 policy cards:**
  - Public Creation Rights: a toggle; footer "Target Policy: Level 2 / Permitted".
  - Default Onboarding Space: "AUTO_ROUTING" amber tag; current value "● Engineering Core" with an "Alter Default" link.
  - Cross-Space Visibility: "TENANT-WIDE" tag; "Audit Status: Passed / Global Discovery On".
- **Left list (xl: 7 columns):**
  - Header "ALL PARTITIONS [4 Active]" with "Filter: Active" and "Sort: Priority" buttons.
  - **Selected space card:** left accent bar; emoji/icon tile; name; badges "DEFAULT SYSTEM" (indigo) and "Public (Internal)"; description; "Inspecting" primary chip and kebab; a 4-stat grid (Members 24 users, Chat Channels 12, Databoards 4, Univer Sheets 6); "Space Leads" avatars and names; "Manage Roles" and "Edit Permissions" buttons.
  - **Collapsed cards:** icon, name, visibility badge, description, a dot-separated counts line, "Select" button, "Lead: Name".
  - **Restricted variant:** red "Restricted / Confidential" badge and an "Audit Lock" button.
- **Right inspector (xl: 5 columns):**
  - TARGET SCOPE: icon, slug "engineering-core.nexus", "ID: spc_9942f".
  - Display Name & Glyph (icon picker plus input).
  - Operational Mandate (textarea).
  - Space Membership (24 users), with "+ Invite Contributor": rows with a role select (Space Admin / Contributor), and "+21 other workspace engineers · Default Viewer Sync".
  - Template Presets & Quotas: 3 tiles (Sprint Board, Univer Sheet, Whiteboard presets).
  - Partition Volume quota bar "32.4 GB / 50 GB".
  - Outbound Sync Handlers: Slack Bridge "● Live", Configure.
  - Footer: "Archive Space" (amber ghost) and "Save Settings" (primary).
  - Below the panel: a "Policy Digest: 0 conflicts" strip with "View JSON Hash".

**Current code:**
- `SpaceSettingsSheet.jsx` already edits a single space (it lives in the sidebar flow).
- `pages/settings/Teams.jsx` manages **Team** entities (user groups: name, team_lead, shared_members). That is a different concept from spaces.
- **IA decision needed:** the design's tab is about spaces. Proposal: tab "Spaces" uses this design with the inspector reusing the SpaceSettingsSheet form. Keep "Teams" either as a sub-section here or as its own tab.

**Backend:**
- **Space exists:** name, description, color, icon, default_view, space_lead, is_private, shared_teams, shared_members, member_roles (manager/contributor/viewer), team_roles, is_default. `space/access` PUT exists.
- **Map** "Space Admin/Contributor/Viewer" to manager/contributor/viewer.
- **NEW:**
  - Workspace-level `space_policies` {allow_member_public_create, default_space_id}.
  - `space.archived_at` (archive).
  - Per-space counts endpoint (members, chats, boards, sheets). Can be derived client-side from the tree, except chat.
  - Space slug.
- **Defer:** quotas/volume, template presets, Slack bridge, policy ledger/JSON hash, cross-space visibility (search already respects access).

**Responsive:**
- Policy cards: 1 column, 3 at `md`.
- Below `xl` the inspector becomes a right Sheet (full screen on mobile), opened by "Select".
- Space stat grid: 2×2 on mobile.

---

## 6. workspace_settings (Settings › Workspace)

**Purpose:** workspace identity, defaults, feature modules, storage and dangerous actions.

**Regions:**
- **Header:** eyebrow "WORKSPACE CONFIGURATION & GOVERNANCE :: ID-88241", H1, description. Actions "Audit Log" (`history` → `History`) and primary "Save Changes".
- **Left column (lg: 7/12):**
  - **Identity & Domain** (tag "TENANT_NODE_01"):
    - Organization Crest uploader: preview, "SVG / PNG < 5MB", "Upload New" and "Remove" (danger text).
    - Workspace Legal Name.
    - Canonical Slug: prefix "nexus.internal/workspace/" + slug, with a copy button (`content_copy` → `Copy`).
    - Domain verification row: "● nexus-tech.io ✓ Verified", "TTL 3600s", the TXT record in a mono box, "Recheck DNS".
  - **Preferences & Work Cadence** ("Locale & Sprints"):
    - Primary Timezone select (4 options in the export).
    - Operating Workweek select: Mon–Fri / Sun–Thu / Mon–Sat / 7 days.
    - Sprint Default Cadence: 1/2/3 weeks or monthly.
    - Issue Identifier Prefix: "ENG-", hint "Ex: ENG-409".
    - Primary System Language row: "English (US)" chip.
- **Right column:**
  - **Feature Modules** ("ACTIVE 5/5"): toggle rows with icon tiles for Univer Spreadsheets, Whiteboard Studio, Realtime Audio Huddles, Nexus Copilot AI Assist, Databoard Matrix Views. Then an "Auto-Archive Inactive Resources" row with a "90 Days" chip.
  - **Storage & Quota** ("14.8 / 20.0 GB"): stacked segmented bar with "74% capacity", a legend (Sheets 6.2, Whiteboards 4.1, Revisions 2.8, Chat & Attach 1.7 GB), and an "Export Workspace Data (JSON + Assets archive)" button.
  - **Danger Zone** (red heading, `warning` → `TriangleAlert`):
    - Transfer Ownership → "Transfer".
    - Archive Workspace → "Archive".
    - Delete Workspace: red-tinted row, red "Delete" button.

**Current code:** `pages/settings/Workspace.jsx` has Name, Logo URL (text input), Timezone, Date Format, First Day of Week, Working Days checkboxes, and Billing & Plan.
- Date Format and Billing are not in the design. Keep Date Format in Preferences; billing could become a later tab.
- Working Days maps to "Operating Workweek". Keep the checkbox editor, or offer presets that write `working_days`.

**Backend:**
- **Exists:** `PUT /v1/workspace` (name, description, logo, timezone, date_format, first_day_of_week, working_days, billing_plan), `DELETE /v1/workspace`, media upload for the crest.
- **NEW fields:** `slug` (unique), `language`, `sprint_cadence`, `issue_prefix`, `features` JSON (flags; the client must gate routes and create menus on them), `auto_archive_days`, `archived_at`.
- **NEW endpoints:** transfer ownership (`PUT workspace/owner`); storage breakdown (needs `media.size` and an aggregate by type); export job.
- **Defer:** domain verification/DNS, audit log (no model), audio huddles, AI.

**Responsive:** 12-column grid down to 1 column below `lg`. Danger rows stack the button under the text below `sm`. Form pairs become 1 column below `md`.

---

## Shared settings components (build once)
1. **SettingsLayout:** hub shell, plus a sticky, horizontally scrollable underline tab bar (Profile, Workspace, Spaces/Team Spaces, Members & Roles, Integrations, Security & Audit). Integrations and Security can start hidden or as placeholders. Adds an optional sticky save bar.
2. **PageHeader:** eyebrow (dot + uppercase label + mono id), H1, description, right-side action slot. Reuse it on the hub.
3. **SectionCard:** icon + title + right meta tag (mono pill) + body. Has a `danger` variant.
4. **FormField / FieldGrid:** label, control, hint/suffix ("Ex: ENG-409"), prefix ("@", URL prefix), read-only/locked state with a lock icon, copy button.
5. **StatCard:** label, big number, sub-label, icon tile. Used on Members and Team Spaces, and the hub chips are a compact variant.
6. **ToggleRow / CheckboxCard / RadioCard / SegmentedControl:** feature modules, notification cards, density, theme, digest, and the hub space tabs.
7. **MeterBar:** single and stacked, with legend. Used by the sidebar storage card, the workspace quota and the space volume.
8. **DataToolbar:** search with a kbd hint, "Label: value" filter dropdowns, refresh button, view toggle.
9. **BulkActionBar:** count, description, actions, danger action, deselect. Shared by the hub table and Members.
10. **DataTable + Pagination:** tanstack-based, with selection, a rows-per-page select, numbered pages, and a card layout on mobile.
11. **Pills:** StatusPill (success/warn/info/danger/neutral pastel tones per DESIGN.md), RoleSelect pill with a colour dot, TypeBadge, and a mono Tag ("YOU", "PENDING INVITE", "DEFAULT SYSTEM").
12. **AvatarStack (+N)** and **MemberRow** (avatar, presence dot, name, tag, subline, trailing slot).
13. **IntegrationRow** (icon tile, name, handle, status line, action) and **DangerRow** with a typed-confirmation dialog.
14. **InspectorPanel:** a right column at `xl`, a Sheet below that.

## Top 5 risks / ambiguities
1. **Two design languages.** The settings exports use a different shell (Nexus OS sidebar with Quick Views, static breadcrumb, bolt icon), MD3 tokens, dark-only styling, a different radius scale, and missing mono fonts. The hub uses Quiet Precision with light/dark. Settings has no light-mode design; it has to be derived from the hub tokens.
2. **Enterprise scope inflation with no backend:** SSO/Okta, 2FA, PATs/SSH/GPG, custom RBAC, domain verification, audit log, quotas, Slack bridge, AI/audio feature flags, policy ledger. We need an explicit cut list. Real new backend work is needed for Recent, per-user Favorites, Trash (soft delete across 5 collections), invitations, storage size, last-seen/presence, sessions, new user and workspace fields, and space archive.
3. **Shortcut conflicts.** The tile shortcuts ⌘D, ⌘T, ⌘W and ⌘C are browser or OS reserved (bookmark, new tab, close tab, copy). Databoard's ⌘K duplicates search. Use a different scheme (e.g. `C` then `D`, or ⌥⇧ chords) and update the tile labels.
4. **Model and naming mismatches:**
   - Workspace roles (owner/admin/member/guest) vs space roles (manager/contributor/viewer), while the design mixes them ("Space Manager" as a workspace tier, "SecOps Admin").
   - `pinned` is global, not per-user.
   - `page_type` covers only document/sheet/whiteboard, with boards in a separate collection.
   - The tree shows Groups as plain collapsible headers.
   - Private-space visibility is owner-only in the code but shown to everyone in the design.
5. **IA ambiguity:**
   - The "Team Spaces" tab is about spaces, so where do existing Teams (user groups, `pages/teams/*`) live?
   - Inbox vs Notifications page vs the bell popover.
   - "Direct & Channels" vs `/chat`.
   - What the "Pro Team" breadcrumb chip means (a team context or a plan badge).
   - What "New" opens (a dropdown or the full create modal).
   - "Configure shortcuts" and the hub's greeting summary have no defined data source.
   - Settings tabs Integrations and Security & Audit have no designs in this set.

Key current-code files to replace or re-skin, all under `/home/ocean/client/frontend/src/`:
- Shell: `layouts/Default.jsx`, `layouts/elements/sidebar.jsx`, `SidebarMenu.jsx`, `SidebarMenuItems.jsx`, `header.jsx`, `mobile-sidebar.jsx`, `layouts/elements/components/MenuItemSpace.jsx`, `MenuItemFolder.jsx`, `WorkspaceSwitcher.jsx`, `SpaceSettingsSheet.jsx`.
- Pages: `pages/Home.jsx`, `layouts/Settings.jsx`, `pages/settings/{Profile,Workspace,Members,Teams}.jsx`, `pages/users/index.jsx`.
- Routes: `BetterRouter/routes.jsx`.

Backend references, all under `/home/ocean/server/api-server/`:
- Models: `models/{workspace,user,space,page_meta,board,folder,media,notification}.js`.
- Routes: `modules/v1/workspace/{member,config/validation.js}`, `modules/v1/space/{access,config/validation.js}`, `modules/v1/user/{putRequest.js,password,config/validation.js}`, `modules/v1/search/index.js`.
