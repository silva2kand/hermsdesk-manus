import React, { useState } from 'react';
import { 
  MessageCircle, 
  Cpu, 
  Puzzle, 
  Globe,
  MessageSquare as MsgIcon,
  Send,
  Plus,
  ArrowUp,
  Monitor,
  Mic,
  Layout,
  Github,
  Mail,
  Briefcase,
  Calculator,
  Calendar,
  Palette,
  ChevronDown,
  Video,
  Music,
  BarChart3,
  Table,
  Search as SearchIcon,
  X,
  File,
  Folder,
  Cloud
} from 'lucide-react';

const ToolButton = ({ label, icon: Icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
  >
    <Icon className="w-3.5 h-3.5 text-gray-400" />
    <span>{label}</span>
  </button>
);

const AppIcon = ({ icon: Icon, label, color }: any) => (
  <div className="relative group cursor-pointer">
    <div className={`w-5 h-5 rounded-md ${color} flex items-center justify-center text-white shadow-sm transition-all group-hover:scale-110`}>
      <Icon className="w-3 h-3" />
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 font-bold uppercase tracking-wider">
      {label}
    </div>
  </div>
);

export const LandingPage = ({ onOpenConnectors, onStartTask, onOpenComputer }: any) => {
  const [showMore, setShowMore] = useState(false);
  const [showUploads, setShowUploads] = useState(false);
  const [prompt, setPrompt] = useState('');

  const startTask = (text = prompt) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onStartTask?.(trimmed);
  };

  const attachFiles = async () => {
    const files = await window.ipcRenderer?.selectFiles();
    if (files?.length) {
      setPrompt(prev => `${prev}${prev ? '\n' : ''}Attached files:\n${files.join('\n')}`);
    }
    setShowUploads(false);
  };

  const attachFolder = async () => {
    const folder = await window.ipcRenderer?.selectFolder();
    if (folder) {
      setPrompt(prev => `${prev}${prev ? '\n' : ''}Attached folder:\n${folder}`);
    }
    setShowUploads(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 bg-[#fafafa]">
      <div className="max-w-4xl w-full text-center space-y-12">
        
        <h1 className="text-5xl font-bold text-gray-900 font-serif mb-12">What can I do for you?</h1>

        <div className="max-w-3xl mx-auto w-full space-y-4">
          {/* Main Chat Bar */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-100/50 overflow-hidden">
            <div className="p-6 pb-2">
              <textarea 
                placeholder="Assign a task or ask anything"
                className="w-full text-lg bg-transparent border-none focus:ring-0 resize-none min-h-[100px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    startTask();
                  }
                }}
              />
            </div>
            
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-50 bg-white">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button 
                    onClick={() => setShowUploads(!showUploads)}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  {showUploads && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl p-1 z-50 animate-in fade-in slide-in-from-bottom-2">
                       <button onClick={attachFiles} className="flex items-center w-full px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                         <File className="w-4 h-4 mr-3 text-blue-500" />
                         Upload Files
                       </button>
                       <button onClick={attachFolder} className="flex items-center w-full px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                         <Folder className="w-4 h-4 mr-3 text-orange-400" />
                         Upload Folder
                       </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-0.5 px-3 py-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                   <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                   <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                   <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                   <span className="text-[10px] font-black text-gray-400 ml-1.5">+11</span>
                </div>

                <button onClick={onOpenComputer} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all" title="My Computer">
                  <Monitor className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button onClick={() => setPrompt('Summarize my next meeting and create action items: ')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Meeting Assistant">
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button onClick={() => setPrompt('Transcribe this voice note: ')} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all" title="Voice Input">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={() => startTask()}
                  disabled={!prompt.trim()}
                  className={`p-2.5 rounded-full transition-all ${prompt.trim() ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* App Connectors Strip */}
            <div 
              onClick={onOpenConnectors}
              className="px-6 py-3 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Puzzle className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Connect your tools to ME</span>
              </div>
              <div className="flex items-center space-x-2">
                <AppIcon icon={Globe} label="Browser" color="bg-blue-500" />
                <AppIcon icon={MsgIcon} label="WhatsApp" color="bg-green-500" />
                <AppIcon icon={Palette} label="Canva" color="bg-purple-500" />
                <AppIcon icon={Mail} label="Gmail" color="bg-red-500" />
                <AppIcon icon={Calendar} label="Calendar" color="bg-blue-600" />
                <AppIcon icon={Cloud} label="Drive" color="bg-green-600" />
                <AppIcon icon={Github} label="GitHub" color="bg-gray-900" />
                <AppIcon icon={Layout} label="Notion" color="bg-gray-400" />
                <div className="w-px h-3 bg-gray-200 mx-1" />
                <X className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-pointer transition-colors" />
              </div>
            </div>
          </div>

          {/* Tool Shortcuts */}
          <div className="flex items-center justify-center space-x-3 pt-4 relative">
            <ToolButton label="Create slides" icon={Layout} onClick={() => startTask('Create a slide deck outline with titles, speaker notes, and image ideas.')} />
            <ToolButton label="Build website" icon={Globe} onClick={() => startTask('Build a polished website with responsive sections and real content.')} />
            <ToolButton label="Develop desktop apps" icon={Monitor} onClick={() => startTask('Plan and build a Windows desktop app feature with Electron.')} />
            <ToolButton label="Design" icon={Palette} onClick={() => startTask('Design a clean interface and explain the layout choices.')} />
            
            <div className="relative">
              <button 
                onClick={() => setShowMore(!showMore)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  showMore ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200' : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50 shadow-sm'
                }`}
              >
                More
              </button>
              
              {showMore && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2">
                  <ToolItem icon={Monitor} label="Develop apps" />
                  <ToolItem icon={Calendar} label="Schedule task" />
                  <ToolItem icon={SearchIcon} label="Wide Research" />
                  <ToolItem icon={Table} label="Spreadsheet" />
                  <ToolItem icon={BarChart3} label="Visualization" />
                  <ToolItem icon={Video} label="Video" />
                  <ToolItem icon={Music} label="Audio" />
                  <div className="h-px bg-gray-50 my-1" />
                  <ToolItem icon={MessageCircle} label="Chat mode" />
                  <ToolItem icon={Layout} label="Playbook" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToolItem = ({ icon: Icon, label }: any) => (
  <button className="flex items-center w-full px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
    <Icon className="w-4 h-4 mr-3 text-gray-400" />
    {label}
  </button>
);
