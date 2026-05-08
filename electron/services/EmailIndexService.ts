import Store from 'electron-store';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electron = ((globalThis as any).__electronModule || require('electron')) as typeof import('electron');
const { app } = electron;

export interface IndexedEmail {
  id: string;
  accountId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  receivedAt: string;
  unread: boolean;
  hasAttachments: boolean;
  bodyPreview: string;
  categoryId: string;
  categoryLabel: string;
  agentId: string;
  folderName: string;
}

export interface AccountSyncState {
  accountId: string;
  email: string;
  displayName: string;
  totalIndexed: number;
  lastSyncedAt: string;
  complete: boolean;
}

export class EmailIndexService {
  private indexDir: string;
  private store: any;

  constructor(sharedStore?: any) {
    this.store = sharedStore || new Store({ name: 'email-index-metadata', atomically: false, watch: false });
    this.indexDir = path.join(app.getPath('userData'), 'email-indexes');
    if (!fs.existsSync(this.indexDir)) {
      fs.mkdirSync(this.indexDir, { recursive: true });
    }
  }

  private getIndexPath(accountId: string) {
    return path.join(this.indexDir, `index-${accountId}.json`);
  }

  async saveEmails(accountId: string, emails: IndexedEmail[]) {
    const indexPath = this.getIndexPath(accountId);
    let existing: IndexedEmail[] = [];
    if (fs.existsSync(indexPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      } catch (e) {
        existing = [];
      }
    }

    // Merge by ID to avoid duplicates
    const emailMap = new Map(existing.map(e => [e.id, e]));
    emails.forEach(e => emailMap.set(e.id, e));
    
    const merged = Array.from(emailMap.values()).sort((a, b) => 
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );

    fs.writeFileSync(indexPath, JSON.stringify(merged, null, 2));
    
    // Update global metadata
    const accounts = this.store.get('accounts', {}) as Record<string, AccountSyncState>;
    if (!accounts[accountId]) {
      // Auto-register if missing
      this.registerAccount({
        accountId,
        email: accountId.replace(/^classic-/, ''),
        displayName: accountId.startsWith('classic-') ? `Classic: ${accountId.replace(/^classic-/, '')}` : accountId
      });
    }
    
    // Refresh accounts after possible registration
    const updatedAccounts = this.store.get('accounts', {}) as Record<string, AccountSyncState>;
    if (updatedAccounts[accountId]) {
      updatedAccounts[accountId].totalIndexed = merged.length;
      updatedAccounts[accountId].lastSyncedAt = new Date().toISOString();
      this.store.set('accounts', updatedAccounts);
    }
    
    return merged.length;
  }

  async searchEmails(query: string, accountId?: string): Promise<IndexedEmail[]> {
    const cleanQuery = String(query || '').toLowerCase().trim();
    const tokens = Array.from(new Set(cleanQuery
      .replace(/[^a-z0-9@.\-£$]+/gi, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length > 2 && !['tell', 'about', 'what', 'when', 'that', 'this', 'from', 'have', 'need', 'know', 'please'].includes(token))));
    const scored = new Map<string, { email: IndexedEmail, score: number }>();
    if (!cleanQuery && tokens.length === 0) return [];
    
    const accountIds = accountId ? [accountId] : Object.keys(this.store.get('accounts', {}));
    
    for (const id of accountIds) {
      const indexPath = this.getIndexPath(id);
      if (fs.existsSync(indexPath)) {
        try {
          const emails = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as IndexedEmail[];
          for (const e of emails) {
            const subject = String(e.subject || '').toLowerCase();
            const sender = `${e.sender || ''} ${e.senderEmail || ''}`.toLowerCase();
            const body = String(e.bodyPreview || '').toLowerCase();
            const category = String(e.categoryLabel || '').toLowerCase();
            const haystack = `${subject} ${sender} ${body} ${category}`;
            if (/\bcar\b|\bvehicle\b|\bmotor\b/i.test(query) && /insurance|renew|renewal|policy|premium/i.test(query)) {
              if (!/(car|vehicle|motor)/i.test(haystack) || !/(insurance|renew|renewal|policy|premium)/i.test(haystack)) continue;
            }
            let score = cleanQuery && haystack.includes(cleanQuery) ? 100 : 0;
            for (const token of tokens) {
              if (subject.includes(token)) score += 8;
              if (sender.includes(token)) score += 6;
              if (category.includes(token)) score += 5;
              if (body.includes(token)) score += 2;
            }
            if (/(renew|renewal|expires?|due|mot|insurance|premium|policy|vehicle|car)/i.test(query)) {
              if (/(renew|renewal|expires?|due|mot|insurance|premium|policy|vehicle|car)/i.test(`${e.subject || ''} ${e.sender || ''} ${e.bodyPreview || ''} ${e.categoryLabel || ''}`)) score += 10;
            }
            const receivedMs = new Date(e.receivedAt).getTime();
            if (Number.isFinite(receivedMs)) {
              const ageDays = (Date.now() - receivedMs) / 86400000;
              if (ageDays >= 0 && ageDays <= 30) score += 20;
              else if (ageDays <= 90) score += 16;
              else if (ageDays <= 365) score += 12;
              else if (ageDays <= 730) score += 6;
            }
            if (score > 0) {
              const key = e.id || `${id}:${e.receivedAt}:${e.subject}`;
              const existing = scored.get(key);
              if (!existing || score > existing.score) scored.set(key, { email: e, score });
            }
          }
        } catch (e) {
          console.error(`Failed to read index for ${id}:`, e);
        }
      }
    }
    
    return Array.from(scored.values())
      .sort((a, b) => b.score - a.score || new Date(b.email.receivedAt).getTime() - new Date(a.email.receivedAt).getTime())
      .map(item => item.email)
      .slice(0, 50);
  }

  getAccountMetadata(accountId: string): AccountSyncState | null {
    const accounts = this.store.get('accounts', {}) as Record<string, AccountSyncState>;
    return accounts[accountId] || null;
  }

  getAllAccounts(): AccountSyncState[] {
    const accounts = this.store.get('accounts', {}) as Record<string, AccountSyncState>;
    return Object.values(accounts);
  }

  registerAccount(metadata: Omit<AccountSyncState, 'totalIndexed' | 'lastSyncedAt' | 'complete'>) {
    const accounts = this.store.get('accounts', {}) as Record<string, AccountSyncState>;
    accounts[metadata.accountId] = {
      ...metadata,
      totalIndexed: accounts[metadata.accountId]?.totalIndexed || 0,
      lastSyncedAt: accounts[metadata.accountId]?.lastSyncedAt || '',
      complete: accounts[metadata.accountId]?.complete || false
    };
    this.store.set('accounts', accounts);
    return accounts[metadata.accountId];
  }

  getGlobalStats() {
    const accounts = this.getAllAccounts();
    const totalIndexed = accounts.reduce((sum, acc) => sum + (acc.totalIndexed || 0), 0);
    return {
      totalAccounts: accounts.length,
      totalIndexed,
      accounts: accounts.map(a => ({ email: a.email, count: a.totalIndexed }))
    };
  }
}
