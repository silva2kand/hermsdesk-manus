import React, { useState } from 'react';
import { 
  Plus, 
  Smile, 
  Monitor, 
  Mic, 
  ArrowUp,
  Search,
  ChevronDown,
  Info,
  ExternalLink,
  ChevronRight,
  File,
  Folder,
  Globe,
  MessageSquare as MsgIcon,
  Mail,
  Briefcase,
  Cpu,
  Zap,
  Github,
  Layout,
  Calculator,
  Palette,
  HardDrive,
  Wrench,
  Brain,
  RefreshCw
} from 'lucide-react';

const ResearchStep = ({ label, done = false }: { label: string, done?: boolean }) => (
  <div className="flex items-center space-x-2 text-xs text-gray-500 py-1">
    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${done ? 'bg-gray-100 border-gray-200' : 'border-gray-200 animate-pulse'}`}>
      {done ? <Search className="w-2.5 h-2.5 text-gray-400" /> : <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />}
    </div>
    <span className={done ? "text-gray-400" : "text-gray-600"}>{label}</span>
  </div>
);

const ConnectorIcon = ({ icon: Icon, label, color }: { icon: any, label: string, color: string }) => (
  <div className="relative group cursor-pointer">
    <div className={`w-6 h-6 rounded-md ${color} flex items-center justify-center text-white shadow-sm transition-all group-hover:scale-110`}>
      <Icon className="w-3 h-3" />
    </div>
    {/* Tiny hover tooltip */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none font-bold uppercase tracking-wider">
      {label}
    </div>
  </div>
);

export const ChatInterface = ({ initialModel }: { initialModel?: { provider: string, model: string } | null }) => {
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: "That's an ambitious and exciting project! I can certainly help you design and build a local-first, agentic desktop application for Windows that mirrors my capabilities while integrating specialized business logic for UK-based professional services. Let's start by outlining the architecture and core components."
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [provider, setProvider] = useState(initialModel?.provider || 'Ollama');
  const [model, setModel] = useState(initialModel?.model || 'llama3:8b');
  const [engineStatus, setEngineStatus] = useState<{[key: string]: 'online' | 'offline' | 'checking'}>({
    Ollama: 'checking',
    'LM Studio': 'checking',
    'Jan': 'checking'
  });

  // Update when initialModel changes
  React.useEffect(() => {
    if (initialModel) {
      setProvider(initialModel.provider);
      setModel(initialModel.model);
    }
  }, [initialModel]);

  const providerModels: {[key: string]: string[]} = {
    'Ollama': ['llama3:8b', 'mistral:7b', 'phi3:mini', 'codellama'],
    'LM Studio': ['local-model', 'qwen-2.5-7b', 'llama-3-8b-instruct'],
    'Jan': ['llama-3-8b-q4', 'mistral-7b-v0.3', 'phi-3-mini-4k'],
    'Gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
    'OpenRouter': ['gpt-4o', 'claude-3-5-sonnet', 'deepseek-v2']
  };

  const checkEngines = async () => {
    if (!window.ipcRenderer) return;
    
    setEngineStatus(prev => ({ ...prev, Ollama: 'checking', 'LM Studio': 'checking', Jan: 'checking' }));
    
    try {
      const ollamaModels = await window.ipcRenderer.listModels();
      const lmStudioStatus = await window.ipcRenderer.checkLMStudio();
      const janStatus = await window.ipcRenderer.checkJan();

      setEngineStatus({
        Ollama: ollamaModels && ollamaModels.length > 0 ? 'online' : 'offline',
        'LM Studio': lmStudioStatus ? 'online' : 'offline',
        'Jan': janStatus ? 'online' : 'offline'
      });
    } catch (e) {
      console.error('Engine check failed:', e);
      setEngineStatus({
        Ollama: 'offline',
        'LM Studio': 'offline',
        'Jan': 'offline'
      });
    }
  };

  React.useEffect(() => {
    checkEngines();
  }, []);

  const handleFileUpload = async () => {
    const files = await window.ipcRenderer.selectFiles();
    console.log('Selected files:', files);
  };

  const handleFolderUpload = async () => {
    const folder = await window.ipcRenderer.selectFolder();
    console.log('Selected folder:', folder);
  };

  const handleAppOpen = (app: string) => {
    window.ipcRenderer.openApp(app);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    console.log('Sending message to provider:', provider, 'model:', model);

    try {
      if (window.ipcRenderer) {
        let response;
        const normalizedProvider = provider.toLowerCase().replace(' ', '');

        if (['ollama', 'lmstudio', 'jan'].includes(normalizedProvider)) {
          // Local providers
          response = await window.ipcRenderer.chat({ 
            model, 
            messages: [...messages, userMessage],
            provider: normalizedProvider
          });
        } else {
          // Cloud providers
          response = await window.ipcRenderer.chatProvider({
            provider: normalizedProvider,
            model: model,
            messages: [...messages, userMessage]
          });
        }
        
        console.log('Provider response:', response);
        
        if (response && (response.content || response.choices || response.message)) {
          let aiContent = '';
          if (response.content) aiContent = response.content;
          else if (response.choices) aiContent = response.choices[0].message.content;
          else if (response.message) aiContent = response.message.content; // Ollama format
          
          setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${provider} returned an empty response. Ensure the engine is running and model is loaded.` }]);
        }
      } else {
        // Fallback for non-electron environment
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: `Simulator: Received message from ${provider}. Please run in Electron for real local model routing.` }]);
          setIsTyping(false);
        }, 1000);
        return;
      }
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error. Please check if ${provider} is online and reachable.` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-gray-900' : 'bg-blue-600'}`}>
                  <span className="text-white text-[10px] font-bold">{msg.role === 'assistant' ? 'M' : 'U'}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{msg.role === 'assistant' ? 'manus' : 'you'}</span>
              </div>
              
              <div className="pl-8 space-y-4">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                
                {msg.role === 'assistant' && idx === 0 && (
                  <>
                    {/* Collapsible Research Section */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Research architecture patterns</span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className="flex items-start space-x-3 p-3 bg-red-50/50 rounded-xl border border-red-100 max-w-sm">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info className="w-3 h-3 text-red-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">Blueprint Generation</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">Manus has stopped</span>
                      </div>
                      <span className="text-[10px] text-gray-400 ml-auto font-bold">5 / 4</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center space-x-2 pl-8">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>

      {/* Model & Provider Bar - Integrated above input */}
      <div className="px-6 py-3 flex items-center justify-center space-x-6 border-t bg-gray-50/30">
        <div className="flex items-center space-x-3 group">
          <div className="flex items-center space-x-1.5">
            <Cpu className="w-3 h-3 text-gray-400" />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Provider</span>
          </div>
          <div className="relative">
            <select 
              className="text-[11px] font-black text-gray-900 bg-white border border-gray-100 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer hover:border-blue-200 transition-all appearance-none pr-6"
              value={provider}
              onChange={(e) => {
                const newProvider = e.target.value;
                setProvider(newProvider);
                setModel(providerModels[newProvider]?.[0] || '');
              }}
            >
              {Object.keys(providerModels).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Engine Status Badge */}
          {['Ollama', 'LM Studio', 'Jan'].includes(provider) && (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-white border border-gray-100 rounded-full shadow-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${
                engineStatus[provider] === 'online' ? 'bg-green-500 animate-pulse' : 
                engineStatus[provider] === 'offline' ? 'bg-red-500' : 'bg-gray-300'
              }`} />
              <span className={`text-[8px] font-black uppercase tracking-tighter ${
                engineStatus[provider] === 'online' ? 'text-green-600' : 
                engineStatus[provider] === 'offline' ? 'text-red-600' : 'text-gray-400'
              }`}>
                {engineStatus[provider] || 'Local'}
              </span>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center space-x-3 group">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3 h-3 text-gray-400" />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Model</span>
          </div>
          <div className="relative">
            <select 
              className="text-[11px] font-black text-gray-900 bg-white border border-gray-100 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer hover:border-blue-200 transition-all appearance-none pr-6"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {providerModels[provider]?.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          <button 
            onClick={checkEngines}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-white rounded-md transition-all"
            title="Refresh local engines"
          >
            <RefreshCw className={`w-3 h-3 ${Object.values(engineStatus).some(s => s === 'checking') ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white border-t">
        <div className="max-w-3xl mx-auto">
          <div className="relative border rounded-2xl bg-gray-50/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-50 transition-all">
            <textarea 
              placeholder={`Message ${model}...`}
              className="w-full px-4 py-4 pr-12 text-sm bg-transparent border-none focus:ring-0 resize-none min-h-[56px] max-h-40"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center space-x-0.5">
                <div className="relative">
                  <button 
                    onClick={() => setShowUploadOptions(!showUploadOptions)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Add content"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {showUploadOptions && (
                    <div className="absolute bottom-full left-0 mb-2 w-40 bg-white border rounded-xl shadow-xl p-1 z-50 border-gray-100">
                      <button 
                        onClick={() => { handleFileUpload(); setShowUploadOptions(false); }}
                        className="flex items-center w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <File className="w-3.5 h-3.5 mr-2" />
                        Upload Files
                      </button>
                      <button 
                        onClick={() => { handleFolderUpload(); setShowUploadOptions(false); }}
                        className="flex items-center w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Folder className="w-3.5 h-3.5 mr-2" />
                        Upload Folder
                      </button>
                      <button className="flex items-center w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border-t mt-1 pt-2">
                         <HardDrive className="w-3.5 h-3.5 mr-2 text-green-600" />
                         Google Drive
                      </button>
                    </div>
                  )}
                </div>
                <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Emoji">
                  <Smile className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="My Computer">
                  <Monitor className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Skills">
                  <Wrench className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Memory">
                  <Brain className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Microphone">
                  <Mic className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className={`p-2 rounded-full transition-all ${
                    input.trim() && !isTyping ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Tiny Tiny Connectors Below Chat Bar */}
          <div className="mt-3 flex items-center justify-center space-x-3 px-4">
            <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mr-2">Connectors</span>
            <ConnectorIcon icon={Github} label="GitHub" color="bg-gray-900" />
            <ConnectorIcon icon={Layout} label="Notion" color="bg-gray-400" />
            <ConnectorIcon icon={Mail} label="Outlook" color="bg-blue-600" />
            <ConnectorIcon icon={MsgIcon} label="WhatsApp" color="bg-green-500" />
            <ConnectorIcon icon={Briefcase} label="Legal" color="bg-indigo-700" />
            <ConnectorIcon icon={Calculator} label="Tax" color="bg-teal-600" />
            <ConnectorIcon icon={Palette} label="Canva" color="bg-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
