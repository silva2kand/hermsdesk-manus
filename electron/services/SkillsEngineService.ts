import { createRequire } from 'node:module';
import fs from 'fs';
import path from 'path';
import Store from 'electron-store';
import { exec } from 'child_process';
import { promisify } from 'util';

const require = createRequire(import.meta.url);
const electron = ((globalThis as any).__electronModule || require('electron')) as typeof import('electron');
const { shell, dialog, app } = electron;

const execAsync = promisify(exec);

export interface SkillAction {
  id: string;
  name: string;
  type: 'file' | 'script' | 'os';
  params: any;
  status: 'pending' | 'approved' | 'denied' | 'executed';
  timestamp: number;
}

export interface SkillPackage {
  id: string;
  name: string;
  description: string;
  version?: string;
  path?: string;
  installed: boolean;
  source: 'built-in' | 'local-package';
  instructions?: string;
}

export class SkillsEngineService {
  private store: any;
  private pendingActions: SkillAction[] = [];
  private microsoftGraph: any;
  private indexService: any;
  private browserOperator: any;

  private defaultSkills = [
    'me-api',
    'skill-creator',
    'os-control',
    'file-explorer',
    'mythos-execution',
    'mythos-recovery',
    'mythos-pc-operator',
    'mythos-whatsapp-reply',
    'mythos-truthful-connectors',
    'mythos-justice-casework',
    'mythos-purchase-protection'
  ];

  constructor(sharedStore?: any, microsoftGraph?: any, indexService?: any, browserOperator?: any) {
    this.store = sharedStore || new Store({ name: 'skills-engine', atomically: false, watch: false });
    this.microsoftGraph = microsoftGraph;
    this.indexService = indexService;
    this.browserOperator = browserOperator;
  }

  getInstalledSkills() {
    const saved = this.store.get('installed_skills', this.defaultSkills) as string[];
    return Array.from(new Set([...this.defaultSkills, ...(Array.isArray(saved) ? saved : [])]));
  }

  getSkillPackages(): SkillPackage[] {
    const installed = new Set(this.getInstalledSkills());
    const builtIn: SkillPackage[] = this.defaultSkills.map(id => ({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
      description: this.describeBuiltInSkill(id),
      installed: installed.has(id),
      source: 'built-in'
    }));
    return [...builtIn, ...this.loadLocalSkillPackages(installed)];
  }

  getSkillGuidance() {
    const installed = this.getInstalledSkills();
    const rules: string[] = [];

    if (installed.includes('mythos-execution')) {
      rules.push('Mythos Execution: break complex work into concrete steps, execute available real tools, verify outcomes, and continue until done or blocked by missing permission.');
    }
    if (installed.includes('mythos-recovery')) {
      rules.push('Mythos Recovery: when a tool/model/action fails, diagnose, retry with a smaller step, choose a fallback route, and report exactly what was recovered.');
    }
    if (installed.includes('mythos-pc-operator')) {
      rules.push('Mythos PC Operator: prefer real local routes for files, terminal, browser opening, app launching, ME Computer activity, and approval-first OS actions.');
    }
    if (installed.includes('mythos-whatsapp-reply')) {
      rules.push('Mythos WhatsApp Reply: draft professional, concise replies from user-provided message text; open the real WhatsApp composer; never claim background read/send access. Use [TOOL: whatsapp_inspect_ui()] to see current messages.');
    }
    if (installed.includes('mythos-truthful-connectors')) {
      rules.push('Mythos Connector Truth: distinguish enabled routes from authenticated connections. Use [TOOL: outlook_list_accounts()] to see connected Outlook accounts.');
    }
    if (installed.includes('mythos-justice-casework')) {
      rules.push('Mythos Justice Casework: for legal/public-interest issues, build evidence-first case packs, chronology, issue lists, appeal/review route maps, complaint drafts, and deadline checks.');
    }

    return {
      installed,
      prompt: [
        ...rules,
        ...this.getSkillPackages()
          .filter(skill => skill.installed && skill.instructions)
          .map(skill => `${skill.name}: ${skill.instructions}`)
      ].join('\n')
    };
  }

  private describeBuiltInSkill(id: string) {
    const descriptions: Record<string, string> = {
      'me-api': 'Manage ME tasks, projects, configuration, and local system automation.',
      'skill-creator': 'Create reusable skill packages and workflow instructions.',
      'os-control': 'Use approval-first local OS actions, app launch, and terminal routes.',
      'file-explorer': 'Read, list, and organize files with approval gates for writes.',
      'mythos-execution': 'Execute multi-step work with verification and recovery.',
      'mythos-recovery': 'Recover from tool/model/action failures and continue safely.',
      'mythos-pc-operator': 'Operate local PC/browser/tool routes with visible evidence.',
      'mythos-whatsapp-reply': 'Draft professional WhatsApp replies and open the real composer.',
      'mythos-truthful-connectors': 'Separate enabled routes from authenticated live connections.',
      'mythos-justice-casework': 'Build evidence-first legal, appeal, review, and complaint packs.',
      'mythos-purchase-protection': 'Research sellers/products and build refund or chargeback packs.'
    };
    return descriptions[id] || 'Reusable ME workflow skill.';
  }

  private loadLocalSkillPackages(installed: Set<string>): SkillPackage[] {
    const roots = [
      path.join(app.getPath('userData'), 'skills'),
      path.join(process.cwd(), 'skills')
    ];
    const packages: SkillPackage[] = [];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      for (const folder of fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
        const skillPath = path.join(root, folder.name);
        const mdPath = path.join(skillPath, 'SKILL.md');
        const jsonPath = path.join(skillPath, 'SKILL.json');
        try {
          let manifest: any = {};
          if (fs.existsSync(jsonPath)) {
            manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          }
          const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';
          const id = manifest.id || folder.name;
          packages.push({
            id,
            name: manifest.name || id.replace(/-/g, ' '),
            description: manifest.description || md.split(/\r?\n/).find(line => line.trim() && !line.startsWith('#')) || 'Local skill package',
            version: manifest.version,
            path: skillPath,
            installed: installed.has(id),
            source: 'local-package',
            instructions: md.slice(0, 4000)
          });
        } catch {
          packages.push({
            id: folder.name,
            name: folder.name,
            description: 'Skill package exists but could not be parsed.',
            path: skillPath,
            installed: installed.has(folder.name),
            source: 'local-package'
          });
        }
      }
    }
    return packages;
  }

  toggleSkill(skillId: string, installed: boolean) {
    const installedSkills = this.getInstalledSkills();
    if (installed) {
      if (!installedSkills.includes(skillId)) {
        installedSkills.push(skillId);
      }
    } else {
      const index = installedSkills.indexOf(skillId);
      if (index > -1) {
        installedSkills.splice(index, 1);
      }
    }
    this.store.set('installed_skills', installedSkills);
    return installedSkills;
  }

  proposeAction(action: Omit<SkillAction, 'id' | 'status' | 'timestamp'>) {
    const newAction: SkillAction = {
      ...action,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      timestamp: Date.now()
    };
    this.pendingActions.push(newAction);
    return newAction;
  }

  getPendingActions() {
    return this.pendingActions.filter(a => a.status === 'pending');
  }

  async approveAction(id: string) {
    const action = this.pendingActions.find(a => a.id === id);
    if (!action) return { ok: false, error: 'Action not found' };

    action.status = 'approved';
    try {
      const result = await this.executeAction(action);
      action.status = 'executed';
      
      const logs = this.store.get('skills_audit', []) as any[];
      logs.push({ ...action, result, success: true });
      this.store.set('skills_audit', logs);

      return { ok: true, result };
    } catch (error: any) {
      action.status = 'executed';
      const logs = this.store.get('skills_audit', []) as any[];
      logs.push({ ...action, error: error.message, success: false });
      this.store.set('skills_audit', logs);
      return { ok: false, error: error.message };
    }
  }

  denyAction(id: string) {
    const action = this.pendingActions.find(a => a.id === id);
    if (action) action.status = 'denied';
    return true;
  }

  private async executeAction(action: SkillAction) {
    const name = action.name;
    const params = action.params || {};

    // --- OUTLOOK TOOLS ---
    if (name === 'outlook_list_accounts') {
      const accounts = this.indexService?.getAllAccounts() || [];
      return accounts.length > 0 
        ? accounts.map((a: any) => `- ${a.displayName} (${a.email}): ${a.totalIndexed} emails indexed`).join('\n')
        : 'No Outlook accounts connected.';
    }

    if (name === 'outlook_search_emails') {
      const results = await this.indexService?.searchEmails(params.query, params.accountId);
      if (!results || results.length === 0) return `No emails found for query: "${params.query}"`;
      return results.map((m: any) => `[${m.accountId}] ${m.receivedAt} | ${m.sender}: ${m.subject} (ID: ${m.id})`).join('\n');
    }

    if (name === 'outlook_sync_account') {
      if (!this.microsoftGraph) throw new Error('Microsoft Graph service not initialized');
      const result = await this.microsoftGraph.syncEmailIntelligenceBatch(params.accountId, { batchSize: params.batchSize || 100 });
      return `Sync complete for ${params.accountId}. Indexed ${result.syncedCount} new messages. Total: ${result.totalIndexed}. Complete: ${result.complete}`;
    }

    if (name === 'outlook_get_email_details') {
      if (!this.microsoftGraph) throw new Error('Microsoft Graph service not initialized');
      const data = await this.microsoftGraph.graphGet(`/me/messages/${params.messageId}`, params.accountId);
      return `Subject: ${data.subject}\nFrom: ${data.from?.emailAddress?.name} <${data.from?.emailAddress?.address}>\nDate: ${data.receivedDateTime}\n\n${data.body?.content || data.bodyPreview}`;
    }

    // --- WHATSAPP TOOLS ---
    if (name === 'whatsapp_inspect_ui') {
      if (!this.browserOperator) throw new Error('Browser operator not initialized');
      const sessions = this.browserOperator.getSessions();
      let waSession = sessions.find((s: any) => s.url.includes('web.whatsapp.com'));
      
      if (!waSession) {
        await this.browserOperator.open('https://web.whatsapp.com/', 'whatsapp-vision', 'WhatsApp Web');
        return 'WhatsApp Web was not open. I have opened it for you. Please wait a moment for it to load, then try this tool again.';
      }

      const inspection = await this.browserOperator.inspectScreen(waSession.id);
      return `WhatsApp UI Inspection:\nURL: ${inspection.url}\nVisible Text: ${inspection.visibleText.slice(0, 2000)}\nNote: I have captured a screenshot for visual confirmation.`;
    }

    // --- EXPERT OS TOOLS ---
    if (name === 'os_control_expert') {
      if (params.action === 'list_windows') {
        const cmd = 'Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object ProcessName, MainWindowTitle';
        const { stdout } = await execAsync(`powershell -Command "${cmd}"`);
        return stdout;
      }
      if (params.action === 'focus_window') {
        const script = `
          $wshell = New-Object -ComObject WScript.Shell;
          $wshell.AppActivate("${params.windowTitle}")
        `;
        await execAsync(`powershell -Command "${script}"`);
        return `Attempted to focus window: ${params.windowTitle}`;
      }
      return `Expert action ${params.action} not yet implemented.`;
    }

    // File operations
    if (name === 'write_file' || name === 'write-file') {
      const fullPath = path.resolve(params.path);
      const allowedDirs = [app.getPath('userData'), app.getPath('documents'), process.cwd()];
      if (!allowedDirs.some(dir => fullPath.startsWith(dir))) {
        throw new Error(`Access denied: Cannot write to ${fullPath}. Allowed: ${allowedDirs.join(', ')}`);
      }
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, params.content || '');
      return `Successfully wrote ${(params.content || '').length} bytes to ${fullPath}`;
    }

    if (name === 'read_file' || name === 'read-file') {
      const fullPath = path.resolve(params.path);
      if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${fullPath}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      return content.slice(0, 8000);
    }

    if (name === 'list_dir' || name === 'list-dir') {
      const fullPath = path.resolve(params.path || '.');
      if (!fs.existsSync(fullPath)) throw new Error(`Directory not found: ${fullPath}`);
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      return entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
    }

    if (name === 'analyze_document') {
      const fullPath = path.resolve(params.path);
      if (!fs.existsSync(fullPath)) throw new Error(`Document not found: ${fullPath}`);
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      return `File: ${path.basename(fullPath)}\nSize: ${stats.size} bytes\nLines: ${content.split('\n').length}\n---\n${content.slice(0, 6000)}`;
    }

    if (name === 'run_powershell' || name === 'run-powershell') {
      const cmd = params.command;
      if (!cmd) throw new Error('No command provided');
      const b64 = Buffer.from(cmd, 'utf16le').toString('base64');
      const { stdout, stderr } = await execAsync(`powershell -EncodedCommand ${b64}`, { timeout: 30000 });
      if (stderr && !stdout) throw new Error(stderr);
      return (stdout || stderr || 'Command completed with no output.').slice(0, 4000);
    }

    if (name === 'run_command' || name === 'run-command' || name === 'execute-command') {
      const cmd = params.command;
      if (!cmd) throw new Error('No command provided');
      const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
      return (stdout || stderr || 'Command completed with no output.').slice(0, 4000);
    }

    if (name === 'open_app' || name === 'open-app') {
      const target = params.url || params.app;
      if (!target) throw new Error('No app or URL provided');
      await shell.openExternal(target);
      return `Opened: ${target}`;
    }

    if (name === 'show-item') {
      shell.showItemInFolder(params.path);
      return `Revealed: ${params.path}`;
    }

    return `Unknown tool: ${name}`;
  }
}
