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

  constructor(sharedStore: any, aiService: any) {
    this.store = sharedStore || new Store({ name: 'wide-research', atomically: false, watch: false });
    this.aiService = aiService;
  }

  setWindow(win: any) {
    this.win = win;
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
    this.emit('wide-research:run', run);
    return run;
  }

  private async executeWorker(run: WideResearchRun, worker: ResearchWorker) {
    worker.status = 'running';
    this.updateWorker(run.id, worker);
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
    } catch (error: any) {
      worker.status = 'failed';
      worker.error = error?.message || 'Worker failed.';
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
