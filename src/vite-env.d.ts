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
    getModelsPath: () => Promise<string>;
    listLibraryModels: () => Promise<any[]>;
    deleteLibraryModel: (modelId: string) => Promise<boolean>;
    revealModelsFolder: () => Promise<boolean>;
    chatProvider: (data: any) => Promise<any>;
    getConnectors: () => Promise<{[key: string]: boolean}>;
    connectGoogle: () => Promise<{ success: boolean, email?: string }>;
    saveAPIKey: (provider: string, key: string) => Promise<boolean>;
    getAPIKeys: () => Promise<{[key: string]: string}>;
    getKnowledge: () => Promise<any[]>;
    saveKnowledge: (knowledge: any) => Promise<boolean>;
    openApp: (appName: string) => Promise<boolean>;
    selectFiles: () => Promise<string[]>;
    selectFolder: () => Promise<string>;
    analyzeUK: (path: string, type: 'legal' | 'tax') => Promise<any>;
    createShortcut: () => Promise<{ success: boolean, path?: string, error?: string }>;
    getComputerOverview: () => Promise<any>;
    listDirectory: (folderPath?: string) => Promise<{ path: string, entries: any[] }>;
    revealPath: (targetPath: string) => Promise<{ ok: boolean, path?: string, error?: string }>;
    openPath: (targetPath: string) => Promise<{ ok: boolean, path?: string, error?: string }>;
    openTerminal: (folderPath?: string) => Promise<{ ok: boolean, path?: string }>;
    composeWhatsApp: (message: string, phone?: string) => Promise<{ ok: boolean, url: string, mode: string }>;
    getVoiceStackStatus: () => Promise<{ ok: boolean, url: string, status?: number, error?: string }>;
    getClassicOutlookStatus: () => Promise<any>;
    listClassicOutlookMessages: (limit?: number) => Promise<any[] | { ok: false, error: string }>;
    startMicrosoftGraphLogin: () => Promise<any>;
    completeMicrosoftGraphLogin: () => Promise<any>;
    getMicrosoftGraphStatus: () => Promise<any>;
    getMicrosoftMailboxSettings: () => Promise<any>;
    listMicrosoftGraphMessages: (limit?: number) => Promise<any[]>;
    listMicrosoftGraphFolders: () => Promise<any[]>;
    syncEmailIntelligence: (limitPerFolder?: number) => Promise<any>;
    disconnectMicrosoftGraph: () => Promise<{ ok: boolean }>;
    getSilvaMemory: () => Promise<string>;
    saveSilvaMemory: (memory: string) => Promise<boolean>;
    getEmailIntelligence: () => Promise<any>;
    approveEmailRoute: (messageId: string, status: string) => Promise<any>;

    // Tool Registry
    getTools: () => Promise<any[]>;
    saveConnector: (connector: any) => Promise<{[key: string]: boolean}>;
    toggleConnector: (id: string, enabled: boolean) => Promise<{[key: string]: boolean}>;

    // Skills Engine
    getInstalledSkills: () => Promise<string[]>;
    toggleSkill: (skillId: string, installed: boolean) => Promise<string[]>;
    proposeSkill: (action: any) => Promise<any>;
    getPendingSkills: () => Promise<any[]>;
    approveSkill: (id: string) => Promise<any>;
    denySkill: (id: string) => Promise<boolean>;

    // Multi-Agent Orchestrator
    getAgents: () => Promise<any[]>;
    updateAgentStatus: (id: string, status: string, background: boolean) => Promise<boolean>;
    createAgentTask: (input: string, agentId?: string) => Promise<any>;
    getAgentTasks: () => Promise<any[]>;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    removeAllListeners: (channel: string) => void;
    getResourceUsage: () => Promise<{ cpu: number, ram: number, gpu: number, gpuModel: string, engine?: string }>;
    engineStatus: () => Promise<any>;
    chatBest: (data: { model: string, messages: any[] }) => Promise<any>;
  }
}
