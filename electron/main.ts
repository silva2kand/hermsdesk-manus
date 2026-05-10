import electron from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage, Notification } = electron
type BrowserWindowType = InstanceType<typeof BrowserWindow>
type TrayType = InstanceType<typeof Tray>

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
import { SelfImprovementService } from './services/SelfImprovementService'

let emailIndexService: any;
let tinyFish: any;
let selfImprovementService: any;

function initializeStoreAndServices() {
   try {
     store = new Store({ 
       atomically: false,
       watch: false,
       defaults: {
      connectors: {
        'my-browser': true, 'ollama': true, 'lm-studio': true, 'google-gemini': true,
        'opencode': true, 'openrouter': true, 'tinyfish': true, 'instagram': true, 'instagram-marketplace': true,
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
        modelPreset: { provider: 'Auto', model: 'Auto mix' }
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
  skillsEngine = new SkillsEngineService(store, microsoftGraph, emailIndexService, browserOperator, integrationService)
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
  orchestrator.setTinyFishService?.(tinyFish)
  wideResearchService.setTinyFishService?.(tinyFish)
  selfImprovementService = new SelfImprovementService(store, {
    aiService,
    emailIndexService,
    workspaceService,
    eventBus,
    skillsEngine,
    tinyFish,
    whatsAppChannelService,
    browserOperator,
    providerService
  })
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
     skillsEngine = new SkillsEngineService(store, microsoftGraph, emailIndexService, browserOperator, integrationService);
     workspaceService = new WorkspaceService(store);
     orchestrator = new MultiAgentOrchestrator(store, aiService, skillsEngine, workspaceService);
     schedulerService = new SchedulerService(store, workspaceService, orchestrator);
     wideResearchService = new WideResearchService(store, aiService);
     automationService = new AutomationService(store);
     artifactService = new ArtifactService();
     eventBus = new EventBusService(store);
     webResearchService = new SilvaWebResearchService(eventBus);
     whatsAppChannelService = new WhatsAppChannelService(store, orchestrator, integrationService, eventBus);
     tinyFish = new TinyFishService(store);
     orchestrator.setTinyFishService?.(tinyFish);
     wideResearchService.setTinyFishService?.(tinyFish);
     selfImprovementService = new SelfImprovementService(store, {
       aiService,
       emailIndexService,
       workspaceService,
       eventBus,
       skillsEngine,
       tinyFish,
       whatsAppChannelService,
       browserOperator,
       providerService
     });
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
    const billPattern = /(bill|invoice|payment due|pay now|statement|arrears|overdue|council tax|utility|renewal|premium|direct debit|balance due|missed payment|failed payment|payment failed|chargeback|refund|return)/i
    const deadlinePattern = /(due|deadline|by|before|expires|renewal|hearing|appointment|court|payment date|final notice|enforcement|fine|penalty|licensing|licence|planning)/i
    const renewalPattern = /(renewal|renew|expires|expiry|policy|premium|quote|cover|mot|road tax|vehicle tax|annual|subscription)/i
    const insurancePattern = /(insurance|policy|premium|renewal|cover|quote|claim|no claims|underwriter|aviva|admiral|direct line|tesco bank|petplan|simply business|compare.?the.?market|go.?compare|money.?super.?market)/i
    const supplierPattern = /(supplier|wholesale|wholesaler|stock|stock order|shortage|order|purchase order|invoice|statement|delivery|delivery note|parcel|sales rep|representative|catalogue|promotion|case price|unit price|price change)/i
    const staffInvoicePattern = /(staff|employee|wage|payroll|timesheet|receipt|invoice|bill|expense|whatsapp|uploaded|attachment|photo)/i
    const officialPattern = /(hmrc|vat|tax|council|lancaster city council|land registry|solicitor|conveyancer|court|tribunal|insurance|mot|dvla|nhs|gp|companies house|planning|licensing|licence|enforcement|fine|penalty)/i
    const zReportPattern = /(z[-\s]?report|epos|end of day|daily sales|till report|staff id|pos id)/i
    const legalPropertyPattern = /(land registry|hm land|certificate of compliance|requisition|ground rent|service charge|service charges|deposit dispute|tenancy dispute|leasehold|freehold|steamer street|howlish view|langdale place|arrears|solicitor|conveyancer|rc\.legal|grangeford|fraud report|nfrc|court|tribunal|planning|licensing|licence|enforcement|fine|penalty)/i
    const businessBillPattern = /(silva retail|newton newsagent|newton store|parfetts|wholesaler|supplier|e-invoice|customer 105105|z-report|epos|pos alert|card machine|card payment|payment processor|terminal|merchant|takepayments|chargeback|invoice|statement|receipt|vat|paye|payroll|bank statement|credit card|loan statement|overdraft|lender decision|funding offer|delivery note|refund|return|till discrepancy|void)/i
    const homeBillPattern = /(council tax|water|united utilities|electric|gas|energy|broadband|mobile|mortgage|rent|ground rent|service charge|building insurance|contents insurance|home insurance|direct debit|halifax|credit card)/i
    const accountingEvidencePattern = /(hmrc|vat|vat submission|tax return|making tax digital|mtd|self assessment|companies house|accountant|bookkeeping|cashflow|cash flow|p&l|profit and loss|balance sheet|year.?end|myt accounts|invoice|receipt|statement|bank statement|credit card|loan statement|overdraft|paye|payroll|direct debit|parfetts|e-invoice|silva retail|newton newsagent|newton store|utility bill|gas bill|electric bill|water bill|broadband bill|insurance document)/i
    const localPropertyPattern = /(lancaster|morecambe|heysham|la1|la2|la3|la4|la5|la6|closed shop|corner.?shop|mixed.?use|commercial premises|retail premises|newsagent|shop premises|off.?market|auction|estate agent|mortgage broker|surveyor|epc|daltons business)/i
    const operationalPattern = /(pos alert|staff activity|till open|till close|open\/close|refund|void|stock order|delivery confirmation|supplier shortage|shortage|price change|tobacco|lottery compliance|card machine|payment processor|cctv|pos system update)/i
    const personalAdminPattern = /(nhs|gp|dvla|personal bank|personal insurance|family legal|family document)/i
    const distantPropertyNoisePattern = /(birmingham|west midlands|manchester|liverpool|york|north east|carlisle|penrith|cumbria|lake district)/i
    const marketingNoisePattern = /(newsletter|digest|substack|voucher|win £|win\s?\d|fashion|festival|sale|discount|clearance|promotion|promo|marketing|campaign|petition|organise\.network|national lottery|cash converters|rightmove news|home worth|valuation update|most-viewed homes|unsubscribe|black friday|christmas offer)/i
    const autoReplyNoisePattern = /(automatic reply|undeliverable|out of office|delivery status notification)/i
    const knownSenderPatterns = {
      accountant: /(mytaccounts\.co\.uk|notification\.intuit\.com)/i,
      official: /(tax\.service\.gov\.uk|advice\.hmrc\.gov\.uk|companies\.house@notifications\.service\.gov\.uk|autoenrol\.tpr\.gov\.uk|donotreply\.evl@dvla\.gov\.uk|actionfraud\.police\.uk|westmidlands\.police\.uk)/i,
      legal: /(rc\.legal|holdenslaw\.com|williamharrissolicitors@gmail\.com|eppcs\.co\.uk)/i,
      councilProperty: /(lancaster\.gov\.uk|amcsurveyors\.co\.uk|bpauctions\.co\.uk|auctioneers\.co\.uk)/i,
      paymentProvider: /(elavon\.com|elavonsecuritymanager\.com|paypoint\.co\.uk|fiserv\.com|clover\.com|vivawallet\.com|paymentsave\.co\.uk|paypal\.co\.uk)/i,
      businessBankingFunding: /(mail\.tide\.co|info\.tide\.co|anna\.money|nationwide\.co\.uk|nationwidefinance\.co\.uk|loqbox\.com|iwoca\.co\.uk|fundingcircle\.com|capitalone\.co\.uk|notification\.capitalone\.co\.uk)/i,
      insurance: /(simplybusiness\.co\.uk|darwin-insurance\.com|igo4\.com|vavista\.com|insurancefactory\.co\.uk)/i,
      storeOps: /(visualbusinessretail\.co\.uk|jti360\.co\.uk|jti\.com|parcelly\.com|sysco\.com|deliveroo\.co\.uk|loyalty\.snackdisplay\.co\.uk)/i,
      utilitiesTelecom: /(telecom-service\.co\.uk|mails\.three\.co\.uk|contact\.sky|inform\.bt\.com)/i,
      documentSigning: /(docusign\.net)/i
    }
    const senderText = (message: any) => `${message.sender || ''} ${message.senderEmail || ''}`.toLowerCase()
    const knownSenderCategory = (message: any) => {
      const sender = senderText(message)
      for (const [key, pattern] of Object.entries(knownSenderPatterns)) {
        if (pattern.test(sender)) return key
      }
      return ''
    }
    const itemState = store.get('mailMemoryItemState', {}) as Record<string, any>
    const sorted = [...messages].sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
    const messageText = (message: any) => `${message.subject || ''} ${message.sender || ''} ${message.senderEmail || ''} ${message.bodyPreview || ''} ${message.categoryLabel || ''}`.toLowerCase()
    const mailPriorityScore = (message: any) => {
      const text = messageText(message)
      let score = 0
      if (message.importance === 'high') score += 35
      if (message.flagStatus === 'flagged') score += 30
      if (message.unread) score += 4
      if (message.hasAttachments) score += 12
      const senderCategory = knownSenderCategory(message)
      if (senderCategory) score += 45
      if (/(official|legal|accountant|paymentProvider|businessBankingFunding|insurance)/i.test(senderCategory)) score += 20
      if (legalPropertyPattern.test(text)) score += 85
      if (/(hmrc|vat|tax return|making tax digital|self assessment|companies house|accountant|myt accounts)/i.test(text)) score += 75
      if (businessBillPattern.test(text) && (billPattern.test(text) || moneyPattern.test(text) || message.hasAttachments)) score += 70
      if (homeBillPattern.test(text) && (billPattern.test(text) || moneyPattern.test(text))) score += 60
      if (billPattern.test(text) || moneyPattern.test(text)) score += 45
      if (deadlinePattern.test(text) || renewalPattern.test(text)) score += 35
      if (insurancePattern.test(text)) score += 28
      if (supplierPattern.test(text) && (message.hasAttachments || billPattern.test(text) || moneyPattern.test(text))) score += 24
      if (localPropertyPattern.test(text)) score += 22
      if (operationalPattern.test(text)) score += 18
      if (personalAdminPattern.test(text)) score += 16
      if (zReportPattern.test(text)) score += /void|refund|short|over|missing|failed|error|cash difference|variance/i.test(text) ? 50 : 8
      if (distantPropertyNoisePattern.test(text) && !legalPropertyPattern.test(text)) score -= 35
      if (marketingNoisePattern.test(text) && !legalPropertyPattern.test(text) && !(message.hasAttachments && billPattern.test(text))) score -= 55
      if (autoReplyNoisePattern.test(text)) score -= 45
      return score
    }
    const isPriorityMail = (message: any, floor = 35) => mailPriorityScore(message) >= floor
    const byPriorityThenDate = (a: any, b: any) => mailPriorityScore(b) - mailPriorityScore(a) || String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))
    const detectInsuranceType = (text: string) => {
      if (/(car|vehicle|motor|van|driver|mot|road tax)/i.test(text)) return 'car-insurance'
      if (/(shop|business|commercial|retail|public liability|employer.?s liability|stock|premises)/i.test(text)) return 'shop-business-insurance'
      if (/(pet|dog|cat|vet|petplan)/i.test(text)) return 'pet-insurance'
      if (/(property|home|house|building|contents|landlord|tenant|rent|mortgage)/i.test(text)) return 'property-insurance'
      if (/(life|critical illness|income protection|funeral)/i.test(text)) return 'life-insurance'
      return 'insurance'
    }
    const routeAgent = (message: any, text: string) => {
      const senderCategory = knownSenderCategory(message)
      if (senderCategory === 'legal' || senderCategory === 'official' || senderCategory === 'councilProperty') return 'solicitor-agent'
      if (senderCategory === 'accountant' || senderCategory === 'paymentProvider' || senderCategory === 'businessBankingFunding' || senderCategory === 'utilitiesTelecom') return 'accountant-agent'
      if (senderCategory === 'insurance' || senderCategory === 'storeOps') return 'purchase-guardian'
      if (legalPropertyPattern.test(text) || /(solicitor|conveyancer|land registry|court|tribunal|legal|law|freeholder|leasehold)/i.test(text)) return 'solicitor-agent'
      if (/(hmrc|vat|tax|accountant|payroll|invoice|receipt|statement|bill|payment|direct debit)/i.test(text)) return 'accountant-agent'
      if (/(insurance|renewal|policy|mot|quote|supplier|wholesale|stock|order)/i.test(text)) return 'purchase-guardian'
      return message.agentId || 'general-agent'
    }
    const memoryItem = (message: any, type: string, extra: any = {}) => {
      const saved = itemState[message.id] || {}
      const text = messageText(message)
      return {
        id: message.id,
        type,
        subject: message.subject,
        sender: message.sender || message.senderEmail,
        senderEmail: message.senderEmail,
        receivedAt: message.receivedAt,
        folderName: message.folderName,
        categoryLabel: message.categoryLabel,
        unread: Boolean(message.unread),
        preview: message.bodyPreview,
        assignedAgent: routeAgent(message, text),
        importanceStatus: saved.importanceStatus || 'unreviewed',
        followUpStatus: saved.followUpStatus || 'open',
        userNote: saved.userNote || '',
        lastReviewedAt: saved.lastReviewedAt || null,
        ...extra
      }
    }
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
      const text = messageText(message)
      return (billPattern.test(text) || moneyPattern.test(text) || ['council-bills', 'tax-vat-mot'].includes(message.categoryId)) &&
        isPriorityMail(message, 30) && !autoReplyNoisePattern.test(text)
    }).sort(byPriorityThenDate).slice(0, 80).map((message: any) => memoryItem(message, 'bill-payment', { priorityScore: mailPriorityScore(message), hasAttachments: Boolean(message.hasAttachments) }))
    const deadlines = sorted.filter((message: any) => deadlinePattern.test(`${message.subject || ''} ${message.bodyPreview || ''}`) && isPriorityMail(message, 30))
      .sort(byPriorityThenDate).slice(0, 80).map((message: any) => memoryItem(message, 'deadline', { priorityScore: mailPriorityScore(message), hasAttachments: Boolean(message.hasAttachments) }))
    const insuranceRenewals = sorted.filter((message: any) => {
      const text = messageText(message)
      return insurancePattern.test(text) || (renewalPattern.test(text) && /(car|vehicle|shop|business|pet|property|home|life|insurance|policy)/i.test(text))
    }).filter((message: any) => isPriorityMail(message, 25)).sort(byPriorityThenDate).slice(0, 80).map((message: any) => {
      const text = messageText(message)
      return memoryItem(message, detectInsuranceType(text), { renewal: renewalPattern.test(text), needsQuoteResearch: true, priorityScore: mailPriorityScore(message), hasAttachments: Boolean(message.hasAttachments) })
    })
    const supplierUpdates = sorted.filter((message: any) => supplierPattern.test(messageText(message)) && isPriorityMail(message, 20))
      .sort(byPriorityThenDate).slice(0, 80).map((message: any) => memoryItem(message, 'supplier-update', { priorityScore: mailPriorityScore(message), hasAttachments: Boolean(message.hasAttachments) }))
    const staffInvoices = sorted.filter((message: any) => staffInvoicePattern.test(messageText(message)) && /(invoice|receipt|bill|expense|attachment|photo|whatsapp|staff|employee)/i.test(messageText(message)))
      .filter((message: any) => isPriorityMail(message, 20)).sort(byPriorityThenDate).slice(0, 80).map((message: any) => memoryItem(message, 'staff-invoice', { priorityScore: mailPriorityScore(message), hasAttachments: Boolean(message.hasAttachments) }))
    const zReports = sorted.filter((message: any) => zReportPattern.test(messageText(message)))
      .sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
      .slice(0, 240).map((message: any) => {
        const text = messageText(message)
        return memoryItem(message, /void|refund|short|over|missing|failed|error|cash difference|variance|mismatch/i.test(text) ? 'z-report-abnormal' : 'z-report-fyi', {
          priorityScore: mailPriorityScore(message),
          hasAttachments: Boolean(message.hasAttachments),
          evidenceUse: 'shop accounting, sales history, VAT/tax, funding pack'
        })
      })
    const accountingEvidence = sorted.filter((message: any) => accountingEvidencePattern.test(messageText(message)) || (message.hasAttachments && (billPattern.test(messageText(message)) || moneyPattern.test(messageText(message)))))
      .filter((message: any) => !['legal', 'insurance'].includes(knownSenderCategory(message)) || accountingEvidencePattern.test(messageText(message)) || message.hasAttachments)
      .sort(byPriorityThenDate).slice(0, 240).map((message: any) => memoryItem(message, 'accounting-evidence', {
        priorityScore: mailPriorityScore(message),
        hasAttachments: Boolean(message.hasAttachments),
        evidenceUse: 'accountant, tax, VAT, bookkeeping, funding/funder pack'
      }))
    const legalEvidence = sorted.filter((message: any) => legalPropertyPattern.test(messageText(message)))
      .sort(byPriorityThenDate).slice(0, 160).map((message: any) => memoryItem(message, 'legal-evidence', {
        priorityScore: mailPriorityScore(message),
        hasAttachments: Boolean(message.hasAttachments),
        evidenceUse: 'legal/property case review and solicitor pack'
      }))
    const knownProviderEvidence = sorted.filter((message: any) => Boolean(knownSenderCategory(message)))
      .sort(byPriorityThenDate).slice(0, 240).map((message: any) => memoryItem(message, `known-provider-${knownSenderCategory(message)}`, {
        priorityScore: mailPriorityScore(message),
        hasAttachments: Boolean(message.hasAttachments),
        knownSenderCategory: knownSenderCategory(message),
        evidenceUse: 'trusted sender/provider memory'
      }))
    const upcomingImportant = sorted.filter((message: any) => {
      const text = messageText(message)
      return isPriorityMail(message, 30) && (
        message.unread || message.importance === 'high' || message.flagStatus === 'flagged' ||
        billPattern.test(text) || deadlinePattern.test(text) || renewalPattern.test(text) ||
        insurancePattern.test(text) || officialPattern.test(text) || legalPropertyPattern.test(text) ||
        businessBillPattern.test(text) || homeBillPattern.test(text) || localPropertyPattern.test(text)
      )
    }).sort(byPriorityThenDate).slice(0, 120).map((message: any) => {
      const text = messageText(message)
      const type = legalPropertyPattern.test(text) ? 'legal-property' : insurancePattern.test(text) ? detectInsuranceType(text) : billPattern.test(text) ? 'bill-payment' : deadlinePattern.test(text) ? 'deadline' : officialPattern.test(text) ? 'official-important' : localPropertyPattern.test(text) ? 'local-property-opportunity' : 'important-mail'
      return memoryItem(message, type, { renewal: renewalPattern.test(text), moneyMentioned: moneyPattern.test(text), priorityScore: mailPriorityScore(message), hasAttachments: Boolean(message.hasAttachments) })
    })
    const urgent = sorted.filter((message: any) => (message.importance === 'high' || message.flagStatus === 'flagged' || (message.unread && isPriorityMail(message, 45))) && isPriorityMail(message, 35))
      .sort(byPriorityThenDate).slice(0, 80).map((message: any) => memoryItem(message, 'urgent', {
        reason: message.importance === 'high' ? 'high importance' : message.flagStatus === 'flagged' ? 'flagged' : 'unread'
      }))
    return { generatedAt: new Date().toISOString(), totalIndexed: sorted.length, latestReceivedAt: sorted[0]?.receivedAt || null, unreadCount: sorted.filter((message: any) => message.unread).length, flaggedCount: sorted.filter((message: any) => message.flagStatus === 'flagged').length, categories, topSenders: Array.from(senderMap.values()).sort((a, b) => b.count - a.count).slice(0, 40), billsToPay, deadlines, insuranceRenewals, supplierUpdates, staffInvoices, zReports, accountingEvidence, legalEvidence, knownProviderEvidence, upcomingImportant, urgent }
  }

  const processEmailIntelligence = async (data: any, source = 'mailbox', options: { taskLimit?: number } = {}) => {
    const current = workspaceService.getEmailIntelligenceSummary?.() || { latestMessages: [], folders: [], summary: {}, mailboxMemory: {} }
    const statusById = new Map((current.latestMessages || current.messages || []).map((m: any) => [m.id, m.approvalStatus]))
    const processed = new Set(store.get('mailProcessedTaskIds', []) as string[])
    const incomingMessages = (data.messages || []).map((message: any) => ({
      ...message, source, approvalStatus: statusById.get(message.id) || message.approvalStatus || 'pending-review',
      actionPolicy: 'approval-required-for-send-delete-move-pay-file-submit-contact'
    }))
    const incomingIds = new Set(incomingMessages.map((message: any) => message.id))
    const retainedMessages = (current.latestMessages || current.messages || []).filter((message: any) => message.id && !incomingIds.has(message.id))
    const messages = [...incomingMessages, ...retainedMessages].sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))).slice(0, 2500)
    const foldersByKey = new Map<string, any>()
    ;[...(current.folders || []), ...(data.folders || [])].forEach((folder: any) => {
      const key = folder.id || `${source}:${folder.displayName || 'folder'}`
      foldersByKey.set(key, { ...foldersByKey.get(key), ...folder, source: folder.source || source })
    })
    const memory = buildEmailMemory(messages)
    const stats = emailIndexService.getGlobalStats?.() || {};
    const previousMemory = current.mailboxMemory || current.memory || {};
    const latestPossibleBills = [
      ...(memory.billsToPay || []),
      ...(previousMemory.billsToPay || [])
    ].filter((item: any, index: number, all: any[]) => item?.id && all.findIndex(other => other.id === item.id) === index)
      .sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
      .slice(0, 80);
    const latestDeadlines = [
      ...(memory.deadlines || []),
      ...(previousMemory.deadlines || [])
    ].filter((item: any, index: number, all: any[]) => item?.id && all.findIndex(other => other.id === item.id) === index)
      .sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
      .slice(0, 80);
    const mergeMemoryList = (key: string, limit = 80) => [
      ...(((memory as any)[key]) || []),
      ...(previousMemory[key] || [])
    ].filter((item: any, index: number, all: any[]) => item?.id && all.findIndex(other => other.id === item.id) === index)
      .sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
      .slice(0, limit);
    const compactMemory = {
      ...previousMemory,
      ...memory,
      totalIndexed: Math.max(Number(stats.totalIndexed || 0), Number(previousMemory.totalIndexed || 0), Number(memory.totalIndexed || 0)),
      unreadCount: Math.max(Number(previousMemory.unreadCount || 0), Number(memory.unreadCount || 0)),
      billsToPay: latestPossibleBills,
      deadlines: latestDeadlines,
      insuranceRenewals: mergeMemoryList('insuranceRenewals'),
      supplierUpdates: mergeMemoryList('supplierUpdates'),
      staffInvoices: mergeMemoryList('staffInvoices'),
      zReports: mergeMemoryList('zReports', 240),
      accountingEvidence: mergeMemoryList('accountingEvidence', 240),
      legalEvidence: mergeMemoryList('legalEvidence', 160),
      knownProviderEvidence: mergeMemoryList('knownProviderEvidence', 240),
      upcomingImportant: mergeMemoryList('upcomingImportant', 120),
      urgent: mergeMemoryList('urgent')
    };
    const merged = { ...data, folders: Array.from(foldersByKey.values()).slice(0, 250), messages, summary: compactMemory.categories, memory: compactMemory, mailboxMemory: compactMemory }
    workspaceService.saveEmailIntelligence(merged)

    const highValue = (message: any) => {
      const text = `${message.subject || ''} ${message.sender || ''} ${message.senderEmail || ''} ${message.bodyPreview || ''} ${message.categoryLabel || ''}`.toLowerCase()
      const marketingNoise = /(newsletter|digest|substack|voucher|fashion|festival|shopping|sale|discount|clearance|promotion|promo|marketing|property alerts|rightmove news|national lottery|cash converters|campaign|petition|organise\.network)/i.test(text)
      const strongEvidence = /(land registry|steamer street|howlish view|langdale place|ground rent|service charge|solicitor|rc\.legal|grangeford|hmrc|vat|tax return|accountant|invoice|statement|arrears|overdue|final notice|direct debit|council tax|credit card|bank statement|parfetts|silva retail|newton newsagent|newton store|fraud report|nfrc)/i.test(text)
      return strongEvidence || message.importance === 'high' || message.flagStatus === 'flagged' ||
        (!marketingNoise && message.unread && /(bill|invoice|payment|deadline|due|renewal|insurance|mot|supplier|wholesale|receipt|statement)/i.test(text)) ||
        ['solicitors', 'visa-sponsors', 'tax-vat-mot', 'council-bills', 'land-registry', 'accountant'].includes(message.categoryId)
    }
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
    const newArrivals = incomingMessages
      .filter((message: any) => message?.id && !statusById.has(message.id))
      .sort((a: any, b: any) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
      .slice(0, 12)
      .map((message: any) => ({
        id: message.id,
        subject: message.subject || '(No subject)',
        sender: message.sender || message.senderEmail || 'unknown',
        receivedAt: message.receivedAt,
        folderName: message.folderName,
        categoryLabel: message.categoryLabel || 'Mail',
        unread: Boolean(message.unread),
        preview: message.bodyPreview || ''
      }));
    const mailEvent = { source, incomingCount: incomingMessages.length, newArrivals, messageCount: merged.messages.length, newTasks: taskCandidates.length, syncedAt: merged.syncedAt };
    win?.webContents.send('mail:intelligence-updated', mailEvent)
    if (newArrivals.length && Notification?.isSupported?.()) {
      new Notification({
        title: `HermesDesk Mail ME: ${newArrivals.length} new email${newArrivals.length === 1 ? '' : 's'}`,
        body: `${newArrivals[0].sender}: ${newArrivals[0].subject}`.slice(0, 180)
      }).show();
    }
    eventBus?.emit('mail.index.batch', 'mail-me', { ...mailEvent, indexedCount: merged.messages.length, complete: data.complete, state: data.state })
    appLog('info', `Mail ME auto-analyzed ${merged.messages.length} emails from ${source}; ${taskCandidates.length} new agent tasks queued.`)
    return merged
  }

  let isSyncingMail = false;
  const syncAllMailAutomatically = async () => {
    if (isSyncingMail) return;
    isSyncingMail = true;
    try {
      try {
        const graphStatus = await microsoftGraph.getAccountStatus().catch(() => ({ connected: false, mailboxConnected: false }))
        if (graphStatus?.connected && graphStatus?.mailboxConnected) {
          const accounts = emailIndexService.getAllAccounts().filter((account: any) => !String(account.accountId || '').startsWith('classic-'))
          for (const account of accounts) {
            try {
              const data = await microsoftGraph.syncEmailIntelligenceBatch(account.accountId, { batchSize: 500 })
              await processEmailIntelligence(data, `Microsoft Graph (${account.email})`)
            } catch (error: any) {
              console.error(`Mail sync failed for ${account.email}:`, error)
            }
          }
        }
      } catch (error: any) { appLog('error', `Mail ME Graph auto-sync failed: ${error?.message || error}`) }

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

        // Fast incremental scan: always read the newest local Outlook items and de-dupe
        // against the persisted index. This avoids stale ReceivedTime filters after a full crawl.
        const latestMessages = await integrationService.listClassicOutlookMessages(2000)
        const seenByAccount = new Map<string, Set<string>>();
        const messages = (Array.isArray(latestMessages) ? latestMessages : []).filter((message: any) => {
          const accId = message.accountId || 'classic-outlook';
          if (!message.id) return false;
          if (!seenByAccount.has(accId)) seenByAccount.set(accId, emailIndexService.getKnownEmailIds(accId));
          return !seenByAccount.get(accId)?.has(message.id);
        });
        if (messages.length > 0) {
          appLog('info', `Mail ME Classic Outlook: found ${messages.length} new messages in latest scan.`);
          const accountsInBatch = new Set(messages.map((m: any) => m.accountId || 'classic-outlook'));
          for (const accId of accountsInBatch) {
            const accMessages = messages.filter((m: any) => (m.accountId || 'classic-outlook') === accId);
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
          const newest = messages.map((m: any) => m.receivedAt).filter(Boolean).sort().pop()
          if (newest) store.set('classicMailQuickScanAt', newest)
        } else {
           appLog('info', `Mail ME Classic Outlook: no new messages found in latest scan.`);
        }
      }
      const stats = emailIndexService.getGlobalStats();
      appLog('info', `Intelligence Hub Status: ${stats.totalIndexed} emails read and organized across ${stats.totalAccounts} accounts.`);
      win?.webContents.send('mail:intelligence-summary', stats);
    } catch (error: any) { appLog('error', `Mail ME auto-sync failed: ${error?.message || error}`) }
    finally {
      isSyncingMail = false;
    }
  }

  schedulerService?.setWindow(win); schedulerService?.start(); wideResearchService?.setWindow(win); automationService?.setWindow(win); browserOperator?.setWindow(win); eventBus?.setWindow(win); selfImprovementService?.setWindow(win); selfImprovementService?.start?.(); orchestrator?.setEventBus?.(eventBus); wideResearchService?.setEventBus?.(eventBus); automationService?.setEventBus?.(eventBus); browserOperator?.setEventBus?.(eventBus); whatsAppChannelService?.ensureActive?.().catch((error: any) => appLog('error', `WhatsApp always-active check failed: ${error?.message || error}`))

  ipcMain.handle('ai:list-models', () => aiService.listOllamaModels())
  const isPersonalOrPrivatePrompt = (messages: any[]) => {
    const text = (messages || []).map(message => String(message?.content || '')).join('\n').toLowerCase();
    return /(email|mailbox|inbox|outlook|gmail|whatsapp|phone|address|bank|card|payment|invoice|bill|tax|hmrc|council|insurance|mot|passport|visa|legal|court|solicitor|case|personal|private|silva|kandasamy|@|postcode|account number|sort code)/i.test(text);
  };

  const chatWithAutoProviders = async (model: string, messages: any[]) => {
    const attempts: any[] = [];
    const privateData = isPersonalOrPrivatePrompt(messages);
    const tryRoute = async (label: string, task: () => Promise<any>) => {
      const started = Date.now();
      try {
        const result = await task();
        const content = result?.message?.content || result?.content || result?.choices?.[0]?.message?.content || '';
        attempts.push({ label, ok: Boolean(content), durationMs: Date.now() - started, model: result?.model || model || 'auto' });
        if (content) return { ...result, content, message: result.message || { content }, routeAttempts: attempts };
      } catch (error: any) {
        attempts.push({ label, ok: false, error: error?.message || String(error), durationMs: Date.now() - started });
      }
      return null;
    };

    const local = await tryRoute('Jan + TurboQuant + DFLASH', () => aiService.chatWithBestAvailable(model, messages, { preferred: 'jan' }));
    if (local) return { ...local, engine: local.engine || 'Jan + TurboQuant + DFLASH' };

    const ollama = await tryRoute('Ollama external local', () => aiService.chatWithOllama(model, messages));
    if (ollama) return { ...ollama, engine: ollama.engine || 'Ollama external local' };

    const lm = await tryRoute('LM Studio external local', () => aiService.chatWithLMStudio(model, messages));
    if (lm) return { ...lm, engine: lm.engine || 'LM Studio external local' };

    const openCode = await tryRoute('OpenCode external local', () => aiService.chatWithOpenCode(model, messages));
    if (openCode) return { ...openCode, engine: openCode.engine || 'OpenCode external local' };

    if (privateData) {
      return {
        message: { content: `I kept this task local because it appears to include private/personal data. Local providers did not respond. Auto tried: ${attempts.map(item => `${item.label}${item.error ? ` (${item.error})` : ''}`).join(' -> ')}` },
        engine: 'Auto provider router - local privacy guard',
        routeAttempts: attempts,
        privacyGuard: true
      };
    }

    const apiKeys = await providerService.getAPIKeys().catch(() => ({}));
    if (apiKeys.gemini) {
      const gemini = await tryRoute('Gemini free API', async () => {
        const result = await providerService.chatGemini(apiKeys.gemini, messages, 'gemini-2.5-flash');
        const content = result?.candidates?.[0]?.content?.parts?.[0]?.text || result?.content || '';
        return { content, engine: 'Gemini free API', model: 'gemini-2.5-flash' };
      });
      if (gemini) return gemini;
    }
    if (apiKeys.openrouter) {
      const openrouter = await tryRoute('OpenRouter free cloud', async () => {
        const result = await providerService.chatOpenRouter(apiKeys.openrouter, 'openai/gpt-oss-20b:free', messages);
        return { content: result?.choices?.[0]?.message?.content || '', engine: 'OpenRouter free', model: 'openai/gpt-oss-20b:free' };
      });
      if (openrouter) return openrouter;
    }
    if (apiKeys.nvidia) {
      const nvidia = await tryRoute('NVIDIA NIM free cloud', async () => {
        const result = await providerService.chatNvidiaNIM(apiKeys.nvidia, 'meta/llama-3.1-8b-instruct', messages);
        return { content: result?.choices?.[0]?.message?.content || '', engine: 'NVIDIA NIM free', model: 'meta/llama-3.1-8b-instruct' };
      });
      if (nvidia) return nvidia;
    }

    return {
      message: { content: `No AI provider responded. Auto tried: ${attempts.map(item => `${item.label}${item.error ? ` (${item.error})` : ''}`).join(' -> ')}` },
      engine: 'Auto provider router',
      routeAttempts: attempts
    };
  };

  ipcMain.handle('ai:chat', async (_, { model, messages, provider }) => {
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const startedAt = Date.now();
    eventBus?.emit('session.started', 'local-ai', { sessionId, engine: provider || 'Jan+TurboQuant', model: model || 'auto', streaming: false }, sessionId);
    const p = (provider || '').toLowerCase().replace(/\s+/g, '')
    try {
      let result; if (p === 'auto' || p === 'automix' || p === '') result = await chatWithAutoProviders(model, messages); else if (p === 'ollama') result = await aiService.chatWithOllama(model, messages); else if (p === 'lmstudio') result = await aiService.chatWithLMStudio(model, messages); else if (p === 'opencode') result = await aiService.chatWithOpenCode(model, messages); else if (p === 'jan' || p === 'jan+turboquant') result = await aiService.chatWithBestAvailable(model, messages, { preferred: 'jan' }); else result = await chatWithAutoProviders(model, messages);
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
        result = await providerService.chatGemini(key, messages, model || 'gemini-2.5-flash'); const content = result.candidates?.[0]?.content?.parts?.[0]?.text || result.content || "No response";
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
    const result = await chatWithAutoProviders(model, messages); const content = result?.message?.content || result?.content || '';
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
  ipcMain.handle('pc-window:list', () => integrationService.pcWindowList())
  ipcMain.handle('pc-window:focus', (_, id) => integrationService.pcWindowFocus(id))
  ipcMain.handle('pc-ui:scan', (_, p) => integrationService.pcUiScan(typeof p === 'object' ? (p.windowId || p.id) : p))
  ipcMain.handle('pc-ui:resolve', (_, p) => integrationService.pcUiResolve(p.query || p.text || p.target || p.label || '', p.role, p.windowId || p.id))
  ipcMain.handle('pc-ui:click', (_, p) => integrationService.pcUiClick(p.elementId || p.id || p.query || p.text || p.target || p.label, p.role, p.windowId))
  ipcMain.handle('pc-ui:type', (_, p) => integrationService.pcUiType(p.elementId || p.id || p.query || p.target || p.label, p.text || p.value || p.input || p.content || '', p.windowId, p.role || 'Edit'))
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
  ipcMain.handle('browser-operator:stop-all', (_, reason) => browserOperator.stopAll(reason || 'Stopped by user'))
  ipcMain.handle('browser-operator:resume', () => browserOperator.resume())
  ipcMain.handle('browser-operator:open', (_, t) => { const p = typeof t === 'object' ? t : { target: t }; return browserOperator.open(p.target, p.sessionId, p.label) })
  ipcMain.handle('browser-operator:navigate', (_, t) => { const p = typeof t === 'object' ? t : { target: t }; return browserOperator.navigate(p.target, p.sessionId) })
  ipcMain.handle('browser-operator:read', (_, s) => browserOperator.readPage(s))
  ipcMain.handle('browser-operator:ui-scan', (_, s) => browserOperator.scanUi(s))
  ipcMain.handle('browser-operator:ui-resolve', (_, p) => browserOperator.resolveUi(p.query || p.text || p.target || p.label || '', p.role, p.sessionId || 'main'))
  ipcMain.handle('browser-operator:ui-click', (_, p) => browserOperator.clickUi(p.elementId || p.id || p.query || p.text || p.target || p.label, p.sessionId || 'main', p.role))
  ipcMain.handle('browser-operator:ui-type', (_, p) => browserOperator.typeUi(p.elementId || p.id || p.query || p.target || p.label, p.text || p.value || p.input || p.content || '', p.sessionId || 'main', p.role || 'input'))
  ipcMain.handle('browser-operator:click', (_, p) => typeof p === 'object' ? browserOperator.click(p.selector, p.sessionId) : browserOperator.click(p))
  ipcMain.handle('browser-operator:click-href', (_, p) => browserOperator.clickHref(p.href || p.url, p.sessionId))
  ipcMain.handle('browser-operator:type', (_, { selector, text, sessionId }) => browserOperator.type(selector, text, sessionId))
  ipcMain.handle('browser-operator:press', (_, { key, sessionId }) => browserOperator.press(key || 'Enter', sessionId))
  ipcMain.handle('browser-operator:scroll', (_, { amount, sessionId }) => browserOperator.scroll(amount || 700, sessionId))
  ipcMain.handle('browser-operator:search-visible', (_, { query, sessionId, label }) => browserOperator.searchVisible(query, sessionId, label))
  ipcMain.handle('browser-operator:handle-cookies', (_, s) => browserOperator.dismissCookieOverlays(s))
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
  ipcMain.handle('microsoft:graph-search-index', async (_, { query, accountId }) => {
    const results = await emailIndexService.searchEmails(query, accountId);
    eventBus?.emit('memory.read', 'mail-memory', {
      query,
      accountId,
      resultCount: results.length,
      topSubjects: results.slice(0, 5).map((item: any) => item.subject)
    });
    return results;
  })
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
    const [routes, keys, graph, outlook, jan, ollama, lm, openCode, browser, tinyFishStatus, whatsappStatus] = await Promise.all([
      toolRegistry.getConnectors().catch(() => ({})),
      providerService.getAPIKeys().catch(() => ({})),
      microsoftGraph.getAccountStatus().catch(() => ({ connected: false })),
      integrationService.getClassicOutlookStatus().catch(() => ({})),
      aiService.getJanEngineStatus().catch(() => ({})),
      aiService.listOllamaModels().catch(() => []),
      aiService.checkLMStudio().catch(() => null),
      aiService.checkOpenCode().catch(() => null),
      Promise.resolve(browserOperator.getState()).catch(() => ({})),
      tinyFish.getApiStatus().catch(() => ({ configured: false })),
      whatsAppChannelService.getStatus().catch(() => ({ ok: false }))
    ])
    const known = Array.from(new Set([...Object.keys(routes || {}), 'jan-turboquant', 'ollama', 'lm-studio', 'opencode', 'my-browser', 'outlook-mail', 'outlook-calendar', 'tinyfish', 'google-gemini', 'openrouter', 'nvidia', 'huggingface']))
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
      const tinyFishConfigured = id === 'tinyfish' && Boolean(tinyFishStatus?.configured);
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
        (id === 'whatsapp' && Boolean(whatsappStatus?.ok)) ||
        tinyFishConfigured ||
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
            : id === 'tinyfish'
              ? (tinyFishConfigured ? `TinyFish API key saved locally (${tinyFishStatus.keyPrefix || 'configured'})` : 'TinyFish API key missing')
            : id === 'whatsapp'
              ? (whatsappStatus?.ok ? `WhatsApp channel active (${whatsappStatus.manualSendOnly ? 'manual send' : 'send route'})` : 'WhatsApp route enabled; open WhatsApp Desktop/Web')
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
  ipcMain.handle('self-improvement:get-state', () => selfImprovementService.getState())
  ipcMain.handle('self-improvement:run-now', (_, reason) => selfImprovementService.runAudit(reason || 'Manual self-improvement check'))
  ipcMain.handle('agents:get-all', () => orchestrator.getAgents())
  ipcMain.handle('agents:update-status', (_, { id, status, background }) => orchestrator.updateAgentStatus(id, status, background))
  ipcMain.handle('agents:create-task', async (_, { input, agentId }) => orchestrator.createTask(input, agentId, win))
  ipcMain.handle('agents:get-tasks', () => orchestrator.getTasks())
  ipcMain.handle('operator:stop-all', (_, reason) => {
    const agents = orchestrator.stopAll(reason || 'Stopped by user');
    const browser = browserOperator.stopAll(reason || 'Stopped by user');
    return { ok: true, agents, browser };
  })
  ipcMain.handle('operator:inject', (_, { agentId, instruction }) => orchestrator.injectInstruction(agentId || 'browser-automation-agent', instruction))
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
  ipcMain.handle('workspace:get-email-intelligence', () => workspaceService.getEmailIntelligenceSummary())
  ipcMain.handle('workspace:approve-email-route', (_, { messageId, status }) => workspaceService.approveEmailRoute(messageId, status))
  ipcMain.handle('workspace:update-mail-memory-item', (_, { itemId, patch }) => workspaceService.updateMailMemoryItem(itemId, patch))
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
