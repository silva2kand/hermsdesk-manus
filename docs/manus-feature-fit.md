# HermsDesk ME Manus-Style Capability Map

This map keeps the app honest. `Real` means the feature is wired to working local/Electron services. `Partial` means there is UI or storage, but the full autonomous workflow is not finished. `Missing` means it should not be marketed as working yet.

| Manus capability | HermsDesk fit | Status | Real implementation now | Gap to close |
| --- | --- | --- | --- | --- |
| Agent Mode | Hermes, Paperclips, Solicitor, Accountant, Space, OpenClaw agent runtime | Partial | `MultiAgentOrchestrator` runs agent loops, routes through Jan + TurboQuant/Ollama/LM Studio, executes approved file/PowerShell/app tools, shows agent windows and dock. | Add richer planning UI, task artifacts, cancellation controls per task, and stronger tool permission scopes. |
| Manus Computer | My Computer + Agent windows + Automation events | Partial | `MyComputer` and `DesktopIntegrationService` expose local drives, folders, terminals, apps, and system telemetry. `AutomationService` opens real browser/search sessions, stores live events, and streams them into the ME Computer activity pane. Agent windows show live logs. | Add embedded browser screenshots/control, terminal stream capture, task artifact pane, and consented Chrome/Edge session control. |
| Wide Research | Wide Research workspace + Space Agent / agentic research prompts | Partial | Wide Research now creates stored runs, splits a brief into worker lanes/items, runs local-model workers in parallel, and synthesizes the findings. Chat bar and ME Computer can open real browser research for visible manual source checking. | Add automated browser/search workers, source capture, dedupe, citations, and project-scoped research runs. |
| Manus Slides | Create slides task shortcut | Missing | Landing page can start a slide-outline prompt only. | Add PPTX/PDF/Google Slides export pipeline, slide editor, research outline, and per-slide revision actions. |
| Design View | Design prompt shortcut / MiniMax connector label | Missing | No real image canvas, annotation, background removal, upscale, or image editing workflow. | Add image generation/editing service and editable canvas with region prompts. |
| Browser Operator | My Browser connector + browser automation open/navigate | Partial | Connector exists and `AutomationService` can open/navigate the system browser to URLs or Google research queries while logging visible events in ME Computer. | Add full Chrome/Edge automation through extension or Playwright CDP with user-session consent, screenshots, extraction, and click/type controls. |
| Mail Manus | Mail ME | Partial | Microsoft Graph device login, classic Outlook COM inbox read, workflow email records, sender allowlist, email intelligence sync, approval routing to agents. | Add real inbound ME address, attachment ingestion, automatic task creation from approved mail, reply draft/send approval flow. |
| Scheduled Tasks | Scheduled Tasks view + background scheduler | Partial | Tasks are stored, toggled, executed by `SchedulerService`, persisted as runs, and can be run manually from the UI. | Add richer output delivery by notification/mail/file and per-project schedule binding. |
| Website Builder | Websites workspace placeholder | Missing | Settings shell only. | Add project scaffold, package install/build/test, artifact preview, and deployment/export pipeline. |
| Mobile App Builder | Apps workspace placeholder | Missing | Settings shell only. | Add explicit mobile project templates and build tooling if this is a target. |
| Data Analysis & Visualization | Data Controls / file upload | Missing | File picker exists, but there is no Python/CSV/XLSX analysis runtime or chart output. | Add data-analysis service, Python sandbox or JS dataframe path, chart renderer, and exportable reports. |
| Manus Collab | Shared Tasks / Shared Files placeholders | Missing | Settings shells only. | Add shared workspace model, local handoff files or cloud sync, comments, permissions, and live updates. |
| Projects | Projects workspace + Knowledge + Memory | Partial | First-class Projects now store scoped instructions, files, connectors, task history, and can launch project-aware Hermes agent tasks. Knowledge, Silva memory, connector state, scheduled tasks, and mail settings remain available underneath. | Add task migration, per-project schedules, per-project connector auth, and richer artifacts. |
| Cloud Browser | Cloud Browser settings page | Missing | UI stores/reset notices only; no sandboxed browser actually runs. | Add isolated browser session service, navigation, extraction, screenshots, and privacy controls. |
| Connectors | Connectors Manager + Tool Registry + API keys | Partial | Large connector registry, toggles, API key storage, local model routes, Graph/Outlook, OpenRouter/Gemini/NVIDIA paths. | Separate "available" from "connected", implement OAuth/API flows per connector, add custom MCP server config and invocation. |
| Custom MCP Servers | MCP connector labels | Partial | MCP filesystem and Windows shell are represented as available connector records. | Add real MCP server registry, start/stop, schemas, auth, and tool invocation. |
| Custom API Connectors | API key manager and provider routes | Partial | API key storage and selected cloud providers exist; OpenRouter forced to free models. | Add generic custom API connector builder with auth, schema, test call, and agent tool exposure. |
| Zapier | Zapier connector label | Missing | Toggle only. | Add Zapier webhook/API configuration and action execution. |
| Manus API | ME API skill label | Missing | Skill registry lists `me-api`; no external HTTP API server. | Add local API server or IPC bridge docs for programmatic task creation/status/artifacts. |
| Skills System | Skills Registry + SkillsEngineService | Partial | Skills can be toggled, actions can be proposed/approved/denied, and approved file/script/os actions execute with an audit log. | Add real `SKILL.md` import/export, slash command picker, one-click packaging, GitHub import, zip import, and skill-scoped tool prompts. |
| Team Skill Library | None | Missing | Not implemented. | Add only after single-user skill import/export is solid. |
| Approval Safety | Right Approval drawer | Real | Pending skill actions and email route approvals are shown in a drawer; sensitive actions require approval-first workflow. | Expand audit history UI and add per-connector permission controls. |
| Local Model Hub | Model Hub | Partial | Lists Ollama/local library/Jan status, downloads HF models, starts Jan + TurboQuant when runtime exists, routes free API fallback. | Bundle or locate the built-in TurboQuant runtime reliably and expose model load health clearly. |

## Priority Gaps

1. Add full browser operator control: consented Chrome/Edge session, screenshot stream, click/type/extract tools.
2. Turn `Wide Research` browser research into source-capturing worker lanes with citations.
3. Replace connector toggles with real connected/authenticated statuses.
4. Add real Skills import/packaging and slash command activation.
5. Add richer scheduled-task delivery outputs by notification/mail/file.
6. Decide whether Slides, Design View, Website Builder, and Data Analysis are built-in modules or routed through skills/tools.
