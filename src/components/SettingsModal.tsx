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
import { SkillsRegistry } from './SkillsRegistry';
import { MailMEView } from './MailMEView';
import { DataControlsView } from './DataControlsView';
import { MyComputer } from './MyComputer';
import { KnowledgeView } from './KnowledgeView';
import { ScheduledTasksView } from './ScheduledTasksView';
import { APIKeyManager } from './APIKeyManager';
import { Settings as SettingsPage } from './Settings';

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

const ConnectorCard = ({ icon: Icon, title, desc, connected, color, onAction }: any) => (
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
    <button onClick={onAction} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
      connected ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-800'
    }`}>
      {connected ? 'Route On' : 'Enable Route'}
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

const WorkspacePanel = ({ tab, onAction, setNotice }: any) => {
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

      <div className="p-8 bg-gray-50 border border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-400">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Real local {item.title.toLowerCase()} actions</p>
          <p className="text-[11px] text-gray-400 max-w-xs mt-1">This panel only shows actions that run locally or open a real workspace route. Connector/private-data access is shown separately as route, API key, OAuth, and live verification.</p>
        </div>
        <button 
          onClick={() => onAction(item.primary, tab)}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
        >
          {item.primary}
        </button>
      </div>

      <div className="space-y-3">
        <SettingToggle title="Show module shortcuts" desc={`Session control for showing ${item.title.toLowerCase()} actions across chat and task workflows. Persistent settings live in the dedicated module page.`} defaultChecked />
        <SettingToggle title="Prefer local storage" desc="Policy reminder: files, notes, and state stay on this computer unless a connector is explicitly authenticated." defaultChecked />
        <SettingToggle title="Open browser for research" desc="Current web automation opens/controls the Browser Operator window; authenticated site access still depends on your browser login." defaultChecked />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button 
          onClick={async () => {
            const res = await window.ipcRenderer.createShortcut();
            if (res.success) {
              setNotice('Desktop shortcut created!');
              setTimeout(() => setNotice(''), 3000);
            } else {
              setNotice(`Error: ${res.error}`);
            }
          }}
          className="p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-left transition-all group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-white">Create Desktop Shortcut</p>
            <Zap className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Generate a launch shortcut on your Windows desktop.</p>
        </button>
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
                <SidebarItem icon={Terminal} label="Mythos Skills" active={activeTab === 'Skills'} onClick={() => setActiveTab('Skills')} />
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
                        <button onClick={() => showSettingsNotice('Avatar picker is not connected yet. No fake upload route was started.')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline mt-2">Change Avatar</button>
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
                        defaultValue={`You have access to multiple AI providers including OpenRouter, HuggingFace, Gemini, NVIDIA NIM, LM Studio, Ollama, and Jan + TurboQuant. Treat each provider as a tool with different strengths. Choose the provider based on the task:\n\n- Prefer Jan + TurboQuant for local-first chat, drafting, coding, and private tasks.\n- Use Ollama or LM Studio only when those optional local routes are online.\n- Use cloud models only when the task requires advanced reasoning, multimodal input, or high factual accuracy and the API key is present.\n- Use Gemini for structured, factual, or multimodal tasks when configured.\n- Use OpenRouter free-tier models when a cloud fallback is needed.\n- Use HuggingFace for model discovery and downloads.\n\nGeneral behavior:\n- Be direct, technical, and solution-focused.\n- Provide clear steps, practical examples, and code when relevant.\n- Avoid unnecessary explanations or filler.\n- When multiple tools could solve the task, choose the most efficient real one.\n- When local models are sufficient, prefer them to preserve privacy and reduce latency.\n- Never claim private connector data access unless OAuth/API key/live verification is present.\n- Maintain consistency across tasks and remember my preferences for local-first, open-source, and automated workflows.`}
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
              {activeTab === 'Skills' && <SkillsRegistry />}
              {activeTab === 'Data' && <DataControlsView />}
              {activeTab === 'Cloud' && <DataControlsView mode="cloud" />}
              {activeTab === 'Computer' && <MyComputer />}
              {activeTab === 'Knowledge' && <KnowledgeView />}
              {activeTab === 'APIKeys' && <APIKeyManager />}
              {activeTab === 'Scheduled' && <ScheduledTasksView />}
              
              {activeTab === 'General' && <SettingsPage />}

              {(['Account', 'Usage', 'SharedTasks', 'SharedFiles', 'Websites', 'Apps', 'Domains', 'Integrations', 'About', 'Help'].includes(activeTab)) && (
                <WorkspacePanel tab={activeTab} onAction={runSettingsAction} setNotice={setSettingsNotice} />
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
