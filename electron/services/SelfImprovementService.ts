import Store from 'electron-store';

type Weakness = {
  id: string;
  severity: 'info' | 'medium' | 'high';
  area: string;
  title: string;
  detail: string;
  proposal: string;
};

type DoctorRun = {
  id: string;
  reason: string;
  startedAt: string;
  weaknesses: Weakness[];
  checks: Record<string, any>;
};

export class SelfImprovementService {
  private timer: NodeJS.Timeout | null = null;
  private win: any = null;

  constructor(
    private store: any = new Store({ name: 'self-improvement', atomically: false, watch: false }),
    private deps: {
      aiService?: any;
      emailIndexService?: any;
      workspaceService?: any;
      eventBus?: any;
      skillsEngine?: any;
      tinyFish?: any;
      whatsAppChannelService?: any;
      browserOperator?: any;
      providerService?: any;
    } = {}
  ) {}

  setWindow(win: any) {
    this.win = win;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.runAudit('Hourly self-improvement check').catch(() => null), 60 * 60 * 1000);
    setTimeout(() => this.runAudit('Startup self-improvement check').catch(() => null), 2 * 60 * 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getState() {
    return {
      lastRun: this.store.get('selfImprovement.lastRun', null),
      proposals: this.store.get('selfImprovement.proposals', []),
      enabled: this.store.get('selfImprovement.enabled', true)
    };
  }

  async runAudit(reason = 'Manual self-improvement check') {
    if (this.store.get('selfImprovement.enabled', true) === false) {
      return { ok: false, error: 'Self-improvement doctor is disabled.' };
    }

    const checks = await this.collectChecks();
    const weaknesses = this.detectWeaknesses(checks);
    const run: DoctorRun = {
      id: `doctor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reason,
      startedAt: new Date().toISOString(),
      weaknesses,
      checks
    };

    this.store.set('selfImprovement.lastRun', run);
    this.saveProposals(weaknesses);
    this.emit(run);
    return { ok: true, run };
  }

  private async collectChecks() {
    const settle = async (label: string, task: () => Promise<any>) => {
      const startedAt = Date.now();
      try {
        return { ok: true, durationMs: Date.now() - startedAt, value: await task() };
      } catch (error: any) {
        return { ok: false, durationMs: Date.now() - startedAt, error: error?.message || String(error) };
      }
    };

    const [
      engines,
      jan,
      emailStats,
      emailMemory,
      events,
      tinyFish,
      whatsapp,
      browser,
      apiKeys,
      pendingActions
    ] = await Promise.all([
      settle('engines', () => this.deps.aiService?.getFullEngineStatus?.()),
      settle('jan', () => this.deps.aiService?.getJanEngineStatus?.()),
      settle('emailStats', async () => this.deps.emailIndexService?.getGlobalStats?.()),
      settle('emailMemory', async () => this.deps.workspaceService?.getEmailIntelligenceSummary?.()),
      settle('events', async () => this.deps.eventBus?.getEvents?.(200) || []),
      settle('tinyFish', async () => this.deps.tinyFish?.getApiStatus?.()),
      settle('whatsapp', () => this.deps.whatsAppChannelService?.getStatus?.()),
      settle('browser', async () => this.deps.browserOperator?.getState?.()),
      settle('apiKeys', () => this.deps.providerService?.getAPIKeys?.()),
      settle('pendingActions', async () => this.deps.skillsEngine?.getPendingActions?.() || [])
    ]);

    return { engines, jan, emailStats, emailMemory, events, tinyFish, whatsapp, browser, apiKeys, pendingActions };
  }

  private detectWeaknesses(checks: Record<string, any>): Weakness[] {
    const weaknesses: Weakness[] = [];
    const add = (weakness: Weakness) => weaknesses.push(weakness);

    const janValue = checks.jan?.value || {};
    if (!janValue.apiOnline) {
      add({
        id: 'jan-offline',
        severity: 'high',
        area: 'Local AI',
        title: 'Built-in Jan is not serving',
        detail: janValue.installed ? 'Runtime is present but the OpenAI-compatible Jan API is not answering.' : 'Bundled Jan runtime was not found.',
        proposal: 'Start the smallest verified GGUF model first, verify /v1/models and /v1/chat/completions, then save that model as the default local route.'
      });
    }

    const emailStats = checks.emailStats?.value || {};
    const emailMemory = checks.emailMemory?.value?.mailboxMemory || checks.emailMemory?.value?.memory || {};
    if (!emailStats.totalIndexed || emailStats.totalIndexed < 1000) {
      add({
        id: 'mail-index-low',
        severity: 'high',
        area: 'Mail Memory',
        title: 'Mailbox memory is not fully built',
        detail: `Only ${emailStats.totalIndexed || 0} emails are indexed.`,
        proposal: 'Run Classic Outlook incremental indexing until complete, then keep 10-minute lightweight refresh enabled.'
      });
    }
    if (emailStats.totalIndexed && emailMemory.totalIndexed && Math.abs(emailStats.totalIndexed - emailMemory.totalIndexed) > 1000) {
      add({
        id: 'mail-memory-drift',
        severity: 'medium',
        area: 'Mail Memory',
        title: 'Mailbox index and memory summary drift',
        detail: `Index has ${emailStats.totalIndexed}; memory summary reports ${emailMemory.totalIndexed}.`,
        proposal: 'Rebuild the compact mailbox memory summary from the persisted email index so chat answers use the latest evidence.'
      });
    }
    if (emailMemory.totalIndexed >= 1000) {
      const renewalCount = Number(emailMemory.insuranceRenewals?.length || 0);
      const upcomingCount = Number(emailMemory.upcomingImportant?.length || 0);
      const supplierCount = Number(emailMemory.supplierUpdates?.length || 0);
      const staffInvoiceCount = Number(emailMemory.staffInvoices?.length || 0);
      if (!renewalCount) {
        add({
          id: 'renewal-memory-empty',
          severity: 'medium',
          area: 'Mail Memory',
          title: 'Renewal memory has no tracked items',
          detail: 'The mailbox is indexed, but no insurance/MOT/policy renewal items are exposed in the compact memory.',
          proposal: 'Run a renewal-focused memory refresh across indexed mail and route car, shop/business, pet, property, and life insurance items to Purchase Guardian with Accountant verification.'
        });
      }
      if (!upcomingCount) {
        add({
          id: 'upcoming-memory-empty',
          severity: 'medium',
          area: 'Mail Memory',
          title: 'Upcoming important view is empty',
          detail: 'Bills, deadlines, renewals, official notices, and unread high-value mail are not being surfaced together.',
          proposal: 'Populate the Upcoming Important memory bucket and expose review controls for important/not important, reply drafting, and WhatsApp notification drafts.'
        });
      }
      if (!supplierCount) {
        add({
          id: 'supplier-memory-empty',
          severity: 'info',
          area: 'Business Operations',
          title: 'Supplier updates are not visible yet',
          detail: 'No supplier/order/wholesale updates are currently highlighted from indexed memory.',
          proposal: 'Tune supplier patterns and route supplier updates to Purchase Guardian/Paperclips for shop stock, orders, and supplier follow-up.'
        });
      }
      if (!staffInvoiceCount) {
        add({
          id: 'staff-invoice-memory-empty',
          severity: 'info',
          area: 'Business Operations',
          title: 'Staff invoice memory is not populated yet',
          detail: 'No staff invoice/receipt/expense items are highlighted yet. WhatsApp staff group attachments may need manual-send/UI approval capture.',
          proposal: 'Route staff invoice evidence from WhatsApp drafts/attachments and indexed mail to Paperclips first, then Accountant for bookkeeping review.'
        });
      }
    }
    if (Number(emailMemory.unreadCount || 0) > 5000) {
      add({
        id: 'unread-backlog-large',
        severity: 'medium',
        area: 'Mail Operations',
        title: 'Unread mailbox backlog is very large',
        detail: `${emailMemory.unreadCount} unread messages are in memory. Important items may be hidden inside noise.`,
        proposal: 'Use Mythos to propose a safe triage plan: official/legal/accounting/renewal first, newsletters/promotions last, with no delete/move/send until approval.'
      });
    }

    const events = checks.events?.value || [];
    const errorEvents = events.filter((event: any) => {
      const payload = event?.payload || {};
      return event?.type === 'channel.error' || payload.level === 'error' || payload.error || /failed|error|unavailable|offline/i.test(payload.message || payload.detail || '');
    });
    if (errorEvents.length >= 5) {
      add({
        id: 'recent-errors',
        severity: 'medium',
        area: 'Reliability',
        title: 'Recent EventBus errors need review',
        detail: `${errorEvents.length} error-like events found in the latest EventBus window.`,
        proposal: 'Group errors by source, create one repair task per repeated failure, and verify fixes with the same route that failed.'
      });
    }

    const tinyFish = checks.tinyFish?.value || {};
    if (!tinyFish.configured) {
      add({
        id: 'tinyfish-missing',
        severity: 'info',
        area: 'Web Automation',
        title: 'TinyFish is not configured',
        detail: 'Deep external web agent automation needs a saved TinyFish API key.',
        proposal: 'Save and test a TinyFish key before assigning agents authenticated-style web research tasks.'
      });
    }

    const whatsapp = checks.whatsapp?.value || {};
    if (!whatsapp.ok || !whatsapp.alwaysActive) {
      add({
        id: 'whatsapp-not-active',
        severity: 'medium',
        area: 'WhatsApp',
        title: 'WhatsApp channel is not fully active',
        detail: 'The free personal WhatsApp route depends on Desktop/Web being open and manual send approval.',
        proposal: 'Run Keep Active, verify Desktop/Web availability, and keep draft/manual-send routing visible in Live Operations.'
      });
    }

    const pending = checks.pendingActions?.value || [];
    if (pending.length > 10) {
      add({
        id: 'approval-backlog',
        severity: 'medium',
        area: 'Approvals',
        title: 'Approval queue is backing up',
        detail: `${pending.length} pending tool/action approvals are waiting.`,
        proposal: 'Batch review low-risk read-only proposals, deny stale ones, and keep destructive/external actions separate.'
      });
    }

    if (!weaknesses.length) {
      add({
        id: 'steady-state',
        severity: 'info',
        area: 'System',
        title: 'No blocking weakness detected',
        detail: 'Core checks did not find a blocker in this pass.',
        proposal: 'Continue lightweight monitoring, weekly model/provider research, and memory-quality checks.'
      });
    }

    return weaknesses;
  }

  private saveProposals(weaknesses: Weakness[]) {
    const existing = this.store.get('selfImprovement.proposals', []) as any[];
    const now = Date.now();
    const next = [...weaknesses.map(weakness => ({
      ...weakness,
      status: 'proposed',
      createdAt: new Date(now).toISOString()
    })), ...existing].slice(0, 100);
    this.store.set('selfImprovement.proposals', next);

    for (const weakness of weaknesses.filter(item => item.id !== 'steady-state' && item.severity !== 'info').slice(0, 5)) {
      const recentDuplicate = existing.find(item => item.id === weakness.id && Date.now() - new Date(item.createdAt || 0).getTime() < 24 * 60 * 60 * 1000);
      if (recentDuplicate) continue;
      this.deps.skillsEngine?.proposeAction?.({
        name: 'self_improvement_proposal',
        type: 'os',
        params: weakness
      });
    }
  }

  private emit(run: DoctorRun) {
    const high = run.weaknesses.filter(item => item.severity === 'high').length;
    const medium = run.weaknesses.filter(item => item.severity === 'medium').length;
    const message = `Self-Improvement Doctor checked ${Object.keys(run.checks).length} routes: ${high} high, ${medium} medium, ${run.weaknesses.length} total findings.`;
    this.deps.eventBus?.emit?.('agent.thought', 'self-improvement-doctor', {
      taskId: run.id,
      agentId: 'general-agent',
      agentName: 'Self-Improvement Doctor',
      phase: 'REVISE',
      content: message,
      weaknesses: run.weaknesses
    }, run.id);
    this.win?.webContents.send('app:log', { type: high ? 'bug' : 'info', content: message });
    this.win?.webContents.send('self-improvement:run', run);
  }
}
