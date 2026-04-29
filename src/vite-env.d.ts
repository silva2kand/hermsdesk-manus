/// <reference types="vite/client" />

interface Window {
  // expose in the `electron/preload.ts`
  ipcRenderer: import('electron').IpcRenderer & {
    listModels: () => Promise<any[]>;
    chat: (data: { model: string, messages: any[], provider?: string }) => Promise<any>;
    checkLMStudio: () => Promise<any>;
    checkJan: () => Promise<any>;
    janStatus: () => Promise<{ apiOnline: boolean, installed: boolean, executablePath: string, activeModel: string, models: any[] }>;
    startJan: () => Promise<{ ok: boolean, error?: string, alreadyOnline?: boolean, status?: any }>;
    loadJanModel: (model: { name: string, path?: string }) => Promise<{ ok: boolean, model?: string, warning?: string, error?: string, status?: any }>;
    scanPC: () => Promise<{ gpu: string, vram: string, ram: string, os: string, approximate?: boolean }>;
    searchHF: (query: string) => Promise<any[]>;
    downloadHF: (modelId: string) => Promise<{ ok: boolean, path?: string, error?: string }>;
    listLibraryModels: () => Promise<any[]>;
    deleteLibraryModel: (modelId: string) => Promise<boolean>;
    revealModelsFolder: () => Promise<boolean>;
    getModelsPath: () => Promise<string>;
    chatProvider: (data: any) => Promise<any>;
    toggleConnector: (id: string, state: boolean) => Promise<{[key: string]: boolean}>;
    getConnectors: () => Promise<{[key: string]: boolean}>;
    connectGoogle: () => Promise<{ success: boolean, email?: string }>;
    saveAPIKey: (provider: string, key: string) => Promise<boolean>;
    getAPIKeys: () => Promise<{[key: string]: string}>;
    openApp: (appName: string) => Promise<boolean>;
    selectFiles: () => Promise<string[]>;
    selectFolder: () => Promise<string>;
    analyzeUK: (path: string, type: 'legal' | 'tax') => Promise<any>;
    getResourceUsage: () => Promise<{ cpu: number, ram: number, gpu: number, gpuModel: string }>;
  }
}
