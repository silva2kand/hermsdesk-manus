/// <reference types="vite/client" />

interface Window {
  // expose in the `electron/preload.ts`
  ipcRenderer: import('electron').IpcRenderer & {
    listModels: () => Promise<any[]>;
    chat: (data: { model: string, messages: any[], provider?: string }) => Promise<any>;
    checkLMStudio: () => Promise<any>;
      searchHF: (query: string) => Promise<any[]>;
      downloadHF: (modelId: string) => Promise<string>;
      getModelsPath: () => Promise<string>;
      chatProvider: (data: any) => Promise<any>;
    saveAPIKey: (provider: string, key: string) => Promise<boolean>;
    getAPIKeys: () => Promise<{[key: string]: string}>;
    openApp: (appName: string) => Promise<boolean>;
    selectFiles: () => Promise<string[]>;
    selectFolder: () => Promise<string>;
    analyzeUK: (path: string, type: 'legal' | 'tax') => Promise<any>;
    getResourceUsage: () => Promise<{ cpu: number, ram: number, gpu: number, gpuModel: string }>;
  }
}
