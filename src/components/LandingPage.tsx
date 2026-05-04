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
  Cloud,
  Zap,
  Brain,
  Wrench,
  FileText,
  Volume2,
  CreditCard
} from 'lucide-react';

const ToolButton = ({ label, icon: Icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-9 h-9 flex items-center justify-center bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-50 transition-all shadow-sm shrink-0"
    title={label}
    aria-label={label}
  >
    <Icon className="w-4 h-4" />
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

export const LandingPage = ({ onOpenConnectors, onStartTask, onOpenComputer, onNavigate }: any) => {
  const [showMore, setShowMore] = useState(false);
  const [showUploads, setShowUploads] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);

  const startTask = (text = prompt, agentic = true) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    if (agentic) {
      setIsPreparing(true);
      setTimeout(() => {
        onStartTask?.(trimmed, agentic);
        setIsPreparing(false);
      }, 800);
    } else {
      onStartTask?.(trimmed, agentic);
    }
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

  const composeWhatsApp = async () => {
    if (!prompt.trim()) {
      onNavigate?.('whatsapp');
      return;
    }
    const draft = await window.ipcRenderer?.saveWhatsAppDraft?.({
      label: 'Dashboard compose',
      message: prompt,
      status: 'drafted'
    }).catch(() => null);
    const result = await window.ipcRenderer?.composeWhatsApp?.(prompt);
    if (result?.ok && draft?.id) await window.ipcRenderer?.markWhatsAppOpened?.(draft.id).catch(() => null);
  };

  const openVideoCall = () => window.ipcRenderer?.openApp?.('video call');
  const openVoiceStack = () => window.ipcRenderer?.openApp?.('voice stack');
  const openResearch = () => window.ipcRenderer?.researchWebAutomation?.(prompt || 'HermesDesk ME research');
  const createSlides = async () => window.ipcRenderer?.createSlidesArtifact?.('HermesDesk ME Deck', prompt || 'Create a researched presentation.').then(() => onNavigate?.('projects'));
  const createWebsite = async () => window.ipcRenderer?.createWebsiteArtifact?.('HermesDesk ME Website', prompt || 'Build a production website starter.').then(() => onNavigate?.('websites'));
  const createDesign = async () => window.ipcRenderer?.createDesignArtifact?.('HermesDesk ME Design', prompt || 'Create an editable design mockup.').then(() => onNavigate?.('apps'));
  const analyzeData = async () => {
    const files = await window.ipcRenderer?.selectFiles?.();
    const file = files?.[0];
    if (file) await window.ipcRenderer?.analyzeDataArtifact?.(file);
  };
  const createJusticePack = async () => {
    await window.ipcRenderer?.createJusticeCasePack?.('Justice Case Pack', prompt || 'Describe the legal issue, evidence, decision, deadlines, and outcome wanted.');
    await window.ipcRenderer?.openBrowserOperator?.('GOV.UK legal appeal complaint ombudsman court tribunal guidance');
  };
  const createPurchasePack = async () => {
    await window.ipcRenderer?.createPurchaseProtectionPack?.('Purchase Protection Pack', prompt || 'Describe the product, seller, website, payment method, and concern.');
    await window.ipcRenderer?.openBrowserOperator?.(prompt || 'seller product reviews scam check refund chargeback');
  };

  const [activeConnectorsCount, setActiveConnectorsCount] = useState(0);

  React.useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.getConnectors().then((c: any) => {
        setActiveConnectorsCount(Object.values(c).filter(Boolean).length);
      });
    }
  }, []);

  if (isPreparing) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-gray-200 animate-bounce">
          <Zap className="w-10 h-10 text-blue-400 fill-blue-400" />
        </div>
        <h2 className="text-xl font-serif text-gray-900">Initializing TurboQuant Agent...</h2>
        <div className="flex items-center space-x-2 mt-4">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Routing to Local Model Hub</span>
        </div>
      </div>
    );
  }

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
                    startTask(prompt, true);
                  }
                }}
              />
            </div>

            <div className="px-6 pb-3 flex items-center gap-1.5 overflow-x-auto">
              <ToolButton label="WhatsApp" icon={MsgIcon} onClick={composeWhatsApp} />
              <ToolButton label="Computer" icon={Monitor} onClick={onOpenComputer} />
              <ToolButton label="Connectors" icon={Puzzle} onClick={onOpenConnectors} />
              <ToolButton label="Video Call" icon={Video} onClick={openVideoCall} />
              <ToolButton label="Video Chat" icon={MessageCircle} onClick={openVideoCall} />
              <ToolButton label="Voice Stack" icon={Volume2} onClick={openVoiceStack} />
              <ToolButton label="Brain" icon={Brain} onClick={() => onNavigate?.('memory')} />
              <ToolButton label="Mythos Skills" icon={Wrench} onClick={() => onNavigate?.('skills')} />
              <ToolButton label="Knowledge" icon={FileText} onClick={() => onNavigate?.('knowledge')} />
              <ToolButton label="Research" icon={Globe} onClick={openResearch} />
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

                {activeConnectorsCount > 0 && (
                  <button
                    onClick={onOpenConnectors}
                    className="relative flex items-center space-x-0.5 px-2 py-1.5 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all"
                    title={`${activeConnectorsCount} active tool routes`}
                    aria-label={`${activeConnectorsCount} active tool routes`}
                  >
                     <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                     <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                     <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                  </button>
                )}

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
                  onClick={() => startTask(prompt, true)}
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
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Enable real tool routes and logins</span>
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
            <ToolButton label="Create slides" icon={Layout} onClick={createSlides} />
            <ToolButton label="Build website" icon={Globe} onClick={createWebsite} />
            <ToolButton label="Develop desktop apps" icon={Monitor} onClick={() => startTask('Plan and build a Windows desktop app feature with Electron.', true)} />
            <ToolButton label="Design" icon={Palette} onClick={createDesign} />
            
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
                  <ToolItem icon={Monitor} label="Develop apps" onClick={() => startTask('Develop a new application feature', true)} />
                  <ToolItem icon={Calendar} label="Schedule task" onClick={() => startTask('Schedule a new automated task', true)} />
                  <ToolItem icon={SearchIcon} label="Wide Research" onClick={() => startTask('Perform extensive web and local research', true)} />
                  <ToolItem icon={Briefcase} label="Justice Case Pack" onClick={createJusticePack} />
                  <ToolItem icon={CreditCard} label="Purchase Protection" onClick={createPurchasePack} />
                  <ToolItem icon={Table} label="Spreadsheet" onClick={analyzeData} />
                  <ToolItem icon={BarChart3} label="Visualization" onClick={analyzeData} />
                  <ToolItem icon={Video} label="Video" onClick={() => startTask('Generate a video production plan', true)} />
                  <ToolItem icon={Music} label="Audio" onClick={() => startTask('Create an audio/music workflow', true)} />
                  <div className="h-px bg-gray-50 my-1" />
                  <ToolItem icon={MessageCircle} label="Chat mode" onClick={() => startTask('Enter interactive chat mode', false)} />
                  <ToolItem icon={Layout} label="Playbook" onClick={() => startTask('Create a step-by-step playbook', true)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToolItem = ({ icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className="flex items-center w-full px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
    <Icon className="w-4 h-4 mr-3 text-gray-400" />
    {label}
  </button>
);
