import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2, ChevronDown, ChevronUp, AlertCircle, Info, Bug, Zap, Filter } from 'lucide-react';

export const ConsoleWindow = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.ipcRenderer) {
      const handleMessage = (_event: any, message: string) => {
        setLogs(prev => [...prev.slice(-500), { 
          id: Date.now() + Math.random(), 
          type: 'info', 
          content: message, 
          time: new Date().toLocaleTimeString(),
          agent: 'system'
        }]);
      };

      const handleLog = (_event: any, log: { type: string, content: string }) => {
        setLogs(prev => [...prev.slice(-500), { 
          id: Date.now() + Math.random(), 
          type: log.type, 
          content: log.content, 
          time: new Date().toLocaleTimeString(),
          agent: 'system'
        }]);
      };

      window.ipcRenderer.on('main-process-message', handleMessage);
      window.ipcRenderer.on('app:log', handleLog);

      // Listen for agent-specific updates
      const handleAgentUpdate = (_event: any, data: any) => {
        setLogs(prev => [...prev.slice(-500), {
          id: Date.now() + Math.random(),
          type: data.type || 'info',
          content: `[${data.agentId}] ${data.content}`,
          time: data.time || new Date().toLocaleTimeString(),
          agent: data.agentId || 'system'
        }]);
      };

      window.ipcRenderer.on('agent:update', handleAgentUpdate);

      const handleCustomLog = (e: any) => {
        setLogs(prev => [...prev.slice(-500), { 
          id: Date.now() + Math.random(), 
          type: e.detail.type, 
          content: e.detail.content, 
          time: new Date().toLocaleTimeString(),
          agent: e.detail.agent || 'system'
        }]);
      };
      
      window.addEventListener('app-log', handleCustomLog);
      
      return () => {
        window.removeEventListener('app-log', handleCustomLog);
      };
    }
  }, []);

  // Initialize with real status on open
  useEffect(() => {
    if (isOpen && logs.length === 0) {
      setLogs([
        { id: 1, type: 'info', content: 'HermesDesk ME 1.8 Console Initialized', time: new Date().toLocaleTimeString(), agent: 'system' },
        { id: 2, type: 'info', content: 'Engine Priority: Jan+TurboQuant (6767) → Ollama (11434) → LM Studio (1234) → Cloud', time: new Date().toLocaleTimeString(), agent: 'system' },
        { id: 3, type: 'bug', content: 'Checking built-in Jan+TurboQuant engine status...', time: new Date().toLocaleTimeString(), agent: 'system' }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  // Get unique agents for filter
  const agents = [...new Set(logs.map(l => l.agent).filter(Boolean))];
  const filteredLogs = filterAgent === 'all' ? logs : logs.filter(l => l.agent === filterAgent);

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />;
      case 'bug': return <Bug className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />;
      case 'tool': return <Zap className="w-3 h-3 text-purple-500 shrink-0 mt-0.5" />;
      case 'thinking': return <Bug className="w-3 h-3 text-cyan-500 shrink-0 mt-0.5 animate-spin" />;
      case 'result': return <Info className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />;
      default: return <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'bug': return 'text-yellow-400';
      case 'tool': return 'text-purple-400';
      case 'thinking': return 'text-cyan-400';
      case 'result': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-[100] bg-gray-900 text-white rounded-2xl shadow-2xl border border-white/10 transition-all duration-300 overflow-hidden flex flex-col ${
      isMinimized ? 'w-64 h-12' : 'w-[540px] h-[440px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-black uppercase tracking-widest">ME 1.8 Console</span>
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-bold rounded-md">{filteredLogs.length}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Agent Filter Bar */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-white/[0.02] border-b border-white/5 overflow-x-auto scrollbar-hide">
            <Filter className="w-3 h-3 text-gray-500 shrink-0" />
            <button 
              onClick={() => setFilterAgent('all')}
              className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                filterAgent === 'all' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              All
            </button>
            {agents.map(agent => (
              <button 
                key={agent}
                onClick={() => setFilterAgent(agent)}
                className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                  filterAgent === agent ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {agent}
              </button>
            ))}
          </div>

          {/* Logs Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2 bg-black/20">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex space-x-3 opacity-90 hover:opacity-100 transition-opacity">
                <span className="text-gray-500 shrink-0">[{log.time}]</span>
                <div className="flex items-start space-x-2 min-w-0">
                  {getIcon(log.type)}
                  <span className={`${getColor(log.type)} break-words`}>
                    {log.content}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-[8px] font-bold text-gray-500 uppercase">Jan+TurboQuant Engine</span>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-bold text-green-500 uppercase">Live</span>
              </div>
            </div>
            <button 
              onClick={() => setLogs([])}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
