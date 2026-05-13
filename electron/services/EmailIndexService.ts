import Store from 'electron-store';
import electron from 'electron';
import fs from 'fs';
import path from 'path';

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

  getKnownEmailIds(accountId: string): Set<string> {
    const indexPath = this.getIndexPath(accountId);
    if (!fs.existsSync(indexPath)) return new Set();
    try {
      const emails = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as IndexedEmail[];
      return new Set((Array.isArray(emails) ? emails : []).map(email => email.id).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  async searchEmails(query: string, accountId?: string): Promise<IndexedEmail[]> {
    const cleanQuery = String(query || '').toLowerCase().trim();
    const genericTokens = new Set([
      'tell', 'about', 'what', 'when', 'that', 'this', 'from', 'have', 'need', 'know', 'please',
      'can', 'you', 'check', 'regarding', 'regaring', 'due', 'renewal', 'renew', 'remind',
      'email', 'emails', 'mail', 'last', 'latest', 'said', 'says', 'say', 'she', 'her', 'him', 'his',
      'they', 'them', 'their', 'message', 'messages', 'sent', 'received', 'reply', 'replied'
    ]);
    const tokens = Array.from(new Set(cleanQuery
      .replace(/[^a-z0-9@.\-£$]+/gi, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length > 2 && !genericTokens.has(token))));
    const nameTokens = tokens.filter(token => /^[a-z][a-z.'-]{2,}$/i.test(token) && !token.includes('@') && !/\d/.test(token));
    const looksLikePersonLookup = nameTokens.length > 0 && /(last|latest|email|emails|mail|message|messages|said|say|from|reply|replied|she|he|they)/i.test(cleanQuery);
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
            const identityHaystack = `${sender} ${subject}`;
            if (looksLikePersonLookup && nameTokens.length > 0) {
              const allNameTokensMatch = nameTokens.every(token => identityHaystack.includes(token));
              const mostNameTokensMatch = nameTokens.length > 1 && nameTokens.filter(token => identityHaystack.includes(token)).length >= Math.min(2, nameTokens.length);
              if (!allNameTokensMatch && !mostNameTokensMatch) continue;
            }
            let score = cleanQuery && haystack.includes(cleanQuery) ? 100 : 0;
            const propertyAddresses = [
              'langdale place',
              'langdale plc',
              'langdale plase',
              'landale place',
              '3 langdale',
              '5 langdale',
              'steamer street',
              'streamer street',
              'howlish view'
            ];
            const isPropertyQuery = propertyAddresses.some(addr => cleanQuery.includes(addr)) || /(lease|tenancy|landlord|rent|direct debit|ground rent|service charge|land registry|property|premises)/i.test(cleanQuery);

            if (isPropertyQuery) {
              const addressMatch = propertyAddresses.find(addr => haystack.includes(addr));
              if (addressMatch) score += 150;
              if (/(wood,?\s*ann|ann wood|awood@lancaster\.gov\.uk|lancaster\.gov\.uk|debtors@lancaster\.gov\.uk|fsuser@lancaster\.gov\.uk|slowton@lancaster\.gov\.uk)/i.test(haystack)) score += 120;
              if (/(lease|tenancy|landlord|rent|direct debit|ground rent|service charge|land registry|premises|langdale)/i.test(haystack)) score += 80;
              if (/(car|vehicle|motor|pet|van|bike|motorcycle|mcafee|google cloud|freepricecompare|newsletter|token dispatch|quora|jumpcloud)/i.test(haystack) && !/(langdale|lease|tenancy|landlord|rent|property|premises)/i.test(haystack)) score -= 120;
            }

            if (/\bcar\b|\bvehicle\b|\bmotor\b/i.test(query) && /insurance|renew|renewal|policy|premium/i.test(query)) {
              if (!/(car|vehicle|motor)/i.test(haystack) || !/(insurance|renew|renewal|policy|premium)/i.test(haystack)) continue;
            }
            for (const token of tokens) {
              if (sender.includes(token)) score += looksLikePersonLookup ? 40 : 10;
              if (subject.includes(token)) score += looksLikePersonLookup ? 18 : 8;
              if (category.includes(token)) score += 5;
              if (body.includes(token)) score += 2;
            }
            if (looksLikePersonLookup && nameTokens.every(token => sender.includes(token))) score += 120;
            if (looksLikePersonLookup && nameTokens.some(token => sender.includes(token))) score += 50;
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
