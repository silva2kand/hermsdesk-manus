import Store from 'electron-store';
import axios from 'axios';
import { shell } from 'electron';

const DEFAULT_CLIENT_ID = 'a18c5868-9960-4962-b106-1c77a2d07327';
const DEFAULT_TENANT_ID = '39f9740f-7162-4ff5-93ea-149c79ee1b7a';
const DEFAULT_SCOPES = [
  'openid',
  'offline_access',
  'User.Read',
  'User.ReadWrite',
  'Mail.Read',
  'Mail.ReadWrite',
  'MailboxSettings.Read'
];

type GraphToken = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
};

type MailSyncState = {
  startedAt?: string;
  updatedAt?: string;
  complete?: boolean;
  folderCursors: Record<string, string | null>;
  folderCompleted: Record<string, boolean>;
  totalIndexed: number;
  lastBatchCount: number;
  lastError?: string;
};

export class MicrosoftGraphService {
  private store: any;
  private clientId: string;
  private tenantId: string;

  constructor(sharedStore?: any) {
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
    const settings = this.store.get('microsoftGraph', {}) as any;
    this.clientId = settings.clientId || DEFAULT_CLIENT_ID;
    this.tenantId = settings.tenantId || DEFAULT_TENANT_ID;
  }

  private get authority() {
    return `https://login.microsoftonline.com/${this.tenantId}`;
  }

  private form(data: Record<string, string>) {
    return new URLSearchParams(data).toString();
  }

  private saveToken(raw: any) {
    const token: GraphToken = {
      access_token: raw.access_token,
      refresh_token: raw.refresh_token,
      expires_at: Date.now() + Math.max(Number(raw.expires_in || 3600) - 60, 60) * 1000,
      scope: raw.scope
    };
    this.store.set('microsoftGraphToken', token);
    return token;
  }

  private getStoredToken(): GraphToken | null {
    return this.store.get('microsoftGraphToken', null) as GraphToken | null;
  }

  async startDeviceLogin() {
    const response = await axios.post(
      `${this.authority}/oauth2/v2.0/devicecode`,
      this.form({
        client_id: this.clientId,
        scope: DEFAULT_SCOPES.join(' ')
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    this.store.set('microsoftGraphDeviceCode', {
      device_code: response.data.device_code,
      expires_at: Date.now() + Number(response.data.expires_in || 900) * 1000,
      interval: Number(response.data.interval || 5)
    });

    await shell.openExternal(response.data.verification_uri);

    return {
      ok: true,
      userCode: response.data.user_code,
      verificationUri: response.data.verification_uri,
      message: response.data.message,
      expiresIn: response.data.expires_in,
      interval: response.data.interval
    };
  }

  async completeDeviceLogin() {
    const pending = this.store.get('microsoftGraphDeviceCode', null) as any;
    if (!pending?.device_code) {
      return { ok: false, error: 'No Microsoft login is pending. Start login first.' };
    }
    if (Date.now() > pending.expires_at) {
      this.store.delete('microsoftGraphDeviceCode');
      return { ok: false, error: 'Microsoft login code expired. Start login again.' };
    }

    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      try {
        const response = await axios.post(
          `${this.authority}/oauth2/v2.0/token`,
          this.form({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            client_id: this.clientId,
            device_code: pending.device_code
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
        );
        const token = this.saveToken(response.data);
        this.store.delete('microsoftGraphDeviceCode');
        const profile = await this.getProfile(token.access_token);
        return { ok: true, profile };
      } catch (error: any) {
        const code = error.response?.data?.error;
        if (code === 'authorization_pending') {
          await new Promise(resolve => setTimeout(resolve, Math.max(pending.interval || 5, 2) * 1000));
          continue;
        }
        if (code === 'slow_down') {
          await new Promise(resolve => setTimeout(resolve, Math.max((pending.interval || 5) + 5, 5) * 1000));
          continue;
        }
        return { ok: false, error: error.response?.data?.error_description || error.message };
      }
    }
    return { ok: false, error: 'Still waiting for Microsoft sign-in. Click Complete after approving the code.' };
  }

  async getAccessToken() {
    const token = this.getStoredToken();
    if (!token) throw new Error('Microsoft Graph is not connected.');
    if (Date.now() < token.expires_at) return token.access_token;
    if (!token.refresh_token) throw new Error('Microsoft refresh token missing. Connect again.');

    const response = await axios.post(
      `${this.authority}/oauth2/v2.0/token`,
      this.form({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: token.refresh_token,
        scope: DEFAULT_SCOPES.join(' ')
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );
    return this.saveToken(response.data).access_token;
  }

  private async graphGet(path: string, accessToken?: string) {
    const token = accessToken || await this.getAccessToken();
    const response = await axios.get(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000
    });
    return response.data;
  }

  private async graphGetUrl(url: string, accessToken?: string) {
    const token = accessToken || await this.getAccessToken();
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000
    });
    return response.data;
  }

  private async graphPost(path: string, body: any = {}, accessToken?: string) {
    const token = accessToken || await this.getAccessToken();
    const response = await axios.post(`https://graph.microsoft.com/v1.0${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return response.data;
  }

  private async graphPatch(path: string, body: any = {}, accessToken?: string) {
    const token = accessToken || await this.getAccessToken();
    const response = await axios.patch(`https://graph.microsoft.com/v1.0${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return response.data;
  }

  async getProfile(accessToken?: string) {
    return this.graphGet('/me?$select=id,displayName,userPrincipalName,mail', accessToken);
  }

  async getStatus() {
    const token = this.getStoredToken();
    if (!token) return { connected: false, clientId: this.clientId, tenantId: this.tenantId };
    try {
      const profile = await this.getProfile();
      return { connected: true, clientId: this.clientId, tenantId: this.tenantId, profile };
    } catch (error: any) {
      return { connected: false, clientId: this.clientId, tenantId: this.tenantId, error: error.message };
    }
  }

  async getMailboxSettings() {
    return this.graphGet('/me/mailboxSettings');
  }

  async listMessages(limit = 15) {
    const top = Math.max(1, Math.min(Number(limit) || 15, 50));
    const data = await this.graphGet(`/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead,hasAttachments,bodyPreview,webLink`);
    return (data.value || []).map((m: any) => ({
      id: m.id,
      subject: m.subject,
      sender: m.from?.emailAddress?.name || '',
      senderEmail: m.from?.emailAddress?.address || '',
      receivedAt: m.receivedDateTime,
      unread: !m.isRead,
      hasAttachments: Boolean(m.hasAttachments),
      bodyPreview: m.bodyPreview || '',
      webLink: m.webLink || ''
    }));
  }

  async listMailFolders() {
    const folders: any[] = [];
    const readPage = async (urlOrPath: string) => {
      const data = urlOrPath.startsWith('http')
        ? await this.graphGetUrl(urlOrPath)
        : await this.graphGet(urlOrPath);
      folders.push(...(data.value || []));
      if (data['@odata.nextLink']) await readPage(data['@odata.nextLink']);
    };
    await readPage('/me/mailFolders?$top=100&$select=id,displayName,totalItemCount,unreadItemCount,parentFolderId');
    return folders;
  }

  private categorizeMessage(message: any, folderName: string) {
    const text = `${message.subject || ''} ${message.sender || ''} ${message.senderEmail || ''} ${message.bodyPreview || ''} ${folderName || ''}`.toLowerCase();
    const rules: { id: string; label: string; agentId: string; keywords: string[] }[] = [
      { id: 'land-registry', label: 'Land Registry', agentId: 'solicitor-agent', keywords: ['land registry', 'hm land', 'title register', 'property register'] },
      { id: 'council-bills', label: 'Council / Bills', agentId: 'accountant-agent', keywords: ['council', 'council tax', 'lancaster city council', 'bill', 'utility', 'water', 'electric', 'gas'] },
      { id: 'insurance', label: 'Insurance', agentId: 'paperclip-full', keywords: ['insurance', 'policy', 'premium', 'claim', 'renewal'] },
      { id: 'tax-vat-mot', label: 'Tax / VAT / MOT', agentId: 'accountant-agent', keywords: ['hmrc', 'vat', 'tax', 'mtd', 'self assessment', 'mot', 'vehicle tax'] },
      { id: 'visa-sponsors', label: 'Visa / Sponsors', agentId: 'solicitor-agent', keywords: ['visa', 'sponsor', 'sponsorship', 'home office', 'ukvi', 'right to work'] },
      { id: 'accountant', label: 'Accountant', agentId: 'accountant-agent', keywords: ['accountant', 'bookkeeping', 'payroll', 'ledger', 'receipt', 'invoice', 'xero'] },
      { id: 'solicitors', label: 'Solicitors', agentId: 'solicitor-agent', keywords: ['solicitor', 'legal', 'law', 'court', 'claim', 'tenancy', 'landlord', 'notice'] },
      { id: 'suppliers', label: 'Suppliers / Sales Reps', agentId: 'paperclip-full', keywords: ['supplier', 'wholesale', 'sales rep', 'rep', 'order', 'stock', 'delivery'] },
      { id: 'sales', label: 'Sales', agentId: 'paperclip-full', keywords: ['sale', 'lead', 'customer', 'quote', 'proposal'] },
      { id: 'parcel-services', label: 'Parcel Services', agentId: 'paperclip-full', keywords: ['royal mail', 'parcel', 'evri', 'dpd', 'dhl', 'tracking', 'shipment'] },
      { id: 'companies', label: 'My Companies', agentId: 'accountant-agent', keywords: ['silva retail', 'newton newsagent', 'companies house', 'company'] },
      { id: 'business', label: 'Business', agentId: 'paperclip-full', keywords: ['business', 'shop', 'retail', 'newton newsagent', 'card payment', 'terminal'] },
      { id: 'flagged', label: 'Flagged / Important', agentId: 'paperclip-full', keywords: ['flagged', 'important', 'urgent', 'action required'] }
    ];
    const hit = rules.find(rule => rule.keywords.some(keyword => text.includes(keyword)));
    if (hit) return hit;
    return { id: 'general', label: 'General', agentId: 'paperclip-full', keywords: [] };
  }

  async syncEmailIntelligence(limitPerFolder = 15) {
    const folders = await this.listMailFolders();
    const top = Math.max(1, Math.min(Number(limitPerFolder) || 15, 50));
    const folderResults: any[] = [];
    const routed: any[] = [];

    for (const folder of folders) {
      try {
        const data = await this.graphGet(`/me/mailFolders/${encodeURIComponent(folder.id)}/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead,hasAttachments,bodyPreview,webLink,flag,importance,categories`);
        const messages = (data.value || []).map((m: any) => {
          const base = {
            id: m.id,
            folderId: folder.id,
            folderName: folder.displayName,
            subject: m.subject,
            sender: m.from?.emailAddress?.name || '',
            senderEmail: m.from?.emailAddress?.address || '',
            receivedAt: m.receivedDateTime,
            unread: !m.isRead,
            hasAttachments: Boolean(m.hasAttachments),
            bodyPreview: m.bodyPreview || '',
            webLink: m.webLink || '',
            importance: m.importance || 'normal',
            flagStatus: m.flag?.flagStatus || 'notFlagged',
            categories: m.categories || []
          };
          const route = this.categorizeMessage(base, folder.displayName);
          return {
            ...base,
            categoryId: route.id,
            categoryLabel: route.label,
            agentId: route.agentId,
            approvalStatus: 'pending-review'
          };
        });
        folderResults.push({ ...folder, syncedCount: messages.length });
        routed.push(...messages);
      } catch {
        folderResults.push({ ...folder, syncedCount: 0, error: 'Could not read folder' });
      }
    }

    return {
      syncedAt: new Date().toISOString(),
      folders: folderResults,
      messages: routed.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt))),
      summary: routed.reduce((acc: Record<string, number>, item) => {
        acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
        return acc;
      }, {})
    };
  }

  getMailSyncState(): MailSyncState {
    const state = this.store.get('microsoftGraphMailSyncState', null) as MailSyncState | null;
    return state || {
      complete: false,
      folderCursors: {},
      folderCompleted: {},
      totalIndexed: 0,
      lastBatchCount: 0
    };
  }

  resetMailSyncState() {
    const state: MailSyncState = {
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      complete: false,
      folderCursors: {},
      folderCompleted: {},
      totalIndexed: 0,
      lastBatchCount: 0
    };
    this.store.set('microsoftGraphMailSyncState', state);
    return { ok: true, state };
  }

  private normalizeGraphMessage(m: any, folder: any) {
    const base = {
      id: m.id,
      folderId: folder.id,
      folderName: folder.displayName,
      subject: m.subject,
      sender: m.from?.emailAddress?.name || '',
      senderEmail: m.from?.emailAddress?.address || '',
      receivedAt: m.receivedDateTime,
      unread: !m.isRead,
      hasAttachments: Boolean(m.hasAttachments),
      bodyPreview: m.bodyPreview || '',
      webLink: m.webLink || '',
      importance: m.importance || 'normal',
      flagStatus: m.flag?.flagStatus || 'notFlagged',
      categories: m.categories || []
    };
    const route = this.categorizeMessage(base, folder.displayName);
    return {
      ...base,
      categoryId: route.id,
      categoryLabel: route.label,
      agentId: route.agentId,
      approvalStatus: 'pending-review'
    };
  }

  async syncEmailIntelligenceBatch(options: { batchSize?: number; reset?: boolean } = {}) {
    if (options.reset) this.resetMailSyncState();
    const batchSize = Math.max(25, Math.min(Number(options.batchSize) || 500, 2000));
    const folders = await this.listMailFolders();
    let state = this.getMailSyncState();
    if (!state.startedAt) {
      state = { ...state, startedAt: new Date().toISOString(), complete: false };
    }

    const folderResults: any[] = [];
    const routed: any[] = [];
    let remaining = batchSize;

    for (const folder of folders) {
      if (remaining <= 0) break;
      if (state.folderCompleted[folder.id]) continue;

      try {
        const pageTop = Math.min(50, remaining);
        const initialPath = `/me/mailFolders/${encodeURIComponent(folder.id)}/messages?$top=${pageTop}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead,hasAttachments,bodyPreview,webLink,flag,importance,categories`;
        const data = state.folderCursors[folder.id]
          ? await this.graphGetUrl(state.folderCursors[folder.id]!)
          : await this.graphGet(initialPath);
        const messages = (data.value || []).map((m: any) => this.normalizeGraphMessage(m, folder));
        routed.push(...messages);
        remaining -= messages.length;
        state.folderCursors[folder.id] = data['@odata.nextLink'] || null;
        state.folderCompleted[folder.id] = !data['@odata.nextLink'];
        folderResults.push({
          ...folder,
          syncedCount: messages.length,
          cursorActive: Boolean(data['@odata.nextLink']),
          completed: state.folderCompleted[folder.id]
        });
      } catch (error: any) {
        state.lastError = error?.response?.data?.error?.message || error?.message || 'Could not read folder';
        folderResults.push({ ...folder, syncedCount: 0, completed: false, error: state.lastError });
      }
    }

    const complete = folders.length > 0 && folders.every(folder => state.folderCompleted[folder.id]);
    state = {
      ...state,
      updatedAt: new Date().toISOString(),
      complete,
      totalIndexed: Number(state.totalIndexed || 0) + routed.length,
      lastBatchCount: routed.length
    };
    this.store.set('microsoftGraphMailSyncState', state);

    return {
      syncedAt: new Date().toISOString(),
      folders: folderResults,
      messages: routed.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt))),
      summary: routed.reduce((acc: Record<string, number>, item) => {
        acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
        return acc;
      }, {}),
      state,
      complete,
      batchSize,
      batchCount: routed.length
    };
  }

  async markMessageRead(messageId: string, isRead = true) {
    const result = await this.graphPatch(`/me/messages/${encodeURIComponent(messageId)}`, { isRead });
    return { ok: true, action: isRead ? 'mark-read' : 'mark-unread', messageId, result };
  }

  async moveMessage(messageId: string, destinationFolderId: string) {
    const result = await this.graphPost(`/me/messages/${encodeURIComponent(messageId)}/move`, { destinationId: destinationFolderId });
    return { ok: true, action: 'move', messageId, destinationFolderId, result };
  }

  async createMailFolder(displayName: string, parentFolderId?: string) {
    const safeName = String(displayName || '').trim();
    if (!safeName) throw new Error('Folder name is required.');
    const path = parentFolderId
      ? `/me/mailFolders/${encodeURIComponent(parentFolderId)}/childFolders`
      : '/me/mailFolders';
    const result = await this.graphPost(path, { displayName: safeName });
    return { ok: true, action: 'create-folder', folder: result };
  }

  async createReplyDraft(messageId: string, comment = '') {
    const draft = await this.graphPost(`/me/messages/${encodeURIComponent(messageId)}/createReply`, {});
    if (comment && draft?.id) {
      const body = {
        body: {
          contentType: 'Text',
          content: String(comment)
        }
      };
      await this.graphPatch(`/me/messages/${encodeURIComponent(draft.id)}`, body);
    }
    return { ok: true, action: 'create-reply-draft', sourceMessageId: messageId, draftId: draft?.id, draft };
  }

  disconnect() {
    this.store.delete('microsoftGraphToken');
    this.store.delete('microsoftGraphDeviceCode');
    return { ok: true };
  }
}
