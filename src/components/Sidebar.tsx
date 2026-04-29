import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  User, 
  Search, 
  Library, 
  Settings, 
  LayoutGrid, 
  ChevronRight,
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
  Rocket
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  onClick?: () => void 
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
      active 
        ? "bg-gray-100 text-gray-900" 
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
    )}
  >
    <Icon className="w-4 h-4 mr-3" />
    {label}
  </button>
);

const TaskItem = ({ 
  icon: Icon, 
  label, 
  active = false,
  onClick
}: { 
  icon: any, 
  label: string, 
  active?: boolean,
  onClick?: () => void
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center w-full px-3 py-2 text-xs text-gray-600 rounded-lg hover:bg-gray-50 group transition-colors",
      active && "bg-gray-100 text-gray-900"
    )}
  >
    <Icon className="w-3.5 h-3.5 mr-3 text-gray-400 group-hover:text-gray-600" />
    <span className="truncate">{label}</span>
  </button>
);

export const Sidebar = ({ 
  currentView, 
  onViewChange,
  onOpenSettings
}: { 
  currentView: string, 
  onViewChange: (view: string) => void,
  onOpenSettings: () => void
}) => {
  const [resources, setResources] = useState({ cpu: 0, gpu: 0, ram: 0, gpuModel: 'RTX 5000A' });

  useEffect(() => {
    const updateResources = async () => {
      if (window.ipcRenderer?.getResourceUsage) {
        try {
          const usage = await window.ipcRenderer.getResourceUsage();
          setResources(usage);
        } catch (error) {
          console.error('Failed to fetch resource usage:', error);
        }
      } else {
        // Fallback for dev/browser
        setResources(prev => ({
          ...prev,
          cpu: Math.floor(Math.random() * 30) + 5,
          gpu: Math.floor(Math.random() * 20) + 10,
          ram: 42
        }));
      }
    };

    updateResources();
    const interval = setInterval(updateResources, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="flex flex-col w-64 h-full bg-white border-r select-none">
      {/* Top Section - Draggable */}
      <div 
        className="p-4 space-y-1"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div style={{ WebkitAppRegion: 'no-drag' } as any} className="space-y-1">
          <SidebarItem icon={Plus} label="New task" onClick={() => onViewChange('chat')} />
          <SidebarItem 
            icon={User} 
            label="Agent" 
            active={currentView === 'landing'} 
            onClick={() => onViewChange('landing')}
          />
          <SidebarItem icon={Search} label="Search" />
          <SidebarItem 
            icon={Library} 
            label="Model Hub" 
            active={currentView === 'models'} 
            onClick={() => onViewChange('models')}
          />
          <SidebarItem icon={Settings} label="Settings" onClick={onOpenSettings} />
        </div>
      </div>

      {/* Real AI Features Section */}
      <div className="px-4 mt-2">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Studio</span>
        </div>
        <div className="space-y-0.5">
          <SidebarItem icon={Wrench} label="Skills" active={currentView === 'skills'} onClick={() => onViewChange('skills')} />
          <SidebarItem icon={Database} label="Knowledge" active={currentView === 'knowledge'} onClick={() => onViewChange('knowledge')} />
          <SidebarItem icon={Brain} label="Memory" active={currentView === 'memory'} onClick={() => onViewChange('memory')} />
          <SidebarItem icon={Puzzle} label="Plugins" active={currentView === 'plugins'} onClick={() => onViewChange('plugins')} />
          <SidebarItem icon={Rocket} label="Hermes Agents" active={currentView === 'agents'} onClick={() => onViewChange('agents')} />
        </div>
      </div>

      {/* Projects Section */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</span>
          <Plus className="w-3 h-3 text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
        <SidebarItem icon={Plus} label="New project" />
      </div>

      {/* Tasks Section */}
      <div className="flex-1 px-4 mt-6 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">All tasks</span>
          <button 
            className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase"
            onClick={() => console.log('Clear all tasks')}
          >
            Clear
          </button>
        </div>
        <div className="space-y-0.5">
          {/* ... task items ... */}
        </div>
      </div>

      {/* Resource Monitor Section */}
      <div className="px-4 py-6 border-t bg-gray-50/50">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TurboQuant Real-Time Monitor</span>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-gray-400">
              <span>CPU</span>
              <span className="text-gray-900">{resources.cpu}%</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${resources.cpu}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-gray-400">
              <span>GPU ({resources.gpuModel})</span>
              <span className="text-gray-900">{resources.gpu}%</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-1000" 
                style={{ width: `${resources.gpu}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-gray-400">
              <span>RAM</span>
              <span className="text-gray-900">{resources.ram}%</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-1000" 
                style={{ width: `${resources.ram}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
