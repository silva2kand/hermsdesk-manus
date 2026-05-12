import electron from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const { app, nativeImage, BrowserWindow } = electron;
type BrowserWindowType = InstanceType<typeof BrowserWindow>;

export type BrowserOperatorEvent = {
  id: string;
  type: 'open' | 'navigate' | 'click' | 'type' | 'press' | 'scroll' | 'read' | 'screenshot' | 'vision' | 'ui' | 'error';
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

export type BrowserUiElement = {
  id: string;
  role: string;
  text: string;
  hint: string;
  selector: string;
  tag: string;
  href?: string;
  value?: string;
  checked?: boolean;
  visible: boolean;
  location: { x: number; y: number; width: number; height: number };
  score?: number;
};

type BrowserUiScan = {
  ok: true;
  title: string;
  url: string;
  viewport: { width: number; height: number };
  elements: BrowserUiElement[];
};

const MAX_EVENTS = 100;
const MAX_SESSION_ACTIONS = 80;
const MAX_SESSION_NAVIGATIONS = 12;
const MAX_SCROLL_AMOUNT = 2000;
const PAGE_LOAD_TIMEOUT_MS = 20000;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class BrowserOperatorService {
  private operatorWindow: BrowserWindowType | null = null;
  private operatorWindows: Map<string, BrowserWindowType> = new Map();
  private stopRequested = false;
  private appWindow: BrowserWindowType | null = null;
  private screenshotDir: string;
  private eventBus: any = null;
  private sessionActionCounts: Map<string, number> = new Map();
  private sessionNavigationCounts: Map<string, number> = new Map();

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

  private assertSessionBudget(sessionId = 'main', action: 'action' | 'navigation' = 'action') {
    const actionCount = (this.sessionActionCounts.get(sessionId) || 0) + 1;
    this.sessionActionCounts.set(sessionId, actionCount);
    if (actionCount > MAX_SESSION_ACTIONS) {
      this.push({ type: 'error', status: 'error', detail: `Browser session action cap reached (${MAX_SESSION_ACTIONS}).`, sessionId });
      throw new Error(`Browser session action cap reached (${MAX_SESSION_ACTIONS}).`);
    }
    if (action === 'navigation') {
      const navigationCount = (this.sessionNavigationCounts.get(sessionId) || 0) + 1;
      this.sessionNavigationCounts.set(sessionId, navigationCount);
      if (navigationCount > MAX_SESSION_NAVIGATIONS) {
        this.push({ type: 'error', status: 'error', detail: `Browser session page/depth cap reached (${MAX_SESSION_NAVIGATIONS}).`, sessionId });
        throw new Error(`Browser session page/depth cap reached (${MAX_SESSION_NAVIGATIONS}).`);
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private isRiskyActionText(value: string) {
    return /(pay|purchase|order|submit|checkout|buy|confirm|book|sign|password|card|bank|sort code|cvv|security code)/i.test(value || '');
  }

  private scoreUiElement(element: BrowserUiElement, query: string, role?: string) {
    const needle = String(query || '').trim().toLowerCase();
    const wantedRole = String(role || '').trim().toLowerCase();
    const text = `${element.text || ''} ${element.hint || ''} ${element.value || ''}`.trim().toLowerCase();
    let score = 0;
    if (wantedRole && element.role.toLowerCase() === wantedRole) score += 35;
    if (wantedRole && element.role.toLowerCase().includes(wantedRole)) score += 18;
    if (!needle) score += 1;
    if (needle && text === needle) score += 110;
    if (needle && text.includes(needle)) score += 75;
    if (needle && needle.includes(text) && text.length > 2) score += 45;
    if (needle) {
      const tokens = needle.split(/\s+/).filter(token => token.length > 1);
      for (const token of tokens) {
        if (text.includes(token)) score += 12;
      }
    }
    if (element.visible) score += 5;
    if (element.role === 'button' || element.role === 'link' || element.role === 'input') score += 4;
    if (element.location.width > 0 && element.location.height > 0) score += 3;
    return score;
  }

  private getLatestUiElements(sessionId: string) {
    const saved = this.store.get(`browserUiScan.${sessionId}`, null) as BrowserUiScan | null;
    return saved?.elements || [];
  }

  private async clickAt(win: BrowserWindowType, x: number, y: number) {
    win.webContents.sendInputEvent({ type: 'mouseMove', x, y });
    await wait(40);
    win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
    await wait(40);
    win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
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
        partition: sessionId === 'whatsapp-bridge' ? 'persist:hermes-whatsapp-bridge' : undefined,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    if (sessionId === 'whatsapp-bridge') {
      created.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    }
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
    this.assertSessionBudget(sessionId, 'navigation');
    const url = this.normalizeTarget(target);
    let win: BrowserWindowType | null = null;
    try {
      win = this.ensureWindow(sessionId, label);
      await this.withTimeout(win.loadURL(url), PAGE_LOAD_TIMEOUT_MS, `Opening ${url}`);
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
      const message = error?.message || 'Could not open browser operator';
      const loadedUrl = win?.webContents?.getURL?.() || url;
      if (/timed out/i.test(message) && win) {
        win.show();
        await wait(700).catch(() => null);
        this.saveSession(sessionId, label, loadedUrl, true);
        return {
          ok: true,
          warning: message,
          url: loadedUrl,
          sessionId,
          sessions: this.getSessions(),
          event: this.push({ type: 'open', status: 'done', detail: `Opened with timeout warning: ${loadedUrl}`, url: loadedUrl, sessionId })
        };
      }
      return {
        ok: false,
        error: message,
        event: this.push({ type: 'error', status: 'error', detail: message || `Open failed: ${url}`, url, sessionId })
      };
    }
  }

  async navigate(target: string, sessionId = 'main') {
    return this.open(target, sessionId, sessionId === 'main' ? 'Main Computer' : sessionId);
  }

  async readPage(sessionId = 'main') {
    this.assertNotStopped(sessionId);
    this.assertSessionBudget(sessionId);
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

  async evaluateJavaScript(script: string, sessionId = 'main') {
    this.assertNotStopped(sessionId);
    this.assertSessionBudget(sessionId);
    if (sessionId === 'whatsapp-bridge') {
      return { ok: false, error: 'WhatsApp bridge JavaScript execution is disabled for stability.' };
    }
    const win = this.ensureWindow(sessionId);
    try {
      return await win.webContents.executeJavaScript(script);
    } catch (error: any) {
      this.push({ type: 'error', status: 'error', detail: `Browser script failed: ${error?.message || error}`, sessionId });
      return { ok: false, error: error?.message || String(error) };
    }
  }

  async scanUi(sessionId = 'main'): Promise<BrowserUiScan | { ok: false; error: string }> {
    this.assertNotStopped(sessionId);
    this.assertSessionBudget(sessionId);
    const win = this.ensureWindow(sessionId);
    try {
      await this.dismissCookieOverlays(sessionId).catch(() => null);
      const result = await win.webContents.executeJavaScript(`
        (() => {
          const cssEscape = (value) => {
            if (window.CSS && CSS.escape) return CSS.escape(String(value));
            return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
          };
          const visible = (el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
          };
          const textOf = (el) => ((el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || el.name || '') + '').replace(/\\s+/g, ' ').trim();
          const hintOf = (el) => ([el.getAttribute('aria-label'), el.getAttribute('title'), el.placeholder, el.name, el.id].filter(Boolean).join(' ') || '').replace(/\\s+/g, ' ').trim();
          const roleOf = (el) => {
            const explicit = (el.getAttribute('role') || '').toLowerCase();
            if (explicit) return explicit;
            const tag = el.tagName.toLowerCase();
            const type = (el.getAttribute('type') || '').toLowerCase();
            if (tag === 'button' || type === 'button' || type === 'submit' || type === 'reset') return 'button';
            if (tag === 'a') return 'link';
            if (tag === 'textarea') return 'textarea';
            if (tag === 'select') return 'select';
            if (tag === 'input' && type === 'checkbox') return 'checkbox';
            if (tag === 'input' && type === 'radio') return 'radio';
            if (tag === 'input') return 'input';
            if (tag === 'summary') return 'button';
            if (/^h[1-6]$/.test(tag)) return 'heading';
            if (el.isContentEditable) return 'input';
            return 'text';
          };
          const selectorOf = (el) => {
            const tag = el.tagName.toLowerCase();
            if (el.id) return '#' + cssEscape(el.id);
            const name = el.getAttribute('name');
            if (name) return tag + '[name="' + String(name).replace(/"/g, '\\"') + '"]';
            const aria = el.getAttribute('aria-label');
            if (aria) return tag + '[aria-label="' + String(aria).replace(/"/g, '\\"') + '"]';
            const href = el.getAttribute('href');
            if (tag === 'a' && href) return 'a[href="' + String(href).replace(/"/g, '\\"') + '"]';
            const parts = [];
            let node = el;
            while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body && parts.length < 5) {
              const currentTag = node.tagName.toLowerCase();
              const parent = node.parentElement;
              if (!parent) break;
              const siblings = Array.from(parent.children).filter(child => child.tagName === node.tagName);
              const index = siblings.indexOf(node) + 1;
              parts.unshift(siblings.length > 1 ? currentTag + ':nth-of-type(' + index + ')' : currentTag);
              node = parent;
            }
            return parts.join(' > ');
          };
          const nodes = Array.from(document.querySelectorAll('a[href],button,input,textarea,select,[role],[aria-label],[title],[tabindex],summary,label,[contenteditable="true"],h1,h2,h3'));
          const elements = [];
          const seen = new Set();
          for (const el of nodes) {
            if (!visible(el)) continue;
            const rect = el.getBoundingClientRect();
            const role = roleOf(el);
            const text = textOf(el).slice(0, 220);
            const hint = hintOf(el).slice(0, 220);
            const selector = selectorOf(el);
            const key = selector + '|' + role + '|' + text + '|' + Math.round(rect.x) + ',' + Math.round(rect.y);
            if (seen.has(key)) continue;
            seen.add(key);
            elements.push({
              id: 'ui-' + elements.length,
              role,
              text,
              hint,
              selector,
              tag: el.tagName.toLowerCase(),
              href: el.href || undefined,
              value: ('value' in el ? String(el.value || '').slice(0, 220) : undefined),
              checked: ('checked' in el ? Boolean(el.checked) : undefined),
              visible: true,
              location: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
            if (elements.length >= 180) break;
          }
          return {
            ok: true,
            title: document.title || '',
            url: location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            elements
          };
        })()
      `) as BrowserUiScan;
      this.store.set(`browserUiScan.${sessionId}`, result);
      this.push({ type: 'ui', status: 'done', detail: `UI scan found ${result.elements.length} visible controls`, url: result.url, sessionId });
      return result;
    } catch (error: any) {
      const message = error?.message || 'UI scan failed';
      this.push({ type: 'error', status: 'error', detail: message, sessionId });
      return { ok: false, error: message };
    }
  }

  async resolveUi(query: string, role?: string, sessionId = 'main') {
    const scan = await this.scanUi(sessionId);
    if (!scan.ok) return scan;
    const needle = String(query || '').trim();
    const matches = scan.elements
      .map(element => ({ ...element, score: this.scoreUiElement(element, needle, role) }))
      .filter(element => (element.score || 0) > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8);
    const best = matches[0] || null;
    this.push({
      type: best ? 'ui' : 'error',
      status: best ? 'done' : 'error',
      detail: best ? `Resolved UI target "${needle || role || 'visible element'}" to ${best.role}: ${best.text || best.hint || best.selector}` : `No UI target matched "${needle}"`,
      url: scan.url,
      sessionId
    });
    return { ok: Boolean(best), query: needle, role, best, matches, url: scan.url, title: scan.title };
  }

  async clickUi(target: string, sessionId = 'main', role?: string) {
    this.assertNotStopped(sessionId);
    this.assertSessionBudget(sessionId);
    const win = this.ensureWindow(sessionId);
    const raw = String(target || '').trim();
    if (!raw) return { ok: false, error: 'UI click needs an element id, text, or natural language target.' };
    let element: BrowserUiElement | null = null;
    if (/^ui-\d+$/i.test(raw)) {
      element = this.getLatestUiElements(sessionId).find(item => item.id === raw) || null;
      if (!element) {
        const scan = await this.scanUi(sessionId);
        if (scan.ok) element = scan.elements.find(item => item.id === raw) || null;
      }
    } else {
      const resolved = await this.resolveUi(raw, role, sessionId);
      element = resolved.ok ? resolved.best : null;
    }
    if (!element) return { ok: false, error: `UI target not found: ${raw}` };
    const label = `${element.text || ''} ${element.hint || ''} ${raw}`.trim();
    if (this.isRiskyActionText(label)) {
      throw new Error('Risky UI click blocked. Ask Silva/Syan for explicit approval before clicking pay/purchase/order/submit/checkout/sign/password/payment controls.');
    }
    const bySelector = element.selector ? await this.click(element.selector, sessionId).catch((error: any) => ({ ok: false, error: error?.message })) : { ok: false };
    if (bySelector.ok) return { ok: true, method: 'selector', element, result: bySelector };
    const x = Math.max(1, Math.round(element.location.x + element.location.width / 2));
    const y = Math.max(1, Math.round(element.location.y + element.location.height / 2));
    await this.clickAt(win, x, y);
    await wait(600);
    const url = win.webContents.getURL();
    this.push({ type: 'click', status: 'done', detail: `Clicked UI target ${element.id} at ${x},${y}: ${element.text || element.hint || element.selector}`, url, sessionId });
    return { ok: true, method: 'coordinates', element, x, y, url };
  }

  async typeUi(target: string, text: string, sessionId = 'main', role = 'input') {
    this.assertNotStopped(sessionId);
    this.assertSessionBudget(sessionId);
    const raw = String(target || '').trim();
    if (!raw) return { ok: false, error: 'UI type needs an element id, label, placeholder, or natural language target.' };
    let element: BrowserUiElement | null = null;
    if (/^ui-\d+$/i.test(raw)) {
      element = this.getLatestUiElements(sessionId).find(item => item.id === raw) || null;
      if (!element) {
        const scan = await this.scanUi(sessionId);
        if (scan.ok) element = scan.elements.find(item => item.id === raw) || null;
      }
    } else {
      const resolved = await this.resolveUi(raw, role, sessionId);
      element = resolved.ok ? resolved.best : null;
    }
    if (!element) return { ok: false, error: `UI input target not found: ${raw}` };
    const label = `${element.text || ''} ${element.hint || ''} ${raw}`.trim();
    if (this.isRiskyActionText(label)) {
      throw new Error('Risky UI typing blocked. Ask Silva/Syan for explicit approval before entering passwords, bank, card, payment, legal, or submission details.');
    }
    const bySelector = element.selector ? await this.type(element.selector, text, sessionId).catch((error: any) => ({ ok: false, error: error?.message })) : { ok: false };
    if (bySelector.ok) return { ok: true, method: 'selector', element, result: bySelector };
    const win = this.ensureWindow(sessionId);
    const x = Math.max(1, Math.round(element.location.x + element.location.width / 2));
    const y = Math.max(1, Math.round(element.location.y + element.location.height / 2));
    await this.clickAt(win, x, y);
    for (const char of String(text || '')) {
      win.webContents.sendInputEvent({ type: 'char', keyCode: char });
      await wait(12);
    }
    const url = win.webContents.getURL();
    this.push({ type: 'type', status: 'done', detail: `Typed into UI target ${element.id}: ${element.text || element.hint || element.selector}`, url, sessionId });
    return { ok: true, method: 'coordinates', element, url };
  }

  async click(selector: string, sessionId = 'main') {
    this.assertNotStopped(sessionId);
    this.assertSessionBudget(sessionId);
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
    this.assertSessionBudget(sessionId);
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
    this.assertSessionBudget(sessionId, 'navigation');
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
    this.assertSessionBudget(sessionId);
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
    this.assertSessionBudget(sessionId);
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
    this.assertSessionBudget(sessionId);
    const win = this.ensureWindow(sessionId);
    const rawDelta = Number(amount) || 700;
    const delta = Math.max(-MAX_SCROLL_AMOUNT, Math.min(MAX_SCROLL_AMOUNT, rawDelta));
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
