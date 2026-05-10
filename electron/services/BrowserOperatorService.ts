import electron from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const { app, nativeImage, BrowserWindow } = electron;
type BrowserWindowType = InstanceType<typeof BrowserWindow>;

export type BrowserOperatorEvent = {
  id: string;
  type: 'open' | 'navigate' | 'click' | 'type' | 'press' | 'scroll' | 'read' | 'screenshot' | 'vision' | 'error';
  status: 'done' | 'error';
  detail: string;
  url?: string;
  sessionId?: string;
  screenshotPath?: string;
  createdAt: string;
};

type BrowserSession = {
  id: string;
  label: string;
  url: string;
  online: boolean;
  thumbnailPath?: string;
  updatedAt: string;
};

const MAX_EVENTS = 100;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class BrowserOperatorService {
  private operatorWindow: BrowserWindowType | null = null;
  private operatorWindows: Map<string, BrowserWindowType> = new Map();
  private stopRequested = false;
  private appWindow: BrowserWindowType | null = null;
  private screenshotDir: string;
  private eventBus: any = null;

  constructor(private store: any) {
    this.screenshotDir = path.join(app.getPath('userData'), 'browser-operator');
    if (!fs.existsSync(this.screenshotDir)) fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  setWindow(win: BrowserWindowType | null) {
    this.appWindow = win;
  }

  setEventBus(eventBus: any) {
    this.eventBus = eventBus;
  }

  getState() {
    const sessions = this.getSessions();
    return {
      online: sessions.some(session => session.online),
      url: this.operatorWindow && !this.operatorWindow.isDestroyed() ? this.operatorWindow.webContents.getURL() : sessions[0]?.url || '',
      sessions,
      events: this.getEvents()
    };
  }

  getSessions(): BrowserSession[] {
    const saved = this.store.get('browserOperatorSessions', []) as BrowserSession[];
    const byId = new Map((Array.isArray(saved) ? saved : []).map(session => [session.id, session]));
    for (const [id, win] of this.operatorWindows.entries()) {
      if (win.isDestroyed()) {
        this.operatorWindows.delete(id);
        continue;
      }
      const previous = byId.get(id);
      byId.set(id, {
        id,
        label: previous?.label || id,
        url: win.webContents.getURL(),
        online: true,
        thumbnailPath: previous?.thumbnailPath,
        updatedAt: new Date().toISOString()
      });
    }
    const sessions = Array.from(byId.values()).map(session => ({
      ...session,
      online: Boolean(this.operatorWindows.get(session.id) && !this.operatorWindows.get(session.id)?.isDestroyed())
    })).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    this.store.set('browserOperatorSessions', sessions.slice(0, 12));
    return sessions.slice(0, 12);
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
      sessionId: next.sessionId,
      screenshotPath: next.screenshotPath
    }, next.id);
    return next;
  }

  private assertNotStopped(sessionId?: string) {
    if (this.stopRequested) {
      this.push({ type: 'error', status: 'error', detail: 'Browser Operator stopped by user.', sessionId });
      throw new Error('Browser Operator stopped by user.');
    }
  }

  stopAll(reason = 'Stopped by user') {
    this.stopRequested = true;
    for (const [id, win] of this.operatorWindows.entries()) {
      try {
        if (!win.isDestroyed()) win.close();
      } catch {}
      this.saveSession(id, id, '', false);
    }
    this.operatorWindows.clear();
    this.operatorWindow = null;
    const event = this.push({ type: 'error', status: 'done', detail: `STOP NOW: ${reason}` });
    return { ok: true, stopped: true, reason, event };
  }

  resume() {
    this.stopRequested = false;
    const event = this.push({ type: 'open', status: 'done', detail: 'Browser Operator resume enabled.' });
    return { ok: true, event };
  }

  private normalizeTarget(target?: string) {
    const raw = (target || '').trim();
    if (!raw) return 'https://www.google.com/';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
  }

  async dismissCookieOverlays(sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const labels = [
            'reject all', 'reject optional', 'reject non-essential', 'decline all',
            'continue without accepting', 'save choices', 'save preferences',
            'accept all', 'accept cookies', 'allow all', 'i agree', 'agree',
            'ok', 'got it', 'continue'
          ];
          const visible = (el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          };
          const textOf = (el) => ((el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '') + '').trim().toLowerCase();
          const candidates = Array.from(document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]')).filter(visible);
          for (const label of labels) {
            const el = candidates.find(item => textOf(item) === label || textOf(item).includes(label));
            if (el) {
              el.scrollIntoView({ block: 'center', inline: 'center' });
              el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              return { ok: true, label, text: textOf(el).slice(0, 120), url: location.href };
            }
          }
          const bodyText = document.body ? document.body.innerText.toLowerCase().slice(0, 3000) : '';
          return { ok: false, cookieWallLikely: /cookie|consent|privacy|gdpr/.test(bodyText), url: location.href };
        })()
      `);
      if (result.ok) {
        await wait(700);
        this.push({ type: 'click', status: 'done', detail: `Handled cookie/consent popup: ${result.text || result.label}`, url: result.url, sessionId });
      }
      return result;
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Cookie handler failed' };
    }
  }

  private ensureWindow(sessionId = 'main', label = 'Main Computer') {
    const existing = this.operatorWindows.get(sessionId);
    if (existing && !existing.isDestroyed()) {
      this.operatorWindow = existing;
      return existing;
    }
    const created = new BrowserWindow({
      width: 1180,
      height: 820,
      title: `HermesDesk ME Computer - ${label}`,
      show: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    created.on('closed', () => {
      this.operatorWindows.delete(sessionId);
      if (this.operatorWindow === created) this.operatorWindow = null;
      this.saveSession(sessionId, label, '', false);
    });
    this.operatorWindows.set(sessionId, created);
    this.operatorWindow = created;
    this.saveSession(sessionId, label, '', true);
    return created;
  }

  private saveSession(id: string, label: string, url: string, online: boolean, thumbnailPath?: string) {
    const sessions = this.getSessions().filter(session => session.id !== id);
    sessions.unshift({
      id,
      label,
      url,
      online,
      thumbnailPath,
      updatedAt: new Date().toISOString()
    });
    this.store.set('browserOperatorSessions', sessions.slice(0, 12));
  }

  async open(target?: string, sessionId = 'main', label = 'Main Computer') {
    this.stopRequested = false;
    const url = this.normalizeTarget(target);
    try {
      const win = this.ensureWindow(sessionId, label);
      await win.loadURL(url);
      win.show();
      await wait(700);
      await this.dismissCookieOverlays(sessionId).catch(() => null);
      this.saveSession(sessionId, label, url, true);
      return {
        ok: true,
        url,
        sessionId,
        sessions: this.getSessions(),
        event: this.push({ type: 'open', status: 'done', detail: `Opened ${url}`, url, sessionId })
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error?.message || 'Could not open browser operator',
        event: this.push({ type: 'error', status: 'error', detail: error?.message || `Open failed: ${url}`, url, sessionId })
      };
    }
  }

  async navigate(target: string, sessionId = 'main') {
    return this.open(target, sessionId, sessionId === 'main' ? 'Main Computer' : sessionId);
  }

  async readPage(sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => ({
          title: document.title,
          url: location.href,
          text: document.body ? document.body.innerText.slice(0, 12000) : '',
          links: Array.from(document.querySelectorAll('a[href]')).slice(0, 80).map((a) => ({
            text: (a.innerText || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim().slice(0, 180),
            href: a.href
          })).filter((item) => item.text || item.href)
        }))()
      `);
      this.saveSession(sessionId, sessionId, result.url, true);
      this.push({ type: 'read', status: 'done', detail: `Read page: ${result.title || result.url}`, url: result.url, sessionId });
      return { ok: true, ...result };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Could not read page' };
    }
  }

  async click(selector: string, sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
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
      this.push({ type: result.ok ? 'click' : 'error', status: result.ok ? 'done' : 'error', detail: result.ok ? `Clicked ${selector}` : `${selector}: ${result.error}`, url: result.url, sessionId });
      return result;
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Click failed' };
    }
  }

  async clickText(text: string, sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
    const needle = String(text || '').trim().toLowerCase();
    if (!needle) return { ok: false, error: 'No visible text provided' };
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const needle = ${JSON.stringify(needle)};
          const candidates = Array.from(document.querySelectorAll('a,button,[role="button"],input[type="button"],input[type="submit"]'));
          const score = (el) => {
            const text = ((el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '') + '').trim().toLowerCase();
            if (!text) return 0;
            if (text === needle) return 100;
            if (text.includes(needle)) return 70;
            if (needle.includes(text) && text.length > 2) return 45;
            return 0;
          };
          const el = candidates.map(el => ({ el, score: score(el) })).sort((a, b) => b.score - a.score)[0];
          if (!el || el.score <= 0) return { ok: false, error: 'Visible text not found', url: location.href };
          el.el.scrollIntoView({ block: 'center', inline: 'center' });
          el.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return { ok: true, matchedText: (el.el.innerText || el.el.value || el.el.getAttribute('aria-label') || '').trim().slice(0, 200), url: location.href };
        })()
      `);
      this.push({ type: result.ok ? 'click' : 'error', status: result.ok ? 'done' : 'error', detail: result.ok ? `Clicked visible text "${text}"` : `${text}: ${result.error}`, url: result.url, sessionId });
      return result;
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Click by text failed' };
    }
  }

  async clickHref(href: string, sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
    const target = String(href || '').trim();
    if (!/^https?:\/\//i.test(target)) return { ok: false, error: 'A real http/https href is required.' };
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const target = ${JSON.stringify(target)};
          const clean = (value) => String(value || '').replace(/[?#].*$/, '');
          const anchors = Array.from(document.querySelectorAll('a[href]'));
          const el = anchors.find((a) => a.href === target || clean(a.href) === clean(target) || a.href.startsWith(target));
          if (!el) return { ok: false, error: 'Link href not found on current page', url: location.href };
          el.scrollIntoView({ block: 'center', inline: 'center' });
          el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
          el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return { ok: true, matchedText: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 200), url: location.href, href: el.href };
        })()
      `);
      this.push({ type: result.ok ? 'click' : 'error', status: result.ok ? 'done' : 'error', detail: result.ok ? `Clicked link ${target}` : `${target}: ${result.error}`, url: result.url, sessionId });
      return result;
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Click link failed' };
    }
  }

  async type(selector: string, text: string, sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
    try {
      const focused = await win.webContents.executeJavaScript(`
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return { ok: false, error: 'Selector not found' };
          el.scrollIntoView({ block: 'center', inline: 'center' });
          el.focus();
          if ('value' in el) {
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            el.textContent = '';
          }
          return { ok: true, url: location.href };
        })()
      `);
      if (!focused.ok) {
        this.push({ type: 'error', status: 'error', detail: `${selector}: ${focused.error}`, url: focused.url, sessionId });
        return focused;
      }
      const visibleText = String(text || '');
      for (const char of visibleText) {
        this.assertNotStopped(sessionId);
        win.webContents.sendInputEvent({ type: 'char', keyCode: char });
        await wait(12);
      }
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return { ok: false, error: 'Selector not found after typing', url: location.href };
          const expected = ${JSON.stringify(text)};
          if ('value' in el && el.value !== expected) {
            el.value = expected;
          } else if (!('value' in el) && (el.textContent || '') !== expected) {
            el.textContent = expected;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true, value: ('value' in el ? el.value : el.textContent || '').slice(0, 300), url: location.href };
        })()
      `);
      this.push({ type: result.ok ? 'type' : 'error', status: result.ok ? 'done' : 'error', detail: result.ok ? `Typed into ${selector}` : `${selector}: ${result.error}`, url: result.url, sessionId });
      return result;
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Type failed' };
    }
  }

  async press(key: string, sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
    const keyCode = String(key || 'Enter');
    try {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
      await wait(40);
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
      await wait(500);
      const url = win.webContents.getURL();
      this.push({ type: 'press', status: 'done', detail: `Pressed ${keyCode}`, url, sessionId });
      return { ok: true, key: keyCode, url };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Key press failed' };
    }
  }

  async scroll(amount = 700, sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
    const delta = Number(amount) || 700;
    try {
      const result = await win.webContents.executeJavaScript(`
        (() => {
          window.scrollBy({ top: ${JSON.stringify(delta)}, left: 0, behavior: 'smooth' });
          return { ok: true, x: window.scrollX, y: window.scrollY, url: location.href };
        })()
      `);
      await wait(450);
      this.push({ type: 'scroll', status: 'done', detail: `Scrolled ${delta}px`, url: result.url, sessionId });
      return result;
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Scroll failed' };
    }
  }

  async searchVisible(query: string, sessionId = 'main', label = 'Browser Automation') {
    const text = String(query || '').trim();
    if (!text) return { ok: false, error: 'Search query is required.' };
    const opened = await this.open('https://www.google.com/', sessionId, label);
    if (!opened.ok) return opened;
    await wait(900);
    await this.dismissCookieOverlays(sessionId).catch(() => null);
    const typed = await this.type('textarea[name="q"], input[name="q"]', text, sessionId);
    if (!typed.ok) return typed;
    const pressed = await this.press('Enter', sessionId);
    await wait(1600);
    const page = await this.readPage(sessionId);
    return {
      ok: true,
      query: text,
      url: page.url || pressed.url,
      title: page.title,
      text: page.text,
      links: page.links,
      event: this.push({ type: 'navigate', status: 'done', detail: `Visible search completed for "${text}"`, url: page.url || pressed.url, sessionId })
    };
  }

  async screenshot(sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const win = this.ensureWindow(sessionId);
    try {
      const image = await win.webContents.capturePage();
      const filePath = path.join(this.screenshotDir, `browser-${sessionId}-${Date.now()}.png`);
      fs.writeFileSync(filePath, nativeImage.createFromBuffer(image.toPNG()).toPNG());
      this.saveSession(sessionId, sessionId, win.webContents.getURL(), true, filePath);
      return {
        ok: true,
        path: filePath,
        sessions: this.getSessions(),
        event: this.push({ type: 'screenshot', status: 'done', detail: `Saved screenshot ${filePath}`, url: win.webContents.getURL(), sessionId, screenshotPath: filePath })
      };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Screenshot failed' };
    }
  }

  async inspectScreen(sessionId = 'main') {
    this.assertNotStopped(sessionId);
    const shot = await this.screenshot(sessionId);
    if (!shot.ok) return shot;
    const page = await this.readPage(sessionId).catch((error: any) => ({ ok: false, error: error?.message }));
    const result = {
      ok: true,
      sessionId,
      screenshotPath: shot.path,
      url: page?.url || '',
      title: page?.title || '',
      visibleText: String(page?.text || '').slice(0, 6000),
      note: 'Real screenshot and DOM text captured. Vision-model interpretation requires a connected multimodal provider.'
    };
    this.push({ type: 'vision', status: 'done', detail: `Captured visual inspection frame for ${sessionId}`, url: result.url, sessionId, screenshotPath: shot.path });
    return result;
  }
}
