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
    const cleanQuery = query.toLowerCase();
    const results: IndexedEmail[] = [];
    
    const accountIds = accountId ? [accountId] : Object.keys(this.store.get('accounts', {}));
    
    for (const id of accountIds) {
      const indexPath = this.getIndexPath(id);
      if (fs.existsSync(indexPath)) {
        try {
          const emails = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as IndexedEmail[];
          const matches = emails.filter(e => 
            e.subject.toLowerCase().includes(cleanQuery) ||
            e.sender.toLowerCase().includes(cleanQuery) ||
            e.senderEmail.toLowerCase().includes(cleanQuery) ||
            e.bodyPreview.toLowerCase().includes(cleanQuery) ||
            e.categoryLabel.toLowerCase().includes(cleanQuery)
          );
          results.push(...matches);
        } catch (e) {
          console.error(`Failed to read index for ${id}:`, e);
        }
      }
    }
    
    return results.sort((a, b) => 
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    ).slice(0, 50); // Limit to top 50 results
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
