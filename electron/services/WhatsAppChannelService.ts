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
  { prefix: 'baba', agentId: 'general-agent', label: 'Baba Remote' },
  { prefix: 'property', agentId: 'purchase-guardian-agent', label: 'Property / Acquisition' },
  { prefix: 'funding', agentId: 'accountant-agent', label: 'Funding / Accountant' },
  { prefix: 'space', agentId: 'space-agent-full', label: 'Space Agent' },
  { prefix: 'openclaw', agentId: 'openclaw-full', label: 'OpenClaw' },
  { prefix: 'justice', agentId: 'justice-case-agent', label: 'Justice Case Builder' },
  { prefix: 'guardian', agentId: 'purchase-guardian-agent', label: 'Purchase Guardian' },
  { prefix: 'purchase', agentId: 'purchase-guardian-agent', label: 'Purchase Guardian' }
];

export class WhatsAppChannelService {
  private bridgeTimer: NodeJS.Timeout | null = null;
  private bridgeProcessing = false;
  private readonly bridgeSessionId = 'whatsapp-bridge';

  constructor(
    private store: any,
    private orchestrator: any,
    private integrationService: any,
    private eventBus: any,
    private browserOperator?: any
  ) {}

  getRoutes() {
    return ROUTES;
  }

  getSettings() {
    return this.store.get('whatsappChannelSettings', {
      alwaysActive: false,
      defaultAgentId: 'general-agent',
      manualSendOnly: true,
      localBridgeEnabled: false,
      localAutoReplyToOwner: false,
      ownerPhone: '',
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
      mode: settings.localBridgeEnabled ? 'free-local-whatsapp-web-bridge' : 'free-personal-manual-send',
      alwaysActive: Boolean(settings.alwaysActive),
      manualSendOnly: true,
      localBridgeEnabled: Boolean(settings.localBridgeEnabled),
      localBridgeRunning: Boolean(this.bridgeTimer),
      localAutoReplyToOwner: Boolean(settings.localAutoReplyToOwner),
      ownerPhoneSaved: Boolean(settings.ownerPhone),
      localBridgeLastState: this.store.get('whatsappLocalBridgeLastState', null),
      desktopRunning: processStatus.desktopRunning,
      webLikelyOpen: processStatus.browserRunning,
      routes: ROUTES,
      drafts: drafts.length,
      limitation: settings.localBridgeEnabled
        ? 'Local WhatsApp bridge is disabled for stability. Use manual routing/drafts until a safe connector is rebuilt.'
        : 'Manual draft/composer mode only. HermesDesk can prepare replies and open the composer when you ask, but it does not monitor WhatsApp or auto-send.'
    };
    this.eventBus?.emit('channel.status', 'whatsapp', status);
    return status;
  }

  async ensureActive() {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.alwaysActive) return this.getStatus();
    const status = await this.getStatus();
    this.eventBus?.emit('channel.status', 'whatsapp', {
      channel: 'whatsapp',
      status: 'manual-only',
      reason: 'Always-active WhatsApp opening is disabled for stability. Use Compose to open WhatsApp only when needed.'
    });
    return status;
  }

  async startLocalBridge(ownerPhone = '', win?: any) {
    if (this.bridgeTimer) {
      clearInterval(this.bridgeTimer);
      this.bridgeTimer = null;
    }
    this.saveSettings({
      localBridgeEnabled: false,
      localAutoReplyToOwner: false,
      ownerPhone: ownerPhone || this.getSettings().ownerPhone || ''
    });
    const status = await this.getStatus();
    this.eventBus?.emit('channel.status', 'whatsapp', {
      channel: 'whatsapp',
      status: 'local-bridge-disabled',
      reason: 'Disabled for stability. Use manual WhatsApp drafts/composer only.'
    });
    return { ok: false, status, error: 'Local WhatsApp Web bridge is disabled for stability. Manual WhatsApp drafts still work.' };
  }

  async stopLocalBridge() {
    if (this.bridgeTimer) {
      clearInterval(this.bridgeTimer);
      this.bridgeTimer = null;
    }
    this.saveSettings({ localBridgeEnabled: false });
    const status = await this.getStatus();
    this.eventBus?.emit('channel.status', 'whatsapp', {
      channel: 'whatsapp',
      status: 'local-bridge-stopped'
    });
    return { ok: true, status };
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

        const settings = this.getSettings();
        const shouldAutoReply = route?.from === 'WhatsApp Local Bridge' && settings.localBridgeEnabled && settings.localAutoReplyToOwner;
        if (shouldAutoReply && finished.length === tasks.length && !draft?.localBridgeReplySent) {
          this.sendLocalReply(message).then((result: any) => {
            this.updateDraft(draftId, {
              localBridgeReplySent: Boolean(result?.ok),
              localBridgeReplyError: result?.ok ? '' : result?.error || 'WhatsApp Web send failed'
            });
            this.eventBus?.emit('channel.message.out', 'whatsapp', {
              sessionId,
              channel: 'whatsapp',
              draftId,
              manualSendOnly: false,
              ownerAutoReplyOnly: true,
              text: message,
              result
            }, sessionId);
          }).catch((error: any) => {
            this.updateDraft(draftId, { localBridgeReplyError: error?.message || String(error) });
          });
        }
      }

      if (finished.length === tasks.length || checks >= 36) {
        clearInterval(timer);
      }
    }, 5000);
  }

  private async pollLocalBridge(win?: any) {
    if (this.bridgeProcessing || !this.browserOperator?.evaluateJavaScript) return;
    this.bridgeProcessing = true;
    try {
      const page: any = await this.withTimeout(this.browserOperator.evaluateJavaScript(`
(() => {
  const text = document.body?.innerText || '';
  const loggedIn = !/scan.*qr|link a device|use whatsapp on your computer|log into whatsapp|download whatsapp/i.test(text);
  const nodes = Array.from(document.querySelectorAll('[data-testid="msg-container"], div.message-in, div.message-out, [data-pre-plain-text], div.copyable-text, [role="row"]')).slice(-120);
  const messages = nodes.map((node, index) => {
    const raw = (node.innerText || '').replace(/\\u200e|\\u200f/g, '').trim();
    const lines = raw.split('\\n').map(line => line.trim()).filter(Boolean);
    const cleaned = lines
      .filter(line => !/^\\d{1,2}:\\d{2}(\\s?[AP]M)?$/i.test(line))
      .filter(line => !/^(sent|delivered|read)$/i.test(line))
      .join(' ')
      .replace(/\\s+/g, ' ')
      .trim();
    const cls = node.getAttribute('class') || '';
    const meta = node.getAttribute('data-pre-plain-text') || '';
    return {
      id: (meta || String(index)) + ':' + cleaned.slice(0, 180),
      text: cleaned,
      outgoing: /message-out|outgoing/i.test(cls),
      meta
    };
  }).filter(item => item.text && item.text.length > 2);
  return { ok: true, loggedIn, title: document.title, url: location.href, bodySample: text.slice(0, 500), messages };
})()
`, this.bridgeSessionId), 6500, 'WhatsApp Web scan timed out');

      if (!page?.ok) {
        this.store.set('whatsappLocalBridgeLastState', {
          checkedAt: new Date().toISOString(),
          loggedIn: false,
          title: 'WhatsApp bridge scan failed',
          url: '',
          messageCount: 0,
          commandCount: 0,
          lastMessages: [],
          bodySample: page?.error || 'No WhatsApp bridge scan result.'
        });
        return;
      }
      const now = Date.now();
      const commandPattern = /\b(baba|me|general|accountant|solicitor|property|funding|guardian|purchase|hermes|all|broadcast)\s*:/i;
      const extractCommand = (text: string) => {
        const match = String(text || '').match(/\b(baba|me|general|accountant|solicitor|property|funding|guardian|purchase|hermes|all|broadcast)\s*:\s*[\s\S]+$/i);
        return match?.[0]?.trim() || '';
      };
      const commandCount = (page.messages || []).filter((item: any) => Boolean(extractCommand(item.text))).length;
      const lastState = {
        checkedAt: new Date(now).toISOString(),
        loggedIn: Boolean(page.loggedIn),
        title: page.title,
        url: page.url,
        messageCount: (page.messages || []).length,
        commandCount,
        lastMessages: (page.messages || []).slice(-5).map((item: any) => item.text).filter(Boolean),
        bodySample: page.bodySample
      };
      this.store.set('whatsappLocalBridgeLastState', lastState);
      if (!page.loggedIn) {
        this.eventBus?.emit('channel.status', 'whatsapp', {
          channel: 'whatsapp',
          status: 'local-bridge-waiting-login',
          title: page.title,
          url: page.url
        });
        return;
      }

      const seen = this.store.get('whatsappLocalBridgeSeen', {}) || {};
      const loopPattern = /^(hermesdesk|mythos|agent)\s*:/i;
      const candidates = (page.messages || [])
        .map((item: any) => ({ ...item, commandText: extractCommand(item.text) }))
        .filter((item: any) => item.commandText)
        .filter((item: any) => !loopPattern.test(item.commandText))
        .slice(-3);

      for (const item of candidates) {
        const id = item.id || item.commandText || item.text;
        if (seen[id]) continue;
        seen[id] = now;
        await this.routeIncoming(item.commandText, 'WhatsApp Local Bridge', win);
      }

      const freshSeen = Object.fromEntries(Object.entries(seen).filter((entry: any) => now - Number(entry[1] || 0) < 1000 * 60 * 60 * 24));
      this.store.set('whatsappLocalBridgeSeen', freshSeen);
    } finally {
      this.bridgeProcessing = false;
    }
  }

  private async sendLocalReply(message: string) {
    if (!this.browserOperator?.evaluateJavaScript) return { ok: false, error: 'Browser Operator bridge is not available.' };
    const safeMessage = `HermesDesk: ${String(message || '').slice(0, 3500)}`;
    return this.withTimeout(this.browserOperator.evaluateJavaScript(`
(() => {
  const text = ${JSON.stringify(safeMessage)};
  const boxes = Array.from(document.querySelectorAll('footer [contenteditable="true"], [data-testid="conversation-compose-box-input"], div[contenteditable="true"][role="textbox"]'));
  const box = boxes[boxes.length - 1];
  if (!box) return { ok: false, error: 'WhatsApp message box not found. Open your own chat in WhatsApp Web.' };
  box.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
  box.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  const sendIcon = document.querySelector('span[data-icon="send"]');
  const sendButton = sendIcon?.closest('button') || document.querySelector('button[aria-label="Send"], button[aria-label="Send message"]');
  if (!sendButton) return { ok: false, error: 'WhatsApp send button not found.' };
  sendButton.click();
  return { ok: true };
})()
`, this.bridgeSessionId), 6500, 'WhatsApp Web send timed out');
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T | { ok: false; error: string }> {
    let timer: NodeJS.Timeout | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<{ ok: false; error: string }>(resolve => {
          timer = setTimeout(() => resolve({ ok: false, error: message }), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
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
