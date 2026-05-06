import Store from 'electron-store';

type ResearchWorker = {
  id: string;
  item: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  result?: string;
  error?: string;
};

type WideResearchRun = {
  id: string;
  brief: string;
  status: 'running' | 'done' | 'failed';
  workers: ResearchWorker[];
  synthesis?: string;
  createdAt: number;
  completedAt?: number;
};

export class WideResearchService {
  private store: any;
  private aiService: any;
  private win: any = null;
  private eventBus: any = null;

  constructor(sharedStore: any, aiService: any) {
    this.store = sharedStore || new Store({ name: 'wide-research', atomically: false, watch: false });
    this.aiService = aiService;
  }

  setWindow(win: any) {
    this.win = win;
  }

  setEventBus(eventBus: any) {
    this.eventBus = eventBus;
  }

  getRuns(): WideResearchRun[] {
    return this.store.get('wideResearchRuns', []) as WideResearchRun[];
  }

  async startRun(brief: string, items?: string[]) {
    const targets = this.normalizeItems(brief, items);
    const run: WideResearchRun = {
      id: Math.random().toString(36).slice(2),
      brief,
      status: 'running',
      workers: targets.map(item => ({
        id: Math.random().toString(36).slice(2),
        item,
        status: 'queued'
      })),
      createdAt: Date.now()
    };
    this.saveRun(run);
    this.emit('wide-research:run', run);
    this.writeBlackboard(run.id, 'system', 'Wide Research run started.', { brief, workerCount: run.workers.length });
    this.executeRun(run.id).catch(error => {
      const failed = { ...this.getRun(run.id), status: 'failed' as const, synthesis: error.message, completedAt: Date.now() };
      this.saveRun(failed as WideResearchRun);
      this.emit('wide-research:run', failed);
    });
    return run;
  }

  private async executeRun(runId: string) {
    let run = this.getRun(runId);
    if (!run) throw new Error('Wide Research run not found.');

    this.eventBus?.emit('plan.updated', 'wide-research', {
      runId,
      steps: run.workers.map(worker => `Research worker: ${worker.item}`)
    }, runId);

    const workerResults = await Promise.all(run.workers.map(worker => this.executeWorker(run!, worker)));
    run = this.getRun(runId)!;
    run.workers = workerResults;

    const findings = workerResults
      .map(worker => `## ${worker.item}\n${worker.result || worker.error || 'No result.'}`)
      .join('\n\n');

    const synthesisResponse = await this.aiService.chatWithBestAvailable('', [
      {
        role: 'system',
        content: 'You are Hermes ME Wide Research synthesizer. Produce a concise research brief with key findings, conflicts, gaps, and recommended next actions. Be explicit when sources are local/model-derived rather than browser-verified.'
      },
      {
        role: 'user',
        content: `Original brief:\n${run.brief}\n\nWorker findings:\n${findings}`
      }
    ]);

    run.status = 'done';
    run.synthesis = synthesisResponse?.message?.content || findings;
    run.completedAt = Date.now();
    this.saveRun(run);
    this.writeBlackboard(run.id, 'synthesizer', 'Wide Research synthesis completed.', {
      synthesisPreview: (run.synthesis || '').slice(0, 1200)
    });
    this.emit('wide-research:run', run);
    return run;
  }

  private async executeWorker(run: WideResearchRun, worker: ResearchWorker) {
    worker.status = 'running';
    this.updateWorker(run.id, worker);
    this.writeBlackboard(run.id, worker.id, `Worker started: ${worker.item}`, { item: worker.item });
    try {
      const response = await this.aiService.chatWithBestAvailable('', [
        {
          role: 'system',
          content: 'You are one worker in a parallel Wide Research team. Analyze only your assigned item. Return structured bullets: relevant facts, assumptions, risks, and what should be verified with live web/browser access if needed.'
        },
        {
          role: 'user',
          content: `Research brief:\n${run.brief}\n\nAssigned item:\n${worker.item}`
        }
      ]);
      worker.status = 'done';
      worker.result = response?.message?.content || 'No result returned.';
      this.writeBlackboard(run.id, worker.id, `Worker completed: ${worker.item}`, {
        item: worker.item,
        resultPreview: (worker.result || '').slice(0, 1200)
      });
    } catch (error: any) {
      worker.status = 'failed';
      worker.error = error?.message || 'Worker failed.';
      this.writeBlackboard(run.id, worker.id, `Worker failed: ${worker.item}`, {
        item: worker.item,
        error: worker.error
      });
    }
    this.updateWorker(run.id, worker);
    return worker;
  }

  private updateWorker(runId: string, worker: ResearchWorker) {
    const run = this.getRun(runId);
    if (!run) return;
    run.workers = run.workers.map(item => item.id === worker.id ? worker : item);
    this.saveRun(run);
    this.emit('wide-research:run', run);
  }

  private getRun(id: string) {
    return this.getRuns().find(run => run.id === id);
  }

  private saveRun(run: WideResearchRun) {
    const runs = this.getRuns();
    const next = runs.some(item => item.id === run.id)
      ? runs.map(item => item.id === run.id ? run : item)
      : [run, ...runs];
    this.store.set('wideResearchRuns', next.slice(0, 50));
  }

  getBlackboard(runId?: string) {
    const board = this.store.get('wideResearchBlackboard', []) as any[];
    const items = Array.isArray(board) ? board : [];
    return runId ? items.filter(item => item.runId === runId) : items.slice(0, 200);
  }

  private writeBlackboard(runId: string, actor: string, message: string, payload: any = {}) {
    const entry = {
      id: `bb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      runId,
      actor,
      message,
      payload,
      createdAt: new Date().toISOString()
    };
    const board = [entry, ...this.getBlackboard()].slice(0, 500);
    this.store.set('wideResearchBlackboard', board);
    this.eventBus?.emit('agent.blackboard', 'wide-research', entry, runId);
    return entry;
  }

  private normalizeItems(brief: string, items?: string[]) {
    const provided = (items || []).map(item => item.trim()).filter(Boolean);
    if (provided.length) return provided.slice(0, 12);

    const lines = brief
      .split(/\r?\n|,/)
      .map(line => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(line => line.length > 4);

    if (lines.length >= 2) return lines.slice(0, 12);
    return [
      'Market and context',
      'Competitors or alternatives',
      'User/customer needs',
      'Risks and constraints',
      'Recommended next actions'
    ];
  }

  private emit(channel: string, payload: any) {
    this.win?.webContents.send(channel, payload);
  }
}
