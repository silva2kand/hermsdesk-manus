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
import { DataControlsView } from './components/DataControlsView';
import { ScheduledTasksView } from './components/ScheduledTasksView';
import { ConnectorsManager } from './components/ConnectorsManager';
import { APIKeyManager } from './components/APIKeyManager';
import { 
  Rocket, 
  Paperclip, 
  Scale, 
  Calculator, 
  Brain, 
  Shield, 
  Terminal, 
  Share2, 
  Users, 
  FileText, 
  Edit3, 
  Star, 
  Info, 
  Trash2, 
  MoreVertical,
  Settings 
} from 'lucide-react';

import { hermesAgents } from './data/hermesAgents';

const iconMap: Record<string, any> = {
  'hermes-full': Rocket,
  'paperclip-full': Paperclip,
  'solicitor-agent': Scale,
  'accountant-agent': Calculator,
  'space-agent-full': Brain,
  'openclaw-full': Shield
};

const SettingsSurface = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-full bg-[#fafafa] p-8">
    <div className="max-w-5xl mx-auto">{children}</div>
  </div>
);

const SettingsShell = ({ title, desc }: { title: string, desc: string }) => (
  <SettingsSurface>
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={async () => {
            const folder = await window.ipcRenderer?.selectFolder();
            if (folder) await navigator.clipboard?.writeText(folder);
          }}
          className="p-5 bg-white border border-gray-100 rounded-2xl text-left hover:border-blue-100 hover:shadow-sm transition-all"
        >
          <p className="text-xs font-black text-gray-900">Choose Local Folder</p>
          <p className="text-[10px] text-gray-500 mt-1">Select a workspace path and copy it for the current workflow.</p>
        </button>
        <button
          onClick={async () => {
            const files = await window.ipcRenderer?.selectFiles();
            if (files?.length) await navigator.clipboard?.writeText(files.join('\n'));
          }}
          className="p-5 bg-white border border-gray-100 rounded-2xl text-left hover:border-blue-100 hover:shadow-sm transition-all"
        >
          <p className="text-xs font-black text-gray-900">Attach Local Files</p>
          <p className="text-[10px] text-gray-500 mt-1">Use the native file picker for this module.</p>
        </button>
        <button
          onClick={() => window.ipcRenderer?.openTerminal()}
          className="p-5 bg-gray-900 border border-gray-800 rounded-2xl text-left hover:bg-gray-800 transition-all"
        >
          <p className="text-xs font-black text-white">Open Workspace Terminal</p>
          <p className="text-[10px] text-gray-400 mt-1">Launch PowerShell in the local app workspace.</p>
        </button>
      </div>
    </div>
  </SettingsSurface>
);

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

function App() {
  const [view, setView] = useState<'landing' | 'chat' | 'models' | 'skills' | 'knowledge' | 'memory' | 'plugins' | 'agents' | 'computer' | 'profile' | 'settings' | 'usage' | 'tasks' | 'mail' | 'data' | 'browser' | 'personalization' | 'shared-tasks' | 'shared-files' | 'websites' | 'apps' | 'domains' | 'connectors' | 'api-keys' | 'integrations'>('landing');
  const [selectedModel, setSelectedModel] = useState<{provider: string, model: string} | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
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
            setAgents(prev => orchestratorAgents.map((oa: any) => {
              const localMeta = prev.find(a => a.id === oa.id) || {} as Partial<Agent>;
              return {
                ...oa,
                icon: iconMap[oa.id] || Rocket,
                color: localMeta.color || (oa.id === 'hermes-full' ? 'bg-black' : 'bg-gray-900'),
                role: localMeta.role || oa.role
              };
            }));
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
      setView(nextView as any);
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
    setView('chat');
  };

  const activeAgents = agents.filter(a => activeAgentWindows.includes(a.id) || minimizedAgents.includes(a.id));

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentView={view} 
        onViewChange={(v) => setView(v as any)}
        onOpenSettings={() => openSettings('General')}
        onAgentAction={handleAgentAction}
        agents={agents}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header - No "Lite" or "Free Trial" headers */}
        {['landing', 'chat'].includes(view) && (
          <header 
            className="flex items-center justify-between px-6 py-4 border-b bg-white"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button
                onClick={() => setView(view === 'landing' ? 'agents' : 'models')}
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
                <button onClick={() => { setTaskPrompt(''); setView('landing'); showToast('Task cleared'); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md transition-all" title="Delete">
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
          {view === 'landing' && (
            <LandingPage 
              onOpenConnectors={() => openSettings('Connectors')} 
              onOpenComputer={() => openSettings('Computer')} 
              onStartTask={startTask} 
            />
          )}
          {view === 'chat' && (
            <ChatInterface 
              initialModel={selectedModel} 
              initialPrompt={taskPrompt} 
              isAgentic={isAgenticTask}
            />
          )}
          {view === 'models' && (
            <ModelHub 
              onLoadModel={(m, p) => {
                if (m && p) {
                  setSelectedModel({ model: m, provider: p });
                  setView('chat');
                } else {
                  console.error('ModelHub returned invalid model or provider');
                }
              }} 
            />
          )}
          {view === 'skills' && <Skills />}
          {view === 'memory' && <Memory />}
          {view === 'plugins' && <Plugins />}
          {view === 'computer' && <MyComputer />}
          {view === 'agents' && <AgentsMonitor agents={agents} onAgentAction={handleAgentAction} />}
          {view === 'settings' && <SettingsPage />}
          {view === 'profile' && <SettingsPage />}
          {view === 'usage' && <SettingsShell title="Usage" desc="Local usage, engine activity, and workspace metrics." />}
          {view === 'tasks' && <SettingsSurface><ScheduledTasksView /></SettingsSurface>}
          {view === 'mail' && <SettingsSurface><MailMEView /></SettingsSurface>}
          {view === 'data' && <SettingsSurface><DataControlsView /></SettingsSurface>}
          {view === 'browser' && <SettingsSurface><DataControlsView mode="cloud" /></SettingsSurface>}
          {view === 'personalization' && <SettingsPage />}
          {view === 'shared-tasks' && <SettingsShell title="Shared Tasks" desc="Create local task handoff files and manage collaboration notes." />}
          {view === 'shared-files' && <SettingsShell title="Shared Files" desc="Choose and review local folders used by shared workflows." />}
          {view === 'websites' && <SettingsShell title="Websites" desc="Open generated sites, saved website projects, and export folders." />}
          {view === 'apps' && <SettingsShell title="Apps" desc="Track local app builds, installers, and launch shortcuts." />}
          {view === 'domains' && <SettingsShell title="Purchased Domains" desc="Store domain records and connect them to deployments." />}
          {view === 'connectors' && <SettingsSurface><ConnectorsManager onAddCustomAPI={() => setView('api-keys')} /></SettingsSurface>}
          {view === 'api-keys' && <SettingsSurface><APIKeyManager /></SettingsSurface>}
          {view === 'integrations' && <SettingsSurface><ConnectorsManager onAddCustomAPI={() => setView('api-keys')} /></SettingsSurface>}
          {view === 'knowledge' && <Knowledge />}
          
          {/* Fallback for unmapped views to prevent blank screen */}
          {!['landing', 'chat', 'models', 'skills', 'knowledge', 'memory', 'plugins', 'agents', 'computer', 'settings', 'profile', 'usage', 'tasks', 'mail', 'data', 'browser', 'personalization', 'shared-tasks', 'shared-files', 'websites', 'apps', 'domains', 'connectors', 'api-keys', 'integrations'].includes(view) && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <Settings className="w-6 h-6 text-gray-400" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Feature in Development</h2>
              <p className="text-sm text-gray-500 max-w-md">
                The <strong className="text-gray-900 uppercase">{view}</strong> module is part of the ME 1.8 Premium roadmap and is currently being implemented.
              </p>
              <button 
                onClick={() => setView('landing')}
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

      <RightApprovalSidebar agents={agents} />

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
