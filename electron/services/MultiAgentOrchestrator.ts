import Store from 'electron-store';
import { toolDefinitions } from '../data/toolDefinitions';

// ═══════════════════════════════════════════════════════════════════
// MultiAgentOrchestrator — HermesDesk ME 1.8
//
// Real agent runtime with:
// - LLM-driven agentic loop (calls Jan+TurboQuant / Ollama / LM Studio)
// - Per-agent task queue
// - Rich personality system prompts
// - Tool calling via SkillsEngine
// - Background persistence via electron-store
// - Cancellation support
// ═══════════════════════════════════════════════════════════════════

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  tools: string[];
  status: 'running' | 'idle' | 'stopped';
  version: string;
  type: 'coding' | 'research' | 'creative' | 'security' | 'legal' | 'accounting' | 'automation';
  background: boolean;
  currentTask?: string;
}

export interface Task {
  id: string;
  input: string;
  status: 'planning' | 'running' | 'done' | 'failed' | 'cancelled';
  assignedAgentId: string;
  manager?: {
    managerId: string;
    managerName: string;
    requestedAgentId?: string;
    assignedAgentId: string;
    routeReason: string;
    collaborators: { id: string; name: string; role: string }[];
    approvalGates: string[];
    priority: 'normal' | 'important' | 'urgent';
    decidedAt: number;
  };
  steps: { label: string; status: 'pending' | 'running' | 'done' }[];
  history: any[];
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════════════
// AGENT PERSONALITY PROMPTS
// ═══════════════════════════════════════════════════════════════════

const PERSONALITIES: Record<string, string> = {
  'general-agent': `You are General ME / Mythos Manager, the front-door coordinator for HermesDesk ME 1.8.

Your purpose is to act as Mythos: the director, router, coordinator, memory gatekeeper, and quality controller for Silva's personal-business AI OS. Receive unclear or mixed tasks, infer the real goal, split the work, choose the right specialist agents, and verify the final answer before it reaches Silva.

Your capabilities:
- Route tasks to Hermes, Paperclips, Solicitor, Accountant, Space, OpenClaw, Justice Case Builder, and Purchase Guardian
- Use mailbox memory summaries, installed skills, local model routing, web research, and TinyFish web automation when configured
- Track and route renewals, bills, HMRC/VAT, Lancaster/council matters, land registry, solicitor/conveyancing work, suppliers, staff invoices, shop/business operations, insurance policies, and WhatsApp drafts
- Ask one short clarification only when a missing fact blocks real progress
- Coordinate peer checks and produce a practical final action plan

Rules:
- Prefer action over talk.
- Memory first: check indexed mail/workspace memory before asking Silva to repeat context.
- Route first: if the work belongs to a specialist, name the lead specialist and verifier.
- TASTE always: PLAN -> DRAFT -> REVISE -> PRESENT for non-trivial work.
- Dreams are proposal-only: self-improvement can diagnose and propose, but must not silently edit code, install packages, submit forms, pay, send, delete, or contact anyone.
- Do not pretend a connector is connected unless live status/API/OAuth confirms it.
- Destructive actions, money, legal filings, external messages, and account changes require approval.
- When a task spans multiple domains, name the lead agent and verifier clearly.

Available tools:
- [TOOL: tinyfish_web_agent(url="https://...", task="what to inspect/extract/verify")]
- [TOOL: pc_window_list()]
- [TOOL: pc_window_focus(id="window id")]
- [TOOL: pc_ui_scan()]
- [TOOL: pc_ui_resolve(query="OK", role="Button")]
- [TOOL: pc_ui_click(query="OK", role="Button")]
- [TOOL: pc_ui_type(query="Search", text="text")]
- [TOOL: read_file(path="document/path")]
- [TOOL: list_dir(path="folder/path")]
- [TOOL: open_app(app="URL or app name")]`,

  'hermes-full': `You are Hermes, the System Architect & Coder agent for HermesDesk ME 1.8.

Your capabilities:
- Full access to the local filesystem (read, write, list directories)
- PowerShell command execution on Windows
- Expert OS control (focus windows, list processes)
- Code generation, debugging, and refactoring
- Workspace automation and build system management
- WhatsApp UI inspection and response drafting

Your personality: You are precise, technical, and efficient. You explain your reasoning before acting. You write production-quality code. When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: run_powershell(command="your command here")]
- [TOOL: pc_window_list()]
- [TOOL: pc_window_focus(id="window id")]
- [TOOL: pc_ui_scan()]
- [TOOL: pc_ui_resolve(query="OK", role="Button")]
- [TOOL: pc_ui_click(query="OK", role="Button")]
- [TOOL: pc_ui_type(query="Search", text="text")]
- [TOOL: os_control_expert(action="list_windows")]
- [TOOL: os_control_expert(action="focus_window", windowTitle="title")]
- [TOOL: whatsapp_inspect_ui()]
- [TOOL: write_file(path="file/path", content="file content")]
- [TOOL: read_file(path="file/path")]
- [TOOL: list_dir(path="directory/path")]
- [TOOL: open_app(app="app name or URL")]

Always think step-by-step before executing tools. Report results clearly.`,

  'paperclip-full': `You are Paperclips, the Full Intelligence Organizer agent for HermesDesk ME 1.8.

Your capabilities:
- Document routing and classification
- Email-to-task conversion workflows
- Professional Outlook management across multiple accounts
- High-volume email indexing and searching (60,000+ emails)
- UK regulatory compliance checking
- Data organization and filing

Your personality: You are meticulous, organized, and thorough. You classify everything. You flag compliance issues. You create structured summaries. When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: outlook_list_accounts()]
- [TOOL: outlook_sync_account(accountId="id", batchSize="100")]
- [TOOL: outlook_search_emails(query="search terms")]
- [TOOL: outlook_get_email_details(messageId="id", accountId="id")]
- [TOOL: read_file(path="document/path")]
- [TOOL: write_file(path="output/path", content="organized content")]
- [TOOL: list_dir(path="folder/path")]

Always organize information hierarchically. Flag anything that requires human review.`,

  'solicitor-agent': `You are the Solicitor Agent, a UK Legal Reasoning & Drafting specialist for HermesDesk ME 1.8.

Your capabilities:
- UK property law analysis (tenancy disputes, Section 21/Section 8 notices)
- HMCTS procedure guidance and timeline planning
- Legal letter drafting (before-action letters, formal complaints)
- Contract review and risk assessment
- Housing disrepair claims under the Landlord and Tenant Act 1985

Your personality: You are formal, precise, and cautious. You cite relevant legislation. You always include disclaimers that this is AI-assisted analysis, not legal advice. You structure legal arguments clearly.

When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: read_file(path="document/path")]
- [TOOL: write_file(path="legal_document.txt", content="drafted content")]

Always cite the relevant UK statute or case law. Structure responses with numbered points.`,

  'accountant-agent': `You are the Accountant Agent, a UK Ledger Parsing & VAT specialist for HermesDesk ME 1.8.

Your capabilities:
- Bank statement parsing and reconciliation
- VAT calculation and return preparation (UK MTD compliant)
- Invoice processing and matching
- HMRC Self Assessment guidance
- Corporation Tax computation
- Payroll calculations (PAYE, National Insurance)

Your personality: You are precise with numbers, conservative in estimates, and thorough in documentation. You flag discrepancies immediately. You always show your working.

When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: read_file(path="statement.csv")]
- [TOOL: write_file(path="vat_return.txt", content="calculated return")]
- [TOOL: run_powershell(command="calculation command")]

Always show the calculation methodology. Flag any figures that seem unusual.`,

  'space-agent-full': `You are Space Agent, the Full System Monitoring Agent for HermesDesk ME 1.8.

Your capabilities:
- Real-time system resource monitoring (CPU, RAM, GPU, VRAM)
- Process management and optimization
- Network diagnostics and latency testing
- Storage analysis and cleanup recommendations
- Performance benchmarking and bottleneck detection

Your personality: You are observant, analytical, and proactive. You monitor silently but alert on anomalies. You provide data-driven recommendations.

When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: run_powershell(command="Get-Process | Sort-Object CPU -Descending | Select-Object -First 10")]
- [TOOL: run_powershell(command="systeminfo")]
- [TOOL: list_dir(path="C:\\")]

Always include metrics and percentages. Compare against baselines when available.`,

  'openclaw-full': `You are OpenClaw, the Security & Forensics Agent for HermesDesk ME 1.8.

Your capabilities:
- System security audit and hardening
- Log analysis and anomaly detection
- Vulnerability scanning and assessment
- File integrity monitoring
- Network security checks
- Windows Defender and firewall status

Your personality: You are vigilant, thorough, and security-first. You assume breach until proven otherwise. You classify findings by severity (Critical/High/Medium/Low/Info).

When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: run_powershell(command="Get-MpComputerStatus")]
- [TOOL: run_powershell(command="Get-NetFirewallProfile")]
- [TOOL: list_dir(path="path/to/check")]
- [TOOL: read_file(path="log/file")]

Always classify findings by severity. Recommend immediate actions for Critical/High items.`
,

  'justice-case-agent': `You are Justice Case Builder for HermesDesk ME.

Your purpose is to help ordinary people prepare serious legal, complaint, appeal, review, and public-interest casework. You are not a regulated solicitor and must not claim to represent the user.

Your capabilities:
- Build an evidence-first case theory
- Create chronology, issue lists, evidence index, appeal/review route maps, and complaint drafts
- Identify procedural unfairness, errors of law, missing reasons, ignored evidence, bias/risk patterns, human rights/public-interest angles, and escalation routes
- Open official research routes and preserve evidence

Rules:
- Deadlines first. Always ask for decision dates, order dates, service dates, and appeal/review deadlines.
- Verify current official routes before action.
- Draft only. Filing, sending, public accusations, court submissions, and legal commitments require explicit user approval.
- Be direct, rigorous, and evidence-led.

Available tools:
- [TOOL: read_file(path="document/path")]
- [TOOL: write_file(path="justice_case_note.txt", content="drafted content")]
- [TOOL: list_dir(path="folder/path")]
- [TOOL: open_app(app="URL or app name")]`,

  'purchase-guardian-agent': `You are Purchase Guardian for HermesDesk ME.

Your purpose is to protect the user when buying online or fighting seller/platform/payment problems.

Your capabilities:
- Research seller identity, product alternatives, price anomalies, reviews, domain/site risk, return policies, and payment protection
- Build comparison tables, scam-risk checklists, evidence lists, seller messages, refund requests, chargeback/Section 75 notes where relevant, and platform complaint routes

Rules:
- Never approve payment or purchase decisions for the user.
- Preserve screenshots and written evidence.
- Be suspicious, practical, and source-led.
- Draft messages and disputes only; sending requires user approval.

Available tools:
- [TOOL: read_file(path="document/path")]
- [TOOL: write_file(path="purchase_protection_note.txt", content="drafted content")]
- [TOOL: list_dir(path="folder/path")]
- [TOOL: open_app(app="URL or app name")]`
,

  'browser-automation-agent': `You are Browser Automation Agent for HermesDesk ME.

Your purpose is to operate the real controlled browser computer: open pages, read DOM text, list links, click selectors or visible text, type into forms, capture screenshots, and verify each step.

Rules:
- Use real browser tools, not instructions, when the user asks you to browse, click, type, compare, extract, navigate, or open product/result pages.
- After every action, verify with browser_read or browser_inspect.
- Never click pay, buy, submit, checkout, order, confirm, sign, book, or purchase controls without explicit Silva approval.
- Never enter passwords, payment details, bank details, or legal/accounting submissions without approval.
- For shopping/research, open result pages, extract prices/specs/risks/reviews, compare evidence, and stop before purchase/checkout.

Available tools:
- [TOOL: browser_search_visible(query="search query")]
- [TOOL: browser_open(target="URL")]
- [TOOL: browser_read()]
- [TOOL: browser_ui_scan()]
- [TOOL: browser_ui_resolve(query="Continue", role="button")]
- [TOOL: browser_ui_click(query="Continue", role="button")]
- [TOOL: browser_ui_type(query="Search", text="text to enter")]
- [TOOL: browser_click(selector="CSS selector")]
- [TOOL: browser_click_href(href="https://...")]
- [TOOL: browser_click_text(text="visible link or button text")]
- [TOOL: browser_type(selector="CSS selector", text="text to enter")]
- [TOOL: browser_press(key="Enter")]
- [TOOL: browser_scroll(amount="700")]
- [TOOL: browser_screenshot()]
- [TOOL: browser_inspect()]
- [TOOL: tinyfish_web_agent(url="https://...", task="what to inspect/extract/verify")]`
};

export class MultiAgentOrchestrator {
  private store: any;
  private aiService: any;
  private skillsEngine: any;
  private eventBus: any = null;
  private tinyFishService: any = null;
  private cancelFlags: Map<string, boolean> = new Map();
  private taskOverrides: Map<string, string[]> = new Map();

  private agents: Agent[] = [
    {
      id: 'general-agent',
      name: 'General ME / Mythos Manager',
      role: 'Manager, Router, Clarifier & Verifier',
      description: 'Front-door manager that receives tasks, chooses specialists, checks connector truth, coordinates peer checks, enforces approvals, and verifies completion.',
      personality: PERSONALITIES['general-agent'],
      tools: ['jan-turboquant', 'outlook-mail', 'google-search', 'tinyfish', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'research',
      background: false
    },
    {
      id: 'hermes-full',
      name: 'Hermes Agent',
      role: 'System Architect & Coder',
      description: 'Advanced coding, terminal access, and system-level automation.',
      personality: PERSONALITIES['hermes-full'],
      tools: ['ollama', 'github', 'os-control', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'coding',
      background: false
    },
    {
      id: 'paperclip-full',
      name: 'Paperclips',
      role: 'Full Intelligence Organizer',
      description: 'End-to-end document routing, email-to-task conversion, and UK compliance.',
      personality: PERSONALITIES['paperclip-full'],
      tools: ['gmail', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'accounting',
      background: false
    },
    {
      id: 'solicitor-agent',
      name: 'Solicitor Agent',
      role: 'Legal Reasoning & Drafting',
      description: 'Reviews letters, tenancy/property issues, claims, and legal timelines for UK law.',
      personality: PERSONALITIES['solicitor-agent'],
      tools: ['google-search', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'legal',
      background: false
    },
    {
      id: 'accountant-agent',
      name: 'Accountant Agent',
      role: 'Ledger Parsing & VAT',
      description: 'Parses bank statements, reconciles invoices, and calculates VAT/tax obligations.',
      personality: PERSONALITIES['accountant-agent'],
      tools: ['stripe', 'xero', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'accounting',
      background: false
    },
    {
      id: 'space-agent-full',
      name: 'Space Agent',
      role: 'Full Monitoring Agent',
      description: 'Deep system monitoring, terminal monitoring, and real-time research.',
      personality: PERSONALITIES['space-agent-full'],
      tools: ['google-search', 'os-control'],
      status: 'idle',
      version: '1.8.0',
      type: 'research',
      background: false
    },
    {
      id: 'openclaw-full',
      name: 'OpenClaw',
      role: 'Security & Forensics Agent',
      description: 'System security audit, log analysis, and vulnerability detection.',
      personality: PERSONALITIES['openclaw-full'],
      tools: ['os-control', 'terminal'],
      status: 'idle',
      version: '1.8.0',
      type: 'security',
      background: false
    },
    {
      id: 'justice-case-agent',
      name: 'Justice Case Builder',
      role: 'Legal Fight, Evidence, Appeal & Complaint Pack',
      description: 'Builds evidence-first legal/complaint/appeal packs and official route maps with approval gates.',
      personality: PERSONALITIES['justice-case-agent'],
      tools: ['file-system', 'google-search', 'os-control'],
      status: 'idle',
      version: '1.8.0',
      type: 'legal',
      background: false
    },
    {
      id: 'purchase-guardian-agent',
      name: 'Purchase Guardian',
      role: 'Online Buying, Scam Check & Refund Strategy',
      description: 'Researches seller/product risk and builds purchase protection, refund, and chargeback packs.',
      personality: PERSONALITIES['purchase-guardian-agent'],
      tools: ['google-search', 'file-system', 'os-control'],
      status: 'idle',
      version: '1.8.0',
      type: 'research',
      background: false
    },
    {
      id: 'browser-automation-agent',
      name: 'Browser Automation Agent',
      role: 'Real Browser Click, Type, Extract & Verify',
      description: 'Operates the controlled browser computer with real open/read/click/type/screenshot/inspect steps and approval gates for risky actions.',
      personality: PERSONALITIES['browser-automation-agent'],
      tools: ['browser-operator', 'tinyfish', 'google-search'],
      status: 'idle',
      version: '1.8.0',
      type: 'automation',
      background: false
    }
  ];

  private taskQueues: Map<string, Task[]> = new Map();

  private workspaceService: any;

  constructor(sharedStore?: any, aiService?: any, skillsEngine?: any, workspaceService?: any) {
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
    this.aiService = aiService;
    this.skillsEngine = skillsEngine;
    this.workspaceService = workspaceService;
    
    // Initialize task queues per agent
    this.agents.forEach(agent => {
      this.taskQueues.set(agent.id, []);
    });

    // Load persisted agent status
    const savedAgents = this.store.get('agents_status', {});
    this.agents.forEach(agent => {
      if (savedAgents[agent.id]) {
        agent.status = savedAgents[agent.id].status || 'idle';
        agent.background = savedAgents[agent.id].background || false;
      }
    });
  }

  setEventBus(eventBus: any) {
    this.eventBus = eventBus;
  }

  setTinyFishService(tinyFishService: any) {
    this.tinyFishService = tinyFishService;
  }

  private emitThought(task: Task, agent: Agent, phase: 'PLAN' | 'THINK' | 'TOOL_CALL' | 'OBSERVATION' | 'REVISE' | 'DONE' | 'ERROR', content: string, payload: any = {}) {
    const eventPayload = {
      taskId: task.id,
      agentId: agent.id,
      agentName: agent.name,
      phase,
      content,
      ...payload
    };
    this.eventBus?.emit('agent.thought', 'agent-orchestrator', eventPayload, task.id);
    return eventPayload;
  }

  private toolNeedsManualApproval(name: string, params: any = {}) {
    const normalized = String(name || '').toLowerCase().replace(/_/g, '-');
    const action = String(params?.action || '').toLowerCase();

    if (['read-file', 'list-dir', 'list-directory', 'outlook-list-accounts', 'outlook-search-emails', 'outlook-get-email-details'].includes(normalized)) {
      return false;
    }

    if (normalized === 'os-control-expert' && action === 'list-windows') {
      return false;
    }

    return [
      'run-powershell',
      'run-command',
      'execute-command',
      'write-file',
      'open-app',
      'os-control-expert'
    ].some(tool => normalized === tool)
      || normalized.includes('powershell')
      || normalized.includes('command')
      || normalized.includes('write')
      || normalized.includes('delete')
      || normalized.includes('move')
      || normalized.includes('send')
      || normalized.includes('open');
  }

  private getCollaborationPlan(agent: Agent, input: string) {
    const text = `${agent.id} ${agent.type} ${input}`.toLowerCase();
    const collaborators = new Set<string>();

    if (agent.id !== 'paperclip-full') collaborators.add('paperclip-full');
    if (/browser|click|type|scroll|navigate|open .*page|product page|search results|compare|extract|dom|purchase tab|web automation|tinyfish/.test(text)) {
      collaborators.add('browser-automation-agent');
    }
    if (/legal|court|appeal|justice|solicitor|council|lancaster|landlord|tenant|hmrc|evidence|complaint|land registry|conveyancer|freeholder|leasehold/.test(text)) {
      collaborators.add('justice-case-agent');
      collaborators.add('solicitor-agent');
    }
    if (/invoice|vat|tax|bill|payment|receipt|hmrc|account|ledger|bank|staff invoice|payroll|supplier invoice|direct debit/.test(text)) {
      collaborators.add('accountant-agent');
    }
    if (/buy|purchase|seller|refund|chargeback|scam|price|product|order|parcel|insurance|renewal|quote|policy|mot|supplier|wholesale|stock|shop/.test(text)) {
      collaborators.add('purchase-guardian-agent');
    }
    if (/email|mail|outlook|gmail|whatsapp|staff|supplier|invoice|receipt|attachment|organize|remember|memory/.test(text)) {
      collaborators.add('paperclip-full');
    }
    if (/security|password|hack|malware|risk|fraud|suspicious/.test(text)) {
      collaborators.add('openclaw-full');
    }
    if (/pc|performance|freeze|slow|cpu|ram|gpu|process|jan|model/.test(text)) {
      collaborators.add('space-agent-full');
    }

    collaborators.delete(agent.id);
    return Array.from(collaborators).slice(0, 4).map(id => {
      const peer = this.agents.find(item => item.id === id);
      return {
        id,
        name: peer?.name || id,
        role: peer?.role || 'Peer verifier'
      };
    });
  }

  private pickVerifier(agent: Agent, task: Task) {
    const plan = this.getCollaborationPlan(agent, task.input);
    return plan.find(peer => peer.id !== 'paperclip-full') || plan[0] || null;
  }

  private routeTaskToAgent(input: string) {
    const text = String(input || '').toLowerCase();
    if (/browser|click|type|scroll|navigate|open .*page|product page|search results|compare|extract|dom|purchase tab|web automation|tinyfish/.test(text)) return 'browser-automation-agent';
    if (/code|build|fix|bug|repo|git|typescript|electron|jan|turboquant|dfalsh|model hub|voice|runtime|crash|freeze|test|terminal/.test(text)) return 'hermes-full';
    if (/legal|solicitor|court|appeal|justice|land registry|conveyancer|freeholder|leasehold|council dispute|complaint|evidence|hmcts/.test(text)) return 'general-agent';
    if (/invoice|receipt|vat|hmrc|tax|accountant|payroll|bookkeeping|bill|payment|direct debit|statement|staff invoice|supplier invoice/.test(text)) return 'general-agent';
    if (/insurance|renewal|quote|policy|mot|road tax|supplier|wholesale|stock|purchase|refund|chargeback|seller|parcel|order/.test(text)) return 'general-agent';
    if (/security|hack|password|malware|fraud|suspicious|forensic/.test(text)) return 'openclaw-full';
    if (/pc|cpu|ram|gpu|vram|performance|slow|process|storage/.test(text)) return 'space-agent-full';
    return 'general-agent';
  }

  private getApprovalGates(input: string) {
    const text = String(input || '').toLowerCase();
    const gates = new Set<string>();
    if (/send|reply|email|whatsapp|message|contact|call|notify/.test(text)) gates.add('external communication');
    if (/pay|payment|buy|purchase|checkout|order|subscribe|book|quote/.test(text)) gates.add('money/purchase/booking');
    if (/delete|remove|move|archive|unsubscribe|mark read|mark unread|file\b|folder/.test(text)) gates.add('mail/file state change');
    if (/court|hmcts|appeal|submit|filing|legal|solicitor|hmrc|vat|tax|council|land registry/.test(text)) gates.add('legal/accounting/government submission');
    if (/password|bank|card|credential|login|api key|secret/.test(text)) gates.add('credential/private-data entry');
    if (!gates.size) gates.add('approval before irreversible external action');
    return Array.from(gates);
  }

  private decideWithManager(input: string, requestedAgentId?: string) {
    const inferredAgentId = this.routeTaskToAgent(input);
    const requestedExists = requestedAgentId && this.agents.some(agent => agent.id === requestedAgentId);
    const assignedAgentId = requestedExists && requestedAgentId !== 'general-agent'
      ? requestedAgentId
      : inferredAgentId;
    const text = String(input || '').toLowerCase();
    const priority: 'normal' | 'important' | 'urgent' = /urgent|asap|deadline|court|hmrc|overdue|renewal|insurance|payment due|final notice|today|tomorrow/.test(text)
      ? 'urgent'
      : /important|invoice|bill|tax|legal|solicitor|supplier|staff|whatsapp|complaint|appeal/.test(text)
        ? 'important'
        : 'normal';
    const collaborators = this.getCollaborationPlan(
      this.agents.find(agent => agent.id === assignedAgentId) || this.agents[0],
      input
    );
    const routeReason = requestedExists && requestedAgentId !== 'general-agent'
      ? `Silva or an upstream route requested ${requestedAgentId}; Mythos Manager keeps that lead and adds oversight.`
      : `Mythos Manager inferred ${assignedAgentId} from task intent and safety rules.`;
    return {
      managerId: 'general-agent',
      managerName: 'General ME / Mythos Manager',
      requestedAgentId,
      assignedAgentId,
      routeReason,
      collaborators,
      approvalGates: this.getApprovalGates(input),
      priority,
      decidedAt: Date.now()
    };
  }

  previewRoute(input: string, requestedAgentId?: string) {
    const decision = this.decideWithManager(input, requestedAgentId);
    const previewId = `route-preview-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.eventBus?.emit('manager.decision', 'mythos-manager', {
      preview: true,
      previewId,
      ...decision
    }, previewId);
    return {
      ok: true,
      previewId,
      ...decision
    };
  }

  private async peerVerifyFinal(agent: Agent, task: Task, answer: string, engine: string) {
    const verifier = this.pickVerifier(agent, task);
    if (!verifier || !this.aiService?.chatWithBestAvailable) return '';

    const verifierAgent = this.agents.find(item => item.id === verifier.id);
    const startedAt = Date.now();
    this.emitThought(task, agent, 'REVISE', `${verifier.name} is checking the answer before completion.`, {
      verifierId: verifier.id,
      engine
    });

    try {
      const response = await this.aiService.chatWithBestAvailable('', [
        {
          role: 'system',
          content: `${verifierAgent?.personality || 'You are a careful peer verifier.'}

You are verifying another HermesDesk agent output. Be concise. Check for missing facts, risk, approvals required, and next best action. Do not invent connector access.`
        },
        {
          role: 'user',
          content: `Original task:\n${task.input}\n\nDraft answer to verify:\n${answer.slice(0, 6000)}\n\nReturn a short peer check with: OK / concerns / recommended next action.`
        }
      ]);
      const review = String(response?.message?.content || '').trim();
      if (!review) return '';
      this.eventBus?.emit('agent.peer_verified', 'agent-orchestrator', {
        taskId: task.id,
        agentId: agent.id,
        verifierId: verifier.id,
        durationMs: Date.now() - startedAt,
        reviewPreview: review.slice(0, 1000)
      }, task.id);
      return review;
    } catch (error: any) {
      const message = error?.message || 'Peer verification failed.';
      this.emitThought(task, agent, 'ERROR', `${verifier.name} verification failed: ${message}`, {
        verifierId: verifier.id
      });
      return '';
    }
  }

  private async runTinyFishTool(task: Task, agent: Agent, params: any) {
    if (!this.tinyFishService?.getApiStatus?.().configured) {
      return {
        ok: false,
        error: 'TinyFish API key is not configured in this app profile.'
      };
    }

    const url = String(params.url || params.website || params.page || '').trim();
    const goal = String(params.task || params.goal || params.instruction || task.input).trim();
    if (!/^https?:\/\//i.test(url)) {
      return {
        ok: false,
        error: 'TinyFish needs a real http/https URL.'
      };
    }

    this.eventBus?.emit('tool.called', 'tinyfish', {
      taskId: task.id,
      agentId: agent.id,
      tool: 'tinyfish_web_agent',
      args: { url, goal }
    }, task.id);
    const result = await this.tinyFishService.runAgent({ url, task: goal, maxSteps: 6 });
    this.eventBus?.emit('tool.result', 'tinyfish', {
      taskId: task.id,
      agentId: agent.id,
      tool: 'tinyfish_web_agent',
      ok: result?.ok,
      sessionId: result?.sessionId,
      status: result?.status,
      error: result?.error,
      resultPreview: JSON.stringify(result?.result || result?.steps || '').slice(0, 1200)
    }, task.id);
    return result;
  }

  private async runBrowserBootstrap(task: Task, agent: Agent, sendUpdate: (step: string, type: any) => void) {
    if (!this.skillsEngine?.proposeAction || !this.skillsEngine?.approveAction) return '';
    const sessionId = `agent-${task.id}`;
    const runTool = async (name: string, params: any) => {
      if (this.cancelFlags.get(agent.id)) throw new Error('Agent stopped by user.');
      const override = this.consumeInstruction(agent.id);
      if (override) {
        sendUpdate(`Operator override: ${override}`, 'info');
        this.emitThought(task, agent, 'REVISE', `Operator override received: ${override}`, { override });
        if (/stop|pause|halt|wrong/i.test(override)) throw new Error(`Operator stopped/corrected workflow: ${override}`);
      }
      const action = this.skillsEngine.proposeAction({ name, type: 'os', params });
      const result = await this.skillsEngine.approveAction(action.id);
      const text = typeof result?.result === 'string' ? result.result : JSON.stringify(result || {});
      sendUpdate(`${name}: ${text.slice(0, 1000)}`, result?.ok === false ? 'error' : 'result');
      this.emitThought(task, agent, result?.ok === false ? 'ERROR' : 'OBSERVATION', `${name} bootstrap returned.`, {
        tool: name,
        params,
        resultPreview: text.slice(0, 1200)
      });
      return text;
    };

    this.emitThought(task, agent, 'TOOL_CALL', 'Browser Automation Agent bootstrapping visible browser search and browser_read before model planning.', {
      sessionId
    });
    const opened = await runTool('browser_search_visible', {
      query: task.input,
      sessionId,
      label: 'Browser Automation Agent'
    });
    await runTool('browser_scroll', { amount: 650, sessionId });
    const page = await runTool('browser_read', { sessionId });
    return `Browser bootstrap completed.\nSession: ${sessionId}\n\n${opened}\n\n${page}`;
  }

  private isShoppingComparisonTask(input: string) {
    return /(cheapest|best price|compare|reviews?|specs?|product page|purchase tab|buy|shopping|pc|computer|gpu|vram|workstation)/i.test(input)
      && /(browser|click|search|product|purchase|compare|vram|pc|computer|gpu)/i.test(input);
  }

  private buildShoppingSearchQuery(input: string) {
    const vram = String(input || '').match(/(\d{2,3})\s*gb\s*vram/i)?.[1];
    if (vram && Number(vram) >= 80) {
      return `workstation PC ${Number(vram) >= 86 ? '96GB VRAM dual RTX 6000 Ada' : `${vram}GB VRAM GPU`} price UK reviews`;
    }
    return String(input || '').replace(/mythos[, ]*/ig, '').replace(/run full browser automation:?/ig, '').trim() || 'workstation PC GPU VRAM price UK reviews';
  }

  private parseBrowserLinks(readResult: string) {
    const links: { text: string; href: string }[] = [];
    const regex = /^\s*\d+\.\s*(.*?)\s*->\s*(https?:\/\/\S+)/gmi;
    let match;
    while ((match = regex.exec(readResult)) !== null) {
      links.push({ text: (match[1] || '').trim(), href: (match[2] || '').trim() });
    }
    const blocked = /(google\.[^/]+\/search|accounts\.google|support\.google|policies\.google|webcache|translate\.google|youtube\.com|facebook\.com|reddit\.com|pinterest\.com)/i;
    const useful = /(scan\.co\.uk|pcspecialist|chillblast|overclockers|box\.co\.uk|ebuyer|dell|hp\.com|lenovo|workstationspecialist|bizon|lambda|pugetsystems|amazon|ebay|newegg|nvidia|rtx|workstation|gaming pc|desktop pc|computer|pc)/i;
    const seen = new Set<string>();
    return links
      .filter(link => link.href && !blocked.test(link.href) && (useful.test(`${link.text} ${link.href}`) || /shopping|product|price|workstation|rtx/i.test(`${link.text} ${link.href}`)))
      .filter(link => {
        const key = link.href.replace(/[?#].*$/, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }

  private summarizeCandidate(url: string, readResult: string) {
    const title = readResult.match(/Title:\s*(.+)/i)?.[1]?.trim() || url;
    const visible = readResult.split('Visible text:')[1]?.split('Links:')[0] || readResult;
    const priceMatches = Array.from(visible.matchAll(/(?:£|GBP\s*|\$|USD\s*)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/gi)).map(match => match[0]);
    const vramMatches = Array.from(visible.matchAll(/\b\d{2,3}\s*GB\s*(?:GDDR\w*|VRAM|graphics memory)?/gi)).map(match => match[0]);
    const gpuMatches = Array.from(visible.matchAll(/\b(?:RTX|NVIDIA|GeForce|Quadro|Ada|A6000|6000|4090|5090)[^\n\r.]{0,80}/gi)).map(match => match[0].trim());
    const reviewSignals = Array.from(visible.matchAll(/\b(?:review|reviews|rating|stars?|trustpilot|warranty|delivery|returns?)\b[^\n\r.]{0,100}/gi)).map(match => match[0].trim());
    return {
      title,
      url,
      prices: Array.from(new Set(priceMatches)).slice(0, 6),
      vram: Array.from(new Set(vramMatches)).slice(0, 6),
      gpu: Array.from(new Set(gpuMatches)).slice(0, 6),
      reviews: Array.from(new Set(reviewSignals)).slice(0, 5),
      evidencePreview: visible.replace(/\s+/g, ' ').slice(0, 700)
    };
  }

  private async runDeterministicShoppingAutomation(task: Task, agent: Agent, sendUpdate: (step: string, type: any) => void) {
    if (!this.skillsEngine?.proposeAction || !this.skillsEngine?.approveAction) return '';
    const sessionId = `shopping-${task.id}`;
    const runTool = async (name: string, params: any) => {
      const action = this.skillsEngine.proposeAction({ name, type: 'os', params });
      const result = await this.skillsEngine.approveAction(action.id);
      const text = typeof result?.result === 'string' ? result.result : JSON.stringify(result || {});
      sendUpdate(`${name}: ${text.slice(0, 1400)}`, result?.ok === false ? 'error' : 'result');
      this.emitThought(task, agent, result?.ok === false ? 'ERROR' : 'OBSERVATION', `${name} returned during shopping automation.`, {
        tool: name,
        params,
        resultPreview: text.slice(0, 1400)
      });
      return text;
    };

    const query = this.buildShoppingSearchQuery(task.input);
    this.emitThought(task, agent, 'PLAN', `Running deterministic shopping comparison for: ${query}`, { sessionId, query });
    await runTool('browser_search_visible', { query, sessionId, label: 'Shopping Comparison Agent' });
    await runTool('browser_scroll', { amount: 700, sessionId });
    const searchRead = await runTool('browser_read', { sessionId });
    const links = this.parseBrowserLinks(searchRead);
    sendUpdate(`Candidate product/result pages selected: ${links.length}`, 'info');
    this.eventBus?.emit('agent.step', 'browser-automation-agent', {
      taskId: task.id,
      agentId: agent.id,
      step: 'candidate-pages-selected',
      query,
      links
    }, task.id);

    const candidates: any[] = [];
    for (let index = 0; index < links.length; index++) {
      const link = links[index];
      if (index === 0) {
        const clicked = await runTool('browser_click_href', { href: link.href, sessionId });
        if (/ok"?\s*:\s*false|not found|error/i.test(clicked)) {
          await runTool('browser_open', { target: link.href, sessionId, label: 'Shopping Comparison Agent' });
        }
      } else {
        await runTool('browser_open', { target: link.href, sessionId, label: 'Shopping Comparison Agent' });
      }
      await runTool('browser_scroll', { amount: 600, sessionId });
      const page = await runTool('browser_read', { sessionId });
      candidates.push(this.summarizeCandidate(link.href, page));
      await runTool('browser_screenshot', { sessionId });
    }

    const valid = candidates.filter(candidate => {
      const haystack = `${candidate.title} ${candidate.vram.join(' ')} ${candidate.gpu.join(' ')} ${candidate.evidencePreview}`;
      return /(86|88|96|128)\s*GB|RTX\s*6000|A6000|dual/i.test(haystack);
    });
    const ranked = (valid.length ? valid : candidates).sort((a, b) => {
      const priceA = Number(String(a.prices?.[0] || '').replace(/[^0-9.]/g, '')) || Number.MAX_SAFE_INTEGER;
      const priceB = Number(String(b.prices?.[0] || '').replace(/[^0-9.]/g, '')) || Number.MAX_SAFE_INTEGER;
      return priceA - priceB;
    });
    const best = ranked[0];
    const summary = [
      `Shopping automation completed with ${candidates.length} pages opened/read and ${candidates.length} screenshots captured.`,
      `Search query used: ${query}`,
      '',
      ...ranked.slice(0, 5).map((candidate, index) => [
        `${index + 1}. ${candidate.title}`,
        `URL: ${candidate.url}`,
        `Prices found: ${candidate.prices.join(', ') || 'not visible'}`,
        `GPU/VRAM evidence: ${[...candidate.gpu, ...candidate.vram].join(' | ') || 'not visible in page preview'}`,
        `Review/risk signals: ${candidate.reviews.join(' | ') || 'not visible in page preview'}`
      ].join('\n')),
      '',
      best ? `Best current candidate from visible evidence: ${best.title}\n${best.url}` : 'No suitable candidate was confirmed from visible page evidence.',
      'Purchase/checkout was not clicked. Opening or pressing a purchase/buy/checkout control still needs Silva approval.'
    ].join('\n\n');

    sendUpdate(summary, 'info');
    this.emitThought(task, agent, 'DONE', 'Deterministic shopping comparison finished.', {
      query,
      candidateCount: candidates.length,
      best,
      summaryPreview: summary.slice(0, 1800)
    });
    task.history.push({ role: 'assistant', content: summary, engine: 'Browser Automation Deterministic Workflow' });
    return summary;
  }

  getAgents() {
    return this.agents.map(a => ({
      ...a,
      personality: undefined // Don't send full prompt to frontend
    }));
  }

  updateAgentStatus(id: string, status: Agent['status'], background: boolean = false) {
    const agent = this.agents.find(a => a.id === id);
    if (agent) {
      agent.status = status;
      agent.background = background;
      
      const savedAgents = this.store.get('agents_status', {});
      savedAgents[id] = { status, background };
      this.store.set('agents_status', savedAgents);

      // If stopping, set cancel flag
      if (status === 'stopped') {
        this.cancelFlags.set(id, true);
      }
    }
    return this.getAgents();
  }

  stopAll(reason = 'Stopped by user') {
    for (const agent of this.agents) {
      this.cancelFlags.set(agent.id, true);
      agent.status = 'stopped';
      agent.currentTask = undefined;
    }
    this.store.set('agents_status', Object.fromEntries(this.agents.map(agent => [agent.id, { status: agent.status, background: false }])));
    this.eventBus?.emit('operator.stop', 'mythos-manager', { reason, stoppedAt: new Date().toISOString() });
    return { ok: true, reason, agents: this.getAgents() };
  }

  injectInstruction(agentId: string, instruction: string) {
    const text = String(instruction || '').trim();
    if (!text) return { ok: false, error: 'Instruction is empty.' };
    const queue = this.taskOverrides.get(agentId) || [];
    queue.push(text);
    this.taskOverrides.set(agentId, queue.slice(-10));
    this.eventBus?.emit('operator.override', 'mythos-manager', {
      agentId,
      instruction: text,
      createdAt: new Date().toISOString()
    });
    return { ok: true, agentId, instruction: text };
  }

  private consumeInstruction(agentId: string) {
    const queue = this.taskOverrides.get(agentId) || [];
    const next = queue.shift();
    this.taskOverrides.set(agentId, queue);
    return next;
  }

  async createTask(input: string, agentId?: string, win?: any) {
    const managerDecision = this.decideWithManager(input, agentId);
    const assignedId = managerDecision.assignedAgentId;
    const task: Task = {
      id: Math.random().toString(36).substring(7),
      input,
      status: 'running',
      assignedAgentId: assignedId,
      manager: managerDecision,
      steps: [
        { label: 'Mythos Manager route decision', status: 'done' },
        { label: `Lead agent: ${assignedId}`, status: 'done' },
        { label: 'Agent Loop Active', status: 'running' }
      ],
      history: [],
      createdAt: Date.now()
    };

    // Add to agent's task queue
    const queue = this.taskQueues.get(assignedId) || [];
    queue.push(task);
    this.taskQueues.set(assignedId, queue);

    // Clear cancel flag
    this.cancelFlags.set(assignedId, false);

    const sendUpdate = (step: string, type: 'step' | 'thinking' | 'tool' | 'code' | 'info' | 'error' | 'result' = 'info') => {
      win?.webContents.send('agent:update', { 
        agentId: assignedId, 
        taskId: task.id,
        type, 
        content: step, 
        time: new Date().toLocaleTimeString() 
      });
    };

    this.eventBus?.emit('manager.decision', 'mythos-manager', {
      taskId: task.id,
      ...managerDecision
    }, task.id);
    win?.webContents.send('agent:update', {
      agentId: 'general-agent',
      taskId: task.id,
      type: 'info',
      content: `Mythos Manager routed task to ${assignedId}. Priority: ${managerDecision.priority}. Reason: ${managerDecision.routeReason}`,
      time: new Date().toLocaleTimeString()
    });

    const agent = this.agents.find(a => a.id === assignedId);
    if (!agent) {
      task.status = 'failed';
      return task;
    }

    // Run the agent loop asynchronously
    this.runAgentLoop(agent, task, sendUpdate);
    return task;
  }

  private async runAgentLoop(
    agent: Agent,
    task: Task,
    sendUpdate: (step: string, type: 'step' | 'thinking' | 'tool' | 'code' | 'info' | 'error' | 'result') => void
  ) {
    this.updateAgentStatus(agent.id, 'running', agent.background);
    agent.currentTask = task.input.slice(0, 100);
    sendUpdate(`${agent.name} v${agent.version} starting...`, 'info');
    if (task.manager) {
      sendUpdate(`Managed by ${task.manager.managerName}. Priority: ${task.manager.priority}. Approval gates: ${task.manager.approvalGates.join(', ')}.`, 'info');
    }
    this.emitThought(task, agent, 'PLAN', `${agent.name} accepted task and started the local agent loop.`, {
      steps: task.steps,
      inputPreview: task.input.slice(0, 500),
      manager: task.manager
    });

    const skillGuidance = this.skillsEngine?.getSkillGuidance?.();
    const silvaMemory = this.workspaceService?.getSilvaMemory?.() || '';
    const emailSummary = this.workspaceService?.getEmailIntelligenceSummary?.() || {};
    const mailboxMemory = emailSummary.mailboxMemory || emailSummary.memory || {};
    const collaborationPlan = this.getCollaborationPlan(agent, task.input);
    const tinyFishStatus = this.tinyFishService?.getApiStatus?.();
    this.eventBus?.emit('agent.collaboration', 'agent-orchestrator', {
      taskId: task.id,
      leadAgentId: agent.id,
      collaborators: collaborationPlan,
      tinyFishConfigured: Boolean(tinyFishStatus?.configured)
    }, task.id);

    if (agent.id === 'browser-automation-agent' && this.isShoppingComparisonTask(task.input)) {
      await this.runDeterministicShoppingAutomation(task, agent, sendUpdate).catch((error: any) => {
        const message = error?.message || 'Deterministic browser shopping workflow failed.';
        sendUpdate(message, 'error');
        this.emitThought(task, agent, 'ERROR', message);
      });
      task.status = task.history.length > 0 ? 'done' : 'failed';
      task.steps = task.steps.map(s => ({ ...s, status: 'done' as const }));
      agent.currentTask = undefined;
      if (agent.status === 'running') this.updateAgentStatus(agent.id, 'idle', agent.background);
      this.emitThought(task, agent, task.status === 'done' ? 'DONE' : 'ERROR', `Browser automation deterministic workflow finished with status ${task.status}.`, {
        status: task.status,
        historyCount: task.history.length
      });
      return;
    }
    
    const messages: any[] = [
      { 
        role: 'system', 
        content: `${agent.personality}

### BASE MEMORY OF SILVA KANDASAMY
${silvaMemory}

### LIVE MAIL MEMORY SNAPSHOT
Use this before asking Silva to reread mail. It is a compact index summary, not permission to send/move/delete.
${JSON.stringify({
  syncedAt: emailSummary.syncedAt || null,
  totalIndexed: mailboxMemory.totalIndexed || 0,
  latestReceivedAt: mailboxMemory.latestReceivedAt || null,
  billsToPay: (mailboxMemory.billsToPay || []).slice(0, 10),
  deadlines: (mailboxMemory.deadlines || []).slice(0, 10),
  insuranceRenewals: (mailboxMemory.insuranceRenewals || []).slice(0, 10),
  upcomingImportant: (mailboxMemory.upcomingImportant || []).slice(0, 10),
  supplierUpdates: (mailboxMemory.supplierUpdates || []).slice(0, 8),
  staffInvoices: (mailboxMemory.staffInvoices || []).slice(0, 8),
  zReports: (mailboxMemory.zReports || []).slice(0, 8),
  accountingEvidence: (mailboxMemory.accountingEvidence || []).slice(0, 8),
  legalEvidence: (mailboxMemory.legalEvidence || []).slice(0, 8),
  knownProviderEvidence: (mailboxMemory.knownProviderEvidence || []).slice(0, 8),
  businessResearchEvidence: (mailboxMemory.businessResearchEvidence || []).slice(0, 8),
  propertyAnalysisEvidence: (mailboxMemory.propertyAnalysisEvidence || []).slice(0, 8),
  acquisitionEvidence: (mailboxMemory.acquisitionEvidence || []).slice(0, 8),
  fundingEvidence: (mailboxMemory.fundingEvidence || []).slice(0, 8),
  personalAdminEvidence: (mailboxMemory.personalAdminEvidence || []).slice(0, 8)
}, null, 2)}

### CRITICAL CONSTRAINTS
- **AUTO-ORGANIZATION**: You are empowered to organize files, documents, and emails into their logical categories.
- **NO DELETION**: You are NEVER allowed to delete, remove, or trash any email, file, or data. This is a strict constraint.
- **APPROVAL FIRST**: Destructive actions, money transfers, or external communication require explicit user approval.
- **COLLABORATION**: Treat this as a shared HermesDesk task. Lead agent: ${agent.name}. Peer agents available for clarification/verification: ${collaborationPlan.length ? collaborationPlan.map(peer => `${peer.name} (${peer.role})`).join('; ') : 'none selected'}.
- **TINYFISH WEB AGENT**: ${tinyFishStatus?.configured ? 'Available for real web automation on specific URLs. Use [TOOL: tinyfish_web_agent(url="https://...", task="what to inspect/extract/verify")] when a task needs live page inspection.' : 'Not available until a TinyFish API key is saved.'}
- **BROWSER OPERATOR**: Available as a real controlled browser. Use [TOOL: browser_search_visible(query="search query")] for visible Google typing/searching, [TOOL: browser_open(target="URL")], [TOOL: browser_read()], [TOOL: browser_ui_scan()] to list visible controls, [TOOL: browser_ui_resolve(query="Continue", role="button")] to choose robust targets, [TOOL: browser_ui_click(query="Continue", role="button")] and [TOOL: browser_ui_type(query="Search", text="text")] for natural UI actions, [TOOL: browser_scroll(amount="700")], [TOOL: browser_click(selector="CSS selector")], [TOOL: browser_click_text(text="visible text")], [TOOL: browser_click_href(href="https://...")], [TOOL: browser_type(selector="CSS selector", text="text")], [TOOL: browser_press(key="Enter")], [TOOL: browser_screenshot()], and [TOOL: browser_inspect()] for browser automation. Verify after each action. Do not click purchase/pay/submit/order/checkout without approval.
- **PC UIA OPERATOR**: Available for real Windows app control. Use [TOOL: pc_window_list()] then [TOOL: pc_window_focus(id="...")] before acting. Use [TOOL: pc_ui_scan()] to list visible controls in the focused app, [TOOL: pc_ui_resolve(query="OK", role="Button")] to choose targets, [TOOL: pc_ui_click(query="OK", role="Button")] to click, and [TOOL: pc_ui_type(query="File name", text="...")] to type. Prefer semantic targets over coordinates. Verify after every action. Do not click or type into purchase/payment/password/system-destructive controls without approval.

### TASTE ENGINE - REQUIRED BEHAVIOUR
- **THOUGHTFULNESS**: infer the real goal, audience, context, risk, opportunity, and missing facts before acting.
- **AUTONOMY**: do useful read-only work first using available memory, tools, research, and peer checks; ask one short question only if blocked.
- **STYLE**: craft outputs as professional work products, not generic chat. Use clear structure, persuasive framing, and practical next actions.
- **TARGETED INTELLIGENCE**: shape every answer for the audience and outcome. For drafts, identify who will read it and what response is desired.
- **EVOLUTION**: learn from approvals, denials, edits, repeated routes, and user preferences. Reduce noise and strengthen useful patterns.
- **WORKFLOW**: for non-trivial tasks use PLAN -> DRAFT -> REVISE -> PRESENT. For important drafts, include a safe version and a stronger version when helpful.
- **MEMORY FIRST**: check mailbox/workspace memory before asking Silva to repeat known context. Never pretend memory contains facts it does not contain.
- **DIRECTOR MODE**: if the task spans domains, General ME coordinates; specialists contribute; a different agent verifies before final delivery.
- **DOMAIN ROUTING**: solicitor/legal/land registry/council disputes -> Solicitor + Justice; invoices/HMRC/VAT/payroll -> Accountant; renewals/insurance/suppliers/purchases -> Purchase Guardian + Accountant where money is involved; WhatsApp staff/supplier evidence -> Paperclips first, then the specialist.
- **DREAM CYCLE SAFETY**: propose improvements, routes, skills, and fixes as approval items. Do not silently modify code, install dependencies, use paid APIs, send messages, or perform external actions.

${skillGuidance?.prompt ? `\n\n### INSTALLED SKILLS\n${skillGuidance.prompt}` : ''}` 
      },
      { role: 'user', content: task.input }
    ];

    if (agent.id === 'browser-automation-agent') {
      const bootstrap = await this.runBrowserBootstrap(task, agent, sendUpdate).catch((error: any) => {
        const message = error?.message || 'Browser bootstrap failed.';
        this.emitThought(task, agent, 'ERROR', message);
        sendUpdate(message, 'error');
        return '';
      });
      if (bootstrap) {
        messages.push({
          role: 'user',
          content: `Real browser automation bootstrap evidence is below. Continue from this evidence using browser_read, browser_click_text, browser_click, browser_type, browser_screenshot, and browser_inspect. Do not say you cannot browse.\n\n${bootstrap.slice(0, 7000)}`
        });
      }
    }

    let iterations = 0;
    const maxIterations = 8;
    let recoveryAttempts = 0;
    const maxRecoveryAttempts = 3;
    let completed = false;

    while (iterations < maxIterations) {
      // Check cancel flag
      if (this.cancelFlags.get(agent.id)) {
        sendUpdate('Agent stopped by user.', 'info');
        task.status = 'cancelled';
        break;
      }

      const override = this.consumeInstruction(agent.id);
      if (override) {
        sendUpdate(`Operator override: ${override}`, 'info');
        this.emitThought(task, agent, 'REVISE', `Operator override received: ${override}`, { override });
        messages.push({
          role: 'user',
          content: `LIVE OPERATOR OVERRIDE FROM SILVA:\n${override}\n\nObey this immediately. If it says stop, pause and report. If it corrects direction, continue from the current tool state.`
        });
      }

      iterations++;
      sendUpdate(`Iteration ${iterations}/${maxIterations}: Thinking...`, 'thinking');
      this.emitThought(task, agent, 'THINK', `Iteration ${iterations}/${maxIterations}: preparing next model call.`, {
        iteration: iterations,
        maxIterations
      });

      try {
        // Call LLM through the smart engine router (Jan+TQ first)
        const response = await this.aiService.chatWithBestAvailable(
          '', // Let the engine pick the model
          messages
        );

        const content = response?.message?.content || '';
        const engine = response?.engine || 'Unknown';
        this.eventBus?.emit('model.info', 'agent-orchestrator', {
          taskId: task.id,
          agentId: agent.id,
          engine,
          iteration: iterations,
          outputChars: content.length
        }, task.id);

        if (!content) {
          recoveryAttempts++;
          const recoveryMessage = `No response from ${engine}. Recovery ${recoveryAttempts}/${maxRecoveryAttempts}: retrying with a smaller continuation prompt.`;
          sendUpdate(recoveryMessage, 'error');
          this.emitThought(task, agent, 'REVISE', recoveryMessage, { engine, iteration: iterations, recoveryAttempts });
          task.history.push({ role: 'system', content: recoveryMessage, engine, iteration: iterations, recoveryAttempts });
          messages.push({
            role: 'user',
            content: `The previous engine response was empty. Continue the task from the last reliable state. If a tool failed, choose another approach. Task: ${task.input}`
          });
          if (recoveryAttempts < maxRecoveryAttempts) continue;
          task.status = 'failed';
          break;
        }

        sendUpdate(`Engine: ${engine}`, 'info');
        this.emitThought(task, agent, 'OBSERVATION', `Model route returned output from ${engine}.`, {
          engine,
          outputPreview: content.slice(0, 800)
        });

        // Check for tool calls in the response
        const toolCalls = this.extractAllToolCalls(content);

        if (toolCalls.length > 0) {
          // Execute each tool call
          for (const toolCall of toolCalls) {
            if (this.cancelFlags.get(agent.id)) break;

            sendUpdate(`Tool: ${toolCall.name}(${JSON.stringify(toolCall.params)})`, 'tool');
            this.emitThought(task, agent, 'TOOL_CALL', `Calling ${toolCall.name}.`, {
              tool: toolCall.name,
              params: toolCall.params
            });

            try {
              const normalizedTool = String(toolCall.name || '').toLowerCase();
              if (['tinyfish_web_agent', 'tinyfish', 'web_agent'].includes(normalizedTool)) {
                const result = await this.runTinyFishTool(task, agent, toolCall.params);
                const resultStr = JSON.stringify(result || {}).slice(0, 2500);
                sendUpdate(resultStr, result?.ok ? 'result' : 'error');
                this.emitThought(task, agent, result?.ok ? 'OBSERVATION' : 'ERROR', 'TinyFish web agent returned.', {
                  tool: toolCall.name,
                  resultPreview: resultStr.slice(0, 1200)
                });
                messages.push({ role: 'assistant', content });
                messages.push({ role: 'user', content: `TinyFish result:\n${resultStr}\n\nContinue the task with this live web evidence.` });
                continue;
              }

              const action = this.skillsEngine.proposeAction({
                name: toolCall.name,
                type: this.getToolType(toolCall.name),
                params: toolCall.params
              });

              if (this.toolNeedsManualApproval(toolCall.name, toolCall.params)) {
                const approvalMessage = `Approval required for ${toolCall.name}. The proposed action is waiting in Approvals and was not auto-executed.`;
                sendUpdate(approvalMessage, 'tool');
                this.emitThought(task, agent, 'OBSERVATION', approvalMessage, {
                  tool: toolCall.name,
                  params: toolCall.params,
                  approvalId: action.id
                });
                messages.push({ role: 'assistant', content });
                messages.push({
                  role: 'user',
                  content: `Tool "${toolCall.name}" requires explicit user approval and was not executed automatically. Continue with safe read-only reasoning, explain what approval is needed, or choose a read-only tool if possible.`
                });
                continue;
              }

              const result = await this.skillsEngine.approveAction(action.id);
              const resultStr = typeof result.result === 'string' 
                ? result.result.slice(0, 2000) 
                : JSON.stringify(result.result || result.error).slice(0, 2000);

              sendUpdate(resultStr, 'result');
              this.emitThought(task, agent, 'OBSERVATION', `Tool ${toolCall.name} returned a result.`, {
                tool: toolCall.name,
                resultPreview: resultStr.slice(0, 1000)
              });

              messages.push({ role: 'assistant', content });
              messages.push({ role: 'user', content: `Tool "${toolCall.name}" result:\n${resultStr}\n\nContinue with the task or provide your final answer.` });
            } catch (toolErr: any) {
              sendUpdate(`Tool error: ${toolErr.message}`, 'error');
              this.emitThought(task, agent, 'ERROR', `Tool ${toolCall.name} failed: ${toolErr.message}`, {
                tool: toolCall.name,
                error: toolErr.message
              });
              messages.push({ role: 'assistant', content });
              messages.push({ role: 'user', content: `Tool "${toolCall.name}" failed: ${toolErr.message}. Try a different approach.` });
            }
          }
        } else {
          // No tool calls — this is the agent's final response
          if (agent.id === 'browser-automation-agent' && /cannot browse|can't browse|do not have the ability to browse|not able to browse|as an ai language model/i.test(content) && iterations < maxIterations) {
            const correction = 'Browser Automation Agent correction: you do have real browser tools. Continue by calling [TOOL: browser_read()] or [TOOL: browser_inspect()], then choose result/product links with browser_click_text or browser_click. Do not provide a generic inability answer.';
            sendUpdate(correction, 'error');
            this.emitThought(task, agent, 'REVISE', correction, { outputPreview: content.slice(0, 600) });
            messages.push({ role: 'assistant', content });
            messages.push({ role: 'user', content: correction });
            continue;
          }
          const peerReview = await this.peerVerifyFinal(agent, task, content, engine);
          const finalContent = peerReview ? `${content}\n\nPeer verification:\n${peerReview}` : content;
          sendUpdate(finalContent, 'info');
          this.emitThought(task, agent, 'DONE', 'Agent produced a final response.', {
            outputPreview: finalContent.slice(0, 1000),
            engine
          });
          task.history.push({ role: 'assistant', content: finalContent, engine, iteration: iterations, peerReview });
          completed = true;
          break;
        }
      } catch (err: any) {
        recoveryAttempts++;
        const message = err?.message || 'Unknown engine error';
        sendUpdate(`Engine error: ${message}`, 'error');
        this.emitThought(task, agent, 'ERROR', `Engine route failed: ${message}`, {
          iteration: iterations,
          recoveryAttempts
        });
        task.history.push({ role: 'system', content: `Engine error: ${message}`, iteration: iterations, recoveryAttempts });
        if (recoveryAttempts >= maxRecoveryAttempts) {
          task.status = 'failed';
          sendUpdate(`Recovery exhausted after ${maxRecoveryAttempts} attempts. Task needs review.`, 'error');
          break;
        }
        messages.push({
          role: 'user',
          content: `The engine/tool route failed with: ${message}\nRecover and continue. Try a smaller answer, another local route, or produce the safest partial result with next actions. Do not abandon the task unless impossible.`
        });
        sendUpdate(`Recovery pass ${recoveryAttempts}/${maxRecoveryAttempts}: continuing instead of stopping.`, 'info');
        continue;
      }
    }

    if (iterations >= maxIterations) {
      sendUpdate(`Reached maximum iterations (${maxIterations}). Task paused.`, 'info');
    }

    sendUpdate(task.status === 'failed' ? 'Agent loop stopped after recovery attempts.' : 'Agent loop complete.', task.status === 'failed' ? 'error' : 'info');
    task.status = task.status === 'cancelled' ? 'cancelled' : task.status === 'failed' ? 'failed' : completed || task.history.length > 0 ? 'done' : 'failed';
    task.steps = task.steps.map(s => ({ ...s, status: 'done' as const }));
    agent.currentTask = undefined;

    // Only set idle if not cancelled/stopped
    if (agent.status === 'running') {
      this.updateAgentStatus(agent.id, 'idle', agent.background);
    }
    this.emitThought(task, agent, task.status === 'failed' ? 'ERROR' : 'DONE', `Agent loop finished with status ${task.status}.`, {
      status: task.status,
      historyCount: task.history.length
    });
  }

  /** Extract ALL tool calls from LLM output */
  private extractAllToolCalls(content: string): { name: string; params: any }[] {
    const calls: { name: string; params: any }[] = [];
    const regex = /\[TOOL:\s*(\w+)\(([^)]*)\)\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      try {
        const name = match[1];
        const paramsStr = match[2];
        const params: any = {};
        
        // Parse key="value" pairs
        const paramRegex = /(\w+)="([^"]*)"/g;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(paramsStr)) !== null) {
          params[paramMatch[1]] = paramMatch[2];
        }
        
        calls.push({ name, params });
      } catch (e) {
        // Skip malformed tool calls
      }
    }

    return calls;
  }

  private getToolType(name: string): 'file' | 'script' | 'os' {
    if (name.includes('powershell') || name.includes('command')) return 'script';
    if (name.includes('file') || name.includes('dir')) return 'file';
    return 'os';
  }

  getTasks() {
    const allTasks: Task[] = [];
    this.taskQueues.forEach(queue => allTasks.push(...queue));
    return allTasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  getAgentTasks(agentId: string) {
    return this.taskQueues.get(agentId) || [];
  }
}
