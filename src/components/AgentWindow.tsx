import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Minus, Terminal, MessageSquare, 
  ChevronRight, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentWindowProps {
  agent: {
    id: string;
    name: string;
    version: string;
    type: 'coding' | 'research' | 'creative' | 'security' | 'legal' | 'accounting';
    icon: any;
    color: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export const AgentWindow: React.FC<AgentWindowProps> = ({ 
  agent, 
  isOpen, 
  onClose, 
  onMinimize 
}) => {
  const [activeTab, setActiveTab] = useState<'reasoning' | 'chat'>('reasoning');
  const [logs, setLogs] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Listen for agent-specific logs from the backend
  useEffect(() => {
    const handleLog = (event: any) => {
      const { agentId, log } = event.detail;
      if (agentId === agent.id) {
        setLogs(prev => [...prev, { ...log, id: Date.now() }]);
        if (log.content.includes('completed') || log.content.includes('failed')) {
          setIsProcessing(false);
        }
      }
    };
    window.addEventListener('agent-log', handleLog as any);
    return () => window.removeEventListener('agent-log', handleLog as any);
  }, [agent.id]);

  const handleSendMessage = async () => {
    if (!input.trim() || !window.ipcRenderer) return;
    
    const userMessage = input;
    setInput('');
    setIsProcessing(true);
    
    // Add user message to reasoning/chat logs
    setLogs(prev => [...prev, { 
      id: Date.now(), 
      type: 'user', 
      content: userMessage, 
      time: new Date().toLocaleTimeString() 
    }]);

    try {
      await window.ipcRenderer.createAgentTask(userMessage, agent.id);
    } catch (e) {
      console.error('Failed to create agent task:', e);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-[min(450px,calc(100vw-2rem))] h-[min(600px,calc(100vh-6rem))] bg-white rounded-[24px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
      {/* Title Bar */}
      <div className={cn("p-4 flex items-center justify-between text-white transition-colors duration-500", agent.color)}>
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
            <agent.icon className={cn("w-4 h-4", isProcessing && "animate-spin")} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-tight">{agent.name}</h3>
            <div className="flex items-center space-x-2">
              <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">v{agent.version}</p>
              {isProcessing && (
                <span className="flex items-center space-x-1">
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={onMinimize} 
            className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
            title="Minimize to Background"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-red-100 hover:text-white"
            title="Stop Agent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-50">
        <button 
          onClick={() => setActiveTab('reasoning')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all",
            activeTab === 'reasoning' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Reasoning</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all",
            activeTab === 'chat' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30">
        {activeTab === 'reasoning' ? (
          <div className="flex-1 overflow-y-auto p-4 font-mono space-y-3">
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2">
                <Activity className="w-8 h-8 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-tighter">Waiting for agent activity...</p>
              </div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="text-[10px] animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                    log.type === 'tool' ? "bg-purple-100 text-purple-600" : 
                    log.type === 'thinking' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                  )}>
                    {log.type}
                  </span>
                  <span className="text-gray-400 text-[8px]">{new Date().toLocaleTimeString()}</span>
                </div>
                <p className="text-gray-700 leading-relaxed pl-2 border-l border-gray-200">{log.content}</p>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl rounded-tl-none mr-12">
                <p className="text-xs text-blue-800 leading-relaxed">
                  Hello! I am the {agent.name}. I am currently monitoring your {agent.type} tasks in the background. How can I help you?
                </p>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Instruct ${agent.name}...`}
                  disabled={isProcessing}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active System Connection</span>
        </div>
        <button 
          onClick={onMinimize}
          className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
        >
          Run in BG
        </button>
      </div>
    </div>
  );
};
