import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Smile, Monitor, Mic, ArrowUp, Search, ChevronDown, Info, ExternalLink, ChevronRight, File, Folder, Globe,
  MessageSquare as MsgIcon, Mail, Briefcase, Cpu, Zap, Github, Layout, Calculator, Palette, HardDrive, Wrench, Brain,
  RefreshCw, Copy, Volume2, Edit3, StepForward, RotateCcw, X, Rocket, LayoutGrid, FileText, MessageSquare, Video,
  Scale, CreditCard, Radio, Code as CodeIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

const ResearchStep = ({ label, done = false }: { label: string, done?: boolean }) => (
  <div className="flex items-center space-x-2 text-xs text-gray-500 py-1">
    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${done ? 'bg-gray-100 border-gray-200' : 'border-gray-200 animate-pulse'}`}>
      {done ? <Search className="w-2.5 h-2.5 text-gray-400" /> : <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />}
    </div>
    <span className={done ? "text-gray-400" : "text-gray-600"}>{label}</span>
  </div>
);

const connectorId = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
const engineKey = (name: string) => name === 'Jan' ? 'Jan + TurboQuant' : name === 'Auto' ? 'Auto' : name;
const preferJanModel = (models: string[]) => models.find(m => /qwen/i.test(m)) || models.find(m => /phi/i.test(m)) || models[0] || 'Auto local model';
const providerLabel = (name: string) => name === 'Auto' ? 'Auto Mix (local first + free cloud)' : name === 'Jan' ? 'Jan + TurboQuant + DFLASH (built-in)' : name;

const chooseAgentForPrompt = (prompt: string) => {
  const text = prompt.toLowerCase();
  if (/(court|tribunal|appeal|judg|justice|legal|solicitor|law|claim|evidence|ombudsman|complaint|hmcts|uk)/.test(text)) return 'justice-case-agent';
  if (/(buy|seller|refund|chargeback|section 75|scam|product|purchase|return|ebay|amazon|shop|payment)/.test(text)) return 'purchase-guardian-agent';
  if (/(tax|vat|hmrc|invoice|account|ledger|payroll|self assessment|receipt)/.test(text)) return 'accountant-agent';
  if (/(security|virus|defender|firewall|forensic|breach|malware|audit)/.test(text)) return 'openclaw-full';
  if (/(email|mail|document|file|organize|summarize|folder|workflow)/.test(text)) return 'paperclip-full';
  if (/(research|browser|web|pc|computer|monitor|system|performance|cpu|ram|gpu)/.test(text)) return 'space-agent-full';
  return 'hermes-full';
};

const ConnectorIcon = ({ icon: Icon, label, color }: { icon: any, label: string, color: string }) => (
  <div className="relative group cursor-pointer">
    <div className={`w-5 h-5 rounded-md ${color} flex items-center justify-center text-white shadow-sm transition-all group-hover:scale-110`}>
      <Icon className="w-2.5 h-2.5" />
    </div>
    {/* Tiny hover tooltip */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none font-bold uppercase tracking-wider">
      {label}
    </div>
  </div>
);

const ComposerIconButton = ({ icon: Icon, label, onClick, className = '' }: { icon: any; label: string; onClick: () => void; className?: string }) => (
  <div className="relative shrink-0">
    <button
      onClick={onClick}
      className={`p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all ${className}`}
      title={label}
      aria-label={label}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  </div>
);

type ChatInterfaceProps = {
  initialModel?: { provider: string, model: string } | null;
  initialPrompt?: string;
  isAgentic?: boolean;
  onNavigate?: (view: string) => void;
};

export const ChatInterface = ({ initialModel, initialPrompt, isAgentic, onNavigate }: ChatInterfaceProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [researchSteps, setResearchSteps] = useState<string[]>([]);
  const [provider, setProvider] = useState(initialModel?.provider || 'Auto');
  const [model, setModel] = useState(initialModel?.model || 'Auto mix');
  const [voicePreset, setVoicePreset] = useState('tamil-jaffna');
  const [showConnectorPanel, setShowConnectorPanel] = useState(false);
  const [chatConnectors, setChatConnectors] = useState<{[key: string]: boolean}>({});
  const handledInitialPrompt = useRef('');
  const [engineStatus, setEngineStatus] = useState<{[key: string]: 'online' | 'offline' | 'checking'}>({
    'Jan + TurboQuant': 'checking',
    Auto: 'checking',
    Ollama: 'checking',
    'LM Studio': 'checking',
    OpenCode: 'checking'
  });

  // Update when initialModel changes
  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (window.ipcRenderer) {
        try {
          // Fetch real connector state
          const state = await window.ipcRenderer.getConnectors();
          if (!isMounted) return;
          const normalized = Array.isArray(state) ? {} : state;
          setChatConnectors(normalized);

          if (initialModel && initialModel.model && initialModel.provider) {
            setProvider(initialModel.provider);
            setModel(initialModel.model);
          } else {
            const savedPreset = await window.ipcRenderer.getModelPreset?.().catch(() => ({ provider: 'Auto', model: 'Auto mix' }));
            const sessionProviderChanged = window.sessionStorage.getItem('hermsdesk.provider.changed') === 'true';
            const preset = sessionProviderChanged ? savedPreset : { provider: 'Auto', model: 'Auto mix' };
            if (preset?.provider) {
              setProvider(preset.provider);
              setModel(preset.model || 'Auto local model');
            }
            // Auto-detect best local engine
            const [ollama, jan, lmstudio, openCode] = await Promise.all([
              window.ipcRenderer.listModels().catch(() => []),
              window.ipcRenderer.janStatus().catch(() => null),
              window.ipcRenderer.checkLMStudio().catch(() => null),
              window.ipcRenderer.checkOpenCode?.().catch(() => null)
            ]);

            if (!isMounted) return;

            const janModels = jan?.models?.map((m: any) => m.id || m.name).filter(Boolean) || [];

            if (preset?.provider === 'Auto') {
              setProvider('Auto');
              setModel('Auto mix');
              setEngineStatus(prev => ({
                ...prev,
                Auto: jan?.apiOnline || ollama?.length || lmstudio?.online || openCode?.online ? 'online' : 'checking',
                'Jan + TurboQuant': jan?.apiOnline ? 'online' : jan?.installed ? 'checking' : 'offline',
                Ollama: ollama?.length ? 'online' : 'offline',
                'LM Studio': lmstudio?.online ? 'online' : 'offline',
                OpenCode: openCode?.online ? 'online' : 'offline'
              }));
            } else if (preset?.provider === 'Jan') {
              setProvider('Jan');
              const presetModel = preset.model && preset.model !== 'Auto local model' ? preset.model : '';
              setModel(presetModel || preferJanModel(janModels));
              setEngineStatus(prev => ({
                ...prev,
                'Jan + TurboQuant': jan?.apiOnline ? 'online' : jan?.installed ? 'checking' : 'offline',
                OpenCode: openCode?.online ? 'online' : 'offline'
              }));
            } else if (jan && jan.apiOnline) {
              setProvider('Jan');
              if (janModels.length) setModel(preferJanModel(janModels));
              setEngineStatus(prev => ({ ...prev, 'Jan + TurboQuant': 'online' }));
            } else if (ollama && ollama.length > 0) {
              setProvider('Ollama');
              setModel(ollama[0].name);
              setEngineStatus(prev => ({ ...prev, Ollama: 'online' }));
            } else if (lmstudio) {
              setProvider('LM Studio');
              setEngineStatus(prev => ({ ...prev, 'LM Studio': 'online' }));
            } else if (openCode?.online) {
              setProvider('OpenCode');
              const openCodeModels = openCode.models?.map((m: any) => m.id || m.name).filter(Boolean) || [];
              if (openCodeModels.length) setModel(openCodeModels[0]);
              setEngineStatus(prev => ({ ...prev, OpenCode: 'online' }));
            }
          }
        } catch (error) {
          console.error('ChatInterface initialization error:', error);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [initialModel]);

  React.useEffect(() => {
    if (!window.ipcRenderer?.saveModelPreset) return;
    if (initialModel?.provider && initialModel?.model) return;
    const timeout = window.setTimeout(() => {
      window.ipcRenderer.saveModelPreset({
        provider,
        model: model || (provider === 'Auto' ? 'Auto mix' : 'Auto local model')
      }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [provider, model, initialModel]);

  const [providerModels, setProviderModels] = useState<{[key: string]: string[]}>({
    'Auto': ['Auto mix', 'Local first', 'Free cloud fallback'],
    'Ollama': [],
    'LM Studio': [],
    'OpenCode': [],
    'Jan': ['Auto local model'],
    'Gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
    'OpenRouter': [
      'openrouter/auto-free',
      'google/gemma-2-9b-it:free', 
      'mistralai/mistral-7b-instruct:free', 
      'meta-llama/llama-3-8b-instruct:free',
      'microsoft/phi-3-mini-128k-instruct:free',
      'qwen/qwen-2-7b-instruct:free'
    ],
    'Nvidia': [
      'meta/llama-3.1-8b-instruct',
      'meta/llama3-70b-instruct',
      'meta/llama3-8b-instruct',
      'mistralai/mistral-7b-instruct-v0.2',
      'google/gemma-7b',
      'nvidia/llama-3.1-405b-instruct'
    ]
  });

  const chatConnectorItems = [
    { name: 'LM Studio', icon: Monitor, color: 'bg-blue-700', desc: 'Local model server' },
    { name: 'Ollama', icon: Cpu, color: 'bg-gray-800', desc: 'Local inference engine' },
    { name: 'OpenCode', icon: CodeIcon, color: 'bg-emerald-700', desc: 'Local/OpenAI-compatible code model route' },
    { name: 'GitHub', icon: Github, color: 'bg-black', desc: 'Code sync & issues' },
    { name: 'Notion', icon: FileText, color: 'bg-gray-900', desc: 'Workspace & docs' },
    { name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-600', desc: 'Direct messaging' },
    { name: 'Gmail', icon: Mail, color: 'bg-red-600', desc: 'Email automation' },
    { name: 'Google Drive', icon: HardDrive, color: 'bg-blue-600', desc: 'Cloud file access' },
    { name: 'Browser', icon: Globe, color: 'bg-indigo-600', desc: 'Web research & scraping' },
    { name: 'Slack', icon: MessageSquare, color: 'bg-purple-600', desc: 'Team communication' },
    { name: 'Linear', icon: LayoutGrid, color: 'bg-blue-800', desc: 'Task management' }
  ];

  const toggleChatConnector = async (name: string) => {
    if (window.ipcRenderer) {
      const id = connectorId(name);
      const currentState = chatConnectors[id] !== false;
      const newState = !currentState;
      const updated = await window.ipcRenderer.toggleConnector(id, newState);
      setChatConnectors(updated);
      addNotice(`${name} route ${newState ? 'enabled' : 'disabled'} for this chat. Login/API access is separate where required.`);
    }
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

  const voiceOptions: Record<string, any> = {
    'tamil-jaffna': { voice: 'ta-m1', accent_id: 'ta-m1', language: 'ta-LK', accent: 'jaffna', style: 'professional' },
    'tamil-india': { voice: 'ta-default', accent_id: 'ta-default', language: 'ta-IN', accent: 'india', style: 'professional' },
    'english-uk': { voice: 'en-gb-default', accent_id: 'en-gb-default', language: 'en-GB', accent: 'uk', style: 'professional' },
    'english-us': { voice: 'en-us-default', accent_id: 'en-us-default', language: 'en-US', accent: 'us', style: 'professional' }
  };

  const speakMessage = async (content: string) => {
    const spoken = content
      .replace(/```[\s\S]*?```/g, 'code block omitted')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#>~[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const voiceResult = await window.ipcRenderer?.speakVoiceStack?.(`ME says. ${spoken}`, voiceOptions[voicePreset]).catch((error: any) => ({ ok: false, error: error?.message }));
    if (voiceResult?.ok) {
      addNotice(`Silva Voice Stack speaking: ${(voiceResult as any).voice || voicePreset}`);
      return;
    }

    addNotice(`Silva Voice Stack could not speak. ${voiceResult?.error || 'Start or repair the local voice server.'}`.trim());
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

  const runFollowUp = async (label: string, idx: number) => {
    const prompt = getLastUserPrompt(idx);
    
    if (label.toLowerCase().includes('research web')) {
      await openWebResearch(prompt);
      return;
    }

    if (label.toLowerCase().includes('start jan engine')) {
      addNotice('Attempting to start Jan+TurboQuant engine...');
      const result = await window.ipcRenderer.startJan();
      if (result.ok) {
        addNotice('Jan engine started successfully!');
        checkEngines();
      } else {
        addNotice(`Failed to start Jan: ${result.error || 'Unknown error'}`);
      }
      return;
    }

    if (label.toLowerCase().includes('check engine status')) {
      checkEngines();
      addNotice('Refreshing engine status...');
      return;
    }

    handleSend(`${label}: ${prompt}`);
  };

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  const toggleMicrophone = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      addNotice('Meeting Assistant: Capture stopped.');
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        addNotice('Error: System hardware (Microphone) transcription is not supported in this browser.');
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          addNotice('Meeting Assistant: System hardware active (Listening...)');
        };

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript;
            }
          }
          if (transcript) {
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          addNotice(`Microphone error: ${event.error}`);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        addNotice('Error: System hardware (Microphone) access failed.');
      }
    }
  };

  const checkEngines = async () => {
    if (!window.ipcRenderer) return;
    
    setEngineStatus(prev => ({ ...prev, Auto: 'checking', Ollama: 'checking', 'LM Studio': 'checking', 'Jan + TurboQuant': 'checking', OpenCode: 'checking' }));
    
    try {
      const ollamaModels = await window.ipcRenderer.listModels();
      const lmStudioStatus = await window.ipcRenderer.checkLMStudio();
      const janStatus = await window.ipcRenderer.janStatus();
      const openCodeStatus = await window.ipcRenderer.checkOpenCode?.().catch(() => null);
      const libraryModels = await window.ipcRenderer.listLibraryModels();
      const janApiModels = janStatus?.models?.map((m: any) => m.id || m.name).filter(Boolean) || [];
      const openCodeModels = openCodeStatus?.models?.map((m: any) => m.id || m.name).filter(Boolean) || [];
      const ollamaNames = ollamaModels?.map((m: any) => m.name) || [];
      const janNames = libraryModels?.map((m: any) => m.name) || [];

      setProviderModels(prev => ({
        ...prev,
        Auto: [
          'Auto mix',
          janStatus?.apiOnline ? `Jan: ${preferJanModel(janApiModels.length ? janApiModels : libraryModels?.map((m: any) => m.name) || [])}` : '',
          ollamaNames.length ? `Ollama: ${ollamaNames[0]}` : '',
          lmStudioStatus?.online ? 'LM Studio: auto' : '',
          openCodeStatus?.online ? `OpenCode: ${openCodeModels[0] || 'auto'}` : '',
          'OpenRouter: openrouter/auto-free',
          'NVIDIA NIM: meta/llama-3.1-8b-instruct'
        ].filter(Boolean),
        Ollama: ollamaModels?.length ? ollamaModels.map((m: any) => m.name) : prev.Ollama,
        'LM Studio': lmStudioStatus?.data?.length ? lmStudioStatus.data.map((m: any) => m.id) : prev['LM Studio'],
        Jan: ['Auto local model', ...(() => {
          const source = janApiModels.length ? janApiModels : libraryModels?.length ? libraryModels.map((m: any) => m.name) : prev.Jan.filter(m => m !== 'Auto local model');
          const best = preferJanModel(source);
          return [best, ...source.filter((m: string) => m !== best)].filter((m: string) => m && m !== 'Auto local model');
        })()],
        OpenCode: openCodeModels.length ? openCodeModels : prev.OpenCode
      }));

      if (provider === 'Ollama' && ollamaNames.length > 0 && !ollamaNames.includes(model)) {
        setModel(ollamaNames[0]);
        addNotice(`Switched to installed Ollama model: ${ollamaNames[0]}`);
      } else if (provider === 'Ollama' && ollamaNames.length === 0 && janStatus?.apiOnline && (janApiModels.length || janNames.length > 0)) {
        setProvider('Jan');
        const bestJan = preferJanModel(janApiModels.length ? janApiModels : janNames);
        setModel(bestJan);
        addNotice(`Ollama has no installed models. Switched to Jan: ${bestJan}`);
      }

      setEngineStatus({
        Auto: janStatus?.apiOnline || (ollamaModels && ollamaModels.length > 0) || Boolean(lmStudioStatus) || Boolean(openCodeStatus?.online) ? 'online' : 'checking',
        'Jan + TurboQuant': janStatus && janStatus.apiOnline ? 'online' : 'offline',
        Ollama: ollamaModels && ollamaModels.length > 0 ? 'online' : 'offline',
        'LM Studio': lmStudioStatus ? 'online' : 'offline',
        OpenCode: openCodeStatus?.online ? 'online' : 'offline'
      });
    } catch (e) {
      console.error('Engine check failed:', e);
      setEngineStatus({
        Auto: 'offline',
        'Jan + TurboQuant': 'offline',
        Ollama: 'offline',
        'LM Studio': 'offline',
        OpenCode: 'offline'
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

  const composeWhatsApp = async () => {
    const message = input.trim() || getLastUserPrompt();
    if (!input.trim() && !messages.length) {
      onNavigate?.('whatsapp');
      addNotice('Opened WhatsApp ME communication workspace.');
      return;
    }
    const draft = await window.ipcRenderer?.saveWhatsAppDraft?.({
      label: 'Chat bar compose',
      message,
      status: 'drafted'
    }).catch(() => null);
    const result = await window.ipcRenderer?.composeWhatsApp?.(message);
    if (result?.ok && draft?.id) {
      await window.ipcRenderer?.markWhatsAppOpened?.(draft.id).catch(() => null);
    }
    addNotice(result?.ok ? 'Opened WhatsApp composer. Review and press Send manually.' : 'Could not open WhatsApp.');
  };

  const openVideoCall = async () => {
    await window.ipcRenderer?.openApp?.('video call');
    addNotice('Opened video call room in your browser.');
  };

  const openVoiceStack = async () => {
    const status = await window.ipcRenderer?.getVoiceStackStatus?.();
    const diagnosis = await window.ipcRenderer?.diagnoseVoiceStack?.().catch(() => null);
    await window.ipcRenderer?.openApp?.('voice stack');
    addNotice(status?.ok && diagnosis?.ok
      ? 'Silva Voice Stack is online and runtime checks passed.'
      : 'Voice Stack opened. Use Build Voice Stack to repair missing packages/models.');
  };

  const buildVoiceStack = async () => {
    addNotice('Starting Silva Voice Stack self-build terminal...');
    const result = await window.ipcRenderer?.buildVoiceStack?.().catch((error: any) => ({ ok: false, error: error?.message }));
    if (result?.ok) {
      addNotice('Build Voice Stack opened. It will repair packages, check models, and restart the server.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Voice Stack self-build started.\n\nScript: ${(result as any).script || 'repair_voice_stack.ps1'}\n\nIt will repair the Python environment, install/refresh local TTS dependencies, check CUDA/Piper/TTS, list missing premium voice model files, and restart the server.`
      }]);
    } else {
      addNotice(`Build Voice Stack failed: ${result?.error || 'unknown error'}`);
    }
  };

  const openWebResearch = async (query?: string) => {
    const target = (query || input || getLastUserPrompt()).trim();
    const result = await window.ipcRenderer?.openBrowserOperator?.(target);
    addNotice(result?.ok ? 'Opened live Browser Operator research window.' : (result?.error || 'Could not open browser research.'));
  };

  const startAutoResearch = async () => {
    const brief = (input || getLastUserPrompt()).trim();
    if (!brief) {
      addNotice('Type the task first, then start AutoResearch.');
      return;
    }

    setResearchSteps([
      'Opening live browser operator',
      'Dispatching local wide research lanes',
      'Starting Space agent task',
      'Streaming progress to the right cockpit'
    ]);

    const [browser, research] = await Promise.all([
      window.ipcRenderer?.openBrowserOperator?.(brief).catch((error: any) => ({ ok: false, error: error?.message })),
      window.ipcRenderer?.startWideResearch?.(brief, [
        'Find current official sources and primary evidence',
        'Check risks, contradictions, loopholes, and missing facts',
        'Build action route with next steps and approvals',
        'Prepare professional reply/draft output for the user'
      ]).catch((error: any) => ({ ok: false, error: error?.message }))
    ]);

    await window.ipcRenderer?.createAgentTask?.(
      `AutoResearch task:\n${brief}\n\nUse local-first reasoning. Use browser/operator verification when needed. Keep outputs evidence-led, approval-safe, and practical.`,
      'space-agent-full'
    ).catch(() => null);

    addNotice(
      browser?.ok || research?.id
        ? 'AutoResearch started: browser, wide research, and Space agent are visible in the right cockpit.'
        : `AutoResearch could not start: ${browser?.error || research?.error || 'unknown error'}`
    );

    window.setTimeout(() => setResearchSteps([]), 5000);
  };

  const openComputerView = () => {
    onNavigate?.('computer');
    addNotice('Opened ME Computer live workspace.');
  };

  const openSkillsView = async () => {
    const skills = await window.ipcRenderer?.getInstalledSkills?.();
    onNavigate?.('skills');
    addNotice(`Skills Engine: ${skills?.length || 0} installed local skills`);
  };

  const openMemoryView = () => {
    onNavigate?.('memory');
    addNotice('Opened Memory Base.');
  };

  const openKnowledgeView = () => {
    onNavigate?.('knowledge');
    addNotice('Opened Knowledge rules.');
  };

  const openAgentsView = () => {
    onNavigate?.('agents');
    addNotice('Opened live agents monitor.');
  };

  const openMailView = () => {
    onNavigate?.('mail');
    addNotice('Opened Mail ME workspace.');
  };

  const createJusticePack = async () => {
    const brief = input.trim() || getLastUserPrompt();
    const result = await window.ipcRenderer?.createJusticeCasePack?.('Justice Case Pack', brief);
    await window.ipcRenderer?.openBrowserOperator?.('GOV.UK legal appeal complaint ombudsman court tribunal guidance');
    addNotice(result?.ok ? 'Justice Case Pack created and official route research opened.' : 'Could not create Justice Case Pack.');
  };

  const createPurchasePack = async () => {
    const brief = input.trim() || getLastUserPrompt();
    const result = await window.ipcRenderer?.createPurchaseProtectionPack?.('Purchase Protection Pack', brief);
    await window.ipcRenderer?.openBrowserOperator?.(brief || 'seller product reviews scam check refund chargeback');
    addNotice(result?.ok ? 'Purchase Protection Pack created and seller/product research opened.' : 'Could not create Purchase Protection Pack.');
  };

  const handleSend = async (overrideInput?: string) => {
    const outgoing = (overrideInput ?? input).trim();
    if (!outgoing || isTyping) return;

    if (/(build|repair|fix|install|setup|self[-\s]?build).*(voice|tts|speech|silva voice)|voice.*(build|repair|fix|install|setup|self[-\s]?build)/i.test(outgoing)) {
      const userMessage = { role: 'user', content: outgoing };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);
      setResearchSteps(['Diagnosing Silva Voice Stack', 'Preparing self-build repair script', 'Opening visible repair terminal']);
      try {
        const diagnosis = await window.ipcRenderer?.diagnoseVoiceStack?.().catch(() => null);
        const result = await window.ipcRenderer?.buildVoiceStack?.().catch((error: any) => ({ ok: false, error: error?.message }));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result?.ok
            ? `I started the Silva Voice Stack self-build.\n\nWhat it does now:\n- Repairs/creates the Python 3.11 virtual environment.\n- Installs the local voice package.\n- Installs Piper TTS support.\n- Tries CUDA PyTorch for RTX acceleration.\n- Checks TTS/Piper/CUDA status.\n- Lists any missing premium model files.\n- Restarts the Voice Stack server.\n\nRepair script: ${(result as any).script}\n\nCurrent diagnosis before repair:\n${JSON.stringify(diagnosis, null, 2)}`
            : `I could not start the Voice Stack self-build.\n\nError: ${result?.error || 'unknown error'}`
        }]);
      } finally {
        setIsTyping(false);
        setResearchSteps([]);
      }
      return;
    }

    // Fetch knowledge rules to augment the system prompt
    let systemPrompt = "You are ME, an advanced AI agentic desktop application. You are local-first and privacy-focused.";
    if (window.ipcRenderer) {
      const knowledge = await window.ipcRenderer.getKnowledge();
      const activeRules = knowledge.map((k: any) => `[${k.title}]:\n${k.rules}`).join('\n\n');
      if (activeRules) {
        systemPrompt += `\n\nUse the following knowledge base rules for context:\n${activeRules}`;
      }
      const skillGuidance = await window.ipcRenderer.getSkillGuidance?.().catch(() => null);
      if (skillGuidance?.prompt) {
        systemPrompt += `\n\nInstalled ME/Mythos skills:\n${skillGuidance.prompt}`;
      }
    }

    const userMessage = { role: 'user', content: outgoing };
    const needsMailMemory = /(email|mail|inbox|outlook|gmail|bill|invoice|payment|pay|deadline|due|renewal|council|tax|hmrc|insurance|statement)/i.test(outgoing);
    let memoryContext: any = null;
    if (needsMailMemory && window.ipcRenderer?.getEmailIntelligence) {
      try {
        const intel = await window.ipcRenderer.getEmailIntelligence();
        memoryContext = intel?.mailboxMemory || intel?.memory || null;
      } catch {
        memoryContext = null;
      }
    }
    const chatHistory = [
      { role: 'system', content: systemPrompt },
      ...(memoryContext ? [{
        role: 'system',
        content: `Current local mailbox memory is already indexed. Use this first instead of asking to reread all mail. If the user asks about bills/deadlines/payments, answer from billsToPay/deadlines and say when the index was last updated. Never claim full mailbox access beyond the indexed state.\n\n${JSON.stringify({
          generatedAt: memoryContext.generatedAt,
          totalIndexed: memoryContext.totalIndexed,
          latestReceivedAt: memoryContext.latestReceivedAt,
          unreadCount: memoryContext.unreadCount,
          categories: memoryContext.categories,
          billsToPay: (memoryContext.billsToPay || []).slice(0, 20),
          deadlines: (memoryContext.deadlines || []).slice(0, 20),
          urgent: (memoryContext.urgent || []).slice(0, 20)
        })}`
      }] : []),
      ...messages,
      userMessage
    ];

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    const assignedAgentId = chooseAgentForPrompt(outgoing);
    if (researchSteps.length === 0) {
      setResearchSteps([
        'Creating local agent task',
        `Routing to ${assignedAgentId}`,
        'Starting built-in Jan+TurboQuant first',
        'Streaming work to Live Operations'
      ]);
    }

    console.log('Sending message with knowledge-augmented prompt');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 90s UI timeout

      if (window.ipcRenderer) {
        window.ipcRenderer.createAgentTask?.(
          `User task from chat:\n${outgoing}\n\nAct as a real HermesDesk ME local agent. Think, plan, use approved local/web/tool routes where available, recover from errors, and report progress through agent updates. Do not pretend unavailable private access is connected; use drafts and approval gates for external actions.`,
          assignedAgentId
        ).catch((error: any) => {
          console.error('Agent task launch failed:', error);
          addNotice(`Agent launch failed: ${error?.message || 'unknown error'}`);
        });

        let response;
        const normalizedProvider = provider.toLowerCase().replace(/\s+/g, '');

        if (['auto', 'automix', 'ollama', 'lmstudio', 'jan', 'jan+turboquant', 'opencode'].includes(normalizedProvider)) {
          response = await window.ipcRenderer.chat({ 
            model: model === 'Auto local model' || model === 'Auto mix' || model.startsWith('Jan:') || model.startsWith('Ollama:') || model.startsWith('LM Studio:') || model.startsWith('OpenCode:') || model.startsWith('OpenRouter:') || model.startsWith('NVIDIA NIM:')
              ? ''
              : normalizedProvider === 'ollama' && model && !model.includes(':')
                ? `${model}:latest`
                : model,
            messages: chatHistory,
            provider: normalizedProvider
          });
        } else if (['gemini', 'nvidia', 'openrouter'].includes(normalizedProvider)) {
          // Cloud providers — force free tier if not already specified
          let cloudModel = model;
          if (normalizedProvider === 'openrouter' && (!model.includes(':free') || model === 'openrouter/auto')) {
            cloudModel = 'openrouter/auto-free';
          } else if (normalizedProvider === 'nvidia' && !model.includes('/')) {
            cloudModel = 'meta/llama-3.1-8b-instruct';
          }

          response = await window.ipcRenderer.chatProvider({
            provider: normalizedProvider,
            model: cloudModel,
            messages: chatHistory
          });
        } else {
          // Default: use smart engine routing (Jan+TQ → Ollama → LM Studio)
          response = await window.ipcRenderer.chatBest({
            model,
            messages: chatHistory
          });
        }

        clearTimeout(timeoutId);

        if (response) {
          const content = response.content || response.message?.content || (response.choices && response.choices[0]?.message?.content) || "No response content received.";
          const engine = response.engine || provider;
          setMessages(prev => [...prev, { role: 'assistant', content, engine }]);
        } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${provider} returned an empty response. Open Model Hub and refresh engine status before retrying.` }]);
        }
      } else {
        // Fallback for non-electron environment
        addNotice('System Error: Electron IPC bridge not detected.');
        setIsTyping(false);
        return;
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message || "Request timed out or failed."}` }]);
    } finally {
      setIsTyping(false);
      setResearchSteps([]);
    }
  };

  React.useEffect(() => {
    if (initialPrompt && handledInitialPrompt.current !== initialPrompt) {
      handledInitialPrompt.current = initialPrompt;
      if (isAgentic) {
        setResearchSteps(['Reading task context', 'Checking available local engines']);
        setTimeout(() => {
          setResearchSteps(prev => [...prev, 'Searching knowledge base']);
          handleSend(initialPrompt);
        }, 500);
      } else {
        handleSend(initialPrompt);
      }
    }
  }, [initialPrompt]);

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide px-4 pt-4 pb-32"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500",
                msg.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              <div className={cn("flex items-center space-x-2", msg.role === 'user' && "flex-row-reverse space-x-reverse")}>
                <div className={cn(
                  "w-8 h-8 rounded-2xl flex items-center justify-center shadow-sm",
                  msg.role === 'assistant' ? 'bg-black text-white' : 'bg-blue-600 text-white'
                )}>
                  {msg.role === 'assistant' ? <Rocket className="w-4 h-4" /> : <span className="text-[10px] font-black uppercase">YOU</span>}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{msg.role === 'assistant' ? 'Hermes ME' : 'User'}</span>
                  {msg.engine && <span className="text-[8px] font-bold text-gray-400 uppercase">{msg.engine}</span>}
                </div>
              </div>
              
              <div className={cn(
                "max-w-[85%] group/msg relative",
                msg.role === 'user' ? 'mr-10' : 'ml-10'
              )}>
                <div className={cn(
                  "p-4 rounded-[28px] text-sm leading-relaxed whitespace-pre-wrap select-text",
                  msg.role === 'assistant' ? 'bg-gray-50 text-gray-800' : 'bg-blue-600 text-white shadow-xl shadow-blue-500/10'
                )}>
                  {msg.content}
                </div>
              </div>
                
              {msg.role === 'assistant' && (
                <div className="ml-10 space-y-4 w-full max-w-[85%]">
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
                </div>
              )}
            </div>
          ))}
          {researchSteps.length > 0 && (
            <div className="max-w-2xl mx-auto w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-1 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Local Agent Process</span>
              </div>
              {researchSteps.map((step, i) => (
                <ResearchStep key={i} label={step} done={i < researchSteps.length - 1} />
              ))}
            </div>
          )}
          {isTyping && (
            <div className="flex flex-col items-start space-y-4 ml-10 animate-in fade-in duration-300">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Thinking...</span>
              </div>
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
                window.sessionStorage.setItem('hermsdesk.provider.changed', 'true');
                setProvider(newProvider);
                setModel(providerModels[newProvider]?.[0] || '');
              }}
            >
              {Object.keys(providerModels).map(p => (
                <option key={p} value={p}>{providerLabel(p)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Engine Status Badge */}
          {['Ollama', 'LM Studio', 'Jan', 'OpenCode'].includes(provider) && (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-white border border-gray-100 rounded-full shadow-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${
                engineStatus[engineKey(provider)] === 'online' ? 'bg-green-500 animate-pulse' : 
                engineStatus[engineKey(provider)] === 'offline' ? 'bg-red-500' : 'bg-gray-300'
              }`} />
              <span className={`text-[8px] font-black uppercase tracking-tighter ${
                engineStatus[engineKey(provider)] === 'online' ? 'text-green-600' : 
                engineStatus[engineKey(provider)] === 'offline' ? 'text-red-600' : 'text-gray-400'
              }`}>
                {engineStatus[engineKey(provider)] || 'Local'}
              </span>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200" />

        <div className={`flex items-center space-x-2 px-3 py-1 border rounded-full ${
          engineStatus['Jan + TurboQuant'] === 'online'
            ? 'bg-green-50 border-green-100'
            : 'bg-orange-50 border-orange-100'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            engineStatus['Jan + TurboQuant'] === 'online' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'
          }`} />
          <span className={`text-[8px] font-black uppercase tracking-widest ${
            engineStatus['Jan + TurboQuant'] === 'online' ? 'text-green-700' : 'text-orange-700'
          }`}>
            {engineStatus['Jan + TurboQuant'] === 'online' ? 'Jan + DFLASH online' : 'Jan standby'}
          </span>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center space-x-3 group">
          <div className="flex items-center space-x-1.5">
            <Volume2 className="w-3 h-3 text-gray-400" />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Voice</span>
          </div>
          <div className="relative">
            <select
              className="text-[11px] font-black text-gray-900 bg-white border border-gray-100 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer hover:border-blue-200 transition-all appearance-none pr-6"
              value={voicePreset}
              onChange={(e) => setVoicePreset(e.target.value)}
            >
              <option value="tamil-jaffna">Tamil Jaffna</option>
              <option value="tamil-india">Tamil India</option>
              <option value="english-uk">English UK</option>
              <option value="english-us">English US</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
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
        <div className="max-w-5xl mx-auto">
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
                <div className="relative group/icon">
                  <button 
                    onClick={() => setShowUploadOptions(!showUploadOptions)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover/icon:opacity-100 invisible group-hover/icon:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                    Add content
                  </div>
                  {showUploadOptions && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border rounded-2xl shadow-2xl p-1.5 z-50 border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                      <button 
                        onClick={() => { handleFileUpload(); setShowUploadOptions(false); }}
                        className="flex items-center w-full px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                      >
                        <File className="w-4 h-4 mr-2.5" />
                        Upload Files
                      </button>
                      <button 
                        onClick={() => { handleFolderUpload(); setShowUploadOptions(false); }}
                        className="flex items-center w-full px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                      >
                        <Folder className="w-4 h-4 mr-2.5" />
                        Upload Folder
                      </button>
                      <button
                        onClick={() => { addNotice('Google Drive connects from Settings > Connectors'); setShowUploadOptions(false); }}
                        className="flex items-center w-full px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all border-t mt-1.5 pt-2"
                      >
                         <HardDrive className="w-4 h-4 mr-2.5 text-green-600" />
                         Google Drive
                      </button>
                    </div>
                  )}
                </div>

                <ComposerIconButton icon={MessageSquare} label="WhatsApp" onClick={composeWhatsApp} className="hover:text-green-600 hover:bg-green-50" />
                <ComposerIconButton icon={Video} label="Video Call" onClick={openVideoCall} className="hover:text-blue-600 hover:bg-blue-50" />
                <ComposerIconButton icon={Volume2} label="Voice Stack" onClick={openVoiceStack} className="hover:text-cyan-600 hover:bg-cyan-50" />
                <ComposerIconButton icon={Wrench} label="Build Voice Stack" onClick={buildVoiceStack} className="hover:text-cyan-700 hover:bg-cyan-50" />
                <ComposerIconButton icon={Smile} label="Emoji" onClick={() => setInput(prev => `${prev}${prev ? ' ' : ''}:)`)} />
                <ComposerIconButton icon={Monitor} label="Computer" onClick={openComputerView} />
                <ComposerIconButton icon={Wrench} label="Mythos Skills" onClick={openSkillsView} className="hover:text-orange-600 hover:bg-orange-50" />
                <ComposerIconButton icon={LayoutGrid} label="Connectors" onClick={() => onNavigate?.('connectors')} className="hover:text-indigo-600 hover:bg-indigo-50" />
                <ComposerIconButton icon={Globe} label="Research" onClick={() => openWebResearch()} className="hover:text-blue-600 hover:bg-blue-50" />
                <ComposerIconButton icon={Brain} label="Brain" onClick={openMemoryView} className="hover:text-purple-600 hover:bg-purple-50" />
              </div>

              <div className="flex items-center space-x-2">
                <ComposerIconButton icon={Mail} label="Mail ME" onClick={openMailView} className="hover:text-red-600 hover:bg-red-50" />
                <ComposerIconButton icon={Rocket} label="Agents" onClick={openAgentsView} className="hover:text-gray-950 hover:bg-gray-100" />
                <ComposerIconButton icon={Radio} label="AutoResearch" onClick={startAutoResearch} className="hover:text-rose-700 hover:bg-rose-50" />
                <ComposerIconButton icon={Scale} label="Justice" onClick={createJusticePack} className="hover:text-red-800 hover:bg-red-50" />
                <ComposerIconButton icon={CreditCard} label="Purchase Guard" onClick={createPurchasePack} className="hover:text-emerald-800 hover:bg-emerald-50" />
                <ComposerIconButton icon={FileText} label="Knowledge" onClick={openKnowledgeView} className="hover:text-emerald-700 hover:bg-emerald-50" />
                <div className="relative shrink-0">
                  <button 
                    onClick={toggleMicrophone} 
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      isRecording ? "bg-red-50 text-red-600 animate-pulse" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                    )}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative shrink-0">
                  <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className={cn(
                      "p-2 rounded-full transition-all shadow-sm",
                      input.trim() && !isTyping 
                        ? 'bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:shadow-black/10' 
                        : 'bg-gray-100 text-gray-300'
                    )}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tiny Tiny Connectors Below Chat Bar */}
          <div className="mt-3 flex items-center justify-center px-4 relative">
            <button
              onClick={() => setShowConnectorPanel(prev => !prev)}
              className="relative group/connectors flex items-center gap-2 px-2.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-2xl transition-all"
              title="Connectors and per-chat tool access"
              aria-label="Connectors and per-chat tool access"
            >
              <LayoutGrid className="w-4 h-4 text-gray-500" />
              <div className="flex items-center space-x-2">
                {chatConnectorItems.filter(item => chatConnectors[connectorId(item.name)] !== false).slice(0, 8).map(item => (
                  <ConnectorIcon key={item.name} icon={item.icon} label={item.name} color={item.color} />
                ))}
              </div>
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
                {Object.values(chatConnectors).filter(Boolean).length}
              </span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showConnectorPanel ? 'rotate-180' : ''}`} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] font-black uppercase tracking-widest rounded opacity-0 invisible group-hover/connectors:opacity-100 group-hover/connectors:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                Tool access
              </div>
            </button>

            {showConnectorPanel && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[520px] max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-3xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Per-chat tool permissions</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">ON enables the route in this chat. OAuth/API login is still required for private data.</p>
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
                      <div className={`w-9 h-5 rounded-full relative transition-all ${chatConnectors[connectorId(item.name)] !== false ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${chatConnectors[connectorId(item.name)] !== false ? 'left-4' : 'left-0.5'}`} />
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
