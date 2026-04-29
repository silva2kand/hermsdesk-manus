import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
import { ModelHub } from './components/ModelHub';
import { Skills } from './components/Skills';
import { Knowledge } from './components/Knowledge';
import { Memory } from './components/Memory';
import { Plugins } from './components/Plugins';
import { ConsoleWindow } from './components/ConsoleWindow';
import { Share2, MoreHorizontal, ChevronDown, Users, FileText, Edit3, Star, Info, Trash2, MoreVertical, Terminal } from 'lucide-react';

function App() {
  const [view, setView] = useState<'landing' | 'chat' | 'models' | 'skills' | 'knowledge' | 'memory' | 'plugins'>('landing');
  const [selectedModel, setSelectedModel] = useState<{provider: string, model: string} | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>('Profile');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [toast, setToast] = useState('');

  // Global error capturing for the Console Window
  useEffect(() => {
    const originalError = console.error;
    const originalLog = console.log;

    console.error = (...args) => {
      try {
        window.dispatchEvent(new CustomEvent('app-log', { 
          detail: { 
            type: 'error', 
            content: args.map(a => {
              if (typeof a === 'string') return a;
              try { return JSON.stringify(a); } catch (e) { return String(a); }
            }).join(' ') 
          } 
        }));
      } catch (e) {
        originalError.apply(console, ['Console error override failed:', e]);
      }
      originalError.apply(console, args);
    };

    console.log = (...args) => {
      const msg = args.map(a => {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }).join(' ');

      if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
        try {
          window.dispatchEvent(new CustomEvent('app-log', { 
            detail: { type: 'bug', content: msg } 
          }));
        } catch (e) {}
      }
      originalLog.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.log = originalLog;
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

  const startTask = (prompt: string) => {
    setTaskPrompt(prompt);
    setView('chat');
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentView={view} 
        onViewChange={(v) => setView(v as any)}
        onOpenSettings={() => openSettings('General')}
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
              <span className="text-sm font-bold text-gray-900">
                {view === 'landing' ? 'Agent' : 'How to Build a Windows App with AI...'}
              </span>
              {view === 'chat' && (
                <ChevronDown className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-900 transition-colors" />
              )}
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
          {view === 'landing' && <LandingPage onOpenConnectors={() => openSettings('Connectors')} onOpenComputer={() => openSettings('Computer')} onStartTask={startTask} />}
          {view === 'chat' && <ChatInterface initialModel={selectedModel} initialPrompt={taskPrompt} />}
          {view === 'models' && (
            <ModelHub 
              onLoadModel={(m, p) => {
                setSelectedModel({ model: m, provider: p });
                setView('chat');
              }} 
            />
          )}
          {view === 'skills' && <Skills />}
          {view === 'knowledge' && <Knowledge />}
          {view === 'memory' && <Memory />}
          {view === 'plugins' && <Plugins />}
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

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
