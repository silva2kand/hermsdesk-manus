import type { BrowserWindow as BrowserWindowType, Tray as TrayType } from 'electron'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'

const require = createRequire(import.meta.url)
const electron = ((globalThis as any).__electronModule || require('electron')) as typeof import('electron')
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = electron

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let store: any;
let aiService: any;
let integrationService: any;
export let providerService: any;
let toolRegistry: any;
let skillsEngine: any;
let orchestrator: any;
let workspaceService: any;
let microsoftGraph: any;
let schedulerService: any;
let wideResearchService: any;
let automationService: any;
let browserOperator: any;
let artifactService: any;
let eventBus: any;
let webResearchService: any;
let whatsAppChannelService: any;

import { LocalAIService } from './services/LocalAIService'
import { DesktopIntegrationService } from './services/DesktopIntegrationService'
import { AIProviderService } from './services/AIProviderService'
import { ToolRegistryService } from './services/ToolRegistryService'
import { SkillsEngineService } from './services/SkillsEngineService'
import { MultiAgentOrchestrator } from './services/MultiAgentOrchestrator'
import { WorkspaceService } from './services/WorkspaceService'
import { MicrosoftGraphService } from './services/MicrosoftGraphService'
import { SchedulerService } from './services/SchedulerService'
import { WideResearchService } from './services/WideResearchService'
import { AutomationService } from './services/AutomationService'
import { BrowserOperatorService } from './services/BrowserOperatorService'
import { ArtifactService } from './services/ArtifactService'
import { EventBusService } from './services/EventBusService'
import { SilvaWebResearchService } from './services/SilvaWebResearchService'
import { WhatsAppChannelService } from './services/WhatsAppChannelService'
import { EmailIndexService } from './services/EmailIndexService'
import { TinyFishService } from './services/TinyFishService'

let emailIndexService: any;
let tinyFish: any;

function initializeStoreAndServices() {
   try {
     store = new Store({ 
       atomically: false,
       watch: false,
       defaults: {
      connectors: {
        'my-browser': true, 'ollama': true, 'lm-studio': true, 'google-gemini': true,
        'opencode': true, 'openrouter': true, 'instagram': true, 'instagram-marketplace': true,
        'meta-ads': true, 'gmail': true, 'google-calendar': true, 'google-drive': true,
        'outlook-mail': true, 'outlook-calendar': true, 'github': true, 'slack': true,
        'notion': true, 'zapier': true, 'asana': true, 'monday': true, 'make': true,
        'linear': true, 'atlassian': true, 'clickup': true, 'supabase': true,
        'vercel': true, 'neon': true, 'prisma': true, 'sentry': true, 'huggingface': true,
        'hubspot': true, 'stripe': true, 'mcp-filesystem': true, 'mcp-windows-shell': true,
        'intercom': true, 'paypal-business': true, 'revenuecat': true, 'close': true,
        'xero': true, 'airtable': true, 'dify': true, 'cloudflare': true, 'posthog': true,
        'playwright': true, 'jam': true, 'canva': true, 'webflow': true, 'wix': true,
        'graphify': true, 'granola': true, 'fireflies': true, 'tldv': true, 'firecrawl': true,
        'todoist': true, 'zoominfo': true, 'metabase': true, 'explorium': true,
        'serena': true, 'heygen': true, 'context7': true, 'hume': true, 'line': true,
        'jotform': true, 'pophive': true, 'minimax': true
      },
      'api-keys': {},
      models: {},
      mail: { workflowEmails: [], approvedSenders: [], enabledCategories: {} },
      whatsAppDrafts: [],
      scheduledTasks: [],
      projects: [],
      wideResearchRuns: [],
      automationEvents: [],
      generalSettings: {
        language: 'English',
        theme: 'Quantum Blue',
        appearance: 'Dark',
        notifications: { productUpdates: true, earlyAccess: false, taskEmail: true },
        modelPreset: { provider: 'Jan', model: 'Auto local model' }
      },
      knowledge: []
    }
  });

  aiService = new LocalAIService(store)
  integrationService = new DesktopIntegrationService()
  providerService = new AIProviderService(store)
  toolRegistry = new ToolRegistryService(store)
  emailIndexService = new EmailIndexService(store)
  browserOperator = new BrowserOperatorService(store)
  microsoftGraph = new MicrosoftGraphService(store, emailIndexService)
  skillsEngine = new SkillsEngineService(store, microsoftGraph, emailIndexService, browserOperator)
  workspaceService = new WorkspaceService(store)
  orchestrator = new MultiAgentOrchestrator(store, aiService, skillsEngine, workspaceService)
  schedulerService = new SchedulerService(store, workspaceService, orchestrator)
  wideResearchService = new WideResearchService(store, aiService)
  automationService = new AutomationService(store)
  artifactService = new ArtifactService()
  eventBus = new EventBusService(store)
  webResearchService = new SilvaWebResearchService(eventBus)
  whatsAppChannelService = new WhatsAppChannelService(store, orchestrator, integrationService, eventBus)
  tinyFish = new TinyFishService(store)
} catch (error) {
     console.error('CRITICAL: Failed to initialize ElectronStore:', error);
     store = { get: (key: string, def: any) => def, set: () => {}, delete: () => {} };
     aiService = new LocalAIService(store);
     integrationService = new DesktopIntegrationService();
     providerService = new AIProviderService(store);
     toolRegistry = new ToolRegistryService(store);
     emailIndexService = new EmailIndexService(store);
     browserOperator = new BrowserOperatorService(store);
     microsoftGraph = new MicrosoftGraphService(store, emailIndexService);
     skillsEngine = new SkillsEngineService(store, microsoftGraph, emailIndexService, browserOperator);
     workspaceService = new WorkspaceService(store);
     orchestrator = new MultiAgentOrchestrator(store, aiService, skillsEngine, workspaceService);
     schedulerService = new SchedulerService(store, workspaceService, orchestrator);
     wideResearchService = new WideResearchService(store, aiService);
     automationService = new AutomationService(store);
     artifactService = new ArtifactService();
     eventBus = new EventBusService(store);
     webResearchService = new SilvaWebResearchService(eventBus);
     whatsAppChannelService = new WhatsAppChannelService(store, orchestrator, integrationService, eventBus);
   }
}

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindowType | null
let tray: TrayType | null
let isQuitting = false

function showMainWindow() {
  if (!win) { createWindow(); return; }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function createTray() {
  if (tray) return
  const iconPath = path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg')
  const image = nativeImage.createFromPath(iconPath)
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('HermesDesk ME')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open HermesDesk', click: showMainWindow },
    { label: 'Chat Lab', click: () => { showMainWindow(); win?.webContents.send('app:navigate', 'chat') } },
    { label: 'Model Hub', click: () => { showMainWindow(); win?.webContents.send('app:navigate', 'models') } },
    { label: 'WhatsApp ME', click: () => { showMainWindow(); win?.webContents.send('app:navigate', 'whatsapp') } },
    { label: 'Approvals', click: () => { showMainWindow(); win?.webContents.send('app:navigate', 'agents') } },
    { type: 'separator' },
    { label: 'Sync Mail Intelligence', click: () => { showMainWindow(); win?.webContents.send('mail:sync-intelligence') } },
    { label: 'Open WhatsApp', click: () => integrationService?.openApp('whatsapp') },
    { label: 'Open Classic Outlook', click: () => integrationService?.openApp('classic outlook') },
    { label: 'Open Voice Stack', click: () => integrationService?.openApp('voice stack') },
    { label: 'Open Browser', click: () => automationService?.openBrowser() },
    { label: 'Open Workspace Terminal', click: () => integrationService?.openTerminal() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; tray = null; app.quit() } }
  ]))
  tray.on('double-click', showMainWindow)
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  })
  app.whenReady().then(() => {
    initializeStoreAndServices()
    createWindow()
    createTray()
  })
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    width: 1200, height: 800,
    webPreferences: { 
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: true
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#ffffff', symbolColor: '#000000', height: 32 }
  })

  win.on('close', (event: any) => {
    if (!isQuitting && process.platform !== 'darwin') { event.preventDefault(); win?.hide(); }
  })

  const appLog = (type: 'info' | 'error' | 'bug', content: string) => {
    win?.webContents.send('app:log', { type, content });
    eventBus?.log('app', content, type === 'error' ? 'error' : type === 'bug' ? 'warn' : 'info');
  };

  const buildEmailMemory = (messages: any[]) => {
    const moneyPattern = /(?:£|\$|eur|gbp|usd)\s?\d[\d,]*(?:\.\d{2})?|\b\d[\d,]*(?:\.\d{2})?\s?(?:gbp|usd|eur)\b/i
    const billPattern = /(bill|invoice|payment due|pay now|statement|arrears|overdue|council tax|utility|renewal|premium|direct debit|balance due)/i
    const deadlinePattern = /(due|deadline|by|before|expires|renewal|hearing|appointment|court|payment date|final notice)/i
    const sorted = [...messages].sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
    const categories = sorted.reduce((acc: Record<string, number>, message: any) => {
      const key = message.categoryId || 'general'; acc[key] = (acc[key] || 0) + 1; return acc;
    }, {})
    const senderMap = new Map<string, any>()
    sorted.forEach((message: any) => {
      const key = (message.senderEmail || message.sender || 'unknown').toLowerCase()
      const existing = senderMap.get(key) || { sender: message.sender, senderEmail: message.senderEmail, count: 0, latestAt: message.receivedAt, latestSubject: message.subject }
      existing.count += 1
      if (String(message.receivedAt || '') > String(existing.latestAt || '')) {
        existing.latestAt = message.receivedAt; existing.latestSubject = message.subject;
      }
      senderMap.set(key, existing)
    })
    const billsToPay = sorted.filter((message: any) => {
      const text = `${message.subject || ''} ${message.bodyPreview || ''} ${message.categoryLabel || ''}`
      return billPattern.test(text) || moneyPattern.test(text) || ['council-bills', 'tax-vat-mot', 'insurance'].includes(message.categoryId)
    }).slice(0, 80).map((message: any) => ({
      id: message.id, subject: message.subject, sender: message.sender || message.senderEmail, receivedAt: message.receivedAt, folderName: message.folderName, categoryLabel: message.categoryLabel, unread: Boolean(message.unread), preview: message.bodyPreview
    }))
    const deadlines = sorted.filter((message: any) => deadlinePattern.test(`${message.subject || ''} ${message.bodyPreview || ''}`))
      .slice(0, 80).map((message: any) => ({
        id: message.id, subject: message.subject, sender: message.sender || message.senderEmail, receivedAt: message.receivedAt, categoryLabel: message.categoryLabel, preview: message.bodyPreview
      }))
    const urgent = sorted.filter((message: any) => message.unread || message.importance === 'high' || message.flagStatus === 'flagged')
      .slice(0, 80).map((message: any) => ({
        id: message.id, subject: message.subject, sender: message.sender || message.senderEmail, receivedAt: message.receivedAt, reason: message.importance === 'high' ? 'high importance' : message.flagStatus === 'flagged' ? 'flagged' : 'unread', categoryLabel: message.categoryLabel
      }))
    return { generatedAt: new Date().toISOString(), totalIndexed: sorted.length, latestReceivedAt: sorted[0]?.receivedAt || null, unreadCount: sorted.filter((message: any) => message.unread).length, flaggedCount: sorted.filter((message: any) => message.flagStatus === 'flagged').length, categories, topSenders: Array.from(senderMap.values()).sort((a, b) => b.count - a.count).slice(0, 40), billsToPay, deadlines, urgent }
  }

  const processEmailIntelligence = async (data: any, source = 'mailbox', options: { taskLimit?: number } = {}) => {
    const current = workspaceService.getEmailIntelligence?.() || { messages: [], folders: [], summary: {} }
    const statusById = new Map((current.messages || []).map((m: any) => [m.id, m.approvalStatus]))
    const processed = new Set(store.get('mailProcessedTaskIds', []) as string[])
    const incomingMessages = (data.messages || []).map((message: any) => ({
      ...message, source, approvalStatus: statusById.get(message.id) || message.approvalStatus || 'pending-review',
      actionPolicy: 'approval-required-for-send-delete-move-pay-file-submit-contact'
    }))
    const incomingIds = new Set(incomingMessages.map((message: any) => message.id))
    const retainedMessages = (current.messages || []).filter((message: any) => message.id && !incomingIds.has(message.id))
    const messages = [...incomingMessages, ...retainedMessages].sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))).slice(0, 100000)
    const foldersByKey = new Map<string, any>()
    ;[...(current.folders || []), ...(data.folders || [])].forEach((folder: any) => {
      const key = folder.id || `${source}:${folder.displayName || 'folder'}`
      foldersByKey.set(key, { ...foldersByKey.get(key), ...folder, source: folder.source || source })
    })
    const memory = buildEmailMemory(messages)
    const merged = { ...data, folders: Array.from(foldersByKey.values()), messages, summary: memory.categories, memory, mailboxMemory: memory }
    workspaceService.saveEmailIntelligence(merged)

    const highValue = (message: any) => (
      message.unread || message.importance === 'high' || message.flagStatus === 'flagged' ||
      ['solicitors', 'visa-sponsors', 'tax-vat-mot', 'council-bills', 'land-registry', 'accountant', 'insurance'].includes(message.categoryId)
    )
    const taskLimit = Math.max(0, Math.min(Number(options.taskLimit ?? 40), 125))
    const taskCandidates = incomingMessages.filter((message: any) => message.id && !processed.has(message.id) && highValue(message))
      .sort((a: any, b: any) => Number(highValue(b)) - Number(highValue(a)) || String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))).slice(0, taskLimit)

    for (const message of taskCandidates) {
      processed.add(message.id)
      await orchestrator.createTask(
        `Auto Mail ME analysis item.\nSource: ${source}\nFolder: ${message.folderName || 'Inbox'}\nCategory: ${message.categoryLabel || 'General'}\nFrom: ${message.sender || ''} <${message.senderEmail || ''}>\nSubject: ${message.subject || '(No subject)'}\nReceived: ${message.receivedAt || ''}\nUnread: ${message.unread ? 'yes' : 'no'}\nAttachments: ${message.hasAttachments ? 'yes' : 'no'}\nPreview:\n${message.bodyPreview || ''}\n\nDo end-to-end analysis: classify, summarize, extract dates/deadlines/money/risk, identify required documents, suggest next actions, and draft reply text if useful.\nStrict rule: do not send, delete, move, pay, submit, contact, unsubscribe, or change mailbox state. Create recommendations and wait for user approval.`,
        message.agentId || 'paperclip-full', win
      )
    }
    store.set('mailProcessedTaskIds', Array.from(processed).slice(-100000))
    win?.webContents.send('mail:intelligence-updated', { source, messageCount: merged.messages.length, newTasks: taskCandidates.length, syncedAt: merged.syncedAt })
    eventBus?.emit('mail.index.batch', 'mail-me', { source, incomingCount: incomingMessages.length, indexedCount: merged.messages.length, newTasks: taskCandidates.length, syncedAt: merged.syncedAt, complete: data.complete, state: data.state })
    appLog('info', `Mail ME auto-analyzed ${merged.messages.length} emails from ${source}; ${taskCandidates.length} new agent tasks queued.`)
    return merged
  }

  let isSyncingMail = false;
  const syncAllMailAutomatically = async () => {
    if (isSyncingMail) return;
    isSyncingMail = true;
    try {
      const accounts = emailIndexService.getAllAccounts()
      for (const account of accounts) {
        try {
          const data = await microsoftGraph.syncEmailIntelligenceBatch(account.accountId, { batchSize: 500 })
          await processEmailIntelligence(data, `Microsoft Graph (${account.email})`)
        } catch (error: any) {
          console.error(`Mail sync failed for ${account.email}:`, error)
        }
      }
    } catch (error: any) { appLog('error', `Mail ME Graph auto-sync failed: ${error?.message || error}`) }
    try {
      const status = await integrationService.getClassicOutlookStatus().catch(() => null)
      if (status?.ok && Array.isArray(status.accounts)) {
        appLog('info', `Mail ME Classic Outlook: detected ${status.accounts.length} accounts.`);
        // Early registration based on detected accounts in status
        for (const acc of status.accounts) {
          const accId = `classic-${acc.displayName}`;
          if (!emailIndexService.getAccountMetadata(accId)) {
            emailIndexService.registerAccount({
              accountId: accId,
              email: acc.displayName.includes('@') ? acc.displayName : `${acc.displayName.replace(/\s+/g, '.')}.local`,
              displayName: `Classic: ${acc.displayName}`
            });
          }
        }

        const messages = await integrationService.listClassicOutlookMessages(2000)
        if (Array.isArray(messages) && messages.length > 0) {
          appLog('info', `Mail ME Classic Outlook: found ${messages.length} messages.`);
          const accountsInBatch = new Set(messages.map((m: any) => m.accountId));
          for (const accId of accountsInBatch) {
            const accMessages = messages.filter((m: any) => m.accountId === accId);
            await emailIndexService.saveEmails(accId, accMessages.map((m: any) => ({
              ...m,
              categoryId: 'classic',
              categoryLabel: 'Classic Outlook',
              agentId: 'paperclip-full'
            })));
          }
          await processEmailIntelligence({
            syncedAt: new Date().toISOString(),
            folders: Array.from(accountsInBatch).map(id => ({ id, displayName: id, syncedCount: messages.filter((m: any) => m.accountId === id).length })),
            messages
          }, 'Classic Outlook', { taskLimit: 20 });
        } else {
           appLog('info', `Mail ME Classic Outlook: no messages found in recent scan.`);
        }
      }
    } catch (error: any) { appLog('error', `Mail ME Classic Outlook auto-sync failed: ${error?.message || error}`) }

    const stats = emailIndexService.getGlobalStats();
    appLog('info', `Intelligence Hub Status: ${stats.totalIndexed} emails read and organized across ${stats.totalAccounts} accounts.`);
    win?.webContents.send('mail:intelligence-summary', stats);
    isSyncingMail = false;
  }

  schedulerService?.setWindow(win); schedulerService?.start(); wideResearchService?.setWindow(win); automationService?.setWindow(win); browserOperator?.setWindow(win); eventBus?.setWindow(win); orchestrator?.setEventBus?.(eventBus); wideResearchService?.setEventBus?.(eventBus); automationService?.setEventBus?.(eventBus); browserOperator?.setEventBus?.(eventBus); whatsAppChannelService?.ensureActive?.().catch((error: any) => appLog('error', `WhatsApp always-active check failed: ${error?.message || error}`))

  ipcMain.handle('ai:list-models', () => aiService.listOllamaModels())
  ipcMain.handle('ai:chat', async (_, { model, messages, provider }) => {
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const startedAt = Date.now();
    eventBus?.emit('session.started', 'local-ai', { sessionId, engine: provider || 'Jan+TurboQuant', model: model || 'auto', streaming: false }, sessionId);
    const p = (provider || '').toLowerCase().replace(/\s+/g, '')
    try {
      let result; if (p === 'ollama') result = await aiService.chatWithOllama(model, messages); else if (p === 'lmstudio') result = await aiService.chatWithLMStudio(model, messages); else if (p === 'jan' || p === 'jan+turboquant') result = await aiService.chatWithBestAvailable(model, messages, { preferred: 'jan' }); else result = await aiService.chatWithBestAvailable(model, messages);
      const content = result?.message?.content || result?.content || '';
      eventBus?.emit('session.finished', 'local-ai', { sessionId, engine: result?.engine || provider || 'local-ai', model: model || 'auto', durationMs: Date.now() - startedAt, outputChars: content.length }, sessionId);
      return result;
    } catch (error: any) {
      eventBus?.emit('session.finished', 'local-ai', { sessionId, engine: provider || 'local-ai', error: error?.message, durationMs: Date.now() - startedAt }, sessionId);
      return { message: { content: `Local AI route failed: ${error?.message}` }, engine: 'Local router' }
    }
  })
  ipcMain.handle('ai:check-lmstudio', () => aiService.checkLMStudio())
  ipcMain.handle('ai:check-opencode', () => aiService.checkOpenCode())
  ipcMain.handle('ai:list-opencode-models', () => aiService.listOpenCodeModels())
  ipcMain.handle('ai:search-hf', (_, query) => providerService.searchHuggingFace(query))
  ipcMain.handle('ai:download-hf', async (event, modelId) => {
    try {
      const path = await providerService.downloadHFModel(modelId, (progress: number) => { event.sender.send('ai:download-progress', { modelId, progress }) })
      return { ok: true, path }
    } catch (error: any) { return { ok: false, error: error?.message } }
  })
  ipcMain.handle('ai:get-models-path', () => providerService.getModelsPath())
  ipcMain.handle('ai:list-library-models', () => providerService.listLibraryModels())
  ipcMain.handle('ai:delete-library-model', (_, modelId) => providerService.deleteLibraryModel(modelId))
  ipcMain.handle('ai:reveal-models-folder', () => providerService.revealModelsFolder())
  ipcMain.handle('knowledge:get-all', () => providerService.getKnowledge())
  ipcMain.handle('knowledge:save', (_, knowledge) => providerService.saveKnowledge(knowledge))
  ipcMain.handle('ai:chat-provider', async (_, { provider, model, messages }) => {
    const sessionId = `cloud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const startedAt = Date.now();
    eventBus?.emit('session.started', 'cloud-ai', { sessionId, provider, model, streaming: false }, sessionId);
    const apiKeys = await providerService.getAPIKeys(); const key = apiKeys[provider];
    if (!key) {
      eventBus?.emit('session.finished', 'cloud-ai', { sessionId, provider, model, error: 'missing-api-key', durationMs: Date.now() - startedAt }, sessionId);
      return { content: `Error: No API key found for ${provider}. Please add it in Settings > API & Connections.` };
    }
    try {
      let result;
      if (provider === 'gemini') {
        result = await providerService.chatGemini(key, messages); const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
        eventBus?.emit('session.finished', 'cloud-ai', { sessionId, provider, model, durationMs: Date.now() - startedAt, outputChars: content.length }, sessionId);
        return { content };
      }
      if (provider === 'nvidia') {
        result = await providerService.chatNvidiaNIM(key, model, messages); const content = result.choices?.[0]?.message?.content || "No response";
        eventBus?.emit('session.finished', 'cloud-ai', { sessionId, provider, model, durationMs: Date.now() - startedAt, outputChars: content.length }, sessionId);
        return { content };
      }
      if (provider === 'openrouter') {
        result = await providerService.chatOpenRouter(key, model, messages); const content = result.choices?.[0]?.message?.content || "No response";
        eventBus?.emit('session.finished', 'cloud-ai', { sessionId, provider, model, durationMs: Date.now() - startedAt, outputChars: content.length }, sessionId);
        return { content };
      }
      return { content: `Cloud provider ${provider} not supported.` };
    } catch (e: any) {
      eventBus?.emit('session.finished', 'cloud-ai', { sessionId, provider, model, error: e.message, durationMs: Date.now() - startedAt }, sessionId);
      return { content: `Error: ${e.message}` };
    }
  })
  ipcMain.handle('ai:check-jan', () => aiService.checkJanEngine())
  ipcMain.handle('ai:jan-status', () => aiService.getJanEngineStatus())
  ipcMain.handle('ai:start-jan', () => aiService.startJanEngine())
  ipcMain.handle('ai:load-jan-model', (_, model) => aiService.loadJanModel(model))
  ipcMain.handle('ai:scan-pc', () => aiService.scanPCResources())
  ipcMain.handle('ai:get-resource-usage', () => aiService.getResourceUsage())
  ipcMain.handle('ai:model-hub-diagnostics', async () => {
    const settle = async (task: any, def: any) => { try { return await task } catch { return def } }
    const [pc, jan, library, ollama, lm, openCode] = await Promise.all([settle(aiService.scanPCResources(), null), settle(aiService.getJanEngineStatus(), null), settle(providerService.listLibraryModels(), []), settle(aiService.listOllamaModels(), []), settle(aiService.checkLMStudio(), null), settle(aiService.checkOpenCode(), null)])
    return { pc, jan, library, ollama, lmStudio: lm, openCode, checkedAt: new Date().toISOString() }
  })
  ipcMain.handle('ai:engine-status', () => aiService.getFullEngineStatus())
  ipcMain.handle('ai:chat-best', async (_, { model, messages }) => {
    const sessionId = `smart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const startedAt = Date.now();
    eventBus?.emit('session.started', 'smart-router', { sessionId, model: model || 'auto' }, sessionId);
    const result = await aiService.chatWithBestAvailable(model, messages); const content = result?.message?.content || result?.content || '';
    eventBus?.emit('session.finished', 'smart-router', { sessionId, engine: result?.engine || 'smart-router', durationMs: Date.now() - startedAt, outputChars: content.length }, sessionId);
    return result;
  })
  ipcMain.handle('file:select-files', async () => { const r = await dialog.showOpenDialog(win!, { properties: ['openFile', 'multiSelections'] }); return r.canceled ? [] : r.filePaths })
  ipcMain.handle('file:select-folder', async () => { const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0] })
  ipcMain.handle('desktop:create-shortcut', () => integrationService.createDesktopShortcut())
  ipcMain.handle('desktop:computer-overview', () => integrationService.getComputerOverview())
  ipcMain.handle('desktop:list-directory', (_, p) => integrationService.listDirectory(p))
  ipcMain.handle('desktop:reveal-path', (_, p) => integrationService.revealPath(p))
  ipcMain.handle('desktop:open-path', (_, p) => integrationService.openPath(p))
  ipcMain.handle('desktop:open-terminal', (_, p) => integrationService.openTerminal(p))
  ipcMain.handle('desktop:whatsapp-compose', (_, { message, phone }) => integrationService.composeWhatsAppMessage(message, phone))
  ipcMain.handle('whatsapp:status', () => whatsAppChannelService.getStatus())
  ipcMain.handle('whatsapp:ensure-active', () => whatsAppChannelService.ensureActive())
  ipcMain.handle('whatsapp:settings', () => whatsAppChannelService.getSettings())
  ipcMain.handle('whatsapp:save-settings', (_, s) => whatsAppChannelService.saveSettings(s))
  ipcMain.handle('whatsapp:routes', () => whatsAppChannelService.getRoutes())
  ipcMain.handle('whatsapp:route-message', (_, { text, from }) => whatsAppChannelService.routeIncoming(text, from || 'User', win))
  ipcMain.handle('whatsapp:compose-draft', (_, id) => whatsAppChannelService.composeDraft(id))
  ipcMain.handle('desktop:voice-stack-status', () => integrationService.getVoiceStackStatus())
  ipcMain.handle('desktop:voice-stack-speak', (_, { text, options }) => integrationService.speakWithVoiceStack(text, options))
  ipcMain.handle('desktop:voice-stack-diagnose', () => integrationService.diagnoseVoiceStack())
  ipcMain.handle('desktop:voice-stack-build', () => integrationService.buildVoiceStackNeeds())
  ipcMain.handle('silva-events:get-recent', (_, l) => eventBus.getEvents(l))
  ipcMain.handle('automation:get-events', () => automationService.getEvents())
  ipcMain.handle('automation:open-browser', (_, t) => automationService.openBrowser(t))
  ipcMain.handle('automation:research-web', async (_, q) => {
    const sessionId = `research-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    eventBus?.emit('tool.called', 'automation', { sessionId, tool: 'silva.search_web', args: { q } }, sessionId);
    const [trace, opened] = await Promise.all([webResearchService.search(q, sessionId).catch(() => ({ ok: false, results: [] })), automationService.researchWeb(q)]);
    return { ...opened, trace };
  })
  ipcMain.handle('browser-operator:get-state', () => browserOperator.getState())
  ipcMain.handle('browser-operator:open', (_, t) => { const p = typeof t === 'object' ? t : { target: t }; return browserOperator.open(p.target, p.sessionId, p.label) })
  ipcMain.handle('browser-operator:navigate', (_, t) => { const p = typeof t === 'object' ? t : { target: t }; return browserOperator.navigate(p.target, p.sessionId) })
  ipcMain.handle('browser-operator:read', (_, s) => browserOperator.readPage(s))
  ipcMain.handle('browser-operator:click', (_, p) => typeof p === 'object' ? browserOperator.click(p.selector, p.sessionId) : browserOperator.click(p))
  ipcMain.handle('browser-operator:type', (_, { selector, text, sessionId }) => browserOperator.type(selector, text, sessionId))
  ipcMain.handle('browser-operator:screenshot', (_, s) => browserOperator.screenshot(s))
  ipcMain.handle('browser-operator:inspect', (_, s) => browserOperator.inspectScreen(s))
  ipcMain.handle('outlook:classic-status', () => integrationService.getClassicOutlookStatus())
  ipcMain.handle('outlook:classic-messages', async (_, l) => {
    const m = await integrationService.listClassicOutlookMessages(l)
    if (Array.isArray(m)) {
      const processed = await processEmailIntelligence({ syncedAt: new Date().toISOString(), folders: [{ id: 'classic-outlook-inbox', displayName: 'Classic Outlook Inbox', syncedCount: m.length }], messages: m.map((msg: any) => ({ ...msg, id: `classic:${msg.id}`, folderId: `classic:${msg.folderName || 'mailbox'}`, folderName: msg.folderName || 'Classic Outlook Mailbox', categoryId: 'classic-outlook', categoryLabel: 'Classic Outlook', agentId: 'paperclip-full', approvalStatus: 'pending-review' })), summary: { 'classic-outlook': m.length } }, 'Classic Outlook', { taskLimit: 20 })
      const stats = emailIndexService.getGlobalStats();
      const existingState = store.get('classicMailSyncState', {}) as any;
      store.set('classicMailSyncState', {
        ...existingState,
        source: 'Classic Outlook',
        totalIndexed: Math.max(Number(existingState.totalIndexed || 0), Number(processed?.mailboxMemory?.totalIndexed || 0), Number(stats.totalIndexed || 0)),
        globalTotalIndexed: Math.max(Number(stats.totalIndexed || 0), Number(processed?.mailboxMemory?.totalIndexed || 0)),
        totalAccounts: Math.max(Number(existingState.totalAccounts || 0), Number(stats.totalAccounts || 0)),
        lastBatchCount: m.length,
        updatedAt: new Date().toISOString(),
        complete: Boolean(existingState.complete)
      });
    }
    return m
  })
  ipcMain.handle('outlook:classic-sync-batch', async (_, arg) => {
    const existingState = store.get('classicMailSyncState', {}) as any;
    const result = await integrationService.syncClassicOutlookMessagesBatch({
      batchSize: arg?.batchSize || 1000,
      reset: Boolean(arg?.reset),
      state: existingState
    });
    if (result?.ok === false) return result;
    const messages = Array.isArray(result?.messages) ? result.messages : [];
    const accountsInBatch = new Set(messages.map((m: any) => m.accountId || 'classic-outlook'));

    // Register accounts if they were found in status but not yet in index
    const status = await integrationService.getClassicOutlookStatus().catch(() => null);
    if (status?.ok && Array.isArray(status.accounts)) {
      for (const acc of status.accounts) {
        const accId = `classic-${acc.displayName}`;
        if (!emailIndexService.getAccountMetadata(accId)) {
          emailIndexService.registerAccount({
            accountId: accId,
            email: acc.displayName.includes('@') ? acc.displayName : `${acc.displayName.replace(/\s+/g, '.')}.local`,
            displayName: `Classic: ${acc.displayName}`
          });
        }
      }
    }

    for (const accId of accountsInBatch) {
      const accountMessages = messages.filter((m: any) => (m.accountId || 'classic-outlook') === accId);
      await emailIndexService.saveEmails(accId as string, accountMessages);
    }
    const processed = await processEmailIntelligence({
      ok: true,
      syncedAt: new Date().toISOString(),
      folders: [{ id: 'classic-outlook-paged', displayName: 'Classic Outlook Mailbox', syncedCount: messages.length }],
      messages,
      batchCount: messages.length,
      complete: Boolean(result?.state?.complete),
      state: result?.state || {}
    }, 'Classic Outlook', { taskLimit: 20 });
    const stats = emailIndexService.getGlobalStats();
    const nextState = {
      ...(result?.state || {}),
      totalIndexed: processed?.mailboxMemory?.totalIndexed || stats.totalIndexed || 0,
      globalTotalIndexed: stats.totalIndexed || 0,
      totalAccounts: stats.totalAccounts || accountsInBatch.size,
      totalAvailable: Number(status?.itemCount || 0),
      lastBatchCount: messages.length,
      updatedAt: new Date().toISOString(),
      source: 'Classic Outlook'
    };
    store.set('classicMailSyncState', nextState);
    return { ok: true, source: 'Classic Outlook', messages, batchCount: messages.length, complete: nextState.complete, state: nextState };
  })
  ipcMain.handle('outlook:classic-sync-state', async () => {
    const status = await integrationService.getClassicOutlookStatus().catch(() => null);
    const stats = emailIndexService.getGlobalStats?.() || {};
    const memoryTotal = workspaceService.getEmailIntelligence?.()?.mailboxMemory?.totalIndexed || workspaceService.getEmailIntelligence?.()?.memory?.totalIndexed || 0;
    const saved = store.get('classicMailSyncState', null) as any;
    return {
      source: 'Classic Outlook',
      complete: Boolean(saved?.complete),
      ...(saved || {}),
      totalIndexed: Math.max(Number(saved?.totalIndexed || 0), Number(memoryTotal || 0), Number(stats.totalIndexed || 0)),
      globalTotalIndexed: Math.max(Number(saved?.globalTotalIndexed || 0), Number(stats.totalIndexed || 0)),
      totalAccounts: Math.max(Number(saved?.totalAccounts || 0), Number(stats.totalAccounts || 0), Number(status?.accounts?.length || 0)),
      totalAvailable: Math.max(Number(saved?.totalAvailable || 0), Number(status?.itemCount || 0)),
      lastBatchCount: Number(saved?.lastBatchCount || 0)
    };
  })
  ipcMain.handle('outlook:classic-reset-sync', () => {
    store.delete('classicMailSyncState');
    return { ok: true };
  })
  ipcMain.handle('microsoft:graph-start-login', () => microsoftGraph.startDeviceLogin())
  ipcMain.handle('microsoft:graph-complete-login', () => microsoftGraph.completeDeviceLogin())
  ipcMain.handle('microsoft:graph-status', (_, accountId) => microsoftGraph.getAccountStatus(accountId))
  ipcMain.handle('microsoft:graph-list-accounts', () => emailIndexService.getAllAccounts())
  ipcMain.handle('microsoft:graph-search-index', (_, { query, accountId }) => emailIndexService.searchEmails(query, accountId))
  ipcMain.handle('microsoft:graph-mailbox-settings', (_, accountId) => microsoftGraph.getMailboxSettings(accountId))
  ipcMain.handle('microsoft:graph-messages', (_, arg) => {
    const payload = typeof arg === 'object' && arg !== null ? arg : { limit: arg };
    return microsoftGraph.listMessages(payload.accountId, payload.limit)
  })
  ipcMain.handle('microsoft:graph-folders', (_, accountId) => microsoftGraph.listMailFolders(accountId))
  ipcMain.handle('microsoft:graph-sync-email-intelligence', async (_, arg) => {
    const payload = typeof arg === 'object' && arg !== null ? arg : { limitPerFolder: arg };
    // Legacy sync call fallback
    const d = await microsoftGraph.syncEmailIntelligenceBatch(payload.accountId, { batchSize: payload.limitPerFolder || 100 });
    if (d?.ok === false) return d;
    return processEmailIntelligence(d, 'Microsoft Graph') 
  })
  ipcMain.handle('microsoft:graph-sync-email-batch', async (_, arg) => {
    // Frontend may pass { batchSize, reset } directly without accountId
    let resolvedAccountId: string | undefined = undefined;
    let opts: any = { batchSize: 500 };
    if (typeof arg === 'string') {
      resolvedAccountId = arg;
    } else if (arg && typeof arg === 'object') {
      if (typeof arg.accountId === 'string') {
        resolvedAccountId = arg.accountId;
      }
      if (arg.batchSize || arg.reset !== undefined) {
        opts = { batchSize: arg.batchSize || arg.options?.batchSize || 500, reset: arg.reset ?? arg.options?.reset };
      } else if (arg.options) {
        opts = arg.options;
      }
    }
    // Auto-resolve accountId from stored tokens if not provided
    if (!resolvedAccountId) {
      const tokens = store.get('microsoftGraphTokens', {}) as Record<string, any>;
      resolvedAccountId = Object.keys(tokens)[0];
    }
    if (!resolvedAccountId) {
      return { ok: false, error: 'No Microsoft Graph account connected. Please complete login first.' };
    }
    const d = await microsoftGraph.syncEmailIntelligenceBatch(resolvedAccountId, opts);
    if (d?.ok === false) return d;
    return processEmailIntelligence(d, 'Microsoft Graph') 
  })
  ipcMain.handle('microsoft:graph-mail-sync-state', (_, accountId) => microsoftGraph.getAccountMetadata(accountId))
  ipcMain.handle('microsoft:graph-reset-mail-sync', (_, accountId) => {
    let resolvedAccountId = typeof accountId === 'string' ? accountId : '';
    if (!resolvedAccountId) {
      const tokens = store.get('microsoftGraphTokens', {}) as Record<string, any>;
      resolvedAccountId = Object.keys(tokens)[0] || '';
    }
    if (!resolvedAccountId) return { ok: false, error: 'No Microsoft Graph account connected.' };
    const stateKey = `mailSyncState_${resolvedAccountId}`;
    store.delete(stateKey);
    return { ok: true };
  })
  ipcMain.handle('microsoft:graph-set-secret', (_, secret) => microsoftGraph.setSecret(secret))
  ipcMain.handle('microsoft:graph-set-config', (_, config) => microsoftGraph.setConfig(config))
  ipcMain.handle('microsoft:graph-get-config', () => microsoftGraph.getConfig())
  ipcMain.handle('tinyfish:run-agent', (_, options) => tinyFish.runAgent(options))
  ipcMain.handle('tinyfish:set-api-key', (_, key) => tinyFish.setApiKey(key))
  ipcMain.handle('tinyfish:api-status', () => tinyFish.getApiStatus())
  ipcMain.handle('tinyfish:get-status', (_, sessionId) => tinyFish.getSessionStatus(sessionId))
  ipcMain.handle('microsoft:graph-mail-action', async (_, arg) => {
    const accountId = arg?.accountId;
    const action = arg?.action || arg;
    const id = `mail-action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    if (!action?.approved) { 
      eventBus?.emit('mail.action.proposed', 'mail-me', { actionId: id, action, accountId }); 
      return { ok: false, requiresApproval: true, actionId: id, message: 'Action requires user approval.' } 
    }
    eventBus?.emit('mail.action.approved', 'mail-me', { actionId: id, action, accountId }); 
    let r: any
    if (action.type === 'mark-read') r = await microsoftGraph.markMessageRead(accountId, action.messageId, true)
    else if (action.type === 'mark-unread') r = await microsoftGraph.markMessageRead(accountId, action.messageId, false)
    else if (action.type === 'create-reply-draft') r = await microsoftGraph.createReplyDraft(accountId, action.messageId, action.comment)
    else throw new Error(`Unsupported action: ${action.type}`)
    eventBus?.emit('mail.action.completed', 'mail-me', { actionId: id, action, accountId, result: r }); 
    return r
  })
  ipcMain.handle('microsoft:graph-disconnect', (_, accountId) => microsoftGraph.disconnect(accountId))
  ipcMain.handle('app:open', (_, n) => integrationService.openApp(n))
  ipcMain.handle('file:analyze-uk', (_, { path, type }) => integrationService.analyzeUKDocument(path, type))
  ipcMain.handle('ai:toggle-connector', (_, { id, state }) => providerService.toggleConnector(id, state))
  ipcMain.handle('ai:get-connectors', () => providerService.getConnectorsState())
  ipcMain.handle('ai:connect-google', () => providerService.connectWithGoogle())
  ipcMain.handle('ai:save-api-key', (_, { provider, key }) => providerService.saveAPIKey(provider, key))
  ipcMain.handle('ai:get-api-keys', () => providerService.getAPIKeys())
  ipcMain.handle('ai:get-connector-statuses', async () => {
    const [routes, keys, graph, outlook, jan, ollama, lm, openCode, browser] = await Promise.all([
      toolRegistry.getConnectors().catch(() => ({})),
      providerService.getAPIKeys().catch(() => ({})),
      microsoftGraph.getAccountStatus().catch(() => ({ connected: false })),
      integrationService.getClassicOutlookStatus().catch(() => ({})),
      aiService.getJanEngineStatus().catch(() => ({})),
      aiService.listOllamaModels().catch(() => []),
      aiService.checkLMStudio().catch(() => null),
      aiService.checkOpenCode().catch(() => null),
      Promise.resolve(browserOperator.getState()).catch(() => ({}))
    ])
    const known = Array.from(new Set([...Object.keys(routes || {}), 'jan-turboquant', 'ollama', 'lm-studio', 'opencode', 'my-browser', 'outlook-mail', 'outlook-calendar', 'google-gemini', 'openrouter', 'nvidia', 'huggingface']))
    const apiKeyProvider: Record<string, string> = {
      'google-gemini': 'gemini',
      openrouter: 'openrouter',
      nvidia: 'nvidia',
      huggingface: 'huggingface',
      opencode: 'opencode'
    };
    const makeStatus = (id: string) => {
      const routeEnabled = routes?.[id] !== false;
      const apiKeySaved = Boolean(apiKeyProvider[id] && keys?.[apiKeyProvider[id]]);
      const oauthConnected = (
        (['outlook-mail', 'outlook-calendar'].includes(id) && Boolean(graph.connected)) ||
        (id === 'classic-outlook' && Boolean(outlook.ok))
      );
      const liveVerified = (
        (id === 'jan-turboquant' && Boolean(jan.apiOnline)) ||
        (id === 'ollama' && Array.isArray(ollama) && ollama.length > 0) ||
        (id === 'lm-studio' && Boolean(lm?.online || lm?.data)) ||
        (id === 'opencode' && Boolean(openCode?.online) && !openCode?.authRequired) ||
        (id === 'my-browser' && Boolean(browser?.online)) ||
        oauthConnected
      );
      return {
        id,
        routeEnabled,
        apiKeySaved,
        oauthConnected,
        liveVerified,
        status: !routeEnabled ? 'disabled' : liveVerified ? 'live verified' : apiKeySaved ? 'api key saved' : oauthConnected ? 'oauth connected' : 'route only',
        detail: id === 'jan-turboquant'
          ? (jan.apiOnline ? `Jan + TurboQuant API verified at ${jan.apiUrl || 'localhost:6767/v1'}` : jan.installed ? 'Bundled Jan runtime found; start/load a GGUF model' : 'Bundled Jan runtime missing')
          : ['outlook-mail', 'outlook-calendar'].includes(id)
            ? (graph.connected ? `Microsoft Graph connected: ${graph.profile?.mail || graph.profile?.userPrincipalName || graph.accountId || 'account'}` : 'Microsoft Graph OAuth not connected')
            : id === 'my-browser'
              ? (browser?.online ? `Browser Operator open: ${browser.url || 'active session'}` : 'Browser Operator not opened yet')
              : apiKeyProvider[id]
                ? (apiKeySaved ? `${apiKeyProvider[id]} API key saved locally` : `${apiKeyProvider[id]} API key missing`)
                : 'Route enabled only. Add OAuth/API/MCP server before private data access works.'
      };
    };
    return Object.fromEntries(known.map(id => [id, makeStatus(id)]))
  })
  ipcMain.handle('app:open-external', (_, n) => integrationService.openExternalApp(n))
  ipcMain.handle('tools:get-all', () => toolRegistry.getTools())
  ipcMain.handle('tools:get-connectors', () => toolRegistry.getConnectors())
  ipcMain.handle('tools:save-connector', (_, c) => toolRegistry.saveConnector(c?.id || c?.name, c?.enabled ?? true))
  ipcMain.handle('tools:toggle-connector', (_, p) => toolRegistry.toggleConnector(p?.id || p?.name, p?.enabled))
  ipcMain.handle('tools:execute', (_, { toolId, params }) => toolRegistry.executeTool(toolId, params))
  ipcMain.handle('skills:get-installed', () => skillsEngine.getInstalledSkills())
  ipcMain.handle('skills:get-packages', () => skillsEngine.getSkillPackages())
  ipcMain.handle('skills:get-guidance', () => skillsEngine.getSkillGuidance())
  ipcMain.handle('skills:toggle', (_, { skillId, installed }) => skillsEngine.toggleSkill(skillId, installed))
  ipcMain.handle('skills:propose', (_, a) => skillsEngine.proposeAction(a))
  ipcMain.handle('skills:get-pending', () => skillsEngine.getPendingActions())
  ipcMain.handle('skills:approve', (_, id) => skillsEngine.approveAction(id))
  ipcMain.handle('skills:deny', (_, id) => skillsEngine.denyAction(id))
  ipcMain.handle('agents:get-all', () => orchestrator.getAgents())
  ipcMain.handle('agents:update-status', (_, { id, status, background }) => orchestrator.updateAgentStatus(id, status, background))
  ipcMain.handle('agents:create-task', async (_, { input, agentId }) => orchestrator.createTask(input, agentId, win))
  ipcMain.handle('agents:get-tasks', () => orchestrator.getTasks())
  ipcMain.handle('workspace:get-mail', () => workspaceService.getMailSettings())
  ipcMain.handle('workspace:save-mail', (_, s) => workspaceService.saveMailSettings(s))
  ipcMain.handle('workspace:get-whatsapp-drafts', () => workspaceService.getWhatsAppDrafts())
  ipcMain.handle('workspace:save-whatsapp-draft', (_, d) => workspaceService.saveWhatsAppDraft(d))
  ipcMain.handle('workspace:mark-whatsapp-opened', (_, id) => workspaceService.updateWhatsAppDraftStatus(id, 'opened'))
  ipcMain.handle('workspace:get-tasks', () => workspaceService.getScheduledTasks())
  ipcMain.handle('workspace:save-tasks', (_, t) => workspaceService.saveScheduledTasks(t))
  ipcMain.handle('workspace:run-scheduled-task', (_, id) => schedulerService.runNow(id))
  ipcMain.handle('workspace:get-scheduled-runs', () => schedulerService.getRuns())
  ipcMain.handle('workspace:get-settings', () => workspaceService.getGeneralSettings())
  ipcMain.handle('workspace:save-settings', (_, s) => workspaceService.saveGeneralSettings(s))
  ipcMain.handle('workspace:get-model-preset', () => workspaceService.getModelPreset())
  ipcMain.handle('workspace:save-model-preset', (_, p) => workspaceService.saveModelPreset(p))
  ipcMain.handle('workspace:get-silva-memory', () => workspaceService.getSilvaMemory())
  ipcMain.handle('workspace:save-silva-memory', (_, m) => workspaceService.saveSilvaMemory(m))
  ipcMain.handle('workspace:get-email-intelligence', () => workspaceService.getEmailIntelligence())
  ipcMain.handle('workspace:approve-email-route', (_, { messageId, status }) => workspaceService.approveEmailRoute(messageId, status))
  ipcMain.handle('workspace:get-projects', () => workspaceService.getProjects())
  ipcMain.handle('workspace:save-project', (_, p) => workspaceService.saveProject(p))
  ipcMain.handle('workspace:delete-project', (_, id) => workspaceService.deleteProject(id))
  ipcMain.handle('workspace:add-project-files', (_, { id, files }) => workspaceService.addProjectFiles(id, files))
  ipcMain.handle('workspace:start-project-task', async (_, { id, prompt, agentId }) => {
    const project = workspaceService.addProjectTask(id, prompt, agentId)
    const context = `Project: ${project.name}\nTask: ${prompt}`
    const task = await orchestrator.createTask(context, agentId || 'hermes-full', win)
    return { ok: true, project, task }
  })
  ipcMain.handle('wide-research:get-runs', () => wideResearchService.getRuns())
  ipcMain.handle('wide-research:get-blackboard', (_, id) => wideResearchService.getBlackboard(id))
  ipcMain.handle('wide-research:start', (_, { brief, items }) => wideResearchService.startRun(brief, items))
  ipcMain.handle('artifacts:create-slides', (_, { title, brief }) => artifactService.createSlides(title, brief))
  ipcMain.handle('artifacts:create-website', (_, { title, brief }) => artifactService.createWebsite(title, brief))
  ipcMain.handle('artifacts:create-design', (_, { title, brief }) => artifactService.createDesign(title, brief))
  ipcMain.handle('artifacts:analyze-data', (_, p) => artifactService.analyzeData(p))
  ipcMain.handle('artifacts:create-justice-case', (_, { title, brief }) => artifactService.createJusticeCasePack(title, brief))
  ipcMain.handle('artifacts:create-purchase-protection', (_, { title, brief }) => artifactService.createPurchaseProtectionPack(title, brief))
  ipcMain.handle('artifacts:reveal-root', () => artifactService.revealRoot())

  setTimeout(syncAllMailAutomatically, 60000)
  setInterval(syncAllMailAutomatically, 10 * 60 * 1000)

  win.webContents.on('did-finish-load', () => { win?.webContents.send('main-process-message', (new Date).toLocaleString()) })
  win.webContents.on('context-menu', (_: any, params: any) => {
    Menu.buildFromTemplate([
      { label: 'Chat Lab', click: () => win?.webContents.send('app:navigate', 'chat') },
      { label: 'Model Hub', click: () => win?.webContents.send('app:navigate', 'models') },
      { label: 'Mail ME', click: () => win?.webContents.send('app:navigate', 'mail') },
      { label: 'WhatsApp ME', click: () => win?.webContents.send('app:navigate', 'whatsapp') },
      { label: 'My Computer', click: () => win?.webContents.send('app:navigate', 'computer') },
      { type: 'separator' },
      { label: 'Sync Mail Intelligence', click: () => win?.webContents.send('mail:sync-intelligence') },
      { label: 'Open WhatsApp', click: () => integrationService.openApp('whatsapp') },
      { label: 'Open Video Call', click: () => integrationService.openApp('video call') },
      { label: 'Open Voice Stack', click: () => integrationService.openApp('voice stack') },
      { label: 'Open Browser', click: () => automationService.openBrowser() },
      { type: 'separator' },
      { label: 'Copy', role: 'copy', enabled: params.selectionText.length > 0 },
      { label: 'Paste', role: 'paste' }
    ]).popup()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL).catch(() => { setTimeout(() => { win?.loadURL(process.env.VITE_DEV_SERVER_URL!) }, 1000) })
  } else {
    win.loadFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.html'))
  }
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin' && isQuitting) { app.quit(); win = null; } })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); })
