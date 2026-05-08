import React, { useState, useEffect } from 'react';
import { cn } from './lib/utils';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
import { Settings as SettingsPage } from './components/Settings';
import { ModelHub } from './components/ModelHub';
import { Skills } from './components/Skills';
import { Knowledge } from './components/Knowledge';
import { Memory } from './components/Memory';
import { Plugins } from './components/Plugins';
import { ConsoleWindow } from './components/ConsoleWindow';
import { AgentsMonitor } from './components/AgentsMonitor';
import { AgentWindow } from './components/AgentWindow';
import { RunningAgentsDock } from './components/RunningAgentsDock';
import { RightApprovalSidebar } from './components/RightApprovalSidebar';
import { MyComputer } from './components/MyComputer';
import { MailMEView } from './components/MailMEView';
import { WhatsAppMEView } from './components/WhatsAppMEView';
import { DataControlsView } from './components/DataControlsView';
import { ScheduledTasksView } from './components/ScheduledTasksView';
import { ConnectorsManager } from './components/ConnectorsManager';
import { APIKeyManager } from './components/APIKeyManager';
import { ProjectsView } from './components/ProjectsView';
import { WideResearchView } from './components/WideResearchView';
import { GraphifyView } from './components/GraphifyView';
import { 
  Rocket, 
  Paperclip, 
  Scale, 
  Calculator, 
  Brain, 
  Shield, 
  Landmark,
  Receipt,
  Terminal, 
  Share2, 
  Users, 
  FileText, 
  Edit3, 
  Star, 
  Info, 
  Trash2, 
  MoreVertical,
  Settings,
  Bell
} from 'lucide-react';

import { hermesAgents } from './data/hermesAgents';

const iconMap: Record<string, any> = {
  'hermes-full': Rocket,
  'general-agent': Brain,
  'paperclip-full': Paperclip,
  'solicitor-agent': Scale,
  'accountant-agent': Calculator,
  'space-agent-full': Brain,
  'openclaw-full': Shield,
  'justice-case-agent': Landmark,
  'purchase-guardian-agent': Receipt
};

const SettingsSurface = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-full bg-[#fafafa] p-8">
    <div className="max-w-5xl mx-auto">{children}</div>
  </div>
);

const SettingsShell = ({ title, desc }: { title: string, desc: string }) => {
  const [notice, setNotice] = useState('');
  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const saveLocalRecord = (key: string, record: any) => {
    const current = JSON.parse(window.localStorage.getItem(key) || '[]');
    const next = [{ id: Math.random().toString(36).slice(2), createdAt: Date.now(), ...record }, ...current].slice(0, 50);
    window.localStorage.setItem(key, JSON.stringify(next));
    return next[0];
  };

  const commonActions = [
    {
      label: 'Choose Local Folder',
      detail: 'Pick a real folder and copy the path.',
      run: async () => {
        const folder = await window.ipcRenderer?.selectFolder();
        if (folder) {
          await navigator.clipboard?.writeText(folder);
          showNotice(`Folder copied: ${folder}`);
        }
      }
    },
    {
      label: 'Attach Local Files',
      detail: 'Pick real files and copy their paths.',
      run: async () => {
        const files = await window.ipcRenderer?.selectFiles();
        if (files?.length) {
          await navigator.clipboard?.writeText(files.join('\n'));
          showNotice(`${files.length} file path${files.length === 1 ? '' : 's'} copied.`);
        }
      }
    },
    {
      label: 'Open Workspace Terminal',
      detail: 'Launch PowerShell in this repo.',
      dark: true,
      run: async () => {
        await window.ipcRenderer?.openTerminal();
        showNotice('Workspace terminal opened.');
      }
    }
  ];

  const moduleActions: Record<string, any[]> = {
    Usage: [
      { label: 'Open ME Computer Metrics', detail: 'View live CPU/RAM/disk and automation activity.', run: async () => window.ipcRenderer?.openBrowserAutomation?.('http://localhost:7100/') },
      { label: 'Scan PC Resources', detail: 'Run the real hardware scan route.', run: async () => { const scan = await window.ipcRenderer?.scanPC?.(); await navigator.clipboard?.writeText(JSON.stringify(scan, null, 2)); showNotice('PC scan copied to clipboard.'); } },
      { label: 'Engine Status', detail: 'Check Jan, Ollama, and LM Studio routes.', run: async () => { const status = await window.ipcRenderer?.engineStatus?.(); await navigator.clipboard?.writeText(JSON.stringify(status, null, 2)); showNotice('Engine status copied.'); } }
    ],
    'Shared Tasks': [
      { label: 'Create Shared Task File', detail: 'Save a local handoff task record.', run: async () => { const prompt = window.prompt('Shared task brief', 'Follow up and report status'); if (!prompt) return; saveLocalRecord('hermsdesk.sharedTasks', { prompt, status: 'open' }); await window.ipcRenderer?.createAgentTask?.(`Shared task handoff:\n${prompt}`, 'paperclip-full'); showNotice('Shared task saved and queued to Paperclips.'); } },
      { label: 'Open Approvals', detail: 'Review pending safe actions.', run: async () => showNotice('Approvals drawer is available from the bottom-right button.') },
      { label: 'Copy Task Handoff', detail: 'Copy a reusable handoff template.', run: async () => { await navigator.clipboard?.writeText('Shared task:\nOwner:\nDeadline:\nFiles:\nAcceptance:'); showNotice('Shared task template copied.'); } }
    ],
    'Shared Files': [
      { label: 'Choose Shared Folder', detail: 'Pick and save a shared local folder.', run: async () => { const folder = await window.ipcRenderer?.selectFolder(); if (!folder) return; saveLocalRecord('hermsdesk.sharedFiles', { folder }); await navigator.clipboard?.writeText(folder); showNotice('Shared folder saved and copied.'); } },
      { label: 'Attach Files', detail: 'Pick files for sharing workflow.', run: commonActions[1].run },
      { label: 'Open Downloads', detail: 'Open the real Downloads folder.', run: async () => window.ipcRenderer?.openApp?.('downloads') }
    ],
    Websites: [
      { label: 'Open Local Browser', detail: 'Open a URL or search target.', run: async () => { const target = window.prompt('URL or search', 'localhost:5173'); if (target) await window.ipcRenderer?.openBrowserAutomation?.(target); } },
      { label: 'Create Website Project', detail: 'Save a project record for a website build.', run: async () => { const name = window.prompt('Website project name', 'New website'); if (!name) return; await window.ipcRenderer?.saveProject?.({ name, description: 'Website build project', instructions: 'Build, test, and export a real website project.', connectors: ['my-browser', 'github', 'vercel'] }); showNotice('Website project created.'); } },
      { label: 'Open Dist Folder', detail: 'Open built web output.', run: async () => window.ipcRenderer?.openPath?.('dist') }
    ],
    Apps: [
      { label: 'Create App Project', detail: 'Save a desktop app project record.', run: async () => { const name = window.prompt('App project name', 'New desktop app'); if (!name) return; await window.ipcRenderer?.saveProject?.({ name, description: 'Desktop app project', instructions: 'Implement, verify, build, and package this app feature.', connectors: ['mcp-filesystem', 'mcp-windows-shell', 'github'] }); showNotice('App project created.'); } },
      { label: 'Open Workspace Terminal', detail: 'Build, test, and package locally.', dark: true, run: commonActions[2].run },
      { label: 'Open Release Folder', detail: 'Open packaged app outputs.', run: async () => window.ipcRenderer?.openPath?.('release') }
    ],
    'Purchased Domains': [
      { label: 'Save Domain Record', detail: 'Store domain notes locally.', run: async () => { const domain = window.prompt('Domain name', 'yourdomain.co.uk'); if (!domain) return; saveLocalRecord('hermsdesk.domains', { domain, status: 'saved' }); showNotice(`${domain} saved locally.`); } },
      { label: 'Open DNS Lookup', detail: 'Research domain/DNS in browser.', run: async () => { const domain = window.prompt('Domain to check', 'yourdomain.co.uk'); if (domain) await window.ipcRenderer?.openBrowserAutomation?.(`dns lookup ${domain}`); } },
      { label: 'Copy Deployment Checklist', detail: 'Copy DNS/deployment checklist.', run: async () => { await navigator.clipboard?.writeText('Domain checklist:\nRegistrar:\nDNS provider:\nA/CNAME:\nSSL:\nDeployment URL:\nRenewal date:'); showNotice('Domain checklist copied.'); } }
    ]
  };

  const actions = moduleActions[title] || commonActions;

  return (
    <SettingsSurface>
      <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{desc}</p>
        </div>
        {notice && <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">{notice}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={action.run}
              className={`p-5 border rounded-2xl text-left hover:shadow-sm transition-all ${action.dark ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' : 'bg-white border-gray-100 hover:border-blue-100'}`}
            >
              <p className={`text-xs font-black ${action.dark ? 'text-white' : 'text-gray-900'}`}>{action.label}</p>
              <p className={`text-[10px] mt-1 ${action.dark ? 'text-gray-400' : 'text-gray-500'}`}>{action.detail}</p>
            </button>
          ))}
        </div>
      </div>
    </SettingsSurface>
  );
};

class MainErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || 'Unknown renderer error' };
  }

  componentDidCatch(error: Error) {
    window.dispatchEvent(new CustomEvent('app-log', {
      detail: { type: 'error', content: `Renderer panel crashed: ${error.message}` }
    }));
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full flex items-center justify-center bg-white p-8 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Info className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-gray-900">Panel Error</h2>
            <p className="text-xs text-gray-500">{this.state.error}</p>
            <button
              onClick={() => this.setState({ error: '' })}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Agent {
  id: string;
  name: string;
  icon: any;
  status: string;
  version: string;
  type: 'coding' | 'accounting' | 'legal' | 'research' | 'security';
  color: string;
  role: string;
  group?: string;
}

type AppView = 'landing' | 'chat' | 'models' | 'skills' | 'knowledge' | 'memory' | 'plugins' | 'agents' | 'computer' | 'profile' | 'settings' | 'usage' | 'tasks' | 'mail' | 'whatsapp' | 'data' | 'browser' | 'personalization' | 'projects' | 'wide-research' | 'graphify' | 'shared-tasks' | 'shared-files' | 'websites' | 'apps' | 'domains' | 'connectors' | 'api-keys' | 'integrations';

function App() {
  const [view, setView] = useState<AppView>('landing');
  const [visitedViews, setVisitedViews] = useState<Set<AppView>>(() => new Set(['landing']));
  const [selectedModel, setSelectedModel] = useState<{provider: string, model: string} | null>({ provider: 'Jan', model: 'Auto local model' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>('Profile');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [isAgenticTask, setIsAgenticTask] = useState(false);
  const [toast, setToast] = useState('');

  // Agent System State
  const [activeAgentWindows, setActiveAgentWindows] = useState<string[]>([]);
  const [minimizedAgents, setMinimizedAgents] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>(hermesAgents.map(a => ({
    ...a,
    status: 'stopped',
    version: a.id === 'hermes-full' ? '1.2.0' : a.id === 'openclaw-full' ? '2.1.1' : '1.0.0',
    type: a.group === 'Hermes' ? (a.id === 'hermes-full' ? 'coding' : a.id === 'solicitor-agent' ? 'legal' : 'accounting') : (a.id === 'openclaw-full' ? 'security' : 'research')
  })) as any);

  const changeView = (nextView: string) => {
    const typedView = nextView as AppView;
    setView(typedView);
    setVisitedViews(prev => {
      const next = new Set(prev);
      next.add(typedView);
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;
    window.ipcRenderer?.getModelPreset?.()
      .then(preset => {
        if (!isMounted) return;
        if (preset?.provider === 'Jan') {
          setSelectedModel({ provider: 'Jan', model: preset.model || 'Auto local model' });
          return;
        }
        setSelectedModel({ provider: 'Jan', model: 'Auto local model' });
        window.ipcRenderer?.saveModelPreset?.({ provider: 'Jan', model: 'Auto local model' }).catch(() => {});
      })
      .catch(() => {
        if (isMounted) setSelectedModel({ provider: 'Jan', model: 'Auto local model' });
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const fetchRealAgents = async () => {
      if (!isMounted) return;
      if (window.ipcRenderer) {
        try {
          const orchestratorAgents = await window.ipcRenderer.getAgents();
          if (orchestratorAgents && orchestratorAgents.length > 0 && isMounted) {
            // Sync full agent list from backend and merge with local metadata
            setAgents(prev => {
              const merged = orchestratorAgents.map((oa: any) => {
              const localMeta = hermesAgents.find(a => a.id === oa.id) || prev.find(a => a.id === oa.id) || {} as Partial<Agent>;
              return {
                ...oa,
                icon: iconMap[oa.id] || Rocket,
                color: localMeta.color || (oa.id === 'hermes-full' ? 'bg-black' : 'bg-gray-900'),
                role: localMeta.role || oa.role
              };
              });
              const missingLocalAgents = hermesAgents
                .filter(local => !merged.some((agent: any) => agent.id === local.id))
                .map(local => ({
                  ...local,
                  status: prev.find(agent => agent.id === local.id)?.status || 'idle',
                  version: '1.8.0',
                  type: local.id === 'solicitor-agent' || local.id === 'justice-case-agent' ? 'legal' : local.id === 'purchase-guardian-agent' ? 'research' : 'accounting'
                }));
              return [...merged, ...missingLocalAgents] as any;
            });
          }
        } catch (error) {
          console.error('Failed to fetch real agents:', error);
        }
      }
      if (isMounted) {
        timeout = setTimeout(fetchRealAgents, 5000);
      }
    };
    
    fetchRealAgents();
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const activateAllAgents = async () => {
      if (!window.ipcRenderer?.updateAgentStatus) return;
      try {
        await Promise.all(agents.map(agent => window.ipcRenderer.updateAgentStatus(agent.id, 'idle', true)));
        setAgents(prev => prev.map(agent => ({ ...agent, status: agent.status === 'stopped' ? 'idle' : agent.status })));
      } catch (error) {
        console.error('Failed to auto-activate agents:', error);
      }
    };
    activateAllAgents();
  }, []);

  const handleAgentAction = async (agentId: string, action: string) => {
    if (window.ipcRenderer) {
      if (action === 'open' || action === 'chat') {
        // Mark as running and show window
        await window.ipcRenderer.updateAgentStatus(agentId, 'running', false);
        if (!activeAgentWindows.includes(agentId)) {
          setActiveAgentWindows(prev => [...prev, agentId]);
        }
        setMinimizedAgents(prev => prev.filter(id => id !== agentId));
      } else if (action === 'background') {
        // Mark as running but in background
        await window.ipcRenderer.updateAgentStatus(agentId, 'running', true);
        if (!minimizedAgents.includes(agentId)) {
          setMinimizedAgents(prev => [...prev, agentId]);
        }
        setActiveAgentWindows(prev => prev.filter(id => id !== agentId));
      } else if (action === 'stop') {
        // Stop agent entirely
        await window.ipcRenderer.updateAgentStatus(agentId, 'stopped', false);
        setActiveAgentWindows(prev => prev.filter(aid => aid !== agentId));
        setMinimizedAgents(prev => prev.filter(aid => aid !== agentId));
      }
    }
  };

  // Global error capturing for the Console Window
  useEffect(() => {
    if (!window.ipcRenderer) return;

    // Global error capturing for the Console
    const handleLog = (_: any, log: any) => {
      try {
        window.dispatchEvent(new CustomEvent('app-log', { 
          detail: { 
            type: log.type || 'info', 
            content: log.content 
          } 
        }));
      } catch (e) {
        console.error('Failed to dispatch app-log event:', e);
      }
    };

    window.ipcRenderer.on('app:log', handleLog);

    // Agent update listener
    const handleAgentUpdate = (_: any, data: any) => {
      try {
        window.dispatchEvent(new CustomEvent('agent-log', { 
          detail: { 
            agentId: data.agentId, 
            log: {
              type: data.type || 'info',
              content: data.content,
              time: data.time || new Date().toLocaleTimeString()
            }
          } 
        }));
      } catch (e) {
        console.error('Failed to dispatch agent-log event:', e);
      }
    };

    window.ipcRenderer.on('agent:update', handleAgentUpdate);

    const handleNavigate = (_: any, nextView: string) => {
      changeView(nextView);
    };
    window.ipcRenderer.on('app:navigate', handleNavigate);

    return () => {
      window.ipcRenderer?.off?.('app:log', handleLog);
      window.ipcRenderer?.off?.('agent:update', handleAgentUpdate);
      window.ipcRenderer?.off?.('app:navigate', handleNavigate);
    };
  }, []);

  const openSettings = (tab: string = 'Profile') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const startTask = (prompt: string, agentic: boolean = false) => {
    setTaskPrompt(prompt);
    setIsAgenticTask(agentic);
      changeView('chat');
  };

  const activeAgents = agents.filter(a => activeAgentWindows.includes(a.id) || minimizedAgents.includes(a.id));

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentView={view} 
        onViewChange={changeView}
        onOpenSettings={() => openSettings('General')}
        onAgentAction={handleAgentAction}
        agents={agents}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden 2xl:pr-80">
        {/* Header - No "Lite" or "Free Trial" headers */}
        {['landing', 'chat'].includes(view) && (
          <header 
            className="flex items-center justify-between px-6 py-4 border-b bg-white"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button
                onClick={() => changeView(view === 'landing' ? 'agents' : 'models')}
                className="flex items-center space-x-2 px-3 py-1.5 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100"
                title={view === 'landing' ? 'Open agents' : 'Open Model Hub'}
              >
                <span className="text-sm font-black text-gray-900 uppercase tracking-tighter">
                  {view === 'landing'
                    ? `Agents: ${activeAgents.length} running`
                    : selectedModel
                      ? `${selectedModel.provider}: ${selectedModel.model}`
                      : 'Choose real model'}
                </span>
              </button>
            </div>
            
            {/* Task Right Actions */}
            <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <div className="flex items-center space-x-0.5 border-r pr-2 mr-2">
                <button 
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  className={`p-1.5 rounded-md transition-all flex items-center space-x-1.5 ${isConsoleOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`} 
                  title="Toggle Console"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Console</span>
                </button>
                <button onClick={() => { navigator.clipboard?.writeText('Aion OS task ready to share'); showToast('Task link copied'); }} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all" title="Share">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openSettings('Connectors')} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all" title="Collaborate">
                  <Users className="w-3.5 h-3.5" />
                </button>
                <button onClick={async () => { const files = await window.ipcRenderer?.selectFiles(); if (files?.length) showToast(`${files.length} file${files.length === 1 ? '' : 's'} selected`); }} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all" title="Files">
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => showToast('Edit mode enabled for the current task')} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all" title="Edit">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center space-x-0.5">
                <button onClick={() => showToast('Added to favorites')} className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-gray-100 rounded-md transition-all" title="Add Favorite">
                  <Star className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => showToast(selectedModel ? `Using ${selectedModel.provider}: ${selectedModel.model}` : 'No model selected yet')} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all" title="Task Details">
                  <Info className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setTaskPrompt(''); changeView('landing'); showToast('Task cleared'); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md transition-all" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsConsoleOpen(true)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all" title="More">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <MainErrorBoundary>
          {visitedViews.has('landing') && (
            <div className={view === 'landing' ? 'block h-full' : 'hidden'}>
            <LandingPage 
              onOpenConnectors={() => changeView('connectors')}
              onOpenComputer={() => changeView('computer')}
              onNavigate={changeView}
              onStartTask={startTask} 
            />
            </div>
          )}
          {visitedViews.has('chat') && (
            <div className={view === 'chat' ? 'block h-full' : 'hidden'}>
            <ChatInterface 
              initialModel={selectedModel} 
              initialPrompt={taskPrompt} 
              isAgentic={isAgenticTask}
              onNavigate={changeView}
            />
            </div>
          )}
          {visitedViews.has('models') && (
            <div className={view === 'models' ? 'block h-full' : 'hidden'}>
            <ModelHub 
              onLoadModel={(m, p) => {
                if (m && p) {
                  setSelectedModel({ model: m, provider: p });
                  window.ipcRenderer?.saveModelPreset?.({ provider: p, model: m }).catch(() => {});
                  changeView('chat');
                } else {
                  console.error('ModelHub returned invalid model or provider');
                }
              }} 
            />
            </div>
          )}
          {visitedViews.has('skills') && <div className={view === 'skills' ? 'block h-full' : 'hidden'}><Skills /></div>}
          {visitedViews.has('memory') && <div className={view === 'memory' ? 'block h-full' : 'hidden'}><Memory /></div>}
          {visitedViews.has('plugins') && <div className={view === 'plugins' ? 'block h-full' : 'hidden'}><Plugins /></div>}
          {visitedViews.has('computer') && <div className={view === 'computer' ? 'block h-full' : 'hidden'}><MyComputer /></div>}
          {visitedViews.has('agents') && <div className={view === 'agents' ? 'block h-full' : 'hidden'}><AgentsMonitor agents={agents} onAgentAction={handleAgentAction} /></div>}
          {view === 'settings' && <SettingsPage />}
          {view === 'profile' && <SettingsPage />}
          {view === 'usage' && <SettingsShell title="Usage" desc="Local usage, engine activity, and workspace metrics." />}
          {view === 'tasks' && <SettingsSurface><ScheduledTasksView /></SettingsSurface>}
          {visitedViews.has('mail') && <div className={view === 'mail' ? 'block h-full' : 'hidden'}><SettingsSurface><MailMEView /></SettingsSurface></div>}
          {visitedViews.has('whatsapp') && <div className={view === 'whatsapp' ? 'block h-full' : 'hidden'}><WhatsAppMEView /></div>}
          {view === 'data' && <SettingsSurface><DataControlsView /></SettingsSurface>}
          {view === 'browser' && <SettingsSurface><DataControlsView mode="cloud" /></SettingsSurface>}
          {view === 'personalization' && <SettingsPage />}
          {visitedViews.has('projects') && <div className={view === 'projects' ? 'block h-full' : 'hidden'}><ProjectsView /></div>}
          {visitedViews.has('wide-research') && <div className={view === 'wide-research' ? 'block h-full' : 'hidden'}><WideResearchView /></div>}
          {visitedViews.has('graphify') && <div className={view === 'graphify' ? 'block h-full' : 'hidden'}><GraphifyView /></div>}
          {view === 'shared-tasks' && <SettingsShell title="Shared Tasks" desc="Create local task handoff files and manage collaboration notes." />}
          {view === 'shared-files' && <SettingsShell title="Shared Files" desc="Choose and review local folders used by shared workflows." />}
          {view === 'websites' && <SettingsShell title="Websites" desc="Open generated sites, saved website projects, and export folders." />}
          {view === 'apps' && <SettingsShell title="Apps" desc="Track local app builds, installers, and launch shortcuts." />}
          {view === 'domains' && <SettingsShell title="Purchased Domains" desc="Store domain records and connect them to deployments." />}
          {view === 'connectors' && <SettingsSurface><ConnectorsManager onAddCustomAPI={() => changeView('api-keys')} /></SettingsSurface>}
          {view === 'api-keys' && <SettingsSurface><APIKeyManager /></SettingsSurface>}
          {view === 'integrations' && <SettingsSurface><ConnectorsManager onAddCustomAPI={() => changeView('api-keys')} /></SettingsSurface>}
          {view === 'knowledge' && <Knowledge />}
          
          {/* Fallback for unmapped views to prevent blank screen */}
          {!['landing', 'chat', 'models', 'skills', 'knowledge', 'memory', 'plugins', 'agents', 'computer', 'settings', 'profile', 'usage', 'tasks', 'mail', 'whatsapp', 'data', 'browser', 'personalization', 'projects', 'wide-research', 'graphify', 'shared-tasks', 'shared-files', 'websites', 'apps', 'domains', 'connectors', 'api-keys', 'integrations'].includes(view) && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <Settings className="w-6 h-6 text-gray-400" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">No Real Module Mapped Yet</h2>
              <p className="text-sm text-gray-500 max-w-md">
                The <strong className="text-gray-900 uppercase">{view}</strong> route has no production module wired yet. ME will not pretend this is connected.
              </p>
              <button 
                onClick={() => changeView('landing')}
                className="mt-6 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
              >
                Return to Dashboard
              </button>
            </div>
          )}
          </MainErrorBoundary>
        </main>
      </div>

      {/* Pop-up Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        initialTab={settingsTab}
      />

      {/* Console Overlay */}
      <ConsoleWindow 
        isOpen={isConsoleOpen} 
        onClose={() => setIsConsoleOpen(false)} 
      />

      {/* Agent Windows */}
      <div className="fixed inset-0 pointer-events-none z-[100]">
        {activeAgentWindows.map((id, index) => {
          const agent = agents.find(a => a.id === id);
          if (!agent) return null;
          
          // Map group to agent window type
          const typeMap: Record<string, any> = {
            'Engineering': 'coding',
            'Legal': 'legal',
            'Finance': 'accounting',
            'System': 'research',
            'Operations': 'accounting',
            'Security': 'security',
            'Hermes': 'coding',
            'Paperclip': 'accounting',
            'Space': 'research'
          };

          return ( 
            <div 
              key={id} 
              className="absolute pointer-events-auto"
              style={{ 
                top: `${80 + (index * 40)}px`, 
                right: `${40 + (index * 40)}px` 
              }}
            >
              <AgentWindow 
                agent={{
                  ...agent,
                  icon: iconMap[agent.id] || Rocket,
                  type: (agent.group && typeMap[agent.group]) || 'research'
                }}
                isOpen={true}
                onClose={() => handleAgentAction(id, 'stop')}
                onMinimize={() => handleAgentAction(id, 'background')}
              />
            </div>
          );
        })}
      </div>

      {/* Running Agents Dock */}
      <RunningAgentsDock 
        runningAgents={agents
          .filter(a => activeAgentWindows.includes(a.id) || minimizedAgents.includes(a.id))
          .map(a => ({
            ...a,
            icon: iconMap[a.id] || Rocket,
            status: activeAgentWindows.includes(a.id) ? 'active' : 'background' as any
          }))
        }
        onOpenAgent={(id) => handleAgentAction(id, 'open')}
        onCloseAll={() => {
          setMinimizedAgents(prev => [...new Set([...prev, ...activeAgentWindows])]);
          setActiveAgentWindows([]);
        }}
        onExpandAll={() => {
          setActiveAgentWindows(prev => [...new Set([...prev, ...minimizedAgents])]);
          setMinimizedAgents([]);
        }}
      />

      <div className="hidden 2xl:block fixed right-0 top-0 bottom-0 z-[70]">
        <RightApprovalSidebar agents={agents} />
      </div>

      {isApprovalsOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-150">
          <button
            className="flex-1 cursor-default"
            onClick={() => setIsApprovalsOpen(false)}
            aria-label="Close approvals panel"
          />
          <RightApprovalSidebar agents={agents} />
        </div>
      )}

      <button
        onClick={() => setIsApprovalsOpen(true)}
        className="fixed right-4 bottom-5 z-[80] flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black"
        title="Open approvals and notifications"
      >
        <Bell className="w-3.5 h-3.5" />
        Approvals
      </button>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
