import type { BrowserWindow } from 'electron';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electron = ((globalThis as any).__electronModule || require('electron')) as typeof import('electron');
const { shell } = electron;

export type AutomationEvent = {
  id: string;
  type: 'browser' | 'research' | 'computer';
  title: string;
  detail: string;
  status: 'queued' | 'running' | 'done' | 'error';
  url?: string;
  createdAt: string;
};

const MAX_EVENTS = 100;

export class AutomationService {
  private win: BrowserWindow | null = null;
  private eventBus: any = null;

  constructor(private store: any) {}

  setWindow(win: BrowserWindow | null) {
    this.win = win;
  }

  setEventBus(eventBus: any) {
    this.eventBus = eventBus;
  }

  getEvents(): AutomationEvent[] {
    const events = this.store.get('automationEvents', []);
    return Array.isArray(events) ? events : [];
  }

  private saveEvents(events: AutomationEvent[]) {
    this.store.set('automationEvents', events.slice(0, MAX_EVENTS));
  }

  private push(event: Omit<AutomationEvent, 'id' | 'createdAt'>) {
    const next: AutomationEvent = {
      id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...event
    };
    const events = [next, ...this.getEvents()].slice(0, MAX_EVENTS);
    this.saveEvents(events);
    this.win?.webContents.send('automation:event', next);
    this.win?.webContents.send('app:log', {
      type: next.status === 'error' ? 'error' : 'info',
      content: `${next.title}: ${next.detail}`
    });
    this.eventBus?.emit(next.type === 'research' ? 'search.query' : 'tool.called', 'automation', {
      title: next.title,
      detail: next.detail,
      status: next.status,
      url: next.url
    }, next.id);
    return next;
  }

  private normalizeTarget(target?: string) {
    const raw = (target || '').trim();
    if (!raw) return 'https://www.google.com/';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
  }

  async openBrowser(target?: string) {
    const url = this.normalizeTarget(target);
    this.push({
      type: 'browser',
      title: 'Opening browser',
      detail: url,
      status: 'running',
      url
    });

    try {
      await shell.openExternal(url);
      return {
        ok: true,
        url,
        event: this.push({
          type: 'browser',
          title: 'Browser opened',
          detail: url,
          status: 'done',
          url
        })
      };
    } catch (error: any) {
      return {
        ok: false,
        url,
        error: error?.message || 'Browser open failed',
        event: this.push({
          type: 'browser',
          title: 'Browser open failed',
          detail: error?.message || url,
          status: 'error',
          url
        })
      };
    }
  }

  async researchWeb(query: string) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return { ok: false, error: 'Research query is empty' };
    const url = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;
    this.push({
      type: 'research',
      title: 'Web research queued',
      detail: cleanQuery,
      status: 'queued',
      url
    });
    const opened = await this.openBrowser(url);
    this.push({
      type: 'research',
      title: opened.ok ? 'Web research opened' : 'Web research failed',
      detail: cleanQuery,
      status: opened.ok ? 'done' : 'error',
      url
    });
    return { ...opened, query: cleanQuery };
  }

  recordComputerAction(title: string, detail: string) {
    return this.push({
      type: 'computer',
      title,
      detail,
      status: 'done'
    });
  }
}
