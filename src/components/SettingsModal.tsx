import React, { useState } from 'react';
import { 
  X, User, Settings as SettingsIcon, PieChart, Calendar, Mail, 
  Database, Globe, Monitor, Palette, Wrench, Share2, Puzzle, 
  Info, HelpCircle, Check, Github, Briefcase, Calculator, 
  Smile, Cpu, Zap, Cloud, HardDrive, Layout, Clock, Shield,
  Bell, CreditCard, Activity, Terminal, Users, FileText, ShoppingBag,
  Moon, Sun, Laptop, Sparkles, Box, HardDrive as Disk, Download,
  ChevronDown, Heart, Coffee, Camera, Map, Compass, Key
} from 'lucide-react';
import { ConnectorsManager } from './ConnectorsManager';
import { MailMEView } from './MailMEView';
import { DataControlsView } from './DataControlsView';
import { MyComputerSettings } from './MyComputerSettings';
import { KnowledgeView } from './KnowledgeView';
import { SkillsRegistry } from './SkillsRegistry';
import { ScheduledTasksView } from './ScheduledTasksView';
import { APIKeyManager } from './APIKeyManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <div className="flex items-center">
      <Icon className="w-3.5 h-3.5 mr-2.5" />
      {label}
    </div>
    {badge && (
      <span className="px-1.5 py-0.5 text-[9px] bg-blue-100 text-blue-600 rounded-full font-bold uppercase">
        {badge}
      </span>
    )}
  </button>
);

const ConnectorCard = ({ icon: Icon, title, desc, connected, color }: any) => (
  <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow">
    <div className="flex items-center space-x-3">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{desc}</p>
      </div>
    </div>
    <button className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
      connected ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-800'
    }`}>
      {connected ? 'Connected' : 'Add'}
    </button>
  </div>
);

const SettingToggle = ({ title, desc, defaultChecked = false }: any) => (
  <div className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between">
    <div>
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 max-w-md">{desc}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
      <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>
);

const WorkspacePanel = ({ tab, onAction }: any) => {
  const config: Record<string, any> = {
    Account: { title: 'Account', icon: CreditCard, desc: 'Manage identity, authentication, workspace membership, and billing.', primary: 'Copy account summary' },
    Usage: { title: 'Usage', icon: PieChart, desc: 'Review token consumption, API calls, connector activity, and workspace quotas.', primary: 'Export usage report' },
    SharedTasks: { title: 'Shared Tasks', icon: Users, desc: 'Control collaboration, invites, and exported task handoff files.', primary: 'Create share file' },
    SharedFiles: { title: 'Shared Files', icon: FileText, desc: 'Manage local shared folders and files attached to tasks.', primary: 'Choose folder' },
    Websites: { title: 'Websites', icon: Globe, desc: 'Open generated sites, save website projects, and export static builds.', primary: 'Open website folder' },
    Apps: { title: 'Apps', icon: Layout, desc: 'Track desktop app builds, installers, and launch shortcuts.', primary: 'Open release folder' },
    Domains: { title: 'Purchased Domains', icon: ShoppingBag, desc: 'Store domain records and connect deploy targets.', primary: 'Add domain note' },
    Integrations: { title: 'Integrations', icon: Puzzle, desc: 'Manage connector routes, custom APIs, and local MCP-style tools.', primary: 'Open connectors' },
    About: { title: 'About', icon: Info, desc: 'Aion OS / HermsDesk local-first AI workstation with Jan + TurboQuant routing.', primary: 'Copy app info' },
    Help: { title: 'Get Help', icon: HelpCircle, desc: 'Open diagnostics, docs, and support actions for the local app.', primary: 'Copy diagnostics' }
  };
  const item = config[tab] || config.About;
  const Icon = item.icon;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
      </div>

      <div className="p-6 bg-gray-900 text-white rounded-3xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black">{item.title} Control Center</p>
            <p className="text-[11px] text-gray-300 mt-0.5">Local-first settings are saved in this workspace session.</p>
          </div>
        </div>
        <button onClick={() => onAction(item.primary, tab)} className="px-5 py-2 bg-white text-gray-900 rounded-xl text-[11px] font-black hover:bg-gray-100 transition-all">
          {item.primary}
        </button>
      </div>

      <div className="space-y-3">
        <SettingToggle title="Enable module" desc={`Show ${item.title.toLowerCase()} actions across chat and task workflows.`} defaultChecked />
        <SettingToggle title="Use local storage" desc="Keep files, notes, and state on this computer unless a connector is explicitly used." defaultChecked />
        <SettingToggle title="Allow web research" desc="When a task needs current information, open browser research from the thinking panel." defaultChecked />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {['Open local folder', 'Export JSON', 'Refresh status', 'Reset module'].map(action => (
          <button key={action} onClick={() => onAction(action, tab)} className="p-4 bg-gray-50 hover:bg-blue-50 border border-gray-100 rounded-2xl text-left transition-all">
            <p className="text-xs font-black text-gray-900">{action}</p>
            <p className="text-[10px] text-gray-500 mt-1">Runs against the local Electron workspace.</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export const SettingsModal = ({ isOpen, onClose, initialTab }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'Profile');
  const [settingsNotice, setSettingsNotice] = useState('');
  
  // Update activeTab when initialTab changes and modal opens
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const showSettingsNotice = (message: string) => {
    setSettingsNotice(message);
    window.setTimeout(() => setSettingsNotice(''), 3500);
  };

  const runSettingsAction = async (action: string, tab: string) => {
    if (action.includes('folder') || action.includes('release')) {
      const folder = await window.ipcRenderer?.selectFolder();
      showSettingsNotice(folder ? `${tab}: ${folder}` : `${tab}: no folder selected`);
      return;
    }
    if (action.includes('connectors')) {
      setActiveTab('Connectors');
      return;
    }
    if (action.includes('diagnostics') || action.includes('app info')) {
      await navigator.clipboard?.writeText(`HermsDesk ${tab} diagnostics: ${new Date().toISOString()}`);
      showSettingsNotice('Diagnostics copied');
      return;
    }
    showSettingsNotice(`${tab}: ${action} saved`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Sidebar */}
        <div className="w-60 border-r bg-gray-50/50 flex flex-col p-4">
          <div className="flex items-center space-x-3 px-3 mb-8">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">S</div>
            <div>
              <p className="text-xs font-bold text-gray-900">Shiva</p>
              <p className="text-[10px] text-gray-400 font-medium">Personal</p>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
            <div>
              <p className="px-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">User</p>
              <div className="space-y-0.5">
                <SidebarItem icon={User} label="Profile" active={activeTab === 'Profile'} onClick={() => setActiveTab('Profile')} />
                <SidebarItem icon={CreditCard} label="Account" active={activeTab === 'Account'} onClick={() => setActiveTab('Account')} />
                <SidebarItem icon={SettingsIcon} label="General Settings" active={activeTab === 'General'} onClick={() => setActiveTab('General')} />
                <SidebarItem icon={PieChart} label="Usage" active={activeTab === 'Usage'} onClick={() => setActiveTab('Usage')} />
                <SidebarItem icon={Clock} label="Scheduled tasks" active={activeTab === 'Scheduled'} onClick={() => setActiveTab('Scheduled')} />
                <SidebarItem icon={Mail} label="Mail ME" active={activeTab === 'Mail'} onClick={() => setActiveTab('Mail')} badge="Hot" />
              </div>
            </div>

            <div>
              <p className="px-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">System</p>
              <div className="space-y-0.5">
                <SidebarItem icon={Shield} label="Data controls" active={activeTab === 'Data'} onClick={() => setActiveTab('Data')} />
                <SidebarItem icon={Globe} label="Cloud browser" active={activeTab === 'Cloud'} onClick={() => setActiveTab('Cloud')} />
                <SidebarItem icon={Monitor} label="My Computer" active={activeTab === 'Computer'} onClick={() => setActiveTab('Computer')} />
                <SidebarItem icon={Palette} label="Personalization" active={activeTab === 'Personalization'} onClick={() => setActiveTab('Personalization')} />
                <SidebarItem icon={Database} label="Knowledge" active={activeTab === 'Knowledge'} onClick={() => setActiveTab('Knowledge')} />
                <SidebarItem icon={Terminal} label="Skills" active={activeTab === 'Skills'} onClick={() => setActiveTab('Skills')} />
              </div>
            </div>

            <div>
              <p className="px-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Workspace</p>
              <div className="space-y-0.5">
                <SidebarItem icon={Users} label="Shared tasks" active={activeTab === 'SharedTasks'} onClick={() => setActiveTab('SharedTasks')} />
                <SidebarItem icon={FileText} label="Shared files" active={activeTab === 'SharedFiles'} onClick={() => setActiveTab('SharedFiles')} />
                <SidebarItem icon={Globe} label="Websites" active={activeTab === 'Websites'} onClick={() => setActiveTab('Websites')} />
                <SidebarItem icon={Layout} label="Apps" active={activeTab === 'Apps'} onClick={() => setActiveTab('Apps')} />
                <SidebarItem icon={ShoppingBag} label="Purchased domains" active={activeTab === 'Domains'} onClick={() => setActiveTab('Domains')} />
              </div>
            </div>

            <div>
              <p className="px-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Integrations</p>
              <div className="space-y-0.5">
                <SidebarItem icon={Share2} label="Connectors" active={activeTab === 'Connectors'} onClick={() => setActiveTab('Connectors')} badge="New" />
                <SidebarItem icon={Key} label="API Keys" active={activeTab === 'APIKeys'} onClick={() => setActiveTab('APIKeys')} />
                <SidebarItem icon={Puzzle} label="Integrations" active={activeTab === 'Integrations'} onClick={() => setActiveTab('Integrations')} />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-auto border-t space-y-0.5">
            <SidebarItem icon={Info} label="About" active={activeTab === 'About'} onClick={() => setActiveTab('About')} />
            <SidebarItem icon={HelpCircle} label="Get help" active={activeTab === 'Help'} onClick={() => setActiveTab('Help')} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
            <div className="max-w-2xl mx-auto space-y-10">
              {settingsNotice && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
                  {settingsNotice}
                </div>
              )}
              
              {activeTab === 'Profile' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">User Profile</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your identity and how ME remembers you.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center space-x-6 pb-6 border-b border-gray-50">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-blue-100">
                        S
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-gray-900">SILVA</h3>
                        <p className="text-sm text-gray-500">Independent AI Systems Architect</p>
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline mt-2">Change Avatar</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nickname</label>
                        <input 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          defaultValue="silva"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Occupation</label>
                        <input 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          defaultValue="Independent AI Systems Architect & Developer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase">More about you</label>
                        <span className="text-[10px] text-gray-400 font-medium">547 / 2000</span>
                      </div>
                      <textarea 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        defaultValue="I design and build advanced local-first AI systems, multi-agent orchestration frameworks, and automated LLM workflows. I prefer open-source, self-hosted, GPU-accelerated solutions and I value reliability, autonomy, and technical precision. I frequently integrate multiple model providers (local and cloud) and expect tools to work together intelligently. I appreciate direct, technical, solution-focused communication with clear steps and practical examples. My priorities are stability, privacy, and efficient routing across multiple AI backends."
                      />
                      <p className="text-[10px] text-gray-400 italic">ME uses this information to personalize responses across all tasks.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
                    <button onClick={onClose} className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 shadow-lg shadow-gray-200 transition-all">Save Profile</button>
                  </div>
                </div>
              )}

              {activeTab === 'Personalization' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Personalization</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage who you are and what ME remembers</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Nickname</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        defaultValue="silva"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Occupation</label>
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        defaultValue="Independent AI Systems Architect & Developer"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase">More about you</label>
                        <span className="text-[10px] text-gray-400 font-medium">547 / 2000</span>
                      </div>
                      <textarea 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        defaultValue="I design and build advanced local-first AI systems, multi-agent orchestration frameworks, and automated LLM workflows. I prefer open-source, self-hosted, GPU-accelerated solutions and I value reliability, autonomy, and technical precision. I frequently integrate multiple model providers (local and cloud) and expect tools to work together intelligently. I appreciate direct, technical, solution-focused communication with clear steps and practical examples. My priorities are stability, privacy, and efficient routing across multiple AI backends."
                      />
                      <p className="text-[10px] text-gray-400 italic">ME uses this information to personalize responses across all tasks.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase">Custom Instructions</label>
                        <span className="text-[10px] text-gray-400 font-medium">1371 / 3000</span>
                      </div>
                      <textarea 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm h-64 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all leading-relaxed"
                        defaultValue={`You have access to multiple AI providers including Grok, OpenRouter, HuggingFace, Gemini, MiniMax, LM Studio, and Ollama. Treat each provider as a tool with different strengths. Choose the provider based on the task: \n\nÔÇó Prefer local models (LM Studio, Ollama) for general chat, drafting, brainstorming, coding, and any task that does not require cloud-level reasoning or multimodal capabilities. \nÔÇó Use cloud models only when the task requires advanced reasoning, multimodal input, or high factual accuracy. \nÔÇó Use Grok for reasoning-heavy, analytical, or creative tasks. \nÔÇó Use Gemini for structured, factual, or multimodal tasks. \nÔÇó Use OpenRouter when a specific model is requested or when a frontier model is needed. \nÔÇó Use HuggingFace for specialized hosted models. \nÔÇó Use MiniMax for Chinese-language or multimodal tasks. \n\nGeneral behavior: \nÔÇó Be direct, technical, and solution-focused. \nÔÇó Provide clear steps, practical examples, and code when relevant. \nÔÇó Avoid unnecessary explanations or filler. \nÔÇó When multiple tools could solve the task, choose the most efficient one. \nÔÇó When local models are sufficient, prefer them to preserve privacy and reduce latency. \nÔÇó When a task requires external APIs, follow the instructions provided for each custom API. \nÔÇó Maintain consistency across tasks and remember my preferences for local-first, open-source, and automated workflows.`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
                    <button onClick={onClose} className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 shadow-lg shadow-gray-200 transition-all">Save</button>
                  </div>
                </div>
              )}

              {activeTab === 'Mail' && <MailMEView />}
              {activeTab === 'Connectors' && (
                <ConnectorsManager
                  onAddCustomAPI={() => setActiveTab('APIKeys')}
                  onAddCustomMCP={() => showSettingsNotice('Custom MCP registry is ready. Add a server URL when available.')}
                />
              )}
              {activeTab === 'Data' && <DataControlsView />}
              {activeTab === 'Cloud' && <DataControlsView mode="cloud" />}
              {activeTab === 'Computer' && <MyComputerSettings />}
              {activeTab === 'Knowledge' && <KnowledgeView />}
              {activeTab === 'APIKeys' && <APIKeyManager />}
              {activeTab === 'Skills' && <SkillsRegistry />}
              {activeTab === 'Scheduled' && <ScheduledTasksView />}
              
              {activeTab === 'General' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage system language, appearance, and notifications.</p>
                  </div>

                  {/* Language */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Language</h3>
                    <div className="relative max-w-xs">
                      <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all">
                        <option>English</option>
                        <option>Tamil</option>
                        <option>Chinese</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Appearance</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <button className="flex flex-col items-center p-4 bg-white border-2 border-blue-600 rounded-2xl shadow-sm space-y-2">
                        <Sun className="w-6 h-6 text-blue-600" />
                        <span className="text-xs font-bold text-gray-900">Light</span>
                      </button>
                      <button className="flex flex-col items-center p-4 bg-gray-900 border border-gray-800 rounded-2xl space-y-2 group">
                        <Moon className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                        <span className="text-xs font-bold text-gray-400 group-hover:text-white">Dark</span>
                      </button>
                      <button className="flex flex-col items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2 group">
                        <Laptop className="w-6 h-6 text-gray-400 group-hover:text-gray-900 transition-colors" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900">Follow System</span>
                      </button>
                    </div>
                  </div>

                  {/* TurboQuant Themes */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">TurboQuant Themes</h3>
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-100">Quantum Blue</button>
                      <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider">Cyber Neon</button>
                      <button className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider">Eco Fusion</button>
                      <button className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider">Solar Flare</button>
                    </div>
                  </div>

                  {/* Communication Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Communication Preferences</h3>
                    <div className="bg-gray-50/50 border border-gray-100 rounded-3xl divide-y divide-gray-100">
                      <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-900">Receive product updates</p>
                          <p className="text-[11px] text-gray-500">Receive early access to feature releases and success stories to optimize your workflow.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-900">Email me when my queued task starts</p>
                          <p className="text-[11px] text-gray-500">When enabled, we'll send you a timely email once your task finishes queuing and begins processing.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
                    <button onClick={onClose} className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 shadow-lg shadow-gray-200 transition-all">Save</button>
                  </div>
                </div>
              )}

              {(['Account', 'Usage', 'SharedTasks', 'SharedFiles', 'Websites', 'Apps', 'Domains', 'Integrations', 'About', 'Help'].includes(activeTab)) && (
                <WorkspacePanel tab={activeTab} onAction={runSettingsAction} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
