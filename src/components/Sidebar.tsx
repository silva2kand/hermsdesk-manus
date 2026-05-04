import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  User, 
  Search, 
  Library, 
  Settings, 
  LayoutGrid, 
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Globe,
  FileText,
  Cloud,
  Monitor,
  Palette,
  Zap,
  Share2,
  MoreVertical,
  Brain,
  Wrench,
  Database,
  Puzzle,
  Activity,
  Rocket,
  Scale,
  Calculator,
  Paperclip,
  Shield,
  X,
  Users,
  Folder,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SidebarSection = ({ title, children, isCollapsed, defaultExpanded = false }: { title: string, children: React.ReactNode, isCollapsed: boolean, defaultExpanded?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (isCollapsed) {
    return <div className="space-y-1 mb-6">{children}</div>;
  }

  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 group"
      >
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">{title}</span>
        <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform duration-200", !isExpanded && "-rotate-90")} />
      </button>
      <div className={cn(
        "space-y-1 overflow-hidden transition-all duration-300",
        isExpanded ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
      )}>
        {children}
      </div>
    </div>
  );
};

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  isCollapsed = false,
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  isCollapsed?: boolean,
  onClick?: () => void 
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center w-full px-3 py-2 text-sm font-bold rounded-xl transition-all relative group",
      active 
        ? "bg-black text-white shadow-lg shadow-black/10" 
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
    )}
  >
    <Icon className={cn("w-4 h-4 shrink-0", !isCollapsed && "mr-3")} />
    <span className={cn(
      "truncate transition-all duration-300",
      isCollapsed ? "w-0 opacity-0 invisible" : "w-auto opacity-100 visible"
    )}>
      {label}
    </span>
    {isCollapsed && (
      <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all whitespace-nowrap z-50">
        {label}
      </div>
    )}
  </button>
);

const iconMap: Record<string, any> = {
  'hermes-full': Rocket,
  'paperclip-full': Paperclip,
  'solicitor-agent': Scale,
  'accountant-agent': Calculator,
  'space-agent-full': Globe,
  'openclaw-full': Shield
};

const AgentSidebarItem = ({ 
  agent, 
  isExpanded, 
  isCollapsed,
  onToggle, 
  onAction 
}: { 
  agent: any, 
  isExpanded: boolean, 
  isCollapsed: boolean,
  onToggle: () => void,
  onAction: (action: string) => void
}) => {
  const Icon = iconMap[agent.id] || Rocket;
  return (
    <div className="space-y-1">
      <button 
        onClick={onToggle}
        className={cn(
          "flex items-center w-full px-3 py-2 text-xs font-bold text-gray-600 rounded-xl transition-all group relative",
          isExpanded ? "bg-gray-50 text-gray-900 shadow-sm" : "hover:bg-gray-50"
        )}
      >
        <div className={cn("relative shrink-0", !isCollapsed && "mr-3")}>
          <div className={cn(
            "p-1.5 rounded-lg text-white shadow-sm transition-all duration-300",
            agent.id === 'hermes-full' ? 'bg-black' :
            agent.id === 'paperclip-full' ? 'bg-blue-900' :
            agent.id === 'solicitor-agent' ? 'bg-slate-700' :
            agent.id === 'accountant-agent' ? 'bg-emerald-600' :
            agent.id === 'space-agent-full' ? 'bg-indigo-900' : 'bg-red-900',
            agent.status === 'running' && "ring-2 ring-offset-2 ring-gray-100"
          )}>
            <Icon className={cn("w-3.5 h-3.5", agent.status === 'running' && "animate-pulse")} />
          </div>
          <div className={cn(
            "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white transition-all",
            agent.status === 'running' ? "bg-green-500 animate-pulse scale-110" : 
            agent.status === 'idle' ? "bg-yellow-500" : "bg-gray-300"
          )} />
        </div>
        
        <div className={cn(
          "flex-1 text-left min-w-0 transition-all duration-300",
          isCollapsed ? "w-0 opacity-0 invisible" : "w-auto opacity-100 visible"
        )}>
          <p className="truncate uppercase tracking-tighter leading-none mb-0.5">{agent.name}</p>
          <div className="flex items-center space-x-1.5">
            <p className="text-[9px] font-black text-gray-400 opacity-60">v{agent.version || '1.0.0'}</p>
            {agent.status === 'running' && (
              <span className="text-[8px] px-1 bg-green-50 text-green-600 rounded-sm font-black uppercase tracking-tighter">Active</span>
            )}
          </div>
        </div>

        {!isCollapsed && (
          <div className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </div>
        )}

        {isCollapsed && (
          <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all whitespace-nowrap z-50">
            {agent.name} • {agent.status}
          </div>
        )}
      </button>
      
      {isExpanded && !isCollapsed && (
        <div className="mx-3 my-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-1 animate-in slide-in-from-top-2 duration-200">
          <button 
            onClick={() => onAction('open')}
            className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Open Window</span>
          </button>
          <button 
            onClick={() => onAction('chat')}
            className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button 
            onClick={() => onAction('background')}
            className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Run in BG</span>
          </button>
          {agent.status !== 'stopped' && (
            <button 
              onClick={() => onAction('stop')}
              className="w-full flex items-center space-x-2 px-3 py-2 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Stop Agent</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const Sidebar = ({ 
  currentView, 
  onViewChange,
  onOpenSettings,
  onAgentAction,
  agents = []
}: { 
  currentView: string, 
  onViewChange: (view: string) => void,
  onOpenSettings: () => void,
  onAgentAction: (agentId: string, action: string) => void,
  agents?: any[]
}) => {
  const [resourceUsage, setResourceUsage] = useState<any>({ cpu: 0, gpu: 0, ram: 0, gpuModel: 'Detecting...', engine: 'Checking...' });
  const [expandedAgents, setExpandedAgents] = useState<string[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleAgent = (id: string) => {
    setExpandedAgents(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Real-time resource monitoring
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      if (!window.ipcRenderer || !mounted) return;
      try {
        const usage = await window.ipcRenderer.getResourceUsage();
        if (mounted && usage) setResourceUsage(usage);
      } catch (e: any) {
        console.error('Resource usage poll failed:', e.message);
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-white/80 backdrop-blur-xl border-r border-gray-100 transition-all duration-500 ease-in-out z-[110] relative flex-shrink-0",
      isSidebarCollapsed ? "w-20" : "w-64"
    )}>
      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute -right-4 top-10 bg-white border border-gray-100 rounded-full p-2 shadow-xl hover:shadow-2xl transition-all z-[120] hover:scale-110 active:scale-95 group/toggle"
      >
        <div className="transition-transform duration-500" style={{ transform: isSidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover/toggle:text-gray-900" />
        </div>
      </button>

      <div className="p-6 flex items-center justify-between flex-shrink-0">
        <div className={cn("transition-all duration-500", isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 whitespace-nowrap">HermesDesk</h2>
        </div>
        <div className={cn("p-2 bg-black rounded-xl text-white shadow-lg shadow-black/20 hover:scale-110 transition-transform cursor-pointer", isSidebarCollapsed && "mx-auto")}>
          <Rocket className="w-4 h-4" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6 py-4 scrollbar-hide">
        <SidebarSection title="USER" isCollapsed={isSidebarCollapsed} defaultExpanded>
          <SidebarItem icon={User} label="Profile & Account" active={currentView === 'profile'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('profile')} />
          <SidebarItem icon={Settings} label="General Settings" active={currentView === 'settings'} isCollapsed={isSidebarCollapsed} onClick={onOpenSettings} />
          <SidebarItem icon={Activity} label="Usage & Billing" active={currentView === 'usage'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('usage')} />
          <SidebarItem icon={FileText} label="Scheduled Tasks" active={currentView === 'tasks'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('tasks')} />
          <SidebarItem icon={Mail} label="Mail ME" active={currentView === 'mail'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('mail')} />
          <SidebarItem icon={MessageSquare} label="WhatsApp ME" active={currentView === 'whatsapp'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('whatsapp')} />
        </SidebarSection>

        <SidebarSection title="SYSTEM" isCollapsed={isSidebarCollapsed} defaultExpanded>
          <SidebarItem icon={LayoutGrid} label="Dashboard" active={currentView === 'landing'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('landing')} />
          <SidebarItem icon={MessageSquare} label="Chat Lab" active={currentView === 'chat'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('chat')} />
          <SidebarItem icon={Library} label="Model Hub" active={currentView === 'models'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('models')} />
          <SidebarItem icon={Shield} label="Data Controls" active={currentView === 'data'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('data')} />
          <SidebarItem icon={Globe} label="Cloud Browser" active={currentView === 'browser'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('browser')} />
          <SidebarItem icon={Monitor} label="My Computer" active={currentView === 'computer'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('computer')} />
          <SidebarItem icon={Palette} label="Personalization" active={currentView === 'personalization'} isCollapsed={isSidebarCollapsed} onClick={() => onOpenSettings()} />
          <SidebarItem icon={Brain} label="Knowledge" active={currentView === 'knowledge'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('knowledge')} />
          <SidebarItem icon={Database} label="Memory Base" active={currentView === 'memory'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('memory')} />
          <SidebarItem icon={Search} label="Wide Research" active={currentView === 'wide-research'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('wide-research')} />
          <SidebarItem icon={Zap} label="Skills Engine" active={currentView === 'skills'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('skills')} />
        </SidebarSection>

        <SidebarSection title="WORKSPACE" isCollapsed={isSidebarCollapsed}>
          <SidebarItem icon={Folder} label="Projects" active={currentView === 'projects'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('projects')} />
          <SidebarItem icon={Users} label="Shared Tasks" active={currentView === 'shared-tasks'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('shared-tasks')} />
          <SidebarItem icon={Folder} label="Shared Files" active={currentView === 'shared-files'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('shared-files')} />
          <SidebarItem icon={Globe} label="Websites" active={currentView === 'websites'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('websites')} />
          <SidebarItem icon={Puzzle} label="Apps" active={currentView === 'apps'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('apps')} />
          <SidebarItem icon={Cloud} label="Domains" active={currentView === 'domains'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('domains')} />
        </SidebarSection>

        <SidebarSection title="INTEGRATIONS" isCollapsed={isSidebarCollapsed}>
          <SidebarItem icon={Share2} label="Connectors" active={currentView === 'connectors'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('connectors')} />
          <SidebarItem icon={Puzzle} label="Plugin Channels" active={currentView === 'plugins'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('plugins')} />
          <SidebarItem icon={Wrench} label="API Keys" active={currentView === 'api-keys'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('api-keys')} />
          <SidebarItem icon={Database} label="Integrations" active={currentView === 'integrations'} isCollapsed={isSidebarCollapsed} onClick={() => onViewChange('integrations')} />
        </SidebarSection>

        {/* Local AI Engine - Only show if not collapsed or as icons */}
        <SidebarSection title="AGENT WORKSTATION" isCollapsed={isSidebarCollapsed} defaultExpanded>
          <div className="space-y-1">
            {agents.map(agent => (!isSidebarCollapsed) && (
              <AgentSidebarItem 
                key={agent.id} 
                agent={agent} 
                isExpanded={!isSidebarCollapsed && expandedAgents.includes(agent.id)}
                isCollapsed={isSidebarCollapsed}
                onToggle={() => toggleAgent(agent.id)}
                onAction={(action) => onAgentAction(agent.id, action)}
              />
            ))}
          </div>
        </SidebarSection>
      </div>

      {/* Footer Resources — Real System Intelligence */}
      {!isSidebarCollapsed && (
        <div className="p-6 bg-gray-50/50 rounded-t-[40px] mt-auto border-t border-gray-100/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">System Intelligence</span>
              <div className="flex items-center space-x-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${resourceUsage.engine === 'Jan + TurboQuant' ? 'bg-green-500 animate-pulse' : resourceUsage.engine === 'Offline' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                <span className="text-[7px] font-black text-gray-400 uppercase">{resourceUsage.engine || 'Checking...'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col">
                <div className="flex justify-between text-[10px] font-black mb-1.5">
                  <span className="text-gray-600">{resourceUsage.gpuModel || 'GPU'}</span>
                  <span className="text-blue-600">{resourceUsage.cpu || 0}% CPU</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${resourceUsage.cpu || 0}%` }} />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between text-[10px] font-black mb-1.5">
                  <span className="text-gray-600">RAM</span>
                  <span className="text-purple-600">{resourceUsage.ram || 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${resourceUsage.ram || 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isSidebarCollapsed && (
        <div className="py-6 mt-auto flex flex-col items-center space-y-3">
           <div className={`w-2.5 h-2.5 rounded-full ${resourceUsage.engine === 'Jan + TurboQuant' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`} />
           <div className="w-1.5 h-8 bg-gray-100 rounded-full overflow-hidden">
             <div className="w-full bg-gradient-to-b from-blue-500 to-purple-500 rounded-full transition-all duration-1000" style={{ height: `${resourceUsage.cpu || 15}%` }} />
           </div>
        </div>
      )}
    </aside>
  );
};
