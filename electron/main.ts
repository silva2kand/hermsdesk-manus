import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LocalAIService } from './services/LocalAIService'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { DesktopIntegrationService } from './services/DesktopIntegrationService'
import { AIProviderService } from './services/AIProviderService'

const aiService = new LocalAIService()
const integrationService = new DesktopIntegrationService()
const providerService = new AIProviderService()

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

  // IPC Handlers for AI
  ipcMain.handle('ai:list-models', () => aiService.listOllamaModels())
  ipcMain.handle('ai:chat', (_, { model, messages, provider }) => {
    const p = (provider || '').toLowerCase().replace(' ', '')
    if (p === 'ollama') return aiService.chatWithOllama(model, messages)
    if (p === 'lmstudio') return aiService.chatWithLMStudio(model, messages)
    if (p === 'jan') return aiService.chatWithJan(model, messages)
    return aiService.chatWithOllama(model, messages) // Default to Ollama
  })
  ipcMain.handle('ai:check-lmstudio', () => aiService.checkLMStudio())
  
  // New Providers
  ipcMain.handle('ai:search-hf', (_, query) => providerService.searchHuggingFace(query))
  ipcMain.handle('ai:download-hf', async (event, modelId) => {
    return providerService.downloadHFModel(modelId, (progress) => {
      event.sender.send('ai:download-progress', { modelId, progress })
    })
  })
  ipcMain.handle('ai:get-models-path', () => providerService.getModelsPath())
  ipcMain.handle('ai:chat-provider', (_, { provider, model, apiKey, messages }) => {
    if (provider === 'openrouter') return providerService.chatOpenRouter(apiKey, model, messages)
    if (provider === 'gemini') return providerService.chatGemini(apiKey, messages)
    if (provider === 'nvidia') return providerService.chatNvidiaNIM(apiKey, model, messages)
    return null
  })

  // Jan & Local Engine Handlers
  ipcMain.handle('ai:check-jan', () => aiService.checkJanEngine())
  ipcMain.handle('ai:scan-pc', () => aiService.scanPCResources())
  ipcMain.handle('ai:get-resource-usage', () => aiService.getResourceUsage())
  
  // Connectors Handlers
  ipcMain.handle('ai:toggle-connector', (_, { id, state }) => providerService.toggleConnector(id, state))
  ipcMain.handle('ai:get-connectors', () => providerService.getConnectorsState())
  ipcMain.handle('ai:connect-google', () => providerService.connectWithGoogle())
  ipcMain.handle('ai:save-api-key', (_, { provider, key }) => providerService.saveAPIKey(provider, key))
  ipcMain.handle('ai:get-api-keys', () => providerService.getAPIKeys())

  // IPC Handlers for Integrations
  ipcMain.handle('app:open-external', (_, appName) => integrationService.openExternalApp(appName))
  ipcMain.handle('file:select-files', () => integrationService.selectFiles())
  ipcMain.handle('file:select-folder', () => integrationService.selectFolder())
  ipcMain.handle('file:analyze-uk', (_, { path, type }) => integrationService.analyzeUKProfessionalDocs(path, type))

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
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
  if (process.platform !== 'darwin') {
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

app.whenReady().then(createWindow)
