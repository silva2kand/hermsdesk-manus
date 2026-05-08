import Store from 'electron-store';
import axios from 'axios';
import electron from 'electron';

const { shell } = electron;

const DEFAULT_CLIENT_ID = 'a18c5868-9960-4962-b106-1c77a2d07327';
const DEFAULT_TENANT_ID = '39f9740f-7162-4ff5-93ea-149c79ee1b7a';
const DEFAULT_SCOPES = [
  'openid',
  'offline_access',
  'User.Read',
  'User.ReadWrite',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.ReadWrite.Shared',
  'MailboxSettings.Read'
];

type GraphToken = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
};

export class MicrosoftGraphService {
  private store: any;
  private clientId: string;
  private tenantId: string;
  private indexService: any;

  constructor(sharedStore?: any, indexService?: any) {
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
    this.indexService = indexService;
    const settings = this.store.get('microsoftGraph', {}) as any;
    this.clientId = settings.clientId || DEFAULT_CLIENT_ID;
    this.tenantId = settings.tenantId || DEFAULT_TENANT_ID;
  }

  private get authority() {
    return `https://login.microsoftonline.com/${this.tenantId}`;
  }

  private authorityFor(tenantId?: string) {
    return `https://login.microsoftonline.com/${tenantId || this.tenantId}`;
  }

  private form(data: Record<string, string>) {
    return new URLSearchParams(data).toString();
  }

  private saveToken(accountId: string, raw: any) {
    const token: GraphToken = {
      access_token: raw.access_token,
      refresh_token: raw.refresh_token,
      expires_at: Date.now() + Math.max(Number(raw.expires_in || 3600) - 60, 60) * 1000,
      scope: raw.scope
    };
    const tokens = this.store.get('microsoftGraphTokens', {}) as Record<string, GraphToken>;
    tokens[accountId] = token;
    this.store.set('microsoftGraphTokens', tokens);
    return token;
  }

  private getStoredToken(accountId: string): GraphToken | null {
    const tokens = this.store.get('microsoftGraphTokens', {}) as Record<string, GraphToken>;
    return tokens[accountId] || null;
  }

  private resolveAccountId(accountId?: string) {
    if (accountId) return accountId;
    const tokens = this.store.get('microsoftGraphTokens', {}) as Record<string, GraphToken>;
    return Object.keys(tokens)[0] || '';
  }

  async startDeviceLogin() {
    this.store.delete('microsoftGraphDeviceCode');
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
      interval: Number(response.data.interval || 5),
      clientId: this.clientId,
      tenantId: this.tenantId
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

    const deadline = Date.now() + 300000; // 5 minutes
    while (Date.now() < deadline) {
      try {
        const tokenBody: Record<string, string> = {
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          client_id: pending.clientId || this.clientId,
          device_code: pending.device_code
        };
        const secret = this.store.get('microsoftGraph.clientSecret', '') as string;
        if (secret) tokenBody.client_secret = secret;
        const response = await axios.post(
          `${this.authorityFor(pending.tenantId)}/oauth2/v2.0/token`,
          this.form(tokenBody),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
        );
        
        const tempToken = response.data.access_token;
        const profile = await this.getProfile(tempToken);
        const accountId = profile.id;
        
        this.saveToken(accountId, response.data);
        this.store.delete('microsoftGraphDeviceCode');
        
        this.indexService?.registerAccount({
          accountId,
          email: profile.mail || profile.userPrincipalName,
          displayName: profile.displayName
        });

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
        const description = error.response?.data?.error_description || error.message;
        if (code === 'invalid_grant' || /expired|inactivity/i.test(description)) {
          this.store.delete('microsoftGraphDeviceCode');
          return {
            ok: false,
            code: 'device_code_expired',
            error: 'Microsoft rejected this device code because it expired. Start Microsoft login again and complete the new code.'
          };
        }
        if (/AADSTS7000218|client_secret|client_assertion/i.test(description)) {
          return {
            ok: false,
            code: 'client_secret_required',
            clientId: pending.clientId || this.clientId,
            tenantId: pending.tenantId || this.tenantId,
            error: 'Microsoft accepted the device code, but this Azure app registration is not enabled as a public desktop/client app, so Microsoft requires a client secret. Use Configure Azure to confirm Client ID/Tenant, then either click Set Secret and start login again, or in Azure enable Allow public client flows for this app registration.'
          };
        }
        return { ok: false, error: description };
      }
    }
    return { ok: false, error: 'Still waiting for Microsoft sign-in. Click Complete after approving the code.' };
  }

  async getAccessToken(accountId: string) {
    const token = this.getStoredToken(accountId);
    if (!token) throw new Error(`Microsoft Graph account ${accountId} is not connected.`);
    if (Date.now() < token.expires_at) return token.access_token;
    if (!token.refresh_token) throw new Error(`Microsoft refresh token missing for ${accountId}. Connect again.`);

    const secret = this.store.get('microsoftGraph.clientSecret', '') as string;
    const formData: Record<string, string> = {
      grant_type: 'refresh_token',
      client_id: this.clientId,
      refresh_token: token.refresh_token,
      scope: DEFAULT_SCOPES.join(' ')
    };
    if (secret) formData.client_secret = secret;

    const response = await axios.post(
      `${this.authority}/oauth2/v2.0/token`,
      this.form(formData),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );
    return this.saveToken(accountId, response.data).access_token;
  }

  private async graphGet(path: string, accountId?: string, accessToken?: string) {
    const token = accessToken || (accountId ? await this.getAccessToken(accountId) : null);
    if (!token) throw new Error('No account ID or access token provided for Graph GET');
    
    const response = await axios.get(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000
    });
    return response.data;
  }

  private async graphGetUrl(url: string, accountId?: string, accessToken?: string) {
    const token = accessToken || (accountId ? await this.getAccessToken(accountId) : null);
    if (!token) throw new Error('No account ID or access token provided for Graph GET URL');

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000
    });
    return response.data;
  }

  private async graphPost(path: string, body: any = {}, accountId?: string, accessToken?: string) {
    const token = accessToken || (accountId ? await this.getAccessToken(accountId) : null);
    if (!token) throw new Error('No account ID or access token provided for Graph POST');

    const response = await axios.post(`https://graph.microsoft.com/v1.0${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return response.data;
  }

  private async graphPatch(path: string, body: any = {}, accountId?: string, accessToken?: string) {
    const token = accessToken || (accountId ? await this.getAccessToken(accountId) : null);
    if (!token) throw new Error('No account ID or access token provided for Graph PATCH');

    const response = await axios.patch(`https://graph.microsoft.com/v1.0${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return response.data;
  }

  async getProfile(accessToken: string) {
    return this.graphGet('/me?$select=id,displayName,userPrincipalName,mail', undefined, accessToken);
  }

  async getAccountStatus(accountId?: string) {
    let id = this.resolveAccountId(accountId);
    if (!id) return { connected: false };

    const token = this.getStoredToken(id);
    if (!token) return { connected: false, accountId: id };
    try {
      const profile = await this.graphGet('/me?$select=id,displayName,userPrincipalName,mail', id);
      try {
        const mailbox = await this.graphGet('/me/mailFolders/inbox?$select=id,displayName,totalItemCount,unreadItemCount', id);
        return { connected: true, mailboxConnected: true, accountId: id, profile, mailbox };
      } catch (mailError: any) {
        return {
          connected: true,
          mailboxConnected: false,
          accountId: id,
          profile,
          mailboxError: mailError?.response?.data?.error?.message || mailError?.message || 'Microsoft Graph profile signed in, but mailbox access failed.'
        };
      }
    } catch (error: any) {
      return { connected: false, accountId: id, error: error.message };
    }
  }

  async getAllAccountsStatus() {
    const tokens = this.store.get('microsoftGraphTokens', {}) as Record<string, GraphToken>;
    const results = [];
    for (const accountId of Object.keys(tokens)) {
      results.push(await this.getAccountStatus(accountId));
    }
    return results;
  }

  async getMailboxSettings(accountId?: string) {
    const id = this.resolveAccountId(accountId);
    if (!id) throw new Error('No Microsoft Graph account connected.');
    return this.graphGet('/me/mailboxSettings', id);
  }

  async listMessages(accountId?: string, limit = 15) {
    const id = this.resolveAccountId(accountId);
    if (!id) throw new Error('No Microsoft Graph account connected.');
    const top = Math.max(1, Math.min(Number(limit) || 15, 50));
    const data = await this.graphGet(`/me/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead,hasAttachments,bodyPreview,webLink`, id);
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

  async listMailFolders(accountId?: string) {
    const id = this.resolveAccountId(accountId);
    if (!id) throw new Error('No Microsoft Graph account connected.');
    const folders: any[] = [];
    const readPage = async (urlOrPath: string) => {
      const data = urlOrPath.startsWith('http')
        ? await this.graphGetUrl(urlOrPath, id)
        : await this.graphGet(urlOrPath, id);
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

  async syncEmailIntelligenceBatch(accountId?: string, options: { batchSize?: number; reset?: boolean } = {}) {
    const id = this.resolveAccountId(accountId);
    if (!id) return { ok: false, error: 'No Microsoft Graph account connected. Please complete login first.', messages: [], syncedCount: 0, totalIndexed: 0, complete: false };
    const batchSize = Math.max(25, Math.min(Number(options.batchSize) || 500, 2000));
    const folders = await this.listMailFolders(id);
    
    const stateKey = `mailSyncState_${id}`;
    let state = this.store.get(stateKey, {
      complete: false,
      folderCursors: {},
      folderCompleted: {},
      totalIndexed: 0
    });

    if (options.reset) {
      state = { complete: false, folderCursors: {}, folderCompleted: {}, totalIndexed: 0 };
    }

    const routed: any[] = [];
    let remaining = batchSize;

    for (const folder of folders) {
      if (remaining <= 0) break;
      if (state.folderCompleted[folder.id]) continue;

      try {
        const pageTop = Math.min(50, remaining);
        const initialPath = `/me/mailFolders/${encodeURIComponent(folder.id)}/messages?$top=${pageTop}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead,hasAttachments,bodyPreview,webLink,flag,importance,categories`;
        const data = state.folderCursors[folder.id]
          ? await this.graphGetUrl(state.folderCursors[folder.id]!, id)
          : await this.graphGet(initialPath, id);
          
        const messages = (data.value || []).map((m: any) => {
          const base = this.normalizeGraphMessage(m, folder);
          return { ...base, accountId: id };
        });
        
        routed.push(...messages);
        remaining -= messages.length;
        state.folderCursors[folder.id] = data['@odata.nextLink'] || null;
        state.folderCompleted[folder.id] = !data['@odata.nextLink'];
      } catch (error: any) {
        state.lastError = `${folder.displayName}: ${error?.response?.data?.error?.message || error?.message || String(error)}`;
        console.error(`Sync error for account ${id} folder ${folder.displayName}:`, error);
      }
    }

    const complete = folders.length > 0 && folders.every(folder => state.folderCompleted[folder.id]);
    if (this.indexService && routed.length > 0) {
      const mergedTotal = await this.indexService.saveEmails(id, routed);
      state.totalIndexed = mergedTotal;
    } else {
      state.totalIndexed += routed.length;
    }
    const globalStats = this.indexService?.getGlobalStats?.() || {};
    state.complete = complete;
    state.accountId = id;
    state.lastBatchCount = routed.length;
    state.lastSyncedAt = new Date().toISOString();
    state.updatedAt = state.lastSyncedAt;
    state.totalAccounts = globalStats.totalAccounts || (id ? 1 : 0);
    state.globalTotalIndexed = globalStats.totalIndexed || state.totalIndexed || 0;
    if (routed.length > 0 && !complete) delete state.lastError;
    this.store.set(stateKey, state);

    return {
      ok: true,
      accountId: id,
      syncedCount: routed.length,
      batchCount: routed.length,
      totalIndexed: state.totalIndexed,
      state,
      complete,
      messages: routed
    };
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

  async markMessageRead(accountId: string | undefined, messageId: string, isRead = true) {
    const id = this.resolveAccountId(accountId);
    if (!id) throw new Error('No Microsoft Graph account connected.');
    const result = await this.graphPatch(`/me/messages/${encodeURIComponent(messageId)}`, { isRead }, id);
    return { ok: true, action: isRead ? 'mark-read' : 'mark-unread', messageId, result };
  }

  async createReplyDraft(accountId: string | undefined, messageId: string, comment = '') {
    const id = this.resolveAccountId(accountId);
    if (!id) throw new Error('No Microsoft Graph account connected.');
    const draft = await this.graphPost(`/me/messages/${encodeURIComponent(messageId)}/createReply`, {}, id);
    if (comment && draft?.id) {
      const body = {
        body: {
          contentType: 'Text',
          content: String(comment)
        }
      };
      await this.graphPatch(`/me/messages/${encodeURIComponent(draft.id)}`, body, id);
    }
    return { ok: true, action: 'create-reply-draft', sourceMessageId: messageId, draftId: draft?.id, draft };
  }

  disconnect(accountId?: string) {
    const id = this.resolveAccountId(accountId);
    const tokens = this.store.get('microsoftGraphTokens', {}) as Record<string, GraphToken>;
    if (id) delete tokens[id];
    this.store.set('microsoftGraphTokens', tokens);
    return { ok: true };
  }

  setSecret(secret: string) {
    this.store.set('microsoftGraph.clientSecret', String(secret || '').trim());
    this.store.delete('microsoftGraphDeviceCode');
    return { ok: true };
  }

  setConfig(config: { clientId?: string; tenantId?: string }) {
    const settings = this.store.get('microsoftGraph', {}) as any;
    if (config.clientId) {
      settings.clientId = String(config.clientId).trim();
      this.clientId = settings.clientId;
    }
    if (config.tenantId) {
      settings.tenantId = String(config.tenantId).trim();
      this.tenantId = settings.tenantId;
    }
    this.store.set('microsoftGraph', settings);
    this.store.delete('microsoftGraphDeviceCode');
    return { ok: true };
  }

  getConfig() {
    const secret = this.store.get('microsoftGraph.clientSecret', '') as string;
    return {
      ok: true,
      clientId: this.clientId,
      tenantId: this.tenantId,
      hasSecret: Boolean(String(secret || '').trim()),
      authority: this.authority
    };
  }

  getAccountMetadata(accountId?: string) {
    let id = this.resolveAccountId(accountId);
    const globalStats = this.indexService?.getGlobalStats?.() || {};
    if (!id) {
      return {
        complete: false,
        totalIndexed: globalStats.totalIndexed || 0,
        totalAccounts: globalStats.totalAccounts || 0,
        accounts: globalStats.accounts || []
      };
    }
    const stateKey = `mailSyncState_${id}`;
    const state = this.store.get(stateKey, null) as any;
    return {
      accountId: id,
      complete: Boolean(state?.complete),
      folderCursors: state?.folderCursors || {},
      folderCompleted: state?.folderCompleted || {},
      totalIndexed: state?.totalIndexed || this.indexService?.getAccountMetadata?.(id)?.totalIndexed || 0,
      lastBatchCount: state?.lastBatchCount || 0,
      lastSyncedAt: state?.lastSyncedAt || this.indexService?.getAccountMetadata?.(id)?.lastSyncedAt || '',
      updatedAt: state?.updatedAt || state?.lastSyncedAt || '',
      lastError: state?.lastError || '',
      totalAccounts: globalStats.totalAccounts || 1,
      globalTotalIndexed: globalStats.totalIndexed || state?.totalIndexed || 0,
      accounts: globalStats.accounts || []
    };
  }
}
