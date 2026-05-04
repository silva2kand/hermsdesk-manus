import { shell, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import Store from 'electron-store';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SkillAction {
  id: string;
  name: string;
  type: 'file' | 'script' | 'os';
  params: any;
  status: 'pending' | 'approved' | 'denied' | 'executed';
  timestamp: number;
}

export class SkillsEngineService {
  private store: any;
  private pendingActions: SkillAction[] = [];
  private defaultSkills = [
    'me-api',
    'skill-creator',
    'os-control',
    'file-explorer',
    'mythos-execution',
    'mythos-recovery',
    'mythos-pc-operator',
    'mythos-whatsapp-reply',
    'mythos-truthful-connectors'
  ];

  constructor(sharedStore?: any) {
    this.store = sharedStore || new Store({ name: 'skills-engine', atomically: false, watch: false });
  }

  getInstalledSkills() {
    const saved = this.store.get('installed_skills', this.defaultSkills) as string[];
    return Array.from(new Set([...this.defaultSkills, ...(Array.isArray(saved) ? saved : [])]));
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
      rules.push('Mythos WhatsApp Reply: draft professional, concise replies from user-provided message text; open the real WhatsApp composer; never claim background read/send access.');
    }
    if (installed.includes('mythos-truthful-connectors')) {
      rules.push('Mythos Connector Truth: distinguish enabled routes from authenticated connections. Say login/API key required when real private data access is not connected.');
    }

    return {
      installed,
      prompt: rules.join('\n')
    };
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
      
      // Log to audit trail
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

    // File operations
    if (name === 'write_file' || name === 'write-file') {
      const fullPath = path.resolve(params.path);
      const allowedDirs = [app.getPath('userData'), app.getPath('documents'), process.cwd()];
      if (!allowedDirs.some(dir => fullPath.startsWith(dir))) {
        throw new Error(`Access denied: Cannot write to ${fullPath}. Allowed: ${allowedDirs.join(', ')}`);
      }
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, params.content || '');
      return `Successfully wrote ${(params.content || '').length} bytes to ${fullPath}`;
    }

    if (name === 'read_file' || name === 'read-file') {
      const fullPath = path.resolve(params.path);
      if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${fullPath}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      return content.slice(0, 8000); // Cap at 8KB for LLM context
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

    // Script execution
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

    // OS operations
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
