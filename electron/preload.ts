import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // AI & Local Engine
  listModels: () => ipcRenderer.invoke('ai:list-models'),
  chat: (data: { model: string, messages: any[], provider?: string }) => ipcRenderer.invoke('ai:chat', data),
  checkLMStudio: () => ipcRenderer.invoke('ai:check-lmstudio'),
  checkJan: () => ipcRenderer.invoke('ai:check-jan'),
  scanPC: () => ipcRenderer.invoke('ai:scan-pc'),
  getResourceUsage: () => ipcRenderer.invoke('ai:get-resource-usage'),
  
  // New Providers & HF
  searchHF: (query: string) => ipcRenderer.invoke('ai:search-hf', query),
  downloadHF: (modelId: string) => ipcRenderer.invoke('ai:download-hf', modelId),
  listLibraryModels: () => ipcRenderer.invoke('ai:list-library-models'),
  deleteLibraryModel: (modelId: string) => ipcRenderer.invoke('ai:delete-library-model', modelId),
  revealModelsFolder: () => ipcRenderer.invoke('ai:reveal-models-folder'),
  getModelsPath: () => ipcRenderer.invoke('ai:get-models-path'),
  chatProvider: (data: any) => ipcRenderer.invoke('ai:chat-provider', data),

  // Connectors & Social
  toggleConnector: (id: string, state: boolean) => ipcRenderer.invoke('ai:toggle-connector', { id, state }),
  getConnectors: () => ipcRenderer.invoke('ai:get-connectors'),
  connectGoogle: () => ipcRenderer.invoke('ai:connect-google'),
  saveAPIKey: (provider: string, key: string) => ipcRenderer.invoke('ai:save-api-key', { provider, key }),
  getAPIKeys: () => ipcRenderer.invoke('ai:get-api-keys'),

  // Desktop Integrations
  openApp: (appName: string) => ipcRenderer.invoke('app:open-external', appName),
  selectFiles: () => ipcRenderer.invoke('file:select-files'),
  selectFolder: () => ipcRenderer.invoke('file:select-folder'),
  analyzeUK: (path: string, type: 'legal' | 'tax') => ipcRenderer.invoke('file:analyze-uk', { path, type }),
})
