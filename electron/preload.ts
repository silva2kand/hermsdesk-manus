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
  removeAllListeners(channel: string) {
    return ipcRenderer.removeAllListeners(channel)
  },

  // AI & Local Engine — Built-in Jan + TurboQuant (PRIMARY)
  listModels: () => ipcRenderer.invoke('ai:list-models'),
  chat: (data: { model: string, messages: any[], provider?: string }) => ipcRenderer.invoke('ai:chat', data),
  checkLMStudio: () => ipcRenderer.invoke('ai:check-lmstudio'),
  checkJan: () => ipcRenderer.invoke('ai:check-jan'),
  janStatus: () => ipcRenderer.invoke('ai:jan-status'),
  startJan: () => ipcRenderer.invoke('ai:start-jan'),
  loadJanModel: (model: { name: string, path?: string }) => ipcRenderer.invoke('ai:load-jan-model', model),
  scanPC: () => ipcRenderer.invoke('ai:scan-pc'),
  getResourceUsage: () => ipcRenderer.invoke('ai:get-resource-usage'),

  // ME 1.8 — Full engine status and smart routing
  engineStatus: () => ipcRenderer.invoke('ai:engine-status'),
  chatBest: (data: { model: string, messages: any[] }) => ipcRenderer.invoke('ai:chat-best', data),
  
  // New Providers & HF
  searchHF: (query: string) => ipcRenderer.invoke('ai:search-hf', query),
  downloadHF: (modelId: string) => ipcRenderer.invoke('ai:download-hf', modelId),
  getModelsPath: () => ipcRenderer.invoke('ai:get-models-path'),
  listLibraryModels: () => ipcRenderer.invoke('ai:list-library-models'),
  deleteLibraryModel: (modelId: string) => ipcRenderer.invoke('ai:delete-library-model', modelId),
  revealModelsFolder: () => ipcRenderer.invoke('ai:reveal-models-folder'),
  chatProvider: (data: any) => ipcRenderer.invoke('ai:chat-provider', data),

  // Connectors & Social
  connectGoogle: () => ipcRenderer.invoke('ai:connect-google'),
  saveAPIKey: (provider: string, key: string) => ipcRenderer.invoke('ai:save-api-key', { provider, key }),
  getAPIKeys: () => ipcRenderer.invoke('ai:get-api-keys'),
  getKnowledge: () => ipcRenderer.invoke('knowledge:get-all'),
  saveKnowledge: (knowledge: any) => ipcRenderer.invoke('knowledge:save', knowledge),

  // Desktop Integrations
  openApp: (appName: string) => ipcRenderer.invoke('app:open', appName),
  selectFiles: () => ipcRenderer.invoke('file:select-files'),
  selectFolder: () => ipcRenderer.invoke('file:select-folder'),
  analyzeUK: (path: string, type: 'legal' | 'tax') => ipcRenderer.invoke('file:analyze-uk', { path, type }),

  // Tool Registry
  getTools: () => ipcRenderer.invoke('tools:get-all'),
  getConnectors: () => ipcRenderer.invoke('tools:get-connectors'),
  saveConnector: (connector: any) => ipcRenderer.invoke('tools:save-connector', connector),
  toggleConnector: (id: string, enabled: boolean) => ipcRenderer.invoke('tools:toggle-connector', { id, enabled }),

  // Skills Engine
  getInstalledSkills: () => ipcRenderer.invoke('skills:get-installed'),
  getSkillGuidance: () => ipcRenderer.invoke('skills:get-guidance'),
  toggleSkill: (skillId: string, installed: boolean) => ipcRenderer.invoke('skills:toggle', { skillId, installed }),
  proposeSkill: (action: any) => ipcRenderer.invoke('skills:propose', action),
  getPendingSkills: () => ipcRenderer.invoke('skills:get-pending'),
  approveSkill: (id: string) => ipcRenderer.invoke('skills:approve', id),
  denySkill: (id: string) => ipcRenderer.invoke('skills:deny', id),

  // Multi-Agent Orchestrator
  getAgents: () => ipcRenderer.invoke('agents:get-all'),
  updateAgentStatus: (id: string, status: string, background: boolean) => ipcRenderer.invoke('agents:update-status', { id, status, background }),
  createAgentTask: (input: string, agentId?: string) => ipcRenderer.invoke('agents:create-task', { input, agentId }),
  getAgentTasks: () => ipcRenderer.invoke('agents:get-tasks'),

  // Workspace
  getMailSettings: () => ipcRenderer.invoke('workspace:get-mail'),
  saveMailSettings: (settings: any) => ipcRenderer.invoke('workspace:save-mail', settings),
  getWhatsAppDrafts: () => ipcRenderer.invoke('workspace:get-whatsapp-drafts'),
  saveWhatsAppDraft: (draft: any) => ipcRenderer.invoke('workspace:save-whatsapp-draft', draft),
  markWhatsAppOpened: (id: string) => ipcRenderer.invoke('workspace:mark-whatsapp-opened', id),
  getScheduledTasks: () => ipcRenderer.invoke('workspace:get-tasks'),
  saveScheduledTasks: (tasks: any[]) => ipcRenderer.invoke('workspace:save-tasks', tasks),
  runScheduledTask: (id: string) => ipcRenderer.invoke('workspace:run-scheduled-task', id),
  getScheduledRuns: () => ipcRenderer.invoke('workspace:get-scheduled-runs'),
  getGeneralSettings: () => ipcRenderer.invoke('workspace:get-settings'),
  saveGeneralSettings: (settings: any) => ipcRenderer.invoke('workspace:save-settings', settings),
  getModelPreset: () => ipcRenderer.invoke('workspace:get-model-preset'),
  saveModelPreset: (preset: { provider: string, model: string }) => ipcRenderer.invoke('workspace:save-model-preset', preset),
  createShortcut: () => ipcRenderer.invoke('desktop:create-shortcut'),
  getComputerOverview: () => ipcRenderer.invoke('desktop:computer-overview'),
  listDirectory: (folderPath?: string) => ipcRenderer.invoke('desktop:list-directory', folderPath),
  revealPath: (targetPath: string) => ipcRenderer.invoke('desktop:reveal-path', targetPath),
  openPath: (targetPath: string) => ipcRenderer.invoke('desktop:open-path', targetPath),
  openTerminal: (folderPath?: string) => ipcRenderer.invoke('desktop:open-terminal', folderPath),
  composeWhatsApp: (message: string, phone?: string) => ipcRenderer.invoke('desktop:whatsapp-compose', { message, phone }),
  getVoiceStackStatus: () => ipcRenderer.invoke('desktop:voice-stack-status'),
  speakVoiceStack: (text: string, options?: any) => ipcRenderer.invoke('desktop:voice-stack-speak', { text, options }),
  getAutomationEvents: () => ipcRenderer.invoke('automation:get-events'),
  openBrowserAutomation: (target?: string) => ipcRenderer.invoke('automation:open-browser', target),
  researchWebAutomation: (query: string) => ipcRenderer.invoke('automation:research-web', query),
  getBrowserOperatorState: () => ipcRenderer.invoke('browser-operator:get-state'),
  openBrowserOperator: (target?: string) => ipcRenderer.invoke('browser-operator:open', target),
  navigateBrowserOperator: (target: string) => ipcRenderer.invoke('browser-operator:navigate', target),
  readBrowserOperator: () => ipcRenderer.invoke('browser-operator:read'),
  clickBrowserOperator: (selector: string) => ipcRenderer.invoke('browser-operator:click', selector),
  typeBrowserOperator: (selector: string, text: string) => ipcRenderer.invoke('browser-operator:type', { selector, text }),
  screenshotBrowserOperator: () => ipcRenderer.invoke('browser-operator:screenshot'),
  getClassicOutlookStatus: () => ipcRenderer.invoke('outlook:classic-status'),
  listClassicOutlookMessages: (limit?: number) => ipcRenderer.invoke('outlook:classic-messages', limit),
  startMicrosoftGraphLogin: () => ipcRenderer.invoke('microsoft:graph-start-login'),
  completeMicrosoftGraphLogin: () => ipcRenderer.invoke('microsoft:graph-complete-login'),
  getMicrosoftGraphStatus: () => ipcRenderer.invoke('microsoft:graph-status'),
  getMicrosoftMailboxSettings: () => ipcRenderer.invoke('microsoft:graph-mailbox-settings'),
  listMicrosoftGraphMessages: (limit?: number) => ipcRenderer.invoke('microsoft:graph-messages', limit),
  listMicrosoftGraphFolders: () => ipcRenderer.invoke('microsoft:graph-folders'),
  syncEmailIntelligence: (limitPerFolder?: number) => ipcRenderer.invoke('microsoft:graph-sync-email-intelligence', limitPerFolder),
  disconnectMicrosoftGraph: () => ipcRenderer.invoke('microsoft:graph-disconnect'),
  getSilvaMemory: () => ipcRenderer.invoke('workspace:get-silva-memory'),
  saveSilvaMemory: (memory: string) => ipcRenderer.invoke('workspace:save-silva-memory', memory),
  getEmailIntelligence: () => ipcRenderer.invoke('workspace:get-email-intelligence'),
  approveEmailRoute: (messageId: string, status: string) => ipcRenderer.invoke('workspace:approve-email-route', { messageId, status }),
  getProjects: () => ipcRenderer.invoke('workspace:get-projects'),
  saveProject: (project: any) => ipcRenderer.invoke('workspace:save-project', project),
  deleteProject: (id: string) => ipcRenderer.invoke('workspace:delete-project', id),
  addProjectFiles: (id: string, files: string[]) => ipcRenderer.invoke('workspace:add-project-files', { id, files }),
  startProjectTask: (id: string, prompt: string, agentId?: string) => ipcRenderer.invoke('workspace:start-project-task', { id, prompt, agentId }),
  getWideResearchRuns: () => ipcRenderer.invoke('wide-research:get-runs'),
  startWideResearch: (brief: string, items?: string[]) => ipcRenderer.invoke('wide-research:start', { brief, items }),
  getConnectorStatuses: () => ipcRenderer.invoke('ai:get-connector-statuses'),
  createSlidesArtifact: (title: string, brief: string) => ipcRenderer.invoke('artifacts:create-slides', { title, brief }),
  createWebsiteArtifact: (title: string, brief: string) => ipcRenderer.invoke('artifacts:create-website', { title, brief }),
  createDesignArtifact: (title: string, brief: string) => ipcRenderer.invoke('artifacts:create-design', { title, brief }),
  analyzeDataArtifact: (filePath: string) => ipcRenderer.invoke('artifacts:analyze-data', filePath),
  createJusticeCasePack: (title: string, brief: string) => ipcRenderer.invoke('artifacts:create-justice-case', { title, brief }),
  createPurchaseProtectionPack: (title: string, brief: string) => ipcRenderer.invoke('artifacts:create-purchase-protection', { title, brief }),
  revealArtifactsRoot: () => ipcRenderer.invoke('artifacts:reveal-root'),
})
