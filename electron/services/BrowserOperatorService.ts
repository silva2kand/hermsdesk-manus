import { BrowserWindow, app, nativeImage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export type BrowserOperatorEvent = {
  id: string;
  type: 'open' | 'navigate' | 'click' | 'type' | 'read' | 'screenshot' | 'error';
  status: 'done' | 'error';
  detail: string;
  url?: string;
  screenshotPath?: string;
  createdAt: string;
};

const MAX_EVENTS = 100;

export class BrowserOperatorService {
  private operatorWindow: BrowserWindow | null = null;
  private appWindow: BrowserWindow | null = null;
  private screenshotDir: string;
  private eventBus: any = null;

  constructor(private store: any) {
    this.screenshotDir = path.join(app.getPath('userData'), 'browser-operator');
    if (!fs.existsSync(this.screenshotDir)) fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  setWindow(win: BrowserWindow | null) {
    this.appWindow = win;
  }

  setEventBus(eventBus: any) {
    this.eventBus = eventBus;
  }

  getState() {
    return {
      online: Boolean(this.operatorWindow && !this.operatorWindow.isDestroyed()),
      url: this.operatorWindow && !this.operatorWindow.isDestroyed() ? this.operatorWindow.webContents.getURL() : '',
      events: this.getEvents()
    };
  }

  getEvents(): BrowserOperatorEvent[] {
    const events = this.store.get('browserOperatorEvents', []);
    return Array.isArray(events) ? events : [];
  }

  private push(event: Omit<BrowserOperatorEvent, 'id' | 'createdAt'>) {
    const next: BrowserOperatorEvent = {
      id: `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...event
    };
    const events = [next, ...this.getEvents()].slice(0, MAX_EVENTS);
    this.store.set('browserOperatorEvents', events);
    this.appWindow?.webContents.send('browser-operator:event', next);
    this.appWindow?.webContents.send('app:log', {
      type: next.status === 'error' ? 'error' : 'info',
      content: `Browser Operator: ${next.detail}`
    });
    this.eventBus?.emit(next.status === 'error' ? 'tool.result' : 'tool.called', 'browser-operator', {
      tool: `browser.${next.type}`,
      status: next.status,
      detail: next.detail,
      url: next.url,
      screenshotPath: next.screenshotPath
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

  private ensureWindow() {
    if (this.operatorWindow && !this.operatorWindow.isDestroyed()) return this.operatorWindow;
    this.operatorWindow = new BrowserWindow({
      width: 1180,
      height: 820,
      title: 'HermesDesk ME Browser Operator',
      show: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    this.operatorWindow.on('closed', () => {
      this.operatorWindow = null;
    });
    return this.operatorWindow;
  }

  async open(target?: string) {
    const url = this.normalizeTarget(target);
    try {
      const win = this.ensureWindow();
      await win.loadURL(url);
      win.show();
      return {
        ok: true,
        url,
        event: this.push({ type: 'open', status: 'done', detail: `Opened ${url}`, url })
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error?.message || 'Could not open browser operator',
        event: this.push({ type: 'error', status: 'error', detail: error?.message || `Open failed: ${url}`, url })
      };
    }
  }

  async navigate(target: string) {
    return this.open(target);
  }

  async readPage() {
    const win = this.ensureWindow();
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => ({
          title: document.title,
          url: location.href,
          text: document.body ? document.body.innerText.slice(0, 12000) : ''
        }))()
      `);
      this.push({ type: 'read', status: 'done', detail: `Read page: ${result.title || result.url}`, url: result.url });
      return { ok: true, ...result };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Could not read page' };
    }
  }

  async click(selector: string) {
    const win = this.ensureWindow();
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return { ok: false, error: 'Selector not found' };
          el.scrollIntoView({ block: 'center', inline: 'center' });
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return { ok: true, text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').slice(0, 200), url: location.href };
        })()
      `);
      this.push({ type: result.ok ? 'click' : 'error', status: result.ok ? 'done' : 'error', detail: result.ok ? `Clicked ${selector}` : `${selector}: ${result.error}`, url: result.url });
      return result;
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Click failed' };
    }
  }

  async type(selector: string, text: string) {
    const win = this.ensureWindow();
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return { ok: false, error: 'Selector not found' };
          el.focus();
          if ('value' in el) {
            el.value = ${JSON.stringify(text)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            el.textContent = ${JSON.stringify(text)};
          }
          return { ok: true, url: location.href };
        })()
      `);
      this.push({ type: result.ok ? 'type' : 'error', status: result.ok ? 'done' : 'error', detail: result.ok ? `Typed into ${selector}` : `${selector}: ${result.error}`, url: result.url });
      return result;
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Type failed' };
    }
  }

  async screenshot() {
    const win = this.ensureWindow();
    try {
      const image = await win.webContents.capturePage();
      const filePath = path.join(this.screenshotDir, `browser-${Date.now()}.png`);
      fs.writeFileSync(filePath, nativeImage.createFromBuffer(image.toPNG()).toPNG());
      return {
        ok: true,
        path: filePath,
        event: this.push({ type: 'screenshot', status: 'done', detail: `Saved screenshot ${filePath}`, url: win.webContents.getURL(), screenshotPath: filePath })
      };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Screenshot failed' };
    }
  }
}
