import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'

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

function initializeStoreAndServices() {
   try {
     // Initialize global store with all defaults to avoid writes on startup
     // We use atomically: false to avoid EPERM errors on Windows
     store = new Store({ 
       atomically: false,
       watch: false, // Disable watching to avoid file locks on Windows
       defaults: {
      connectors: {
        'my-browser': true, 'ollama': true, 'lm-studio': true, 'google-gemini': true,
        'openrouter': true, 'instagram': true, 'instagram-marketplace': true,
        'meta-ads': true, 'gmail': true, 'google-calendar': true, 'google-drive': true,
        'outlook-mail': true, 'outlook-calendar': true, 'github': true, 'slack': true,
        'notion': true, 'zapier': true, 'asana': true, 'monday': true, 'make': true,
        'linear': true, 'atlassian': true, 'clickup': true, 'supabase': true,
        'vercel': true, 'neon': true, 'prisma': true, 'sentry': true, 'huggingface': true,
        'hubspot': true, 'stripe': true, 'mcp-filesystem': true, 'mcp-windows-shell': true,
        'intercom': true, 'paypal-business': true, 'revenuecat': true, 'close': true,
        'xero': true, 'airtable': true, 'dify': true, 'cloudflare': true, 'posthog': true,
        'playwright': true, 'jam': true, 'canva': true, 'webflow': true, 'wix': true,
        'granola': true, 'fireflies': true, 'tldv': true, 'firecrawl': true,
        'todoist': true, 'zoominfo': true, 'metabase': true, 'explorium': true,
        'serena': true, 'heygen': true, 'context7': true, 'hume': true, 'line': true,
        'jotform': true, 'pophive': true, 'minimax': true
      },
      'api-keys': {},
      models: {},
      mail: {
        workflowEmails: [],
        approvedSenders: [],
        enabledCategories: {}
      },
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
  skillsEngine = new SkillsEngineService(store)
  orchestrator = new MultiAgentOrchestrator(store, aiService, skillsEngine)
  workspaceService = new WorkspaceService(store)
  microsoftGraph = new MicrosoftGraphService(store)
  schedulerService = new SchedulerService(store, workspaceService, orchestrator)
  wideResearchService = new WideResearchService(store, aiService)
  automationService = new AutomationService(store)
} catch (error) {
     console.error('CRITICAL: Failed to initialize ElectronStore:', error);
     // Fallback to a non-persistent object if store fails completely
     store = {
       get: (key: string, def: any) => def,
       set: () => {},
       delete: () => {}
     };
     aiService = new LocalAIService(store)
     integrationService = new DesktopIntegrationService()
     providerService = new AIProviderService(store)
     toolRegistry = new ToolRegistryService(store)
     skillsEngine = new SkillsEngineService(store)
     orchestrator = new MultiAgentOrchestrator(store, aiService, skillsEngine)
     workspaceService = new WorkspaceService(store)
     microsoftGraph = new MicrosoftGraphService(store)
     schedulerService = new SchedulerService(store, workspaceService, orchestrator)
     wideResearchService = new WideResearchService(store, aiService)
     automationService = new AutomationService(store)
   }
 }

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

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')


let win: BrowserWindow | null
let tray: Tray | null
let isQuitting = false

function showMainWindow() {
  if (!win) {
    createWindow()
    return
  }
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

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
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
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#000000',
      height: 32
    }
  })

  win.on('close', (event) => {
    if (!isQuitting && process.platform !== 'darwin') {
      event.preventDefault()
      win?.hide()
    }
  })

  // Helper for sending logs to the console
  const appLog = (type: 'info' | 'error' | 'bug', content: string) => {
    win?.webContents.send('app:log', { type, content });
  };
  schedulerService?.setWindow(win)
  schedulerService?.start()
  wideResearchService?.setWindow(win)
  automationService?.setWindow(win)

  // IPC Handlers for AI
  ipcMain.handle('ai:list-models', async () => {
    appLog('info', 'Listing Ollama models...');
    return aiService.listOllamaModels();
  })
  
  ipcMain.handle('ai:chat', async (_, { model, messages, provider }) => {
    appLog('info', `Sending chat request to ${provider || 'Jan+TurboQuant'} (${model})`);
    const p = (provider || '').toLowerCase().replace(/\s+/g, '')
    try {
      if (p === 'ollama') return aiService.chatWithOllama(model, messages)
      if (p === 'lmstudio') return aiService.chatWithLMStudio(model, messages)
      if (p === 'jan' || p === 'jan+turboquant') return aiService.chatWithBestAvailable(model, messages, { preferred: 'jan' })
      // Default: route through smart engine priority chain (Jan+TQ → Ollama → LM Studio)
      return aiService.chatWithBestAvailable(model, messages)
    } catch (error: any) {
      appLog('error', `Local AI route failed: ${error?.message || 'Unknown error'}`)
      return {
        message: {
          content: `Local AI route failed: ${error?.message || 'Unknown error'}\n\nJan + TurboQuant is the built-in primary engine. If it is offline, Hermes ME will try optional local fallbacks such as Ollama and LM Studio. Open Model Hub to start the built-in engine or load a local model.`
        },
        engine: 'Local router'
      }
    }
  })
  ipcMain.handle('ai:check-lmstudio', () => aiService.checkLMStudio())
  
  // New Providers
  ipcMain.handle('ai:search-hf', (_, query) => providerService.searchHuggingFace(query))
  ipcMain.handle('ai:download-hf', async (event, modelId) => {
    appLog('info', `Starting download: ${modelId}`);
    try {
      const path = await providerService.downloadHFModel(modelId, (progress: number) => {
        event.sender.send('ai:download-progress', { modelId, progress })
        if (progress % 10 === 0) appLog('bug', `Download progress for ${modelId}: ${progress}%`);
      })
      return { ok: true, path }
    } catch (error: any) {
      const message = error?.message || 'Download failed. Please try again.';
      appLog('error', `Download failed for ${modelId}: ${message}`);
      console.warn(`Hugging Face download failed for ${modelId}: ${message}`)
      return { ok: false, error: message }
    }
  })
  ipcMain.handle('ai:get-models-path', () => providerService.getModelsPath())
  ipcMain.handle('ai:list-library-models', () => providerService.listLibraryModels())
  ipcMain.handle('ai:delete-library-model', (_, modelId) => providerService.deleteLibraryModel(modelId))
  ipcMain.handle('ai:reveal-models-folder', () => providerService.revealModelsFolder())
  
  // Knowledge management
  ipcMain.handle('knowledge:get-all', () => providerService.getKnowledge())
  ipcMain.handle('knowledge:save', (_, knowledge) => providerService.saveKnowledge(knowledge))
  
  ipcMain.handle('ai:chat-provider', async (_, { provider, model, messages }) => {
    appLog('info', `Cloud request to ${provider}`);
    const apiKeys = await providerService.getAPIKeys();
    const key = apiKeys[provider];
    
    if (!key) {
      appLog('error', `Missing API key for ${provider}`);
      return { content: `Error: No API key found for ${provider}. Please add it in Settings > API Keys.` };
    }

    try {
      let result;
      if (provider === 'gemini') {
        result = await providerService.chatGemini(key, messages);
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";
        appLog('info', 'Gemini response received');
        return { content };
      }
      if (provider === 'nvidia') {
        result = await providerService.chatNvidiaNIM(key, model, messages);
        const content = result.choices?.[0]?.message?.content || "No response from NVIDIA NIM";
        appLog('info', 'NVIDIA NIM response received');
        return { content };
      }
      if (provider === 'openrouter') {
        result = await providerService.chatOpenRouter(key, model, messages);
        const content = result.choices?.[0]?.message?.content || "No response from OpenRouter";
        appLog('info', 'OpenRouter response received');
        return { content };
      }
      return { content: `Cloud provider ${provider} not yet fully implemented in main process.` };
    } catch (e: any) {
      const errorMsg = e.response?.data?.error?.message || e.message;
      const status = e.response?.status;
      appLog('error', `${provider} error (${status || 'unknown'}): ${errorMsg}`);
      return { content: `Error calling ${provider}: ${errorMsg} (Status: ${status || 'unknown'})` };
    }
  })

  // Built-in Jan + TurboQuant Engine Handlers
  ipcMain.handle('ai:check-jan', () => aiService.checkJanEngine())
  ipcMain.handle('ai:jan-status', () => aiService.getJanEngineStatus())
  ipcMain.handle('ai:start-jan', () => aiService.startJanEngine())
  ipcMain.handle('ai:load-jan-model', (_, model) => aiService.loadJanModel(model))
  ipcMain.handle('ai:scan-pc', () => aiService.scanPCResources())
  ipcMain.handle('ai:get-resource-usage', () => aiService.getResourceUsage())

  // ME 1.8 — Full engine status (all engines) and smart routing
  ipcMain.handle('ai:engine-status', async () => {
    appLog('info', 'Checking all engine status...');
    return aiService.getFullEngineStatus();
  })
  ipcMain.handle('ai:chat-best', async (_, { model, messages }) => {
    appLog('info', 'Smart routing through engine priority chain...');
    return aiService.chatWithBestAvailable(model, messages);
  })

  // Dialog Handlers for real file/folder picking
  ipcMain.handle('file:select-files', async () => {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile', 'multiSelections'],
      title: 'Select Files to Upload'
    })
    if (result.canceled) return []
    return result.filePaths
  })

  ipcMain.handle('file:select-folder', async () => {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: 'Select Folder to Upload'
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('desktop:create-shortcut', () => integrationService.createDesktopShortcut())
  ipcMain.handle('desktop:computer-overview', () => integrationService.getComputerOverview())
  ipcMain.handle('desktop:list-directory', (_, folderPath) => integrationService.listDirectory(folderPath))
  ipcMain.handle('desktop:reveal-path', (_, targetPath) => integrationService.revealPath(targetPath))
  ipcMain.handle('desktop:open-path', (_, targetPath) => integrationService.openPath(targetPath))
  ipcMain.handle('desktop:open-terminal', (_, folderPath) => integrationService.openTerminal(folderPath))
  ipcMain.handle('desktop:whatsapp-compose', (_, { message, phone }) => integrationService.composeWhatsAppMessage(message, phone))
  ipcMain.handle('desktop:voice-stack-status', () => integrationService.getVoiceStackStatus())
  ipcMain.handle('automation:get-events', () => automationService.getEvents())
  ipcMain.handle('automation:open-browser', (_, target) => automationService.openBrowser(target))
  ipcMain.handle('automation:research-web', (_, query) => automationService.researchWeb(query))
  ipcMain.handle('outlook:classic-status', () => integrationService.getClassicOutlookStatus())
  ipcMain.handle('outlook:classic-messages', (_, limit) => integrationService.listClassicOutlookMessages(limit))
  ipcMain.handle('microsoft:graph-start-login', () => microsoftGraph.startDeviceLogin())
  ipcMain.handle('microsoft:graph-complete-login', () => microsoftGraph.completeDeviceLogin())
  ipcMain.handle('microsoft:graph-status', () => microsoftGraph.getStatus())
  ipcMain.handle('microsoft:graph-mailbox-settings', () => microsoftGraph.getMailboxSettings())
  ipcMain.handle('microsoft:graph-messages', (_, limit) => microsoftGraph.listMessages(limit))
  ipcMain.handle('microsoft:graph-folders', () => microsoftGraph.listMailFolders())
  ipcMain.handle('microsoft:graph-sync-email-intelligence', async (_, limitPerFolder) => {
    const data = await microsoftGraph.syncEmailIntelligence(limitPerFolder)
    workspaceService.saveEmailIntelligence(data)
    return data
  })
  ipcMain.handle('microsoft:graph-disconnect', () => microsoftGraph.disconnect())
  
  ipcMain.handle('app:open', async (_, appName) => {
    appLog('info', `Opening application: ${appName}`)
    return integrationService.openApp(appName)
  })

  ipcMain.handle('file:analyze-uk', async (_, { path, type }) => {
    appLog('info', `Analyzing UK ${type} document: ${path}`)
    return integrationService.analyzeUKDocument(path, type)
  })
  
  // Connectors Handlers
  ipcMain.handle('ai:toggle-connector', (_, { id, state }) => providerService.toggleConnector(id, state))
  ipcMain.handle('ai:get-connectors', () => providerService.getConnectorsState())
  ipcMain.handle('ai:connect-google', () => providerService.connectWithGoogle())
  ipcMain.handle('ai:save-api-key', (_, { provider, key }) => providerService.saveAPIKey(provider, key))
  ipcMain.handle('ai:get-api-keys', () => providerService.getAPIKeys())


  // IPC Handlers for Integrations (extended)
  ipcMain.handle('app:open-external', (_, appName) => integrationService.openExternalApp(appName))

  // Tool Registry Handlers
  ipcMain.handle('tools:get-all', () => toolRegistry.getTools())
  ipcMain.handle('tools:get-connectors', () => toolRegistry.getConnectors())
  ipcMain.handle('tools:save-connector', (_, connector) => {
    const id = connector?.id || connector?.name;
    const enabled = connector?.enabled ?? connector?.state ?? true;
    return toolRegistry.saveConnector(id, enabled);
  })
  ipcMain.handle('tools:toggle-connector', (_, payload) => {
    const id = payload?.id || payload?.name;
    return toolRegistry.toggleConnector(id, payload?.enabled);
  })

  // Skills Engine Handlers
  ipcMain.handle('skills:get-installed', () => skillsEngine.getInstalledSkills())
  ipcMain.handle('skills:toggle', (_, { skillId, installed }) => skillsEngine.toggleSkill(skillId, installed))
  ipcMain.handle('skills:propose', (_, action) => skillsEngine.proposeAction(action))
  ipcMain.handle('skills:get-pending', () => skillsEngine.getPendingActions())
  ipcMain.handle('skills:approve', (_, id) => skillsEngine.approveAction(id))
  ipcMain.handle('skills:deny', (_, id) => skillsEngine.denyAction(id))

  // Orchestrator Handlers
  ipcMain.handle('agents:get-all', () => orchestrator.getAgents())
  ipcMain.handle('agents:update-status', (_, { id, status, background }) => orchestrator.updateAgentStatus(id, status, background))
  ipcMain.handle('agents:create-task', (_, { input, agentId }) => orchestrator.createTask(input, agentId, win))
  ipcMain.handle('agents:get-tasks', () => orchestrator.getTasks())

  // Workspace Handlers
  ipcMain.handle('workspace:get-mail', () => workspaceService.getMailSettings())
  ipcMain.handle('workspace:save-mail', (_, settings) => workspaceService.saveMailSettings(settings))
  ipcMain.handle('workspace:get-tasks', () => workspaceService.getScheduledTasks())
  ipcMain.handle('workspace:save-tasks', (_, tasks) => workspaceService.saveScheduledTasks(tasks))
  ipcMain.handle('workspace:run-scheduled-task', (_, id) => schedulerService.runNow(id))
  ipcMain.handle('workspace:get-scheduled-runs', () => schedulerService.getRuns())
  ipcMain.handle('workspace:get-settings', () => workspaceService.getGeneralSettings())
  ipcMain.handle('workspace:save-settings', (_, settings) => workspaceService.saveGeneralSettings(settings))
  ipcMain.handle('workspace:get-model-preset', () => workspaceService.getModelPreset())
  ipcMain.handle('workspace:save-model-preset', (_, preset) => workspaceService.saveModelPreset(preset))
  ipcMain.handle('workspace:get-silva-memory', () => workspaceService.getSilvaMemory())
  ipcMain.handle('workspace:save-silva-memory', (_, memory) => workspaceService.saveSilvaMemory(memory))
  ipcMain.handle('workspace:get-email-intelligence', () => workspaceService.getEmailIntelligence())
  ipcMain.handle('workspace:approve-email-route', (_, { messageId, status }) => workspaceService.approveEmailRoute(messageId, status))
  ipcMain.handle('workspace:get-projects', () => workspaceService.getProjects())
  ipcMain.handle('workspace:save-project', (_, project) => workspaceService.saveProject(project))
  ipcMain.handle('workspace:delete-project', (_, id) => workspaceService.deleteProject(id))
  ipcMain.handle('workspace:add-project-files', (_, { id, files }) => workspaceService.addProjectFiles(id, files))
  ipcMain.handle('workspace:start-project-task', async (_, { id, prompt, agentId }) => {
    const project = workspaceService.addProjectTask(id, prompt, agentId)
    const context = [
      `Project: ${project.name}`,
      project.description ? `Description: ${project.description}` : '',
      project.instructions ? `Project instructions:\n${project.instructions}` : '',
      project.connectors?.length ? `Connectors: ${project.connectors.join(', ')}` : '',
      project.files?.length ? `Files:\n${project.files.join('\n')}` : '',
      `Task:\n${prompt}`
    ].filter(Boolean).join('\n\n')
    const task = await orchestrator.createTask(context, agentId || 'hermes-full', win)
    return { ok: true, project, task }
  })
  ipcMain.handle('wide-research:get-runs', () => wideResearchService.getRuns())
  ipcMain.handle('wide-research:start', (_, { brief, items }) => wideResearchService.startRun(brief, items))

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  win.webContents.on('context-menu', (_, params) => {
    Menu.buildFromTemplate([
      { label: 'Chat Lab', click: () => win?.webContents.send('app:navigate', 'chat') },
      { label: 'Model Hub', click: () => win?.webContents.send('app:navigate', 'models') },
      { label: 'Mail ME', click: () => win?.webContents.send('app:navigate', 'mail') },
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
    console.log('Loading dev server URL:', process.env.VITE_DEV_SERVER_URL)
    win.loadURL(process.env.VITE_DEV_SERVER_URL).catch(e => {
      console.error('Failed to load dev server URL:', e)
      // Retry logic if connection refused
      if (e.code === 'ERR_CONNECTION_REFUSED') {
        setTimeout(() => {
          win?.loadURL(process.env.VITE_DEV_SERVER_URL!)
        }, 1000)
      }
    })
  } else {
    win.loadFile(path.join(process.env.DIST || '', 'index.html'))
  }

  // Handle connection failures and retry
  win.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    if (process.env.VITE_DEV_SERVER_URL && validatedURL === process.env.VITE_DEV_SERVER_URL) {
      console.log(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode}). Retrying in 1s...`)
      setTimeout(() => {
        win?.loadURL(process.env.VITE_DEV_SERVER_URL!)
      }, 1000)
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
