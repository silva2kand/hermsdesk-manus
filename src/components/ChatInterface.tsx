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
  RefreshCw,
  Copy,
  Volume2,
  Edit3,
  StepForward,
  RotateCcw,
  X
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

export const ChatInterface = ({ initialModel, initialPrompt }: { initialModel?: { provider: string, model: string } | null, initialPrompt?: string }) => {
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: "That's an ambitious and exciting project! I can certainly help you design and build a local-first, agentic desktop application for Windows that mirrors my capabilities while integrating specialized business logic for UK-based professional services. Let's start by outlining the architecture and core components."
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [provider, setProvider] = useState(initialModel?.provider || 'Ollama');
  const [model, setModel] = useState(initialModel?.model || 'llama3:8b');
  const [showConnectorPanel, setShowConnectorPanel] = useState(false);
  const [chatConnectors, setChatConnectors] = useState<{[key: string]: boolean}>({
    'LM Studio': true,
    Ollama: true,
    Canva: true,
    GitHub: true,
    Gmail: true,
    Gemini: true,
    Grok: true,
    'Hugging Face': true,
    Playwright: false,
    Stripe: false,
    Notion: false,
    'Custom API': false
  });
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

  const [providerModels, setProviderModels] = useState<{[key: string]: string[]}>({
    'Ollama': ['llama3:8b', 'mistral:7b', 'phi3:mini', 'codellama'],
    'LM Studio': ['local-model', 'qwen-2.5-7b', 'llama-3-8b-instruct'],
    'Jan': ['llama-3-8b-q4', 'mistral-7b-v0.3', 'phi-3-mini-4k'],
    'Gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
    'OpenRouter': ['gpt-4o', 'claude-3-5-sonnet', 'deepseek-v2']
  });

  const chatConnectorItems = [
    { name: 'LM Studio', icon: Monitor, color: 'bg-blue-700', desc: 'Local model server' },
    { name: 'Ollama', icon: Cpu, color: 'bg-gray-700', desc: 'Offline local LLMs' },
    { name: 'Canva', icon: Palette, color: 'bg-purple-500', desc: 'Design generation' },
    { name: 'GitHub', icon: Github, color: 'bg-gray-900', desc: 'Repos, PRs, code search' },
    { name: 'Gmail', icon: Mail, color: 'bg-red-500', desc: 'Email search and drafts' },
    { name: 'Gemini', icon: Zap, color: 'bg-blue-500', desc: 'Cloud multimodal model' },
    { name: 'Grok', icon: Brain, color: 'bg-gray-900', desc: 'Reasoning and analysis' },
    { name: 'Hugging Face', icon: Smile, color: 'bg-yellow-500', desc: 'Models and datasets' },
    { name: 'Playwright', icon: Globe, color: 'bg-green-600', desc: 'Browser automation' },
    { name: 'Stripe', icon: Calculator, color: 'bg-blue-600', desc: 'Payments and invoices' },
    { name: 'Notion', icon: Layout, color: 'bg-gray-400', desc: 'Pages and workspace docs' },
    { name: 'Custom API', icon: Wrench, color: 'bg-orange-500', desc: 'Any REST endpoint' }
  ];

  const toggleChatConnector = (name: string) => {
    setChatConnectors(prev => ({ ...prev, [name]: !prev[name] }));
    addNotice(`${name} ${chatConnectors[name] ? 'disabled' : 'enabled'} for this chat`);
  };

  const addNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const getLastUserPrompt = (beforeIndex = messages.length) => {
    for (let i = Math.min(beforeIndex - 1, messages.length - 1); i >= 0; i -= 1) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return input || 'Aion OS local AI workflow';
  };

  const getFollowUps = (content: string) => {
    const base = content.toLowerCase();
    if (base.includes('error') || base.includes('not running')) {
      return ['Check engine status', 'Open Model Hub', 'Start Jan engine', 'Use installed model', 'Explain this error'];
    }
    if (base.includes('model') || base.includes('jan') || base.includes('ollama')) {
      return ['Load best local model', 'Compare model options', 'Tune for RTX VRAM', 'Search GGUF models', 'Continue setup'];
    }
    return ['Continue', 'Make it shorter', 'Give exact steps', 'Research web', 'Create action plan'];
  };

  const copyMessage = async (content: string) => {
    await navigator.clipboard?.writeText(content);
    addNotice('Copied response');
  };

  const speakMessage = (content: string) => {
    if (!window.speechSynthesis) {
      addNotice('Speech is not available in this environment');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
    addNotice('Speaking response');
  };

  const editMessage = (content: string) => {
    setInput(content);
    addNotice('Response copied into the chat bar for editing');
  };

  const continueMessage = (idx: number) => {
    handleSend(`Continue from your previous response. Last user task: ${getLastUserPrompt(idx)}`);
  };

  const regenerateMessage = (idx: number) => {
    const prompt = getLastUserPrompt(idx);
    setMessages(prev => prev.filter((_, i) => i !== idx));
    window.setTimeout(() => handleSend(prompt), 0);
  };

  const runFollowUp = (label: string, idx: number) => {
    const prompt = getLastUserPrompt(idx);
    if (label.toLowerCase().includes('research web')) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(prompt)}`;
      window.open(url, '_blank');
      addNotice('Opened web research in your browser');
      return;
    }
    handleSend(`${label}: ${prompt}`);
  };

  const checkEngines = async () => {
    if (!window.ipcRenderer) return;
    
    setEngineStatus(prev => ({ ...prev, Ollama: 'checking', 'LM Studio': 'checking', Jan: 'checking' }));
    
    try {
      const ollamaModels = await window.ipcRenderer.listModels();
      const lmStudioStatus = await window.ipcRenderer.checkLMStudio();
      const janStatus = await window.ipcRenderer.checkJan();
      const libraryModels = await window.ipcRenderer.listLibraryModels();

      setProviderModels(prev => ({
        ...prev,
        Ollama: ollamaModels?.length ? ollamaModels.map((m: any) => m.name) : prev.Ollama,
        'LM Studio': lmStudioStatus?.data?.length ? lmStudioStatus.data.map((m: any) => m.id) : prev['LM Studio'],
        Jan: libraryModels?.length ? libraryModels.map((m: any) => m.name) : prev.Jan
      }));

      const ollamaNames = ollamaModels?.map((m: any) => m.name) || [];
      const janNames = libraryModels?.map((m: any) => m.name) || [];

      if (provider === 'Ollama' && ollamaNames.length > 0 && !ollamaNames.includes(model)) {
        setModel(ollamaNames[0]);
        addNotice(`Switched to installed Ollama model: ${ollamaNames[0]}`);
      } else if (provider === 'Ollama' && ollamaNames.length === 0 && janNames.length > 0) {
        setProvider('Jan');
        setModel(janNames[0]);
        addNotice(`Ollama has no installed models. Switched to Jan: ${janNames[0]}`);
      }

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
    if (files?.length) {
      setMessages(prev => [...prev, { role: 'user', content: `Attached files:\n${files.join('\n')}` }]);
      addNotice(`${files.length} file${files.length === 1 ? '' : 's'} attached`);
    }
  };

  const handleFolderUpload = async () => {
    const folder = await window.ipcRenderer.selectFolder();
    console.log('Selected folder:', folder);
    if (folder) {
      setMessages(prev => [...prev, { role: 'user', content: `Attached folder:\n${folder}` }]);
      addNotice('Folder attached');
    }
  };

  const handleAppOpen = (app: string) => {
    window.ipcRenderer.openApp(app);
  };

  const handleSend = async (overrideInput?: string) => {
    const outgoing = (overrideInput ?? input).trim();
    if (!outgoing || isTyping) return;

    const userMessage = { role: 'user', content: outgoing };
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

  React.useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

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
                <span className="text-sm font-bold text-gray-900">{msg.role === 'assistant' ? 'ME' : 'you'}</span>
              </div>
              
              <div className="pl-8 space-y-4">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                
                {msg.role === 'assistant' && (
                  <>
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center">
                            <Brain className="w-3 h-3 text-blue-500" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Thinking and research</span>
                        </div>
                        <button
                          onClick={() => runFollowUp('Research web', idx)}
                          className="flex items-center text-[10px] font-black text-blue-600 uppercase tracking-wider hover:underline"
                        >
                          <Search className="w-3 h-3 mr-1" />
                          Web research
                        </button>
                      </div>
                      <div className="px-4 py-2 bg-white grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <ResearchStep label="Read task context" done />
                        <ResearchStep label="Check local model route" done={!isTyping} />
                        <ResearchStep label="Web research available" done />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button onClick={() => copyMessage(msg.content)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Copy">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => speakMessage(msg.content)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Speak">
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => editMessage(msg.content)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => continueMessage(idx)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Continue">
                        <StepForward className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => regenerateMessage(idx)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Regenerate">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {getFollowUps(msg.content).map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => runFollowUp(suggestion, idx)}
                          className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 text-[10px] font-bold text-gray-600 hover:text-blue-700 rounded-full transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
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

      {notice && (
        <div className="px-6 py-2 bg-blue-50 border-t border-blue-100 text-center text-[11px] font-bold text-blue-700">
          {notice}
        </div>
      )}

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
                      <button
                        onClick={() => addNotice('Google Drive connects from Settings > Connectors')}
                        className="flex items-center w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border-t mt-1 pt-2"
                      >
                         <HardDrive className="w-3.5 h-3.5 mr-2 text-green-600" />
                         Google Drive
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => setInput(prev => `${prev}${prev ? ' ' : ''}:)`)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Emoji">
                  <Smile className="w-4 h-4" />
                </button>
                <button onClick={() => handleFolderUpload()} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="My Computer">
                  <Monitor className="w-4 h-4" />
                </button>
                <button onClick={() => setInput(prev => prev || 'Use my enabled skills to ')} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Skills">
                  <Wrench className="w-4 h-4" />
                </button>
                <button onClick={() => setInput(prev => prev || 'Remember this for future tasks: ')} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Memory">
                  <Brain className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => addNotice('Voice input is ready for browser speech permissions in the next build')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Microphone">
                  <Mic className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleSend()}
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
          <div className="mt-3 flex items-center justify-center px-4 relative">
            <button
              onClick={() => setShowConnectorPanel(prev => !prev)}
              className="flex items-center space-x-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-2xl transition-all"
            >
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Connectors</span>
              <div className="flex items-center space-x-2">
                {chatConnectorItems.filter(item => chatConnectors[item.name]).slice(0, 8).map(item => (
                  <ConnectorIcon key={item.name} icon={item.icon} label={item.name} color={item.color} />
                ))}
              </div>
              <span className="text-[9px] font-black text-blue-600 uppercase">
                {Object.values(chatConnectors).filter(Boolean).length} on
              </span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showConnectorPanel ? 'rotate-180' : ''}`} />
            </button>

            {showConnectorPanel && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[520px] max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-3xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Per-chat tool permissions</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">ON lets ME use that connector in this conversation.</p>
                  </div>
                  <button onClick={() => setShowConnectorPanel(false)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {chatConnectorItems.map(item => (
                    <button
                      key={item.name}
                      onClick={() => toggleChatConnector(item.name)}
                      className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${item.color} rounded-xl flex items-center justify-center text-white`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900">{item.name}</p>
                          <p className="text-[9px] text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                      <div className={`w-9 h-5 rounded-full relative transition-all ${chatConnectors[item.name] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${chatConnectors[item.name] ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
