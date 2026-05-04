import React from 'react';
import { 
  X, Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RunningAgentsDockProps {
  runningAgents: any[];
  onOpenAgent: (id: string) => void;
  onCloseAll: () => void;
  onExpandAll: () => void;
}

export const RunningAgentsDock: React.FC<RunningAgentsDockProps> = ({
  runningAgents,
  onOpenAgent,
  onCloseAll,
  onExpandAll
}) => {
  if (runningAgents.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-2 flex items-center space-x-2 shadow-2xl shadow-black/40">
        <div className="px-3 border-r border-white/10 flex items-center space-x-2">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
              {runningAgents.length} Agents
            </span>
            <span className="text-[7px] font-bold text-green-400 uppercase tracking-tighter">System Online</span>
          </div>
        </div>

        <div className="flex items-center px-1 space-x-1.5">
          {runningAgents.map((agent) => (
            <div key={agent.id} className="relative group">
              <button
                onClick={() => onOpenAgent(agent.id)}
                className={cn(
                  "relative p-2 rounded-2xl transition-all duration-300",
                  agent.status === 'active' 
                    ? "bg-blue-600 scale-110 shadow-lg shadow-blue-500/40 ring-2 ring-white/20" 
                    : "bg-white/5 hover:bg-white/10 hover:scale-105"
                )}
                title={agent.name}
              >
                <agent.icon className={cn(
                  "w-4 h-4 transition-colors",
                  agent.status === 'active' ? "text-white" : "text-gray-400 group-hover:text-white"
                )} />
                {agent.status === 'active' && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full border-2 border-blue-600" />
                )}
              </button>
              
              {/* Tooltip with agent action */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[8px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {agent.name} • {agent.status === 'active' ? 'Viewing' : 'Background'}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-1 ml-2 border-l border-white/10 pl-2">
          <button 
            onClick={onExpandAll}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
            title="Expand All Windows"
          >
            <Layout className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={onCloseAll}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
            title="Minimize All to BG"
          >
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
