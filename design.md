# HermesDesk System Design

HermesDesk is a local-first AI workstation designed to bridge user intent, desktop tools, mail, voice, web research, and local model execution. The app must show real connector state: configured, connected, verified, blocked, or unavailable. Features that require a live external service only run when that service is actually configured and responding.

## Architecture Overview

The system follows a modular architecture consisting of the following key layers:

1. **Frontend (Electron Renderer)**: React and Vite views for Mail ME, Model Hub, Chat Lab, My Computer, Cloud Browser, Voice, Agents, Connectors, and live operations.
2. **Main Process (Electron Main)**: IPC boundary, tray/window behavior, background sync, and long-running service ownership.
3. **Service Layer**: TypeScript services for email indexing, Microsoft Graph, Classic Outlook COM, local AI inference, voice, desktop integration, browser/web agents, and approvals.
4. **Agentic Layer (MultiAgentOrchestrator)**: Specialized agents use model routes and tools, but dangerous tools are approval-gated.
5. **Observability Layer**: Console, event bus traces, mail counters, engine status, and connector status surfaces show actual runtime state instead of static claims.

## Core Services

### Email Indexing Service (`EmailIndexService`)
- **Local-First Indexing**: Stores message memory and checkpoints inside `userData/email-indexes`.
- **Hybrid Sync**: Uses Microsoft Graph when the authenticated user has a real mailbox; falls back to Classic Outlook COM for local PST/OST profiles and consumer accounts exposed through Outlook.
- **Large Mailboxes**: Paged batches keep checkpoints so 60,000+ emails do not need to be re-read from zero after the first crawl.
- **Categorization**: Classifies indexed mail into legal, tax, bills, deadlines, suppliers, parcels, property, development, and research routes.
- **Safety**: Background indexing reads and summarizes only. Sending, moving, deleting, unsubscribing, payments, filing, or contacting third parties require explicit approval.

### Desktop Integration Service (`DesktopIntegrationService`)
- **Native Automation**: Leverages PowerShell and COM objects to interact with Windows applications (Outlook, File Explorer).
- **Security**: Implements a strict no-deletion policy; system mutations require explicit user approval.

### Local AI Inference (`LocalAIService`)
- **Built-In Primary Engine**: Jan + TurboQuant is the HermsDesk-owned local AI route. It is not treated as an external app in the UI.
- **DFALSH + TurboQuant Policy**: The local route builds a runtime policy for model load and generation settings, including context, threads, GPU layers, and last speed metrics where the runtime reports them.
- **External Local Routes**: Ollama, LM Studio, and OpenCode are optional external providers and must be detected as running before they are shown as connected.
- **Context Management**: Handles large context windows and RAG (Retrieval Augmented Generation) for document analysis.

### Voice Pipeline
- **Primary Route**: Silva Voice Stack is used when configured and reachable.
- **Fallback Route**: Windows SAPI is a fallback only, not the premium voice target.
- **Recognition**: Supports system-level audio capture for voice commands when the required local packages/services are installed.

### TinyFish Web Agent Route
- **External API Route**: TinyFish only runs when a real API key is saved in the current app profile and the API accepts the request.
- **Use Case**: High-friction web research and extraction where browser automation needs a specialist web-agent service.
- **Status Surface**: Mail ME exposes whether the key is saved and includes a test action so the user can verify the route instead of trusting a label.

## AI Agent Workflow

HermesDesk operates on an **Approval-First Workflow**:

1.  **Ingestion**: Services (Email, Voice) feed raw data into the `MultiAgentOrchestrator`.
2.  **Analysis**: The orchestrator selects the appropriate agent (e.g., Accountant Agent for invoices).
3.  **Proposal**: The agent generates a proposed action (e.g., a draft reply or a task entry).
4.  **Audit**: The user reviews the proposal in the "Right Approval Sidebar".
5.  **Execution**: Upon approval, the service layer executes the final action.

Read-only tasks such as indexing, searching, and summarizing can run in the background. Risk-bearing actions such as PowerShell execution, file writes, app/window control, outgoing messages, mail moves, deletes, submissions, or payments must pause for approval.

## Mythos + TASTE + Dream Cycles

HermesDesk uses three linked behaviour layers. These are not decoration; they are runtime policy.

### Mythos Orchestrator
- General ME is the default front-door brain for unassigned tasks.
- Mythos receives mail memory, WhatsApp messages, staff invoice evidence, supplier updates, renewals, bills, legal/council/HMRC/land-registry matters, user commands, and system health events.
- Mythos routes work to specialist agents instead of trying to solve every domain alone:
  - Legal, land registry, council disputes, conveyancing, appeals: Solicitor Agent + Justice Case Builder.
  - Bills, invoices, VAT, HMRC, payroll, staff receipts: Accountant Agent + Paperclips.
  - Insurance renewals, MOT, shop suppliers, purchases, quotes, refunds: Purchase Guardian + Accountant when money is involved.
  - System/build/runtime/voice/model work: Hermes Agent + Space Agent where performance is involved.
  - Security, scams, suspicious messages: OpenClaw + Purchase Guardian.
- Mythos must use indexed memory first. It should not ask Silva to reread known emails unless the relevant evidence is absent.

### TASTE Engine
- Every non-trivial task follows PLAN -> DRAFT -> REVISE -> PRESENT.
- Agents infer the real goal, audience, risk, and desired outcome before drafting.
- Agents produce practical work products: summaries, evidence lists, reply drafts, quote/research plans, case packs, VAT/HMRC packs, renewal checklists, and WhatsApp-ready messages.
- Outputs must be evidence-led and connector-honest. If a route is not authenticated or verified, the agent says so and uses an available fallback.
- User feedback is memory: important/not-important decisions, approvals, denials, edits, repeated senders, and repeated workflows tune future priority.

### Dream Cycles
- Dream cycles are safe self-improvement audits, not autonomous code mutation.
- They run on startup/hourly/manual trigger and inspect Jan, mail memory, WhatsApp, TinyFish, browser operator, EventBus errors, API keys, approvals, and business memory buckets.
- They detect missing or weak areas such as empty renewal memory, supplier memory, staff invoice memory, unread backlog, mail-memory drift, connector failures, and engine downtime.
- They create approval-first proposals only. They must not install packages, edit code, submit forms, send messages, move/delete mail, pay, file legal/accounting documents, or contact third parties without Silva approval.

The target operating loop is:

1. Ingest real data.
2. Classify and store it locally.
3. Mythos routes it.
4. Specialists analyse and draft.
5. A peer verifies.
6. Silva approves external/risky actions.
7. Dream cycles find gaps and propose improvements.

## Security & Privacy

- **Local-First**: Primary intelligence and the mail memory index are local. Optional cloud/API routes are explicit connectors.
- **Stored Secrets**: Microsoft Graph, TinyFish, and other secrets are stored in the local Electron profile.
- **Read-Only by Default**: Background processes may read, index, summarize, and draft. They must not send, delete, move, pay, file, or contact third parties without approval.
