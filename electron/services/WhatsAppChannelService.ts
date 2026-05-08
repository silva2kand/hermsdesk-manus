import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type Route = {
  prefix: string;
  agentId: string;
  label: string;
};

const ROUTES: Route[] = [
  { prefix: 'me', agentId: 'general-agent', label: 'General ME' },
  { prefix: 'general', agentId: 'general-agent', label: 'General ME' },
  { prefix: 'gent', agentId: 'hermes-full', label: 'GENT Workstation' },
  { prefix: 'hermes', agentId: 'hermes-full', label: 'Hermes Agent' },
  { prefix: 'paperclips', agentId: 'paperclip-full', label: 'Paperclips' },
  { prefix: 'paperclip', agentId: 'paperclip-full', label: 'Paperclips' },
  { prefix: 'solicitor', agentId: 'solicitor-agent', label: 'Solicitor Agent' },
  { prefix: 'accountant', agentId: 'accountant-agent', label: 'Accountant Agent' },
  { prefix: 'space', agentId: 'space-agent-full', label: 'Space Agent' },
  { prefix: 'openclaw', agentId: 'openclaw-full', label: 'OpenClaw' },
  { prefix: 'justice', agentId: 'justice-case-agent', label: 'Justice Case Builder' },
  { prefix: 'guardian', agentId: 'purchase-guardian-agent', label: 'Purchase Guardian' },
  { prefix: 'purchase', agentId: 'purchase-guardian-agent', label: 'Purchase Guardian' }
];

export class WhatsAppChannelService {
  constructor(
    private store: any,
    private orchestrator: any,
    private integrationService: any,
    private eventBus: any
  ) {}

  getRoutes() {
    return ROUTES;
  }

  getSettings() {
    return this.store.get('whatsappChannelSettings', {
      alwaysActive: true,
      defaultAgentId: 'general-agent',
      manualSendOnly: true,
      broadcastMode: 'multi-section',
      enabled: true
    });
  }

  saveSettings(settings: any) {
    const next = { ...this.getSettings(), ...(settings || {}), manualSendOnly: true };
    this.store.set('whatsappChannelSettings', next);
    this.eventBus?.emit('channel.status', 'whatsapp', {
      channel: 'whatsapp',
      status: next.enabled ? 'enabled' : 'disabled',
      settings: next
    });
    return next;
  }

  async getStatus() {
    const settings = this.getSettings();
    const processStatus = await this.getProcessStatus();
    const drafts = this.store.get('whatsAppDrafts', []) || [];
    const status = {
      ok: Boolean(settings.enabled),
      channel: 'whatsapp',
      mode: 'free-personal-manual-send',
      alwaysActive: Boolean(settings.alwaysActive),
      manualSendOnly: true,
      desktopRunning: processStatus.desktopRunning,
      webLikelyOpen: processStatus.browserRunning,
      routes: ROUTES,
      drafts: drafts.length,
      limitation: 'Uses your real WhatsApp Desktop/Web sessions. HermesDesk routes, drafts, audits, and opens both composer routes; automatic background read/send is not exposed by personal WhatsApp without UI automation approval.'
    };
    this.eventBus?.emit('channel.status', 'whatsapp', status);
    return status;
  }

  async ensureActive() {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.alwaysActive) return this.getStatus();
    await this.integrationService.openApp('whatsapp web').catch(() => null);
    await this.integrationService.openApp('whatsapp').catch(() => null);
    return this.getStatus();
  }

  resolveRoute(text: string, from = 'Silva') {
    const clean = String(text || '').trim();
    const prefixMatch = clean.match(/^\/?([a-z][a-z0-9-]{1,24})\s*:\s*([\s\S]+)$/i);
    const command = prefixMatch?.[1]?.toLowerCase();
    const body = prefixMatch?.[2]?.trim() || clean;
    const isBroadcast = command === 'all' || command === 'broadcast';
    const direct = ROUTES.find(route => route.prefix === command);
    const settings = this.getSettings();
    return {
      from,
      originalText: clean,
      body,
      command: command || '',
      broadcast: isBroadcast,
      agentId: isBroadcast ? '' : direct?.agentId || settings.defaultAgentId || 'hermes-full',
      routeLabel: isBroadcast ? 'All agents' : direct?.label || 'Default Agent'
    };
  }

  async routeIncoming(text: string, from = 'Silva', win?: any) {
    const route = this.resolveRoute(text, from);
    const sessionId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.eventBus?.emit('channel.message.in', 'whatsapp', {
      sessionId,
      channel: 'whatsapp',
      from,
      text,
      route
    }, sessionId);

    const targetAgents = route.broadcast
      ? Array.from(new Set(ROUTES.map(item => item.agentId)))
      : [route.agentId];

    const tasks = [];
    for (const agentId of targetAgents) {
      const task = await this.orchestrator.createTask(
        `WhatsApp channel message.
From: ${from}
Route: ${route.broadcast ? 'broadcast/all agents' : route.routeLabel}
Agent: ${agentId}
Message:
${route.body}

Rules: draft replies and actions only. Do not send WhatsApp messages, contact anyone, pay, submit, delete, or change external systems without Silva approval. Return a concise WhatsApp-ready response.`,
        agentId,
        win
      );
      tasks.push(task);
      this.eventBus?.emit('agent.step', 'whatsapp-router', {
        sessionId,
        channel: 'whatsapp',
        agentId,
        taskId: task?.id,
        status: 'dispatched'
      }, sessionId);
    }

    const label = route.broadcast ? 'WhatsApp broadcast reply' : `WhatsApp reply - ${route.routeLabel}`;
    const message = route.broadcast
      ? `Broadcast sent to ${tasks.length} agents. Review Live Operations for each response. I will not auto-send without approval.`
      : `${route.routeLabel} received the WhatsApp task. Review Live Operations, then approve/copy/open composer when ready.`;

    const draft = this.saveDraft({
      phone: '',
      label,
      message,
      status: 'drafted',
      route,
      taskIds: tasks.map((task: any) => task?.id).filter(Boolean)
    });

    this.eventBus?.emit('channel.message.out', 'whatsapp', {
      sessionId,
      channel: 'whatsapp',
      to: from,
      manualSendOnly: true,
      draftId: draft.id,
      text: message
    }, sessionId);

    this.monitorAgentRepliesForDraft(draft.id, tasks, route, sessionId);

    return { ok: true, sessionId, route, tasks, draft };
  }

  async composeDraft(draftId: string) {
    const drafts = this.store.get('whatsAppDrafts', []) || [];
    const draft = drafts.find((item: any) => item.id === draftId);
    if (!draft) return { ok: false, error: 'Draft not found.' };
    const result = await this.integrationService.composeWhatsAppMessage(draft.message, draft.phone);
    this.eventBus?.emit('channel.message.out', 'whatsapp', {
      channel: 'whatsapp',
      draftId,
      manualSendOnly: true,
      result
    });
    return result;
  }

  private saveDraft(draft: any) {
    const now = Date.now();
    const drafts = this.store.get('whatsAppDrafts', []) || [];
    const next = {
      id: draft.id || Math.random().toString(36).slice(2),
      phone: draft.phone || '',
      label: draft.label || 'WhatsApp routed draft',
      message: draft.message || '',
      status: draft.status || 'drafted',
      route: draft.route || null,
      taskIds: draft.taskIds || [],
      createdAt: now,
      updatedAt: now
    };
    this.store.set('whatsAppDrafts', [next, ...drafts].slice(0, 150));
    return next;
  }

  private updateDraft(draftId: string, updates: any) {
    const drafts = this.store.get('whatsAppDrafts', []) || [];
    const next = drafts.map((draft: any) => draft.id === draftId ? {
      ...draft,
      ...updates,
      updatedAt: Date.now()
    } : draft);
    this.store.set('whatsAppDrafts', next);
    return next.find((draft: any) => draft.id === draftId);
  }

  private monitorAgentRepliesForDraft(draftId: string, tasks: any[], route: any, sessionId: string) {
    let checks = 0;
    const timer = setInterval(() => {
      checks += 1;
      const finished = tasks.filter(task => ['done', 'failed', 'cancelled'].includes(task?.status));
      const replies = finished.map(task => {
        const final = [...(task.history || [])].reverse().find((item: any) => item.role === 'assistant')?.content;
        return `${route.broadcast ? `${task.assignedAgentId}:\n` : ''}${final || `Task ${task.status}. Review Live Operations for details.`}`;
      }).filter(Boolean);

      if (replies.length > 0) {
        const message = route.broadcast
          ? replies.join('\n\n---\n\n')
          : replies[0];
        const draft = this.updateDraft(draftId, {
          message,
          status: 'drafted',
          agentRepliesReady: replies.length,
          label: route.broadcast ? 'WhatsApp broadcast agent replies' : `WhatsApp reply - ${route.routeLabel}`
        });
        this.eventBus?.emit('channel.message.out', 'whatsapp', {
          sessionId,
          channel: 'whatsapp',
          draftId,
          manualSendOnly: true,
          text: message,
          draft,
          status: finished.length === tasks.length ? 'ready' : 'partial'
        }, sessionId);
      }

      if (finished.length === tasks.length || checks >= 36) {
        clearInterval(timer);
      }
    }, 5000);
  }

  private async getProcessStatus() {
    const script = `
$items = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match 'WhatsApp|msedge|chrome|brave|firefox' } | Select-Object ProcessName,Id
$items | ConvertTo-Json -Compress
`;
    try {
      const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script], { timeout: 10000, windowsHide: true });
      const parsed = stdout.trim() ? JSON.parse(stdout.trim()) : [];
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return {
        desktopRunning: list.some((item: any) => /whatsapp/i.test(item.ProcessName || '')),
        browserRunning: list.some((item: any) => /msedge|chrome|brave|firefox/i.test(item.ProcessName || '')),
        processes: list
      };
    } catch {
      return { desktopRunning: false, browserRunning: false, processes: [] };
    }
  }
}
