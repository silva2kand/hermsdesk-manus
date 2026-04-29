import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2, ChevronDown, ChevronUp, AlertCircle, Info, Bug } from 'lucide-react';

export const ConsoleWindow = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.ipcRenderer) {
      const handleMessage = (_event: any, message: string) => {
        setLogs(prev => [...prev, { 
          id: Date.now(), 
          type: 'info', 
          content: message, 
          time: new Date().toLocaleTimeString() 
        }]);
      };

      const handleLog = (_event: any, log: { type: string, content: string }) => {
        setLogs(prev => [...prev, { 
          id: Date.now(), 
          type: log.type, 
          content: log.content, 
          time: new Date().toLocaleTimeString() 
        }]);
      };

      window.ipcRenderer.on('main-process-message', handleMessage);
      window.ipcRenderer.on('app:log', handleLog);

      const handleCustomLog = (e: any) => {
        setLogs(prev => [...prev, { 
          id: Date.now(), 
          type: e.detail.type, 
          content: e.detail.content, 
          time: new Date().toLocaleTimeString() 
        }]);
      };
      
      window.addEventListener('app-log', handleCustomLog);
      
      return () => {
        // window.ipcRenderer.off('main-process-message', handleMessage);
        // window.ipcRenderer.off('app:log', handleLog);
        window.removeEventListener('app-log', handleCustomLog);
      };
    }
  }, []);

  // Simulate some logs for demo/testing
  useEffect(() => {
    if (isOpen && logs.length === 0) {
      setLogs([
        { id: 1, type: 'info', content: 'HermsDesk Console Initialized', time: new Date().toLocaleTimeString() },
        { id: 2, type: 'bug', content: 'Checking Ollama connection on port 11434...', time: new Date().toLocaleTimeString() },
        { id: 3, type: 'error', content: 'NVIDIA RTX 5000A detected - optimizing VRAM allocation', time: new Date().toLocaleTimeString() }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[100] bg-gray-900 text-white rounded-2xl shadow-2xl border border-white/10 transition-all duration-300 overflow-hidden flex flex-col ${
      isMinimized ? 'w-64 h-12' : 'w-[500px] h-[400px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-black uppercase tracking-widest">System Console</span>
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-bold rounded-md">{logs.length}</span>
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
          {/* Logs Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2 bg-black/20">
            {logs.map((log) => (
              <div key={log.id} className="flex space-x-3 opacity-90 hover:opacity-100 transition-opacity">
                <span className="text-gray-500 shrink-0">[{log.time}]</span>
                <div className="flex items-start space-x-2">
                  {log.type === 'error' && <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />}
                  {log.type === 'bug' && <Bug className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />}
                  {log.type === 'info' && <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />}
                  <span className={
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'bug' ? 'text-yellow-400' : 
                    'text-gray-300'
                  }>
                    {log.content}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-[8px] font-bold text-gray-500 uppercase">Status: Connected</span>
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
