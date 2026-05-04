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
}
