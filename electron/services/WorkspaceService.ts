import Store from 'electron-store';

export const SILVA_MASTER_MEMORY = `# SILVA AGENTS - MASTER ORGANISED INDEX

Memory | Skills | Knowledges - Complete, additive, always updated.

## MEMORY
- Current Legal Name: Silva Kandasamy
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
- Money, payments, legal submissions, external messages, installs, and destructive actions require approval.

## SILVA AGENT ROLES
- Hermes Agent: architecture, coding, OS-safe automation.
- Paperclips: email, documents, routing, filing, intelligence organisation.
- Solicitor Agent: UK legal-style drafting and property/legal issue analysis, not legal advice.
- Accountant Agent: VAT, tax, bills, receipts, statements, ledgers, companies.
- Space Agent: system monitoring and research.
- OpenClaw: security and forensics.

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
