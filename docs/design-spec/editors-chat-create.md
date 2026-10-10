# Implementation spec: Stitch screens (Doc, Sheet, Whiteboard, Chat, 2 Create modals)

All six screens were checked against screen.png and code.html. Nothing was modified. In the Stitch exports, every interaction is either static mock markup or small vanilla JS (copy button, collapsible toggle, zoom/pan, tab switching, kind picker). None of it is wired to real presence or collaboration.

---

## 1. rich_document_editor_notion_style

**Purpose.** A Notion-style long-form doc (the example is an RFC). It has a cover, an icon, a properties row, rich blocks and a right-side outline rail.

**Layout.** The standard shell is used. The page is a centred column about 820px wide, with a right rail about 200px wide.
- A full-bleed cover image about 190px tall, with hover actions "Change Cover" and "Reposition".
- A doc header row: breadcrumb "Nexus Docs / Q3 Architecture RFC". On the right:
  - a segmented control, "Side Peek" / "Full Page";
  - a lock icon ("Lock document edits");
  - a "Share" primary pill.
- A 48px page-icon tile with a "Change" hover action.
- An H1 title (headline-lg, 36px) and a muted subtitle/description line.
- A metadata pill row: "Under Review" (amber status pill), author chip "Mahmudul Hasan", "Edited 12m ago", "1,420 words", visibility "Sprint 42 Internal".
- An inline format bar (B / I / U / code / link / "Ask AI"). It is shown docked under the header, but it is really the selection bubble menu.
- The body. Last line is a placeholder: "Press space for AI, or type / for commands…".
- Right rail, sticky:
  - "TABLE OF CONTENTS · 4 SECTIONS", with the active item highlighted in indigo;
  - a "Document Health" card: "RFC Completeness 85%" progress bar, "Collaborator Read 14 views".

**Components and variants.**
- Callout block: icon tile, bold title "Deployment Cadence Protocol", body with inline mono highlight "> 35ms".
- Headings H2/H3.
- Bullet list with bold lead-ins.
- To-do list in a bordered card, with counter "2 / 3 COMPLETED". Each item has a done or undone state (done items are struck through) and a right-hand chip: "PR #882" (mono, neutral) or "In Progress" (amber).
- Collapsible toggle "Database Indexing Strategy (PostgreSQL + Timescale)" with a "3 Indexes" count chip.
- Code block with window dots, filename "crdt_reconciler.ts", language label "TYPESCRIPT", "Copy" button and syntax highlighting. A section aside reads "Engine Module v2.4".
- Linked database table "4. Linked Backlog Entities (Sprint 42)", with a "View in Matrix Sheet →" link. Columns: Task Identifier (status icon), Assignee (avatar), Priority pill ("P0 Critical" red, "P1 High" orange, "P2 Medium" grey), Impact Area (mono), Estimate.
- Presence avatars AR / SC / LV +3 in the top bar.

**Interactions.** Slash commands, "space for AI", Ask AI on selection, TOC scroll-spy, collapsible, code copy, lock editing, side-peek/full-page toggle, cover reposition, presence avatars.

**Gap analysis.**
- **Already exists:**
  - Lexical with slash picker (ComponentPickerPlugin), floating format toolbar, check lists, collapsible, tables, layout, embeds, comments (CommentPlugin plus `inner_comments` on `page_meta`), history (HistoryPanel, `page/history` route).
  - Cover image (`editor.jsx`, media `cover_photo`) and the custom-meta property row (DynamicInput).
  - Side peek / full mode already exist as "Open in full mode".
- **New, front end only:**
  - Page icon. There is no icon field on `page_meta`, so it needs `custom_meta.icon` or a new `icon` attribute.
  - Cover "Reposition", which needs a stored y-offset.
  - Subtitle field (new attribute or custom_meta).
  - Word count and "Edited 12m ago" (`updatedAt` and `last_updated_by` exist).
  - TOC rail (derived from heading nodes).
  - Callout node (StickyNode exists but differs).
  - Code block with filename, language and highlighting. CodeHighlightPlugin is **not** registered, and the code action menu is commented out.
  - Inline linked-database table (a new decorator node that queries a board; it is deep-ish).
  - Lock toggle (needs a `locked` field plus a permission check).
  - Status pill "Under Review" (could map to custom_meta).
- **New, backend needed:**
  - "Ask AI": there is no AI module in the backend at all.
  - "Document Health" read count: there is no view tracking, so it needs a new view-event store. "RFC Completeness" has no defined data source.
- **Real-time:** the presence avatars imply live co-editing. Docs currently have no realtime; saving is a debounced 1s `handleSubmit` of the whole JSON.
  - Cosmetic option: show "who's viewing" avatars using a socket room per page (`page:join`/`leave` plus a presence broadcast). This takes about 1–2 days, extending `websocketService.js` the way `conversation:join` already works.
  - Deep option: true co-editing needs `@lexical/yjs` CollaborationPlugin, a y-websocket or Hocuspocus server, and persistence of Y-doc updates instead of JSON snapshots. That breaks the current history and snapshot model, so it is a multi-week effort.

**Theming.** Lexical is fully skinnable through PlaygroundEditorTheme classes and style.scss, so the body blocks can match the design exactly. The header, cover, icon, pills, TOC rail and health card are custom React chrome around the editor.

---

## 2. univer_spreadsheet_full_page_studio

**Purpose.** A full-page spreadsheet ("Capacity & Feature Matrix") with a Google-Sheets-like ribbon, formula bar and sheet tabs.

**Deviation from the shell.** The doc title moves into the top bar. Next to it are a "Full Canvas" mono badge and a "Saved to Cloud" status with a dot, then presence avatars and the buttons "History", "Comments", "Export", "Share" (primary) and the theme toggle. There is no "New Issue" button. The content area is edge-to-edge with no page padding. (In the screenshot the title is cramped and wraps; treat that as an artifact.)

**Layout.**
- Row 1 (about 44px): menus "File / Edit / Insert / Format / Data", undo/redo, Format Painter, Clear Format, a font picker ("Geist Sans"), size "11", then B / I / U / S, text colour and fill colour.
- Row 2 (about 36px): Borders, Merge, H-align, V-align, Wrap, Currency ($), Percent (%), Decimal ".00", Numbers "123", "Σ Formula", Filter, Link, Freeze, Find & Replace.
- Formula bar (about 36px): cell ref "C4" dropdown, cancel (×), commit (✓), fx, the formula "= SUM(C2:C3)" in mono, a muted "→ Evaluated Result: $34,200 (Currency USD)", and a right-hand chip "Cell Format: Currency ($)".
- Grid: row height about 40px. Column headers use the format "C [Allocated $]", meaning letter plus header-row label.
- Footer (about 48px): "+" (Add New Sheet), the all-sheets menu, and tabs "Sheet 1: Feature Matrix" (active, with a caret), "Sheet 2: Hardware Budget", "Sheet 3: Velocity Metrics". Then the selection stats "Count: 16 · Sum: $213,200 · Avg: $13,325", zoom "– 100% +" and a "Grid" toggle.

**Components and states.**
- Selected cell: indigo 2px border with a fill handle; the active row number is highlighted.
- Mono numerics, right-aligned.
- In-cell pastel pills: Done, In Progress, Review, Blocked (red).
- In-cell avatar chips: AR, SC, LV.
- Conditional-coloured percentages (orange below about 70%).

**Interactions.** Formula evaluation preview, a selection aggregate bar, comments, version history, export, share, autosave status, presence avatars.

**Gap analysis.**
- **Already exists:** Univer 0.10 with formula, numfmt, filter, sort, find-replace, hyperlink, thread-comment, table, notes and conditional-formatting plugins, which covers essentially every ribbon item. History through HistoryPanel.
- **New:**
  - The "Saved to Cloud" autosave. The current sheet is saved **manually** (dropdown "Save" plus a toast), so this needs a debounced listener on Univer command execution plus status state.
  - The inline "Evaluated Result" preview and the "Cell Format" chip (custom, read from the selection).
  - Pill and avatar cell rendering. Data-validation dropdown chips can approximate the pills; avatar chips need a custom cell renderer.
  - Header-label-in-column-letter (custom renderer or skip).
  - "Export" (there is no xlsx export today; Univer's exchange plugin is a paid Pro feature, so a client-side SheetJS conversion is needed).
- **Backend:** the existing `page/document` PUT is enough for autosave. A page-level permission model is needed for Share (see the modal sections).
- **Real-time:** the presence avatars imply co-editing. Univer's collaboration server is a paid, closed component. The alternatives are a self-built command-broadcast over socket.io (deep: you would own conflict resolution) or presence-only avatars (cosmetic, about 1–2 days). Recommend presence-only.

**Theming.** Univer exposes a `theme` palette object and dark mode, so grid colours, selection and fonts can be themed. The toolbar, menus and formula bar are Univer's own React UI. Matching the two-row layout exactly would mean either restyling Univer's toolbar with CSS overrides (fragile across versions) or hiding Univer's header/toolbar (`header: false`/`toolbar: false` UI options) and building custom chrome that dispatches Univer commands (more work, but a stable look). The footer stats bar is custom; Univer has a status bar plugin that can be restyled.

---

## 3. infinite_whiteboard_studio

**Purpose.** An infinite canvas for architecture diagrams: rich "node cards", frames, connectors, sticky notes, comments, minimap and present mode.

**Layout.**
- A header bar under the top bar (about 56px):
  - title "System Architecture & User Journey" with a live dot and a "v2.4-draft" version pill;
  - zoom "– 100% +" and "Reset";
  - undo/redo;
  - a live chip "3 editing now" (amber dot);
  - "Minimap", "Side Peek", "Present", and "Share" (primary).
- The canvas fills the rest, on a dark dotted or plain background.
- A floating bottom-centre tool dock (about 480 × 48px): Select (V), Pan Hand (H), Frame (F), Shapes (R) with a flyout (Rectangle, Rounded, Diamond, Ellipse), Connector Arrow (A), Sticky Note (S), Text Box (T), Draw Pen (P), Comment (C).
- A sticky colour swatch row: Pastel Peach, Calm Slate, Lavender, Soft Mint.
- A floating bottom-right "CANVAS MAP" minimap (about 260 × 180px) with an "Active" badge.

**Components.**
- Frame label "FRAME: GLOBAL EDGE INFRASTRUCTURE" (mono, with an id "#42-RFC-INFRA").
- Node cards about 310px wide: icon tile, title and subtitle, an optional pill ("28 PoPs", "Queue: 14/s"), key/value rows (mono), a footer row and a status dot ("Healthy").
- Connector labels: "HTTPS", "WSS :443", "CDC stream" (dashed).
- Sticky/comment notes: coloured header "● Security Notice 10:42 AM", body, author "@alex.r", "Pinned #1" or an "In Review" state.
- **Live cursor** "Alex R." (pointer plus a name tag).
- Free text annotation "Target latency: < 35ms global P99".

**Interactions.** Tool switching with keyboard shortcuts, pan and zoom, minimap toggle, present mode, pinned comments, version label, live cursors and "N editing now".

**Gap analysis.**
- **Already exists:** forked Excalidraw provides select, hand, frame, rectangle, diamond, ellipse, arrow, text, freedraw, zoom, undo, export and theme. There is a PageEmbed custom element and History.
- **New:**
  - Node cards with structured key/value rows. These are not native Excalidraw shapes; they need embeddables or custom elements (the fork has PageEmbed, so the pattern exists), or approximating them as grouped rect + text.
  - Sticky notes with author, timestamp and pin. Excalidraw has no sticky or comment primitive, so these need a custom overlay layer anchored to scene coordinates and new storage, either in the content JSON or as comments (the `comment` module could be reused with a `{x, y}` anchor).
  - Minimap (custom, rendered from `exportToCanvas` or the scene bounds).
  - Present mode (frame-to-frame navigation via `scrollToContent`).
  - Version pill (needs a named-version concept on `page_history`).
  - Connector labels: Excalidraw arrows support bound text, so these are fine.
- **Real-time:** live cursors and "3 editing now" are core to the design. Excalidraw has a built-in collaborator API (`updateScene({ collaborators })` renders cursors and name tags) plus `reconcileElements` for element-version merging. Over socket.io this is feasible, but it is a **medium-deep** effort: a room per page, pointer broadcast, element-diff broadcast with version/versionNonce reconciliation, and a server relay. Cursors only, without element sync, is about 2–3 days; full sync is about 2 weeks. The backend needs new `whiteboard:join`, `pointer` and `scene-update` socket events (none exist today).

**Theming.** The Excalidraw canvas can be themed: theme prop, `viewBackgroundColor`, and CSS variables (`--color-primary`, island and toolbar colours). Hiding the native toolbar and rebuilding the bottom dock as custom chrome that calls `setActiveTool` is the cleanest way to match the design. The header bar, minimap and sticky overlays are custom chrome.

---

## 4. chat_realtime_collaboration_studio

**Purpose.** A Slack-like channel view with rich entity cards, reactions, threads, typing indicators, an AI bot, huddles and linked context.

**Deviation from the shell, significant.**
- The sidebar is different: "Nexus OS", "Chat & Channels (12)", Databoard, Sprint Board, Univer Sheet, etc., with a footer "● Cluster: us-east-prd".
- The top bar has the breadcrumb "Nexus / Engineering Core / #general-eng-core" plus "● Sync Active" and "Public" chips and a search "Search or jump to… ⌘K".
- A new **"WORKSPACE MESH" bookmark strip** (about 44px) with chips: "Raft Invariants RFC", "Sprint 42 Board", "CFD Benchmark Sheet", "Telemetry Live Stream", "Mesh latency: 9.2ms", and "Manage Bookmarks".
- Parts of the screenshot render in a serif fallback font. That is an artifact; use Geist.

**Layout.** Three columns inside the content area.
- **Conversation list (about 310px):**
  - "Jump to channel or DM…" search and a "+" button (New Channel or DM);
  - sections PINNED, CHANNELS (4) and DIRECT MESSAGES. Rows have unread badges (red "2"), "3 typing" chips, presence dots and role tags (Staff, Design, Infra, SecOps), plus a "Nexus Copilot BOT" row;
  - a docked **huddle card** at the bottom: "Eng Huddle · 3 members in room", with mic, deafen and share-screen buttons and a red "Leave".
- **Message pane (flexible width):**
  - channel header "# consensus-engine", "8 members" with an avatar stack, and buttons video (Start Huddle), Pinned Messages (4), Canvas Split View, Search;
  - a "Today, July 21" date divider;
  - the composer.
- **Thread inspector (about 400px):** "Thread: Split-Brain Recovery", sub-path "#consensus-engine > ENG-104", expand and close. It shows a quoted root message, replies, "Sara Chen is typing…", a "CONTEXT LINKED" section (a doc card "Raft Safety Theorems (Doc) v1.4" and an epic progress card "ENG-EPIC-12 · 82% Burned · Sprint 42 (Day 7 of 10) · 3 Blockers"), and a "Reply to thread…" composer.

**Message components.**
- Author row with a role pill ("Staff IC", "SecOps", "Design Lead") and a time.
- @mention chips.
- **Issue card:** "P0 CRITICAL", "ENG-104", "8 Story Points", "In Progress", title, description, "Assignee", "View in Board" and "Side Drawer".
- Code snippet card: filename, "Go 1.22", copy.
- **AI bot message** "Nexus AI Copilot · Telemetry Engine · Automated Heuristic": stats grid (Delinquency Risk, HSM Handshake P99, Rec. Sprint Balance) and actions "Apply Rebalance via Modal" and "View Scope Impact".
- **Embedded sheet preview** "Univer OPFS Sync Benchmarks.sheet · Live Sync: Active", a mini table and "Open Full Univer Sheet →".
- Reaction pills (👍 3, 👀 5, add-reaction) and "2 replies • Last reply 4m ago".

**Composer.** Toolbar with B, I, code, link, bullet list, "@ Mention", "# Issue", "AI Assist", voice note and attach. Placeholder: "Message #consensus-engine (type # to link issues, docs or boards)…". Emoji button, "Markdown supported", "⌘ + ↵ to send" and "Send".

**Gap analysis.**
- **Already exists:** DMs, groups and space channels (`conversation.type` dm | channel | group, `space_id`); Lexical composer with mentions, slash and task picker (`ChatMentionsPlugin`, `ChatSlashMenuPlugin`, `ChatTaskPickerPlugin`, SpaceItemPicker); `entity_refs` and `mentions` on messages; attachments; realtime delivery (`chat:message` to `conversation:` rooms); send status.
- **New, backend needed:**

| Feature | Backend change |
|---|---|
| Reactions | `message.reactions` json, a toggle endpoint, socket broadcast |
| Threads | `message.parent_message_id`, `reply_count`, `last_reply_at`; thread fetch endpoint |
| Typing indicators | `typing:start`/`typing:stop` socket events. The helper at websocketService.js line 166 mentions typing, but nothing emits it. |
| Online presence dots | user online map on connect/disconnect |
| Unread counts | per-member `last_read_at` on conversation |
| Pinned messages and pinned channels | per-user pinned list on conversation |
| Role tags | from team/space roles |
| Bookmark strip | new per-conversation `bookmarks` field |
| Code block rendering | front end mostly; ChatMessageBody may need a highlighter |
| Rich issue and sheet embed cards | `entity_refs` exist; cards need live data fetch |
| Copilot bot and AI Assist | no AI backend exists; entirely new |
| Huddles (voice/screen) | WebRTC plus an SFU (LiveKit or similar); entirely new, large |

- **Real-time:** chat is already socket-based, so typing and presence are cheap additions to the existing socket. Huddles are the deepest item.

**Theming.** All of this is custom React. The composer uses Lexical, which is fully skinnable.

---

## 5. create_space_folder_resource_modal_experience

**Purpose.** A large "Create in Nexus" modal for either a resource (doc, sheet, whiteboard, board) or a container ("Hierarchy Space"), with explicit placement, access policy, template and a live path preview.

**Layout.** A modal about 940px wide (the scrim covers the shell), two columns at about 60/40.
- **Header:** "Create in Nexus · v2.4 Core", segmented tabs "Resource" / "Hierarchy Space", close (Esc).
- **Left column:**
  - "ARTIFACT KIND": 4 icon tiles, Doc / Sheet / Whiteboard / Board. These are hidden when the "Hierarchy Space" tab is active.
  - "ITEM IDENTIFIER & TITLE": emoji icon button (cycles through an emoji set) plus a title input; "autogenerated slug" hint.
  - "TARGET DESTINATION HIERARCHY": three selects, Domain Space ("Team & Public (Engineering)", "Private Space (Mahmudul)", …), Team Group ("Backend & APIs", …), Target Folder ("/ Root Level", "02-Architecture-RFCs", …).
  - "ACCESS POLICY & INHERITANCE": 3 radio cards, "Workspace — Full team can view & edit", "Group Only — Restricted to squad members", "Private — Visible only to you".
  - "STARTER PRESET" with "View 18 Templates": radio cards "RFC Architecture Spec — Linear structure, specs, API schema" and "Blank Document — Minimal clean editorial slate".
- **Right column (preview):**
  - "GENERATED LOCATION PATH" breadcrumb plus the title (live-updated);
  - "HIERARCHY TREE PLACEMENT" ASCII-style tree;
  - "SQUAD REVIEWERS · Inherited (4)", avatar stack "+2" with "Backend Infrastructure Team";
  - a "Notify squad upon creation" checkbox;
  - a footer meta line "● Storage Allocation · Instant Provisioning" (decorative).
- **Footer:** keyboard hints "esc Dismiss • ⌘ enter Confirm", "Cancel", and a primary button "⚡ Create Document". The label changes with kind: Create Univer Sheet / Create Whiteboard / Create Sprint Board / Create Hierarchy Space.
- The white native selects in the screenshot are a rendering bug; use themed Select components.

**Interactions.** Multi-section single-step form, kind-driven CTA label, cascading selects, live preview, templates, ⌘↵ submit with a "Provisioned ✓" success state.

**Gap analysis.**
- **Already exists:** AddFileDialog and AddMyFilesDialog create document, sheet, whiteboard, board, folder and group with title and `shared_members`/`shared_teams` multi-selects. AddSpaceDialog covers `is_private` plus sharing. Folder, space and group models with `parent_id`, `space_id`, `group_id` are enough for placement.
- **New:**
  - Choosing the destination inside the modal. Today the parent comes from the sidebar node that was clicked; this needs space, group and folder pickers fed by the React Query space tree.
  - Page icon (no field).
  - A 3-level access policy on pages. Pages have only id lists; there is no visibility enum. "Group Only" could map to inheriting from the group, but that needs a `visibility` field or an inheritance rule.
  - Templates: no template system exists. Seed `page_content` from a template registry, either a front-end constants file or a new `template` model for "18 Templates".
  - Inherited reviewers (derive from team/group membership).
  - "Notify squad" (the notification module exists; add a creation-notify flag).
  - "Slug" (no slug field; ids are used).

**Theming.** Pure custom UI (shadcn Dialog plus custom cards).

---

## 6. simplified_create_share_modal_dialog

**Purpose.** A compact create-and-share dialog: pick a kind, title, location, then set sharing and permissions in one step.

**Deviation from the shell.** The sidebar variant differs: "Nexus Workspace", All Files / Recent / Starred / Inbox (3) / Direct & Channels, a storage card ("Storage 84% · 8 active contributors"), and Settings / Trash. The top bar has a "Pro Team" chip, "Search docs, sprints, whiteboards…", a "+ New" (white) button and a help icon. This variant should be reconciled with the main shell; flag it to design.

**Layout.** A centred modal of 620px.
- **Header:** "+" icon, "Create New Resource", subtitle "Select artifact type, destination, and sharing permissions", "ESC" kbd, close.
- "ARTIFACT KIND": a 3×2 grid of cards (icon, name, sub-label). Doc "Notion / Spec", Spreadsheet "Formulas & Data", Whiteboard "Infinite Canvas", Sprint Board "Cycles & Tasks", Databoard "Telemetry & SQL", Sub-Space "Folder & Hierarchy". The selected card has an indigo tint, a border and a dot.
- "TITLE" with a mono URL preview on the right ("NEXUS.IO/ENG/NX-ENG-RFC-402"), and an input with an edit icon.
- A location row: "Location: Engineering Core / Frontend Infra / Sprint 42" with a "Change" link.
- "SHARING & ACCESS" with a "Link Sharing" toggle. A segmented control: "Entire Team" / "Specific Only" / "Hybrid Mode". An "@ Add members by email or name…" input, a role select ("Can view" / "Can edit") and "Invite".
- A member list card: team row "Engineering Core Team (24)" with "Can View", and user row "Alex Rivera · Lead Architect" with "Can Edit" (outlined, active).
- **Footer:** "Open in side panel" checkbox, "Cancel", primary "Create & Open ⌘↵". The primary button is near-invisible in the screenshot; fix the contrast.
- The JS references template pills that are not visible in the render, so templates are optional here.

**Gap analysis.**
- **Already exists:** create for doc, sheet, whiteboard, board and folder; member and team multi-selects; side-peek opening exists.
- **New, backend needed:**
  - **Per-member and per-team permission levels on pages and folders.** `page_meta.shared_members` and `shared_teams` are plain id arrays. Only `space` has `member_roles`/`team_roles` (manager | contributor | viewer). Add `member_roles`/`team_roles` (view | edit) to `page_meta` and `folder`, and enforce them in `page/document` PUT and in the realtime join.
  - **Link sharing:** no token or public-link concept exists. Add `link_sharing: {enabled, role, token}` plus a public or authenticated resolve endpoint.
  - **Invite by email** for non-members: user search exists; email invite of unknown users needs the auth/workspace invite flow (check `workspace` module).
- **Product questions:**
  - "Hybrid Mode" semantics are undefined; presumably team plus specific members.
  - "Databoard" has no current equivalent. `team-health` and `test-coverage` modules exist, but there is no "Databoard" page_type (current types are document, sheet, whiteboard, plus board/scrum), so treat it as out of scope or as a new type.
  - The URL slug preview needs slugs, or show the id path.

**Theming.** Custom shadcn chrome. The same Share panel should be reused as the "Share" popover on the doc, sheet and whiteboard headers.

---

## Cross-screen: build once

1. **ResourceHeader**: breadcrumb or title, version or status pill, save-state indicator ("Saved to Cloud" / "Edited 12m ago"), PresenceStack (avatars +N, "N editing now"), and an action group (History, Comments, Export, Side Peek/Full Page, Present, Share). Used on doc, sheet and whiteboard.
2. **SharePanel / PermissionRow**: member and team rows with a "Can view / Can edit" role select, invite input, link-sharing toggle and audience segmented control. Used in the create modal and every Share button.
3. **CreateResourceDialog**: one component with a compact mode (screen 6) and an advanced mode (screen 5). Shares the KindPicker grid, LocationPicker (space, group, folder cascade from the space tree), AccessPolicy radio cards, TemplatePicker and a ⌘↵ / Esc kbd footer.
4. **Pill/Badge system**: status (Done, In Progress, Review, Blocked, Under Review), priority (P0 Critical, P1 High, P2 Medium), mono id chips (ENG-104, PR #882), role tags. Used in docs, sheet cells, chat cards and whiteboard notes.
5. **EntityCard**: issue card (priority, id, points, status, assignee, "View in Board", "Side Drawer"), doc-link card and sheet-preview card. Used in chat, doc linked tables and the thread "Context Linked" panel.
6. Also: **CodeBlock** (filename, language, copy), shared by the Lexical code node and chat messages; **AvatarStack/UserChip**; **KbdHint**; **SegmentedControl**; **FloatingToolDock**; **PresenceCursor** tag.
7. Realtime layer: generalise `websocketService.js` rooms to `entity:{type}:{id}`, with `presence:join`/`leave`, `typing` and `cursor` events. This one service feeds doc, sheet and whiteboard presence avatars, whiteboard cursors, and chat typing and online status.

## Top 5 risks and ambiguities

1. **Real-time co-editing is implied everywhere** (avatars, "3 editing now", live cursors, "Live Sync: Active") but does not exist for docs, sheets or whiteboards. Decide on presence-only, which is cosmetic and costs days. True co-editing is very different per editor: Lexical needs Yjs plus a y-websocket server and a different persistence and history model (weeks); Excalidraw's reconcile-based sync is feasible (about 2 weeks); Univer's collaboration is paid or closed (very high cost). Without a decision, the UI will promise behaviour the app does not have.
2. **Permission model mismatch.** The designs need per-item view/edit roles, link sharing, a Workspace / Group Only / Private policy and "Hybrid Mode". Pages and folders only store id arrays; only spaces have roles. This is a schema plus enforcement change across page, folder and share endpoints, and it must land before the Share UI.
3. **AI features with no backend:** "Ask AI", "space for AI", composer "AI Assist", the Nexus Copilot bot and "Document Health" completeness. There is no AI module, provider or cost model. Scope out or stub these explicitly.
4. **Heavy 3rd-party chrome fidelity.** Matching the Univer two-row ribbon and the Excalidraw bottom dock likely means hiding the native UI and rebuilding toolbars that dispatch editor commands. That is extra work and creates version-upgrade coupling (Univer 0.10 APIs change often). Node cards and sticky/comment notes on the whiteboard are not native Excalidraw primitives.
5. **Inconsistent shells and invented features.** The chat and simplified-modal screens use different sidebars and top bars (Nexus OS / Nexus Workspace, Workspace Mesh strip, storage card, cluster footer). They also introduce concepts with no product definition: Databoard, Huddles (WebRTC/SFU), slugs ("nexus.io/eng/…"), "18 Templates", "Storage Allocation", version labels ("v2.4-draft"). Confirm with design which are real before building. Several rendering glitches in the PNGs (white native selects, invisible "Create & Open" CTA, serif fallback fonts in chat, cramped sheet title) should not be copied.

**Paths:**
- Designs: `/home/ocean/client/frontend/stitch_all_in_one_workspace_ui/{rich_document_editor_notion_style,univer_spreadsheet_full_page_studio,infinite_whiteboard_studio,chat_realtime_collaboration_studio,create_space_folder_resource_modal_experience,simplified_create_share_modal_dialog}/`
- Key front-end code: `/home/ocean/client/frontend/src/components/elements/editor/editor.jsx`, `/home/ocean/client/frontend/src/components/elements/spreadsheet/index.jsx`, `/home/ocean/client/frontend/src/components/elements/whiteboard/index.jsx`, `/home/ocean/client/frontend/src/pages/Sheets.jsx`, `/home/ocean/client/frontend/src/layouts/elements/components/AddFileDialog.jsx`
- Backend: `/home/ocean/server/api-server/models/{page_meta,space,folder,message,conversation}.js`, `/home/ocean/server/api-server/modules/v1/utils/websocketService.js`
