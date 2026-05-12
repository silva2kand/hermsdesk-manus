# HermesDesk OS Evolution Log

Canonical ledger for what HermesDesk/Baba/Mythos can do, what is shipped, what is gated, and what remains a spec. If a feature is not represented here, it should not be described as shipped.

Last updated: 2026-05-12

## 1. Operating Contract

- Mythos Manager is the front door for user intent, routing, task creation, and approval safety.
- Read-only actions may run when a connector/tool is available, but they must be visible in events, traces, or task history.
- External actions require approval: send, submit, pay, sign, delete, upload, contact, install, or change external systems.
- No fake work: UI surfaces must show real tool events, real evidence, real tasks, or clearly say no real data is available.
- No hidden data sharing: private data must not be sent to external AI apps or cloud tools unless Silva approves exact content and destination.

## 2. Shipped Core Capabilities

- Mail memory indexes Classic Outlook/Graph mail when connected.
- Important sender rules are stored in live config and used by mail intelligence.
- Priority sender emails are boosted, classified, routed, and kept in `knownProviderEvidence`.
- Continuous mail scan runs after app startup and every 5 minutes.
- Z-reports remain stored as accounting/VAT/funding evidence but are lower review priority unless abnormal.
- Rich approval cards and task monitor UI exist for serious actions.
- Browser Operator, PC UI tools, mail sync, Wide Research, WhatsApp draft workspace, and EventBus traces are wired as real surfaces.
- Packaging/build works after closing the running app and clearing `ELECTRON_RUN_AS_NODE`.

## 3. External AI App Study

Status: shipped as safe visible-read mode.

Supported targets:

- Qwen
- Microsoft Copilot
- ChatGPT
- Manus
- Minimax
- DeepSeek
- Grok

Behavior:

- Uses real Windows window list to locate a target app/window.
- Opens known web routes when a target is not visible.
- Focuses the matching window before reading.
- Scans visible UI text only through Windows UI Automation.
- Saves a local memory note with source app, window title, timestamp, and extracted visible text.
- Does not type, submit, send, prompt, or share anything into external AI apps without explicit approval of exact text.

Memory rule:

- External AI app learning must use local import files or visible Windows UI reading only.
- It must save source/date/evidence locally.
- It must stop before typing or submitting into those apps unless Silva approves the exact text.

## 4. Sidebar And Settings Surface

Status: partially shipped.

Shipped:

- Personalization sidebar route opens the Personalization settings view.
- Workspace and Integrations sidebar groups are expanded by default.
- Theme and appearance settings apply to the app root.
- Dark mode and accent themes propagate across common shell styles.

Still to tighten:

- Some settings panels remain thin control surfaces rather than full production modules.
- Some connector cards represent route visibility, not authenticated/live access.
- Each panel should display whether it is `live`, `route-only`, `needs login`, `needs API key`, or `not wired`.

## 5. Premium Live Surfaces Spec

These are specs, not fully shipped yet. They must visualize real data only.

### 5.1 Live Browser Surface

Purpose:

- Operator view of real browser sessions opened/read by agents.

Layout:

- Left: session list grouped by task.
- Center: read-only page viewer or static snapshot.
- Right: evidence snippets, source URLs, timestamps, agent, task, and "used in" links.

Allowed actions:

- Open URL externally.
- Re-search by creating a new Mythos task.

Not allowed:

- Fake navigation state.
- Direct ungated submit/pay/order/book actions.

### 5.2 Email Viewer Surface

Purpose:

- Show real emails referenced by agents and extracted fields used as evidence.

Layout:

- Left: mailbox context and filters.
- Center: email header/body preview.
- Right: extracted fields, evidence ids, linked tasks, and approval cards.

Allowed actions:

- Re-extract read-only.
- Prepare reply draft through approval card.

Not allowed:

- Auto-send.
- Bulk destructive mailbox actions without approval.

### 5.3 File Viewer Surface

Purpose:

- Show files agents touched and extracted snippets used as evidence.

Layout:

- Left: file list by source/domain/task.
- Center: preview or metadata.
- Right: extracted entities, evidence ids, linked tasks, and trace links.

Allowed actions:

- Re-extract read-only.
- Propose draft/diff through approval card.

Not allowed:

- Direct file write/delete without approval.

### 5.4 Domain Dashboards

Domains:

- Accounting
- Funding
- Legal
- Property
- Visa
- Business operations

Each dashboard should show:

- Open tasks
- Awaiting approvals
- Recent decisions
- Risk flags
- Evidence completeness
- Domain timeline

No synthetic KPI should be shown unless backed by task/evidence/memory.

### 5.5 Real-Time Cockpit

Purpose:

- Home operator surface for live tasks, events, approvals, tools, and evidence.

Layout:

- Top: system status, Mythos task counts, active agents.
- Left: live EventBus feed.
- Center: selected task/event focus panel.
- Right: approvals and alerts.

Actions:

- Approve, reject, request changes.
- Pause or cancel safe tasks.
- Create new Mythos tasks from templates.

No arbitrary command runner belongs here.

## 6. Data Contracts

These are language-neutral field specs.

### 6.1 BrowserSession

- `id`: unique session id
- `taskId`: task that started this session
- `leadAgent`: agent id/name
- `startedAt`: timestamp
- `endedAt`: timestamp or null
- `actionsUsed`: integer
- `pagesVisited`: integer
- `events`: list of BrowserEvent

### 6.2 BrowserEvent

- `id`: unique event id
- `type`: `session_started`, `session_ended`, `page_opened`, `scrolled`, `content_extracted`, `error`
- `timestamp`: timestamp
- `url`: page URL when relevant
- `title`: page title when available
- `scrollPositionPx`: scroll position when relevant
- `evidenceId`: linked evidence item if produced

### 6.3 Evidence

- `id`: unique evidence id
- `sourceType`: `browser`, `email`, `file`, `pc_ui`, `memory`
- `sourceRef`: URL, email id, file path, window id, or memory key
- `snippet`: short text actually used
- `metadata`: key/value map
- `createdAt`: timestamp
- `usedIn`: list of UsedInRef

### 6.4 UsedInRef

- `type`: `approval_card`, `answer`, `task_decision`, `memory_note`
- `id`: referenced item id

### 6.5 EmailArtifact

- `id`: email id
- `accountId`: mailbox/account id
- `folder`: folder name/path
- `from`: sender address
- `to`: recipient list
- `subject`: subject line
- `sentAt`: timestamp
- `bodyPreview`: short body preview
- `hasHtml`: boolean
- `extractedFields`: key/value map
- `evidenceIds`: list of evidence ids

### 6.6 FileArtifact

- `id`: internal file id
- `path`: full path or logical id
- `name`: file name
- `extension`: file extension
- `sizeBytes`: integer
- `lastModified`: timestamp
- `previewAvailable`: boolean
- `extractedFields`: key/value map
- `evidenceIds`: list of evidence ids

### 6.7 CockpitEvent

- `id`: unique event id
- `type`: `task_created`, `task_status_changed`, `approval_requested`, `approval_resolved`, `browser_session_started`, `browser_session_ended`, `email_read`, `file_read`, `pc_ui_read`, `memory_write`, `error`
- `timestamp`: timestamp
- `taskId`: optional task id
- `agent`: optional agent id/name
- `domain`: optional domain
- `severity`: `info`, `warning`, `error`
- `payload`: event-specific key/value map

### 6.8 DomainDashboardState

- `domain`: `accounting`, `funding`, `legal`, `property`, `visa`, `business`, `personal_admin`
- `openTasks`: task ids
- `awaitingApproval`: task ids
- `recentDecisions`: approval ids
- `riskFlags`: task ids
- `metrics`: real evidence-backed key/value map
- `lastUpdated`: timestamp

## 7. Approval Card Contract

All serious actions must produce the same shape:

- `title`: short action title
- `target`: person, service, website, institution, or system
- `actionType`: `send`, `submit`, `pay`, `sign`, `delete`, `upload`, `contact`, `apply`, `file`, `change_system`
- `why`: why this action is recommended
- `details`: amounts, dates, addresses, references, parties, terms
- `evidence`: evidence ids and readable labels
- `draftPreview`: exact text/form/action preview
- `willDo`: exact scope being approved
- `willNotDo`: explicit boundaries
- `risks`: risk list
- `missingFacts`: missing information or uncertainty
- `nextStep`: what happens after approval
- `status`: `draft`, `awaiting_approval`, `approved`, `rejected`, `done`, `failed`

## 8. Remaining Risks

- Some connector cards still need live/authenticated status labels.
- Browser and PC operator loops must keep hard caps: max pages, max actions, timeout, scroll limits.
- Shell usage must remain whitelist-based and never pass raw user text into commands.
- WhatsApp free local bridge must remain cautious because background monitoring can freeze or misread; drafts and manual compose are safer.
- Jaffna Tamil remains deferred until a real Tamil/Jaffna TTS model exists.

## 9. Build Notes

- `npx tsc --noEmit` is the fast type gate.
- `npm run build` is the package gate.
- If packaging fails on `d3dcompiler_47.dll`, close running HermesDesk processes and rebuild.
- If packaged app exits immediately, clear `ELECTRON_RUN_AS_NODE` before launching.
