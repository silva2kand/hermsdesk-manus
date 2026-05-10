import Store from 'electron-store';

export const SILVA_MASTER_MEMORY = `# BABA - MASTER ORGANISED INDEX

Memory | Skills | Knowledges - Complete, additive, always updated.

## MEMORY
- Current Legal Name: Silva Kandasamy
- Preferred working name in chat: Syan
- System / AI OS name: Baba
- Previous Names: Shiva Kandasamy (2010-2024), Siyanthan Kandasamy (pre-2010)
- Residence: UK, Lancaster area
- Primary Address: Newton Newsagent, 3 Langdale Place, Lancaster, LA1 3NS
- Properties: 3 Langdale Place; 6F Steamer Street; 16 Howlish View
- Business: Silva Retail Ltd, trading as Newton Newsagent

## MEMORY ARCHITECTURE
/memory/identity, semantic, episodic, procedural, preferences, goals, tools, emails, documents, finance, property, business, tasks.

## RULES
- Additive only. Never reset or overwrite unless Silva explicitly says so.
- Keep memory updated from approved email, document, finance, property, business, and task events.
- For greetings and daily check-ins, use Mythos/Baba first: check mailbox memory, urgent/important buckets, engine status, browser/operator state, and then answer.
- Priority ranking favours bills, payments, renewals, insurance, HMRC/VAT/tax, council, land registry, solicitor/legal, suppliers, staff invoices, property, and system errors.
- Marketing, newsletters, campaigns, junk, discounts, fashion, vouchers, and generic property alerts are background unless Silva marks them important.
- Money, payments, legal submissions, external messages, installs, and destructive actions require approval.

## BABA AGENT ROLES
- Hermes Agent: architecture, coding, OS-safe automation.
- Paperclips: email, documents, routing, filing, intelligence organisation.
- Solicitor Agent: UK legal-style drafting and property/legal issue analysis, not legal advice.
- Accountant Agent: VAT, tax, bills, receipts, statements, ledgers, companies.
- Space Agent: system monitoring and research.
- OpenClaw: security and forensics.
- Purchase Guardian: insurance, renewals, seller/product checks, quote research, purchase protection.
- General ME / Mythos Manager: front-door brain, priority-aware router, memory gatekeeper, peer verifier.

## BABA SKILLS
- MemoryVault: long-term identity, semantic, episodic, procedural, preferences, goals, tools, emails, documents, finance, property, business, and task memory.
- OperatorCore: visible PC/browser/app automation with STOP, approval gates, live events, screenshots, read/click/type/scroll/verify.
- VoiceCore: local speech stack; premium English route works; Tamil/Jaffna UI routes through working ta-default while ta-jaffna-premium remains a model/profile repair target.
- EmailAgent: read, index, dedupe, classify, remember, route, and update new emails from Classic Outlook/Graph when available.
- BrowserAgent: visible web search, cookie handling, result clicking, extraction, screenshots, and safe purchase-gate stopping.
- SafetyGovernor: never silently send, pay, file, delete, move, submit, install, or contact third parties.

## EMAIL DOMAINS
Business, Land Registry, council bills, insurance, tax, VAT, MOT, visa, sponsors, accountant, solicitors, general, suppliers, sales reps, parcel services, companies, property, finance, home, retail/POS, and more discovered folders.

## COGNITIVE BEHAVIOUR
Research, analyse, investigate, cross-check, multi-pass reasoning, team-mode, self-improve, and approval-first safe mode.`;

export interface WorkflowEmail {
  email: string;
  desc: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  trigger: string;
  task: string;
  status: 'Active' | 'Paused';
  color: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  instructions: string;
  files: string[];
  connectors: string[];
  taskHistory: { id: string; prompt: string; createdAt: number; agentId?: string }[];
  createdAt: number;
  updatedAt: number;
}

export interface WhatsAppDraft {
  id: string;
  phone: string;
  message: string;
  label: string;
  status: 'drafted' | 'opened' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export class WorkspaceService {
  private store: any;

  constructor(sharedStore?: any) {
    this.store = sharedStore || new Store({ name: 'workspace-settings', atomically: false, watch: false });
  }

  // Mail ME
  getMailSettings() {
    return this.store.get('mail');
  }

  saveMailSettings(settings: any) {
    this.store.set('mail', settings);
    return true;
  }

  getWhatsAppDrafts(): WhatsAppDraft[] {
    return this.store.get('whatsAppDrafts', []) as WhatsAppDraft[];
  }

  saveWhatsAppDraft(draft: Partial<WhatsAppDraft>) {
    const now = Date.now();
    const drafts = this.getWhatsAppDrafts();
    const existing = draft.id ? drafts.find(item => item.id === draft.id) : null;
    const nextDraft: WhatsAppDraft = {
      id: draft.id || Math.random().toString(36).slice(2),
      phone: draft.phone ?? existing?.phone ?? '',
      message: draft.message ?? existing?.message ?? '',
      label: draft.label ?? existing?.label ?? 'WhatsApp draft',
      status: draft.status ?? existing?.status ?? 'drafted',
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    const next = existing
      ? drafts.map(item => item.id === nextDraft.id ? nextDraft : item)
      : [nextDraft, ...drafts];
    this.store.set('whatsAppDrafts', next.slice(0, 100));
    return nextDraft;
  }

  updateWhatsAppDraftStatus(id: string, status: WhatsAppDraft['status']) {
    const drafts = this.getWhatsAppDrafts();
    const next = drafts.map(item => item.id === id ? { ...item, status, updatedAt: Date.now() } : item);
    this.store.set('whatsAppDrafts', next);
    return next.find(item => item.id === id) || null;
  }

  // Scheduled Tasks
  getScheduledTasks() {
    return this.store.get('scheduledTasks') as ScheduledTask[];
  }

  saveScheduledTasks(tasks: ScheduledTask[]) {
    this.store.set('scheduledTasks', tasks);
    return true;
  }

  // General Settings
  getGeneralSettings() {
    return this.store.get('generalSettings');
  }

  saveGeneralSettings(settings: any) {
    this.store.set('generalSettings', settings);
    return true;
  }

  getModelPreset() {
    const settings = this.getGeneralSettings() || {};
    return settings.modelPreset || { provider: 'Jan', model: 'Auto local model' };
  }

  saveModelPreset(preset: { provider: string; model: string }) {
    const settings = this.getGeneralSettings() || {};
    const next = {
      ...settings,
      modelPreset: {
        provider: preset.provider || 'Jan',
        model: preset.model || 'Auto local model'
      }
    };
    this.store.set('generalSettings', next);
    return next.modelPreset;
  }

  getSilvaMemory() {
    return this.store.get('silvaMasterMemory', SILVA_MASTER_MEMORY);
  }

  saveSilvaMemory(memory: string) {
    this.store.set('silvaMasterMemory', memory);
    return true;
  }

  getEmailIntelligence() {
    return this.store.get('emailIntelligence', {
      syncedAt: null,
      folders: [],
      messages: [],
      summary: {}
    });
  }

  getEmailIntelligenceSummary() {
    const current = this.getEmailIntelligence();
    const memory = current.mailboxMemory || current.memory || {};
    if ((current.messages || []).length > 2500 || (current.folders || []).length > 250) {
      this.store.set('emailIntelligence', {
        ...current,
        folders: (current.folders || []).slice(0, 250),
        messages: (current.messages || []).slice(0, 2500),
        memory,
        mailboxMemory: memory
      });
    }
    return {
      syncedAt: current.syncedAt || null,
      folders: (current.folders || []).slice(0, 200),
      summary: current.summary || {},
      memory,
      mailboxMemory: memory,
      latestMessages: (current.messages || []).slice(0, 100),
      messageCount: (current.messages || []).length
    };
  }

  saveEmailIntelligence(data: any) {
    this.store.set('emailIntelligence', data);
    return true;
  }

  approveEmailRoute(messageId: string, status: 'approved' | 'denied' | 'done') {
    const current = this.getEmailIntelligence();
    current.messages = (current.messages || []).map((message: any) =>
      message.id === messageId ? { ...message, approvalStatus: status } : message
    );
    this.store.set('emailIntelligence', current);
    return current;
  }

  updateMailMemoryItem(itemId: string, patch: any = {}) {
    const current = this.getEmailIntelligence();
    const safePatch = {
      importanceStatus: patch.importanceStatus,
      followUpStatus: patch.followUpStatus,
      userNote: patch.userNote,
      lastReviewedAt: new Date().toISOString()
    };
    const cleanPatch = Object.fromEntries(Object.entries(safePatch).filter(([, value]) => value !== undefined));
    const itemState = this.store.get('mailMemoryItemState', {}) as Record<string, any>;
    itemState[itemId] = { ...(itemState[itemId] || {}), ...cleanPatch };
    this.store.set('mailMemoryItemState', itemState);

    const updateArray = (items: any[] = []) => items.map((item: any) =>
      item?.id === itemId ? { ...item, ...cleanPatch } : item
    );
    const memoryKeys = ['billsToPay', 'deadlines', 'urgent', 'insuranceRenewals', 'supplierUpdates', 'staffInvoices', 'upcomingImportant'];
    const memory = { ...(current.mailboxMemory || current.memory || {}) };
    for (const key of memoryKeys) memory[key] = updateArray(memory[key] || []);
    current.messages = updateArray(current.messages || []);
    current.mailboxMemory = memory;
    current.memory = memory;
    this.store.set('emailIntelligence', current);
    return this.getEmailIntelligenceSummary();
  }

  getProjects(): WorkspaceProject[] {
    return this.store.get('projects', []) as WorkspaceProject[];
  }

  saveProject(project: Partial<WorkspaceProject>) {
    const now = Date.now();
    const projects = this.getProjects();
    const existing = project.id ? projects.find(item => item.id === project.id) : null;
    const nextProject: WorkspaceProject = {
      id: project.id || Math.random().toString(36).slice(2),
      name: project.name || existing?.name || 'Untitled Project',
      description: project.description ?? existing?.description ?? '',
      instructions: project.instructions ?? existing?.instructions ?? '',
      files: project.files || existing?.files || [],
      connectors: project.connectors || existing?.connectors || [],
      taskHistory: project.taskHistory || existing?.taskHistory || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    const next = existing
      ? projects.map(item => item.id === nextProject.id ? nextProject : item)
      : [nextProject, ...projects];
    this.store.set('projects', next);
    return nextProject;
  }

  deleteProject(id: string) {
    const next = this.getProjects().filter(project => project.id !== id);
    this.store.set('projects', next);
    return next;
  }

  addProjectFiles(id: string, files: string[]) {
    const project = this.getProjects().find(item => item.id === id);
    if (!project) throw new Error('Project not found.');
    const merged = Array.from(new Set([...(project.files || []), ...files]));
    return this.saveProject({ ...project, files: merged });
  }

  addProjectTask(id: string, prompt: string, agentId?: string) {
    const project = this.getProjects().find(item => item.id === id);
    if (!project) throw new Error('Project not found.');
    const taskHistory = [
      { id: Math.random().toString(36).slice(2), prompt, createdAt: Date.now(), agentId },
      ...(project.taskHistory || [])
    ].slice(0, 100);
    return this.saveProject({ ...project, taskHistory });
  }
}
