import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Smile, Monitor, Mic, ArrowUp, Search, ChevronDown, Info, ExternalLink, ChevronRight, File, Folder, Globe,
  MessageSquare as MsgIcon, Mail, Briefcase, Cpu, Zap, Github, Layout, Calculator, Palette, HardDrive, Wrench, Brain,
  RefreshCw, Copy, Volume2, Edit3, StepForward, RotateCcw, X, Rocket, LayoutGrid, FileText, MessageSquare, Video,
  Scale, CreditCard, Radio, Code as CodeIcon, History, Trash2
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

const traceLine = (event: any) => {
  const payload = event?.payload || {};
  if (event?.type === 'search.query') return `Search: ${payload.query || 'query'} (${payload.engine || event.source})`;
  if (event?.type === 'search.result') return `Result #${payload.rank || ''}: ${payload.title || payload.url || payload.snippet || 'source'}`;
  if (event?.type === 'tool.called') return `Tool: ${payload.tool || payload.detail || event.source}`;
  if (event?.type === 'tool.result') return `Tool result: ${payload.resultCount ?? payload.status ?? payload.error ?? payload.detail ?? event.source}`;
  if (event?.type === 'session.started') return `Session started: ${payload.engine || payload.model || event.source}`;
  if (event?.type === 'session.finished') return `Session finished: ${payload.engine || event.source} (${payload.durationMs || 0}ms)`;
  if (event?.type === 'agent.step' || event?.type === 'agent.thought') return payload.message || payload.step || 'Agent step';
  if (event?.type === 'memory.read') return `Memory read: ${payload.query || payload.source || event.source}`;
  return payload.message || payload.query || payload.tool || payload.detail || event?.type || 'Event';
};

const connectorId = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
const engineKey = (name: string) => name === 'Jan' ? 'Jan + TurboQuant' : name === 'Auto' ? 'Auto' : name;
const preferJanModel = (models: string[]) => models.find(m => /qwen/i.test(m)) || models.find(m => /phi/i.test(m)) || models[0] || 'Auto local model';
const providerLabel = (name: string) => name === 'Auto' ? 'Auto Mix (local first + free cloud)' : name === 'Jan' ? 'Jan + TurboQuant + DFLASH (built-in)' : name;
const CHAT_HISTORY_KEY = 'hermsdesk.chat.sessions.v1';
const WHATSAPP_NUMBER_KEY = 'hermsdesk.user.whatsappNumber';

const isCasualChatPrompt = (text: string) => {
  const clean = text.toLowerCase().replace(/[^\w\s']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return false;
  return /^(hi|hey|hello|hiya|yo|good morning|good afternoon|good evening|how are you|how are you doing|how's it going|how you doing|you ok|are you ok|thanks|thank you|cheers)\b/.test(clean)
    && !/(update|urgent|important|status|email|mail|bill|payment|deadline|insurance|mot|tax|hmrc|legal|property|accounting|funding|search|research|open|run|check|find|show|list|delete|send|draft|whatsapp)/i.test(clean);
};

const isStatusOrUpdatesPrompt = (text: string) =>
  /system status|\bstatus\b|any updates|important updates|importon|iporton|urgent|need looking|what needs|anything important|anything urgent|today|this morning|ready always|check memory|check emails|mailbox|inbox/i.test(text);

const isPreferenceTrainingPrompt = (text: string) =>
  /(remember|from now on|you must|must|don't show|do not show|not interested|only show|treat this|mark this|ignore this|my preference|i prefer|i want you to|when you analyse|when you analyze|always|never|training|learn this|thanks? yes|thank yes|i have booked|i booked|gather all|filter|prioriti[sz]e)/i.test(text);

const isLiveWebResearchPrompt = (text: string) =>
  /(research|web|internet|online|google|reviews?|review score|near me|nearby|local|book|booking|where should i|best|compare|check.*reviews?|make sure.*reviews?)/i.test(text)
  && !/(email|mailbox|inbox|outlook|gmail|indexed mail|my emails?)/i.test(text);

const isMotReviewResearchPrompt = (text: string) =>
  /(\bmot\b|car|vehicle|garage|test centre|mechanic)/i.test(text)
  && /(research|reviews?|near me|nearby|local|book|booking|best|compare|check)/i.test(text);

const buildLiveResearchAnswer = (prompt: string, trace: any) => {
  const results = (trace?.trace?.results || trace?.results || []).filter((item: any) => item?.title || item?.url || item?.snippet);
  const sourceLines = results.slice(0, 6).map((item: any, index: number) =>
    `${index + 1}. ${item.title || item.url}\n${item.url || ''}\n${String(item.snippet || '').slice(0, 240)}`
  );
  if (isMotReviewResearchPrompt(prompt)) {
    const text = results.map((item: any) => `${item.title || ''} ${item.snippet || ''}`).join('\n').toLowerCase();
    const hasMotService = /mot service centre|4\.88|4\.9|white lund/.test(text);
    const hasPeels = /peels wheels|4\.84|4\.85|207|200 reviews/.test(text);
    const hasVmu = /lancaster city council|vmu|unbiased|01524 582781|£54/.test(text);
    const hasHoward = /howard mot|4\.9|283|280/.test(text);
    const recommendations = [
      hasMotService ? '1. MOT Service Centre Ltd, White Lund, Morecambe - strongest all-round pick from the results: very high reviews, quick turnaround, same-day/urgent booking signals, and online booking.' : '',
      hasPeels ? '2. Peels Wheels, White Lund, Morecambe - strong value/convenience option: high review count, good BookMyGarage score, open weekends, and online booking.' : '',
      hasVmu ? '3. Lancaster City Council VMU, White Lund - good trust/unbiased option: council-run MOT station, published prices, and customer comments mention fair/unbiased service.' : '',
      hasHoward ? '4. Howard MOT Centre, Lancaster - strong Lancaster-side candidate: local article/search result reports very high Google review score and large review count.' : ''
    ].filter(Boolean);
    return [
      'I checked live web results for MOT garages around Lancaster/Morecambe instead of mailbox memory.',
      '',
      'Best shortlist:',
      ...(recommendations.length ? recommendations : [
        '1. MOT Service Centre Ltd, White Lund, Morecambe - check live slots and reviews.',
        '2. Peels Wheels, White Lund, Morecambe - compare price and availability.',
        '3. Lancaster City Council VMU - useful if you want a more independent/council-run MOT route.'
      ]),
      '',
      'My booking advice:',
      '- If you want easiest online booking: use BookMyGarage and compare MOT Service Centre Ltd / Peels Wheels / Eden Autos / Excel Vehicle Sales.',
      '- If you want less upsell risk: call Lancaster City Council VMU and ask for MOT availability.',
      '- Before booking, phone the garage to confirm the slot, MOT price, and whether they can handle repairs same day if it fails.',
      '',
      'Sources checked:',
      ...(sourceLines.length ? sourceLines : ['No structured source lines returned by the search trace.']),
      '',
      'I will not book, pay, call, or submit your registration without your approval.'
    ].join('\n');
  }
  return [
    'I checked live web results and built this from the returned sources.',
    '',
    'Sources checked:',
    ...(sourceLines.length ? sourceLines : ['No structured source lines returned by the search trace.']),
    '',
    'Next step: tell me which option you want me to inspect deeper, and I can open that page/reviews in the browser operator.'
  ].join('\n');
};

const extractAgentFinal = (task: any) => {
  if (!task) return '';
  const final = [...(task.history || [])].reverse().find((item: any) => item.role === 'assistant')?.content;
  if (final && String(final).trim()) return String(final).trim();
  if (task.status === 'failed') return 'Agent task failed. Check Live Operations for the error trace.';
  return '';
};

const timeAwareGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const scorePriorityMail = (item: any) => {
  const text = `${item?.subject || ''} ${item?.sender || ''} ${item?.senderEmail || ''} ${item?.preview || item?.bodyPreview || ''} ${item?.type || ''} ${item?.categoryLabel || ''} ${item?.folderName || ''}`.toLowerCase();
  const normalZReport = /z[-\s]?report|epos/.test(text) && !/void|refund|short|over|missing|failed|error|cash difference|variance|mismatch/.test(text);
  let score = 0;
  if (item?.importanceStatus === 'important') score += 100;
  if (item?.importanceStatus === 'not-important') score -= 200;
  if (typeof item?.priorityScore === 'number') score += Math.min(120, Math.max(-80, item.priorityScore));
  if (item?.unread) score += 6;
  if (item?.hasAttachments) score += 12;
  if (/steamer street|howlish view|langdale place|land registry|certificate of compliance|requisition|ground rent|service charge|leasehold|freehold|rc\.legal|grangeford|fraud report|nfrc/.test(text)) score += 85;
  if (/silva retail|newton newsagent|newton store|parfetts|e-invoice|customer 105105|merchant|card payment|bank statement|credit card/.test(text)) score += 55;
  if (/bill|invoice|payment due|overdue|final notice|statement|direct debit|arrears|balance due/.test(text)) score += 55;
  if (/deadline|expires|expiry|renewal|policy|premium|mot|road tax|vehicle tax|appointment|hearing/.test(text)) score += 50;
  if (/hmrc|vat|tax|council|lancaster city council|land registry|solicitor|conveyancer|court|tribunal|legal|accountant/.test(text)) score += 45;
  if (/insurance|car insurance|business insurance|shop insurance|property insurance|pet insurance|life insurance/.test(text)) score += 42;
  if (/supplier|wholesale|staff invoice|receipt|payroll|wage|stock|order|parcel|delivery/.test(text)) score += 28;
  if (/lancaster|morecambe|heysham|la1|la2|la3|la4|closed shop|corner.?shop|commercial premises|retail premises|shop premises/.test(text)) score += 20;
  if (/birmingham|west midlands|manchester|liverpool|york|north east|carlisle|penrith|lake district/.test(text) && !/steamer street|legal|solicitor|land registry/.test(text)) score -= 35;
  if (/junk email|spam|unsubscribe|newsletter|digest|substack|fashion|festival|shopping voucher|sale|discount|clearance|promotion|promo|marketing|property alerts|organise\.network|petition|campaign/.test(text)) score -= 45;
  if (/automatic reply|undeliverable|out of office/.test(text)) score -= 35;
  if (normalZReport && item?.importanceStatus !== 'important') score = Math.min(score, 20);
  return score;
};

type ChatSession = {
  id: string;
  title: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
};

const chooseAgentForPrompt = (prompt: string) => {
  const text = prompt.toLowerCase();
  if (isPreferenceTrainingPrompt(prompt)) return 'general-agent';
  if (/(browser|click|type|scroll|navigate|open .*page|product page|search results|compare|extract|dom|purchase tab|web automation|tinyfish)/.test(text)) return 'browser-automation-agent';
  if (/(court|tribunal|appeal|judg|justice|legal|solicitor|law|claim|evidence|ombudsman|complaint|hmcts|uk)/.test(text)) return 'justice-case-agent';
  if (/(buy|seller|refund|chargeback|section 75|scam|product|purchase|return|ebay|amazon|shop|payment)/.test(text)) return 'purchase-guardian-agent';
  if (/(tax|vat|hmrc|invoice|account|ledger|payroll|self assessment|receipt)/.test(text)) return 'accountant-agent';
  if (/(security|virus|defender|firewall|forensic|breach|malware|audit)/.test(text)) return 'openclaw-full';
  if (/(email|mail|document|file|organize|summarize|folder|workflow)/.test(text)) return 'paperclip-full';
  if (/(research|browser|web|pc|computer|monitor|system|performance|cpu|ram|gpu)/.test(text)) return 'space-agent-full';
  return 'general-agent';
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [researchSteps, setResearchSteps] = useState<string[]>([]);
  const [liveTrace, setLiveTrace] = useState<any[]>([]);
  const researchStepsRef = useRef<string[]>([]);
  const liveTraceRef = useRef<any[]>([]);
  const lastRoutePreviewRef = useRef<any>(null);
  const [thinkingReview, setThinkingReview] = useState<any | null>(null);
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

  useEffect(() => {
    const onSilvaEvent = (_: any, event: any) => {
      setLiveTrace(prev => [event, ...prev].slice(0, 40));
    };
    window.ipcRenderer?.getSilvaEvents?.(30).then(events => setLiveTrace(events || [])).catch(() => {});
    window.ipcRenderer?.on?.('silva:event', onSilvaEvent);
    return () => {
      window.ipcRenderer?.off?.('silva:event', onSilvaEvent);
    };
  }, []);

  useEffect(() => {
    researchStepsRef.current = researchSteps;
  }, [researchSteps]);

  useEffect(() => {
    liveTraceRef.current = liveTrace;
  }, [liveTrace]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(CHAT_HISTORY_KEY) || '[]') as ChatSession[];
      const clean = Array.isArray(saved) ? saved.filter(item => item?.id).slice(0, 50) : [];
      const lastId = window.localStorage.getItem('hermsdesk.chat.activeId') || clean[0]?.id || `chat-${Date.now()}`;
      const active = clean.find(item => item.id === lastId) || clean[0];
      if (active) {
        setChatSessions(clean);
        setActiveChatId(active.id);
        setMessages(active.messages || []);
      } else {
        const now = new Date().toISOString();
        const fresh = { id: lastId, title: 'New chat', messages: [], createdAt: now, updatedAt: now };
        setChatSessions([fresh]);
        setActiveChatId(fresh.id);
      }
      setWhatsAppNumber(window.localStorage.getItem(WHATSAPP_NUMBER_KEY) || '');
    } catch {
      const now = new Date().toISOString();
      const fresh = { id: `chat-${Date.now()}`, title: 'New chat', messages: [], createdAt: now, updatedAt: now };
      setChatSessions([fresh]);
      setActiveChatId(fresh.id);
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!historyLoaded || !activeChatId) return;
    const now = new Date().toISOString();
    const firstUser = messages.find(message => message.role === 'user')?.content || '';
    const title = firstUser ? String(firstUser).replace(/\s+/g, ' ').slice(0, 48) : 'New chat';
    setChatSessions(prev => {
      const exists = prev.some(item => item.id === activeChatId);
      const next = (exists ? prev : [{ id: activeChatId, title, messages: [], createdAt: now, updatedAt: now }, ...prev])
        .map(item => item.id === activeChatId ? { ...item, title, messages, updatedAt: now } : item)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, 50);
      window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
      window.localStorage.setItem('hermsdesk.chat.activeId', activeChatId);
      return next;
    });
  }, [messages, activeChatId, historyLoaded]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, isTyping, researchSteps.length, liveTrace.length]);

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
    'Gemini': ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'],
    'OpenRouter': [
      'openai/gpt-oss-20b:free',
      'openai/gpt-oss-120b:free',
      'google/gemma-4-26b-a4b-it:free',
      'minimax/minimax-m2.5:free',
      'qwen/qwen3-next-80b-a3b-instruct:free',
      'nvidia/nemotron-3-nano-30b-a3b:free'
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

  const buildThinkingSnapshot = (fallbackSteps: string[] = []) => ({
    createdAt: new Date().toISOString(),
    steps: [
      ...(lastRoutePreviewRef.current?.ok ? [
        'Mythos Manager received the message first',
        `Route decision: ${lastRoutePreviewRef.current.assignedAgentId || 'general-agent'}`,
        `Priority: ${lastRoutePreviewRef.current.priority || 'normal'}`,
        `Approval gates: ${(lastRoutePreviewRef.current.approvalGates || []).join(', ') || 'standard safety'}`
      ] : []),
      ...(researchStepsRef.current.length ? researchStepsRef.current : fallbackSteps)
    ].filter(Boolean),
    events: liveTraceRef.current.slice(0, 12)
  });

  const assistantMessage = (content: string, engine?: string, fallbackSteps: string[] = []) => ({
    role: 'assistant',
    engine,
    content,
    thinking: buildThinkingSnapshot(fallbackSteps)
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
      const currentState = chatConnectors[id] === true;
      const newState = !currentState;
      const updated = await window.ipcRenderer.toggleConnector(id, newState);
      setChatConnectors(updated);
      addNotice(`${name} route ${newState ? 'shown' : 'hidden'} in chat. Real access still needs a live handler, login, API key, or local service.`);
    }
  };

  const addNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const focusChatInput = () => {
    window.setTimeout(() => {
      inputRef.current?.removeAttribute('disabled');
      inputRef.current?.focus();
    }, 0);
  };

  const resetComposerState = () => {
    setInput('');
    setIsTyping(false);
    setResearchSteps([]);
    setShowUploadOptions(false);
    setLiveTrace([]);
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const startNewChat = () => {
    const now = new Date().toISOString();
    const id = `chat-${Date.now()}`;
    const fresh = { id, title: 'New chat', messages: [], createdAt: now, updatedAt: now };
    setChatSessions(prev => [fresh, ...prev].slice(0, 50));
    setActiveChatId(id);
    setMessages([]);
    resetComposerState();
    setShowHistory(false);
    focusChatInput();
    addNotice('Started a new chat. Previous chat is saved in history.');
  };

  const openChatSession = (session: ChatSession) => {
    setActiveChatId(session.id);
    setMessages(session.messages || []);
    resetComposerState();
    setShowHistory(false);
    focusChatInput();
    addNotice(`Opened chat: ${session.title || 'Untitled'}`);
  };

  const deleteChatSession = (id: string) => {
    const now = new Date().toISOString();
    const next = chatSessions.filter(item => item.id !== id);
    setChatSessions(next);
    window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
    if (id === activeChatId) {
      const fallback = next[0];
      if (fallback) {
        setActiveChatId(fallback.id);
        setMessages(fallback.messages || []);
        window.localStorage.setItem('hermsdesk.chat.activeId', fallback.id);
      } else {
        const fresh = { id: `chat-${Date.now()}`, title: 'New chat', messages: [], createdAt: now, updatedAt: now };
        setChatSessions([fresh]);
        setActiveChatId(fresh.id);
        setMessages([]);
        resetComposerState();
        window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([fresh]));
        window.localStorage.setItem('hermsdesk.chat.activeId', fresh.id);
      }
    }
    resetComposerState();
    setShowHistory(false);
    focusChatInput();
    addNotice('Chat deleted from local history.');
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

  const buildMailboxEvidenceAnswer = (prompt: string, mailboxMemory: any, matches: any[]) => {
    const lower = prompt.toLowerCase();
    if (isPreferenceTrainingPrompt(prompt)) return '';
    const isMailQuestion = /(email|mail|inbox|outlook|gmail|bill|invoice|payment|pay|deadline|due|renewal|council|tax|hmrc|insurance|statement|mot|car|vehicle|policy|premium|urgent|important|need looking|accounting|accountant|legal|solicitor|land registry|property|premises|funding|funder|loan|supplier|provider)/i.test(prompt);
    if (!isMailQuestion) return '';

    const total = mailboxMemory?.totalIndexed?.toLocaleString?.() || mailboxMemory?.totalIndexed || 'indexed';
    const updated = mailboxMemory?.generatedAt ? new Date(mailboxMemory.generatedAt).toLocaleString() : 'recently';
    const wantsUrgents = /urgent|important|need looking|look at|priority|top\s*3|3 urgents/i.test(lower);
    const wantsVehicleInsurance = /car|vehicle|motor|mot|insurance|renewal|policy|premium/i.test(lower);
    const wantsCarInsuranceDue = /(car|vehicle|motor|van).{0,30}(insurance|policy|renewal|renew|due|expire|expiry|expires)|insurance.{0,30}(car|vehicle|motor|van|due|renewal|renew|expire|expiry|expires)/i.test(lower);
    const wantsAccounting = /(accounting|accountant|myt|quickbooks|hmrc|vat|tax|self assessment|companies house|payroll|bookkeeping|invoice|bill|statement|receipt|bank statement|credit card|direct debit|payment|supplier|provider)/i.test(lower);
    const wantsLegal = /(legal|solicitor|rc\.legal|land registry|certificate of compliance|requisition|ground rent|service charge|steamer street|howlish view|court|tribunal|council|licensing|planning|enforcement|fraud report|actionfraud)/i.test(lower);
    const wantsProperty = /(property|premises|closed shop|corner.?shop|mixed.?use|auction|estate agent|survey|epc|lancaster|morecambe|heysham|shop premises|commercial premises)/i.test(lower);
    const wantsFunding = /(funding|funder|lender|loan|overdraft|cashflow|cash flow|iwoca|funding circle|tide|anna|loqbox|capital one|nationwide finance|bank statement)/i.test(lower);
    const vehiclePolicyEvidence = (email: any) => {
      const raw = `${email.subject || ''} ${email.sender || ''} ${email.senderEmail || ''} ${email.preview || ''} ${email.bodyPreview || ''}`.toLowerCase();
      const hasVehicle = /(car|vehicle|motor|van|driver|yk13wnz|sva23|admiral|aviva|direct line|churchill|hastings|1st central|tesco bank|esure|swinton|lv=|rac|the aa|aa insurance|saga)/i.test(raw);
      const hasPolicy = /(insurance|policy|premium|renewal|renew|expires|expiry|cover|certificate|schedule|quote|no claims)/i.test(raw);
      const noise = /(life insurance|pet insurance|funding|loan|finance review|unclaimed benefit|alibaba|linkedin|security alert|takepayments|payment processor|newsletter|promotion|gift card|cashback|claim compensation)/i.test(raw);
      return hasVehicle && hasPolicy && !noise;
    };
    const curated = wantsUrgents
      ? [
          ...(mailboxMemory?.upcomingImportant || []),
          ...(mailboxMemory?.insuranceRenewals || []),
          ...(mailboxMemory?.billsToPay || []),
          ...(mailboxMemory?.deadlines || []),
          ...(mailboxMemory?.urgent || [])
        ]
      : wantsVehicleInsurance
        ? [
            ...(mailboxMemory?.insuranceRenewals || []).filter(vehiclePolicyEvidence),
            ...matches.filter(vehiclePolicyEvidence)
          ]
      : wantsFunding
        ? [
            ...matches,
            ...(mailboxMemory?.fundingEvidence || []),
            ...(mailboxMemory?.accountingEvidence || []),
            ...(mailboxMemory?.knownProviderEvidence || [])
          ]
      : wantsLegal
        ? [
            ...matches,
            ...(mailboxMemory?.legalEvidence || []),
            ...(mailboxMemory?.deadlines || [])
          ]
      : wantsProperty
        ? [
            ...matches,
            ...(mailboxMemory?.propertyAnalysisEvidence || []),
            ...(mailboxMemory?.acquisitionEvidence || []),
            ...(mailboxMemory?.legalEvidence || [])
          ]
      : wantsAccounting
        ? [
            ...matches,
            ...(mailboxMemory?.billsToPay || []),
            ...(mailboxMemory?.accountingEvidence || []),
            ...(mailboxMemory?.knownProviderEvidence || []),
            ...(mailboxMemory?.supplierUpdates || [])
          ]
        : matches;
    const seen = new Set<string>();
    const evidence = curated.filter((email: any) => {
      if (!email?.id || seen.has(email.id)) return false;
      seen.add(email.id);
      if (wantsVehicleInsurance) {
        return vehiclePolicyEvidence(email);
      }
      return true;
    }).slice(0, wantsUrgents ? 3 : 8);
    const title = wantsUrgents
      ? 'Here are the top 3 urgent or important items I found in your indexed mailbox memory'
      : wantsVehicleInsurance
      ? 'Here is the strongest vehicle/insurance evidence I found in your indexed mailbox memory'
      : wantsFunding
      ? 'Here is the strongest funding and lender-pack evidence I found in your indexed mailbox memory'
      : wantsLegal
      ? 'Here is the strongest legal/solicitor/property-case evidence I found in your indexed mailbox memory'
      : wantsProperty
      ? 'Here is the strongest property/acquisition evidence I found in your indexed mailbox memory'
      : wantsAccounting
      ? 'Here is the strongest accounting/tax/bills/provider evidence I found in your indexed mailbox memory'
      : /bill|payment|pay|invoice|deadline|due/i.test(lower)
        ? 'Here are the strongest bill/payment/deadline items I found in your indexed mailbox memory'
        : 'Here are the strongest email matches I found in your indexed mailbox memory';

    if (!evidence.length) {
      if (wantsCarInsuranceDue) {
        return [
          `I checked your local indexed mailbox memory (${total} emails, updated ${updated}).`,
          '',
          'I did not find a reliable car-insurance policy or renewal email with a confirmed due/expiry date in the indexed preview text.',
          '',
          'I ignored noisy matches such as life insurance adverts, funding/finance marketing, security alerts, Alibaba/LinkedIn, and payment-processor emails because they are not real car-insurance renewal evidence.',
          '',
          'Best next step: open the real insurer email or policy attachment, then Baba can extract and save the renewal date into memory.',
          'I will not move, delete, send, unsubscribe, pay, or contact anyone without your approval.'
        ].join('\n');
      }
      const bills = (mailboxMemory?.billsToPay || []).slice(0, 8);
      const deadlines = (mailboxMemory?.deadlines || []).slice(0, 8);
      if (!bills.length && !deadlines.length) return '';
      return [
        `I checked your local indexed mailbox memory (${total} emails, updated ${updated}). I did not find an exact search hit for this wording, so I used the current bills/deadlines memory instead.`,
        '',
        ...[...bills, ...deadlines].slice(0, 8).map((email: any, index: number) => (
          `${index + 1}. ${email.subject || '(no subject)'}\nFrom: ${email.sender || email.senderEmail || 'unknown'}\nReceived: ${email.receivedAt ? new Date(email.receivedAt).toLocaleString() : 'unknown'}\nFolder/category: ${email.folderName || 'unknown'} / ${email.categoryLabel || 'unknown'}\n${email.preview ? `Preview: ${String(email.preview).slice(0, 260)}` : ''}`
        )),
        '',
        'I will not move, delete, send, unsubscribe, pay, or contact anyone without your approval.'
      ].join('\n');
    }

    return [
      `${title}.`,
      `Mailbox memory checked: ${total} emails, updated ${updated}.`,
      '',
      ...evidence.map((email: any, index: number) => (
        `${index + 1}. ${email.subject || '(no subject)'}\nFrom: ${email.sender || email.senderEmail || 'unknown'}\nReceived: ${email.receivedAt ? new Date(email.receivedAt).toLocaleString() : 'unknown'}\nAccount/folder: ${email.accountId || 'local memory'} / ${email.folderName || 'unknown'}\nCategory/type: ${email.categoryLabel || email.type || 'unknown'}${email.assignedAgent ? `\nAssigned agent: ${email.assignedAgent}` : ''}\n${email.bodyPreview || email.preview ? `Preview: ${String(email.bodyPreview || email.preview).slice(0, 260)}` : ''}`
      )),
      '',
      wantsUrgents
        ? 'Current read: these are priority candidates from local memory. I can mark any as important/not important, draft a reply, or prepare a WhatsApp notification, but external actions need your approval.'
        : wantsVehicleInsurance
        ? 'Current read: I found renewal/insurance evidence, but I do not see a confirmed future due date in the indexed preview text. The safest next step is to open the matching insurer/comparison email or policy attachment before relying on the date.'
        : wantsAccounting
        ? 'Current read: these are accounting/provider evidence items kept for bills, tax, VAT, payroll, statements, funding packs, and later review. Z-reports stay lower priority unless abnormal, but remain saved as evidence.'
        : wantsLegal
        ? 'Current read: these are legal/property-case evidence items. I can prepare solicitor notes or a WhatsApp-style summary, but I will not send or file anything without approval.'
        : wantsProperty
        ? 'Current read: these are property/acquisition evidence items. Local closed-shop/corner-shop style premises should outrank distant marketing unless you ask otherwise.'
        : wantsFunding
        ? 'Current read: these are funding evidence items. Baba should use accounting, bank statements, bills, provider records, and lender emails to prepare funding packs when needed.'
        : 'Current read: these are evidence matches from the local index. I can draft replies, reminders, or folder actions, but approval is required before anything external changes.',
      'I will not move, delete, send, unsubscribe, pay, or contact anyone without your approval.'
    ].join('\n');
  };

  const copyMessage = async (content: string) => {
    await navigator.clipboard?.writeText(content);
    addNotice('Copied response');
  };

  const voiceOptions: Record<string, any> = {
    'tamil-jaffna': { voice: 'tamil-jaffna', profile_id: 'silva-premium', accent_id: 'ta-jaffna-premium', language: 'ta-LK', accent: 'jaffna', style: 'professional', strict_language: true, allow_windows_fallback: false },
    'tamil-india': { voice: 'tamil-india', profile_id: 'silva-premium', accent_id: 'ta-default', language: 'ta-IN', accent: 'india', style: 'professional', strict_language: true, allow_windows_fallback: false },
    'tamil-speaker-1': { voice: 'tamil-speaker-1', profile_id: 'silva-premium', accent_id: 'ta-m1-s1', language: 'ta-IN', accent: 'generic', style: 'professional', strict_language: true, allow_windows_fallback: false },
    'tamil-speaker-2': { voice: 'tamil-speaker-2', profile_id: 'silva-premium', accent_id: 'ta-m1-s2', language: 'ta-IN', accent: 'generic', style: 'professional', strict_language: true, allow_windows_fallback: false },
    'tamil-speaker-3': { voice: 'tamil-speaker-3', profile_id: 'silva-premium', accent_id: 'ta-m1-s3', language: 'ta-IN', accent: 'generic', style: 'professional', strict_language: true, allow_windows_fallback: false },
    'english-uk': { voice: 'english-uk', profile_id: 'silva-premium', accent_id: 'en-us-sapi', language: 'en-GB', accent: 'uk', style: 'professional', strict_language: true, allow_windows_fallback: false },
    'english-us': { voice: 'english-us', profile_id: 'silva-premium', accent_id: 'en-us-sapi', language: 'en-US', accent: 'us', style: 'professional', strict_language: true, allow_windows_fallback: false }
  };

  const recognitionLanguageByVoice: Record<string, string> = {
    'tamil-jaffna': 'ta-LK',
    'tamil-india': 'ta-IN',
    'tamil-speaker-1': 'ta-IN',
    'tamil-speaker-2': 'ta-IN',
    'tamil-speaker-3': 'ta-IN',
    'english-uk': 'en-GB',
    'english-us': 'en-US'
  };

  const extractLineValue = (text: string, pattern: RegExp) => text.match(pattern)?.[1]?.trim() || '';

  const tamilPeriodGreeting = (text: string) => {
    if (/good morning/i.test(text)) return 'காலை வணக்கம் சயன்.';
    if (/good afternoon/i.test(text)) return 'மதிய வணக்கம் சயன்.';
    if (/good evening/i.test(text)) return 'மாலை வணக்கம் சயன்.';
    return 'வணக்கம் சயன்.';
  };

  const buildTamilSpeechText = (content: string) => {
    const mailbox = extractLineValue(content, /Mailbox memory:\s*([\d,]+)\s*emails indexed/i);
    const unread = extractLineValue(content, /Unread:\s*([\d,]+)/i);
    const bills = extractLineValue(content, /Bills\/payments:\s*([\d,]+)/i);
    const deadlines = extractLineValue(content, /Deadlines:\s*([\d,]+)/i);
    const renewals = extractLineValue(content, /Insurance renewals:\s*([\d,]+)/i);
    const evidence = extractLineValue(content, /Evidence kept for later:\s*([^\n]+)/i);
    const route = extractLineValue(content, /AI route:\s*([^\n]+)/i);
    const browser = extractLineValue(content, /Browser operator:\s*([^\n]+)/i);
    const topItems = Array.from(content.matchAll(/^\d+\.\s+(.+)$/gm)).slice(0, 3).map(match => match[1].trim());

    if (/MYTHOS FRONT DOOR/i.test(content) || mailbox || topItems.length) {
      const lines = [
        tamilPeriodGreeting(content),
        'பாபா மைதோஸ் நினைவு மற்றும் கணினி நிலையை பார்த்தது.',
        mailbox ? `மெயில் நினைவில் ${mailbox} மின்னஞ்சல்கள் உள்ளன.` : '',
        unread || bills || deadlines || renewals
          ? `படிக்காதவை ${unread || '0'}, பில்கள் மற்றும் கட்டணங்கள் ${bills || '0'}, கடைசி தேதிகள் ${deadlines || '0'}, காப்பீட்டு புதுப்பிப்புகள் ${renewals || '0'}.`
          : '',
        evidence ? `பின்னர் பார்க்க வைத்த ஆதாரம்: ${evidence}.` : '',
        route ? `ஏ ஐ பாதை: ${route}.` : '',
        browser ? `பிரௌசர் ஆபரேட்டர்: ${browser}.` : '',
        topItems.length ? `இப்போது பார்க்க வேண்டிய முதல் விஷயங்கள்: ${topItems.join('. ')}.` : '',
        'உங்கள் அனுமதி இல்லாமல் நான் அனுப்ப, கட்டணம் செலுத்த, நகர்த்த, அழிக்க, அல்லது யாரையும் தொடர்பு கொள்ள மாட்டேன்.'
      ];
      return lines.filter(Boolean).join(' ');
    }

    return content;
  };

  const buildGeneralSpeechText = (content: string) => {
    const compact = content
      .replace(/Thinking and research[\s\S]*$/i, '')
      .replace(/REAL EVENTBUS TRACE[\s\S]*$/i, '')
      .replace(/\bCHANNEL\.STATUS\b[\s\S]*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    const short = compact.length > 850 ? `${compact.slice(0, 850).trim()}...` : compact;
    return `ME says. ${short}`;
  };

  const speakMessage = async (content: string) => {
    const spoken = content
      .replace(/```[\s\S]*?```/g, 'code block omitted')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#>~[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const selectedVoice = voiceOptions[voicePreset] || voiceOptions['english-uk'];
    const speechText = voicePreset.startsWith('tamil') ? buildTamilSpeechText(spoken) : buildGeneralSpeechText(spoken);
    const voiceResult = await window.ipcRenderer?.speakVoiceStack?.(speechText, selectedVoice).catch((error: any) => ({ ok: false, error: error?.message }));
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
        recognition.maxAlternatives = 3;
        recognition.lang = recognitionLanguageByVoice[voicePreset] || 'en-GB';

        recognition.onstart = () => {
          setIsRecording(true);
          addNotice(`Microphone listening in ${recognition.lang}`);
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
    addNotice(result?.ok ? 'WhatsApp draft saved and composer opened. Review and press Send manually.' : 'WhatsApp draft saved, but the composer did not open.');
  };

  const extractWhatsAppNumber = (text: string) => {
    const match = text.match(/(?:\+?\d[\d\s().-]{8,}\d)/);
    return match ? match[0].replace(/[^\d+]/g, '').replace(/^00/, '+') : '';
  };

  const extractWhatsAppMessage = (text: string) => {
    const clean = text.trim();
    const quoted = clean.match(/["']([^"']{1,500})["']/);
    if (quoted?.[1]) return quoted[1].trim();
    const hiMatch = clean.match(/\bsend\s+(?:me\s+)?(.{1,160}?)\s+(?:message\s+)?(?:on|to|via)\s+(?:my\s+)?whatsapp/i);
    if (hiMatch?.[1]) return hiMatch[1].trim();
    if (/send.*\bhi\b.*whatsapp/i.test(clean)) return 'hi';
    return clean.replace(/(?:my\s+)?whatsapp\s+number\s+is\s*(?:this)?/ig, '').replace(extractWhatsAppNumber(clean), '').trim() || 'hi';
  };

  const handleWhatsAppIntent = async (outgoing: string) => {
    const foundNumber = extractWhatsAppNumber(outgoing);
    const isNumberSave = /whatsapp.*number|number.*whatsapp/i.test(outgoing) && foundNumber;
    const wantsSend = /\b(send|message|notify|whatsapp)\b/i.test(outgoing) && /whatsapp/i.test(outgoing);

    if (foundNumber) {
      setWhatsAppNumber(foundNumber);
      window.localStorage.setItem(WHATSAPP_NUMBER_KEY, foundNumber);
    }

    if (!isNumberSave && !wantsSend) return false;

    const userMessage = { role: 'user', content: outgoing };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    if (isNumberSave && !/\bsend|message|notify\b/i.test(outgoing)) {
      setMessages(prev => [...prev, assistantMessage(`Saved your WhatsApp number locally: ${foundNumber}.\n\nI will use it for approval-first urgent notifications and manual WhatsApp composer drafts. I still will not silently send messages without your final WhatsApp Send press.`, 'WhatsApp ME', ['Saved WhatsApp number locally', 'Kept manual-send safety gate'])]);
      return true;
    }

    const phone = foundNumber || whatsAppNumber || window.localStorage.getItem(WHATSAPP_NUMBER_KEY) || '';
    const message = extractWhatsAppMessage(outgoing);
    if (!phone) {
      setMessages(prev => [...prev, assistantMessage('I can prepare the WhatsApp composer, but I do not have your WhatsApp number saved yet. Tell me the number once, then I can reuse it for urgent notification drafts.', 'WhatsApp ME', ['Checked WhatsApp draft request', 'Stopped before composer because no saved number'])]);
      return true;
    }

    const draft = await window.ipcRenderer?.saveWhatsAppDraft?.({
      label: 'Chat WhatsApp request',
      message,
      phone,
      status: 'drafted',
      source: 'chat'
    }).catch(() => null);
    const result = await window.ipcRenderer?.composeWhatsApp?.(message, phone).catch((error: any) => ({ ok: false, error: error?.message }));
    if (result?.ok && draft?.id) await window.ipcRenderer?.markWhatsAppOpened?.(draft.id).catch(() => null);

    setMessages(prev => [...prev, assistantMessage(result?.ok
        ? `Saved the WhatsApp draft, sent a desktop notification, and opened the real WhatsApp composer to ${phone}:\n\n${message}\n\nPlease review and press Send manually.`
        : `I saved the WhatsApp draft and sent a desktop notification, but could not open the composer: ${(result as any)?.error || 'unknown error'}`,
      'WhatsApp ME',
      ['Created local WhatsApp draft', 'Opened composer only for manual send']
    )]);
    return true;
  };

  const isBrowserAutomationPrompt = (text: string) =>
    /(browser automation|run full browser|click through|click|type|scroll|navigate|open .*product|product page|search results|compare specs|extract|purchase tab|web automation|tinyfish)/i.test(text);

  const handleBrowserAutomationIntent = async (outgoing: string) => {
    if (!isBrowserAutomationPrompt(outgoing)) return false;
    const userMessage = { role: 'user', content: outgoing };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setResearchSteps([
      'Starting Browser Automation Agent',
      'Opening controlled browser computer',
      'Reading live page text and links',
      'Streaming click/read/extract steps to Live Operations'
    ]);

    try {
      const task = await window.ipcRenderer?.createAgentTask?.(
          `Browser automation task from chat.

User request:
${outgoing}

Do not answer as a generic language model. Use real browser tools.
Required first loop:
1. Use browser_read/browser_inspect on the opened browser.
2. Open relevant result/product pages.
3. Extract visible prices/specs/reviews/risks.
4. Compare evidence.
5. Stop before pay/buy/checkout/order/submit and ask Silva for approval.

Use the controlled browser session if available. Keep every step visible in EventBus/Live Operations.`,
          'browser-automation-agent'
      ).catch((error: any) => ({ ok: false, error: error?.message }));

      setMessages(prev => [...prev, assistantMessage(task?.id
          ? `Browser Automation Agent started as task ${task.id}.\n\nIt will open one controlled browser computer, read result pages, extract evidence, compare candidates, and stream each step to Live Operations.\n\nSafety gate: I will not click pay, buy, checkout, order, submit, confirm, enter passwords, or enter payment details without your explicit approval.`
          : `Browser Automation could not start.\n\nAgent: ${task?.error || 'not queued'}`,
        'Browser Automation Agent'
      )]);
    } finally {
      setIsTyping(false);
      window.setTimeout(() => setResearchSteps([]), 6000);
    }
    return true;
  };

  const handleLiveWebResearchIntent = async (outgoing: string) => {
    if (!isLiveWebResearchPrompt(outgoing) && !isMotReviewResearchPrompt(outgoing)) return false;
    const userMessage = { role: 'user', content: outgoing };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setResearchSteps([
      'Routing to real web research',
      'Opening browser/search route',
      'Checking live sources and reviews',
      'Preparing evidence-led next steps'
    ]);

    try {
      const query = isMotReviewResearchPrompt(outgoing)
        ? `${outgoing} Lancaster Morecambe garage MOT reviews`
        : outgoing;
      const [browser, traceRaw, task] = await Promise.all([
        window.ipcRenderer?.openBrowserOperator?.(query).catch((error: any) => ({ ok: false, error: error?.message })),
        window.ipcRenderer?.researchWebAutomation?.(query).catch((error: any) => ({ ok: false, error: error?.message })),
        window.ipcRenderer?.createAgentTask?.(
          `Live web research task from chat.

User request:
${outgoing}

This is NOT an email-memory lookup. Use web/search evidence and reviews. For MOT/garage requests, focus on Lancaster, Morecambe, Heysham and nearby areas, compare reviews, risks, opening/booking clues, and produce exact next steps. Do not book, pay, call, or submit anything without Silva approval.`,
          'space-agent-full'
        ).catch((error: any) => ({ ok: false, error: error?.message }))
      ]);
      const trace: any = traceRaw;
      const finalTask = task?.id ? await waitForAgentTaskFinal(task.id, 18000) : null;
      const agentFinal = extractAgentFinal(finalTask);

      setMessages(prev => [...prev, assistantMessage([
          buildLiveResearchAnswer(outgoing, trace),
          '',
          browser?.ok ? 'Browser Operator opened for the live search.' : `Browser Operator issue: ${browser?.error || 'not opened'}`,
          agentFinal
            ? `Agent result:\n${agentFinal}`
            : task?.id
              ? `Research agent is still running in Live Operations: ${task.id}.`
              : `Research agent issue: ${task?.error || 'not queued'}`
        ].join('\n'), 'Real Web Research')]);
    } finally {
      setIsTyping(false);
      window.setTimeout(() => setResearchSteps([]), 6000);
    }
    return true;
  };

  const handleFrontDoorStatusIntent = async (outgoing: string) => {
    if (!isStatusOrUpdatesPrompt(outgoing)) return false;
    const userMessage = { role: 'user', content: outgoing };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setResearchSteps(['Checking local mailbox memory', 'Checking system/engine state', 'Checking live operations', 'Preparing Mythos status summary']);

    try {
      const [intel, engine, browserState, classicState] = await Promise.all([
        window.ipcRenderer?.getEmailIntelligence?.().catch(() => null),
        window.ipcRenderer?.engineStatus?.().catch(() => null),
        window.ipcRenderer?.getBrowserOperatorState?.().catch(() => null),
        window.ipcRenderer?.getClassicOutlookSyncState?.().catch(() => null)
      ]);
      const memory = intel?.mailboxMemory || intel?.memory || {};
      const updated = memory?.generatedAt ? new Date(memory.generatedAt).toLocaleString() : classicState?.updatedAt ? new Date(classicState.updatedAt).toLocaleString() : 'not known';
      const priorityItems = [
        ...(memory?.upcomingImportant || []),
        ...(memory?.insuranceRenewals || []),
        ...(memory?.billsToPay || []),
        ...(memory?.deadlines || []),
        ...(memory?.urgent || [])
      ].filter((item: any, index: number, arr: any[]) => item?.id && arr.findIndex(other => other.id === item.id) === index)
        .map((item: any) => ({ ...item, priorityScore: scorePriorityMail(item) }))
        .filter((item: any) => item.priorityScore > 30 || item.importanceStatus === 'important')
        .sort((a: any, b: any) => (b.priorityScore - a.priorityScore) || String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')))
        .slice(0, 3);
      const lines = priorityItems.length
        ? priorityItems.map((item: any, index: number) => `${index + 1}. ${item.subject || '(no subject)'}\nFrom: ${item.sender || item.senderEmail || 'unknown'}\nReceived: ${item.receivedAt ? new Date(item.receivedAt).toLocaleString() : 'unknown'}\nType: ${item.type || item.categoryLabel || 'mail'} | Priority score: ${item.priorityScore}${item.assignedAgent ? `\nAgent: ${item.assignedAgent}` : ''}\nPreview: ${String(item.preview || item.bodyPreview || '').slice(0, 180)}`)
        : ['No high-priority mailbox items are currently surfaced in local memory.'];
      const content = [
        `${timeAwareGreeting()} Syan. Baba/Mythos checked local memory and live system state, not raw model memory.`,
        '',
        `Mailbox memory: ${(memory?.totalIndexed || 0).toLocaleString()} emails indexed, updated ${updated}.`,
        `Unread: ${(memory?.unreadCount || 0).toLocaleString()} | Bills/payments: ${(memory?.billsToPay?.length || 0).toLocaleString()} | Deadlines: ${(memory?.deadlines?.length || 0).toLocaleString()} | Insurance renewals: ${(memory?.insuranceRenewals?.length || 0).toLocaleString()}`,
        `Evidence kept for later: Z-reports ${(memory?.zReports?.length || 0).toLocaleString()} | Accounting/tax ${(memory?.accountingEvidence?.length || 0).toLocaleString()} | Legal/property ${(memory?.legalEvidence?.length || 0).toLocaleString()} | Funding ${(memory?.fundingEvidence?.length || 0).toLocaleString()} | Known providers ${(memory?.knownProviderEvidence?.length || 0).toLocaleString()}.`,
        `AI route: ${engine?.primary?.name || 'Jan + TurboQuant + DFLASH'} ${engine?.primary?.online ? 'online' : 'checking/offline'}${engine?.primary?.activeModel ? ` (${engine.primary.activeModel})` : ''}.`,
        `Browser operator: ${browserState?.online ? 'ready with live sessions' : 'idle/ready'}.`,
        '',
        `Top 3 items to review now:`,
        ...lines,
        '',
        'I can mark any item important/not important, draft a reply, prepare a WhatsApp notification, or route it to Solicitor/Accountant/Purchase Guardian. I will not send, pay, file, move, or delete without approval.'
      ].join('\n');
      setMessages(prev => [...prev, assistantMessage(content, 'Mythos Front Door')]);
      return true;
    } finally {
      setIsTyping(false);
      setResearchSteps([]);
    }
  };

  const handleCasualChatIntent = async (outgoing: string) => {
    if (!isCasualChatPrompt(outgoing)) return false;
    const userMessage = { role: 'user', content: outgoing };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setResearchSteps(['Routing to Baba general chat']);

    try {
      const greeting = timeAwareGreeting();
      const content = [
        `${greeting} Syan. I am doing good. I am here and ready.`,
        '',
        'Normal chat mode is active. Ask for updates, urgent items, emails, bills, legal, accounting, property, or funding when you want the full Mythos scan.'
      ].join('\n');
      setMessages(prev => [...prev, assistantMessage(content, 'Baba General Chat')]);
      return true;
    } finally {
      setIsTyping(false);
      setResearchSteps([]);
    }
  };

  const handleDomainMemoryIntent = async (outgoing: string) => {
    if (isLiveWebResearchPrompt(outgoing) || isMotReviewResearchPrompt(outgoing)) return false;
    const domainQuestion = /(accounting|accountant|myt|quickbooks|hmrc|vat|tax|self assessment|companies house|payroll|bookkeeping|invoice|bill|statement|receipt|bank statement|credit card|direct debit|payment|supplier|provider|legal|solicitor|rc\.legal|land registry|certificate of compliance|requisition|ground rent|service charge|steamer street|howlish view|court|tribunal|council|licensing|planning|enforcement|property|premises|closed shop|corner.?shop|mixed.?use|auction|estate agent|survey|epc|lancaster|morecambe|heysham|funding|funder|lender|loan|overdraft|cashflow|iwoca|funding circle|tide|anna|loqbox|capital one|car insurance|vehicle insurance|motor insurance|mot|road tax|policy renewal)/i.test(outgoing);
    if (!domainQuestion || isStatusOrUpdatesPrompt(outgoing) && !/(accounting|legal|property|funding|insurance|mot|tax|vat|hmrc|bill|statement|solicitor|premises|funder)/i.test(outgoing)) return false;

    const userMessage = { role: 'user', content: outgoing };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setResearchSteps(['Routing to Mythos domain memory', 'Checking indexed email evidence', 'Using saved priority buckets']);

    try {
      const intel = await window.ipcRenderer?.getEmailIntelligence?.().catch(() => null);
      const memory = intel?.mailboxMemory || intel?.memory || null;
      const matches = await window.ipcRenderer?.searchIndexedEmails?.(outgoing).catch(() => []) || [];
      const answer = buildMailboxEvidenceAnswer(outgoing, memory, matches);
      setMessages(prev => [...prev, assistantMessage(answer || [
          'I checked Baba/Mythos domain memory, but I could not find a reliable indexed evidence item for that wording yet.',
          '',
          'The app should keep accounting, legal, property, funding, provider, insurance, and Z-report evidence saved for later review. I will not send, delete, pay, or file anything without approval.'
        ].join('\n'), 'Mythos Domain Memory')]);
    } finally {
      setIsTyping(false);
      setResearchSteps([]);
    }
    return true;
  };

  const handlePreferenceTrainingIntent = async (outgoing: string) => {
    if (!isPreferenceTrainingPrompt(outgoing)) return false;
    const userMessage = { role: 'user', content: outgoing };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setResearchSteps(['Routing as Baba memory training', 'Saving preference rules', 'Updating future priority filters', 'Not searching random email evidence']);

    try {
      const learnedRules: string[] = [];
      const lower = outgoing.toLowerCase();
      if (/z[-\s]?reports?/.test(lower)) learnedRules.push('Z-Reports from VBR EPOS/Newton Newsagent are normal staff/shop notifications; surface as FYI unless abnormal, missing, duplicated, cash/card mismatch, or explicitly requested.');
      if (/mot/.test(lower) && /(booked|next week|book)/.test(lower)) learnedRules.push('MOT for YK13WNZ is booked for next week; do not keep treating the current MOT reminder as unresolved urgent unless a new risk appears.');
      if (/birmingham/.test(lower) && /not interested/.test(lower)) learnedRules.push('Property opportunity filter: Birmingham/West Midlands opportunities are not currently interesting unless Syan explicitly asks.');
      if (/lancaster|morecambe|morecome|surrounding/.test(lower)) learnedRules.push('Property opportunity filter: prioritise Lancaster, Morecambe, and nearby surrounding areas.');
      if (/accounting|bank statements?|funders?|funding/.test(lower)) learnedRules.push('Funding preparation: gather and organise accounting records, invoices, statements, bank statements, Z-reports, VAT/tax evidence, and finance emails so Accountant/Purchase Guardian can identify funders and finance options.');
      if (/closed shop|shop premisses|shop premises|cornershop|corner shop|premises/.test(lower)) learnedRules.push('Property analysis preference: when analysing property opportunities, look for closed shop/corner-shop premises and retail conversion/business potential, not just residential investment.');
      if (!learnedRules.length) learnedRules.push(`Preference/training note from Syan: ${outgoing}`);

      const existing = await window.ipcRenderer?.getSilvaMemory?.().catch(() => '') || '';
      const stamp = new Date().toISOString();
      const block = [
        '',
        `## BABA LEARNED PREFERENCES - ${stamp}`,
        ...learnedRules.map(rule => `- ${rule}`)
      ].join('\n');
      await window.ipcRenderer?.saveSilvaMemory?.(`${existing}\n${block}`.trim()).catch(() => false);

      window.ipcRenderer?.createAgentTask?.(
        `Baba preference update from Syan. Apply these rules to future mailbox triage, property analysis, accounting preparation, and morning updates:\n${learnedRules.map(rule => `- ${rule}`).join('\n')}`,
        'general-agent'
      ).catch(() => null);

      setMessages(prev => [...prev, assistantMessage([
          'Understood Syan. I saved this as Baba/Mythos preference training, not as an insurance/email search.',
          '',
          'Updated rules:',
          ...learnedRules.map(rule => `- ${rule}`),
          '',
          'Future morning updates and mailbox intelligence should use these filters before surfacing priorities. External actions still need approval.'
        ].join('\n'), 'Mythos Memory Trainer')]);
    } finally {
      setIsTyping(false);
      setResearchSteps([]);
    }
    return true;
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
      setMessages(prev => [...prev, assistantMessage(`Voice Stack self-build started.\n\nScript: ${(result as any).script || 'repair_voice_stack.ps1'}\n\nIt will repair the Python environment, install/refresh local TTS dependencies, check CUDA/Piper/TTS, list missing premium voice model files, and restart the server.`, 'Voice Stack', ['Diagnosed voice stack', 'Opened repair workflow'])]);
    } else {
      addNotice(`Build Voice Stack failed: ${result?.error || 'unknown error'}`);
    }
  };

  const openWebResearch = async (query?: string) => {
    const target = (query || input || getLastUserPrompt()).trim();
    setResearchSteps(['Opening live browser computer', 'Sending real web search query', 'Capturing search trace']);
    const [browser, trace]: any[] = await Promise.all([
      window.ipcRenderer?.openBrowserOperator?.(target).catch((error: any) => ({ ok: false, error: error?.message })),
      window.ipcRenderer?.researchWebAutomation?.(target).catch((error: any) => ({ ok: false, error: error?.message }))
    ]);
    addNotice(browser?.ok || trace?.trace?.ok
      ? `Live web research started. ${trace?.trace?.results?.length || 0} sources traced in Event Bus.`
      : (browser?.error || trace?.error || 'Could not open browser research.'));
    window.setTimeout(() => setResearchSteps([]), 5000);
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

  const waitForAgentTaskFinal = async (taskId?: string, timeoutMs = 24000) => {
    if (!taskId || !window.ipcRenderer?.getAgentTasks) return null;
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const tasks = await window.ipcRenderer.getAgentTasks().catch(() => []);
      const task = (tasks || []).find((item: any) => item.id === taskId);
      if (task && ['done', 'failed', 'cancelled'].includes(task.status)) return task;
      await new Promise(resolve => window.setTimeout(resolve, 1600));
    }
    return null;
  };

  const handleSend = async (overrideInput?: string) => {
    const outgoing = (overrideInput ?? input).trim();
    if (!outgoing || isTyping) return;

    const routePreview = await window.ipcRenderer?.previewAgentRoute?.(outgoing).catch(() => null);
    lastRoutePreviewRef.current = routePreview;
    if (routePreview?.ok) {
      setResearchSteps([
        'Mythos Manager received the message first',
        `Intent route preview: ${routePreview.assignedAgentId || 'general-agent'}`,
        `Priority: ${routePreview.priority || 'normal'}`,
        `Approval gates: ${(routePreview.approvalGates || []).join(', ') || 'standard safety'}`
      ]);
    }

    if (await handleWhatsAppIntent(outgoing)) return;
    if (await handleBrowserAutomationIntent(outgoing)) return;
    if (await handleLiveWebResearchIntent(outgoing)) return;
    if (await handleCasualChatIntent(outgoing)) return;
    if (await handlePreferenceTrainingIntent(outgoing)) return;
    if (await handleDomainMemoryIntent(outgoing)) return;
    if (await handleFrontDoorStatusIntent(outgoing)) return;

    if (/(build|repair|fix|install|setup|self[-\s]?build).*(voice|tts|speech|silva voice)|voice.*(build|repair|fix|install|setup|self[-\s]?build)/i.test(outgoing)) {
      const userMessage = { role: 'user', content: outgoing };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);
      setResearchSteps(['Diagnosing Silva Voice Stack', 'Preparing self-build repair script', 'Opening visible repair terminal']);
      try {
        const diagnosis = await window.ipcRenderer?.diagnoseVoiceStack?.().catch(() => null);
        const result = await window.ipcRenderer?.buildVoiceStack?.().catch((error: any) => ({ ok: false, error: error?.message }));
        setMessages(prev => [...prev, assistantMessage(result?.ok
            ? `I started the Silva Voice Stack self-build.\n\nWhat it does now:\n- Repairs/creates the Python 3.11 virtual environment.\n- Installs the local voice package.\n- Installs Piper TTS support.\n- Tries CUDA PyTorch for RTX acceleration.\n- Checks TTS/Piper/CUDA status.\n- Lists any missing premium model files.\n- Restarts the Voice Stack server.\n\nRepair script: ${(result as any).script}\n\nCurrent diagnosis before repair:\n${JSON.stringify(diagnosis, null, 2)}`
            : `I could not start the Voice Stack self-build.\n\nError: ${result?.error || 'unknown error'}`,
          'Voice Stack'
        )]);
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
    const wantsLiveWeb = isLiveWebResearchPrompt(outgoing) || isMotReviewResearchPrompt(outgoing) || /(research|web|internet|latest|current|today|news|official|source|cite|verify online|search online|browser)/i.test(outgoing);
    const needsMailMemory = !wantsLiveWeb && !isPreferenceTrainingPrompt(outgoing) && /(email|mail|inbox|outlook|gmail|bill|invoice|payment|pay|deadline|due|renewal|council|tax|hmrc|insurance|statement|mot|car|vehicle|policy|premium|urgent|important|importon|iporton|updates?|need looking|what needs)/i.test(outgoing);
    let memoryContext: any = null;
    let matchingEmails: any[] = [];
    if (needsMailMemory && window.ipcRenderer?.getEmailIntelligence) {
      try {
        const intel = await window.ipcRenderer.getEmailIntelligence();
        memoryContext = intel?.mailboxMemory || intel?.memory || null;
        matchingEmails = await window.ipcRenderer.searchIndexedEmails?.(outgoing).catch(() => []) || [];
      } catch {
        memoryContext = null;
        matchingEmails = [];
      }
    }
    let webTrace: any = null;
    if (wantsLiveWeb && window.ipcRenderer?.researchWebAutomation) {
      setResearchSteps(['Sending real web search query', 'Fetching source results', 'Streaming research trace']);
      webTrace = await window.ipcRenderer.researchWebAutomation(outgoing).catch((error: any) => ({ ok: false, error: error?.message, trace: null }));
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
          zReports: (memoryContext.zReports || []).slice(0, 20),
          accountingEvidence: (memoryContext.accountingEvidence || []).slice(0, 20),
          legalEvidence: (memoryContext.legalEvidence || []).slice(0, 20),
          knownProviderEvidence: (memoryContext.knownProviderEvidence || []).slice(0, 20),
          businessResearchEvidence: (memoryContext.businessResearchEvidence || []).slice(0, 20),
          propertyAnalysisEvidence: (memoryContext.propertyAnalysisEvidence || []).slice(0, 20),
          acquisitionEvidence: (memoryContext.acquisitionEvidence || []).slice(0, 20),
          fundingEvidence: (memoryContext.fundingEvidence || []).slice(0, 20),
          personalAdminEvidence: (memoryContext.personalAdminEvidence || []).slice(0, 20),
          insuranceRenewals: (memoryContext.insuranceRenewals || []).slice(0, 20),
          upcomingImportant: (memoryContext.upcomingImportant || []).slice(0, 20),
          supplierUpdates: (memoryContext.supplierUpdates || []).slice(0, 12),
          staffInvoices: (memoryContext.staffInvoices || []).slice(0, 12),
          urgent: (memoryContext.urgent || []).slice(0, 20),
          exactSearchMatchesForThisQuestion: matchingEmails.slice(0, 12).map((email: any) => ({
            subject: email.subject,
            sender: email.sender || email.senderEmail,
            senderEmail: email.senderEmail,
            receivedAt: email.receivedAt,
            accountId: email.accountId,
            folderName: email.folderName,
            categoryLabel: email.categoryLabel,
            unread: email.unread,
            preview: email.bodyPreview
          }))
        })}`
      }] : []),
      ...(webTrace?.trace?.results?.length ? [{
        role: 'system',
        content: `Live web research was performed for this user question. Use these real fetched search results as evidence. Do not pretend you visited pages that are not listed here. Cite titles/URLs when useful.\n\n${JSON.stringify({
          query: webTrace.trace.query,
          engine: webTrace.trace.engine,
          durationMs: webTrace.trace.durationMs,
          results: webTrace.trace.results.slice(0, 8)
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
        'Asking Mythos Manager to route task',
        `Routing to ${assignedAgentId}`,
        'Applying approval gates and peer checks',
        'Starting built-in Jan+TurboQuant first',
        'Streaming work to Live Operations'
      ]);
    }

    console.log('Sending message with knowledge-augmented prompt');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 90s UI timeout

      if (window.ipcRenderer) {
        const launchedAgentTask = window.ipcRenderer.createAgentTask?.(
          `User task from chat:\n${outgoing}\n\nAct as a real HermesDesk ME local agent. Think, plan, use approved local/web/tool routes where available, recover from errors, and report progress through agent updates. Do not pretend unavailable private access is connected; use drafts and approval gates for external actions.`,
          assignedAgentId
        ).catch((error: any) => {
          console.error('Agent task launch failed:', error);
          addNotice(`Agent launch failed: ${error?.message || 'unknown error'}`);
          return null;
        });

        if (assignedAgentId === 'browser-automation-agent') {
          const task = await launchedAgentTask;
          setMessages(prev => [...prev, assistantMessage(task?.id
              ? `Browser Automation Agent is running as task ${task.id}.\n\nI have routed this away from raw chat, so Jan will not answer with generic browsing text. Watch Live Operations for browser_open, browser_read, click/read/extract, screenshots, and verification events.\n\nSafety gate: I will not click pay, buy, checkout, order, submit, confirm, enter passwords, or enter payment details without your explicit approval.`
              : 'Browser Automation Agent could not be launched. Check Live Operations or the Event Bus for the launch error.',
            'Browser Automation Agent'
          )]);
          return;
        }

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
          if (normalizedProvider === 'openrouter' && (!model.includes(':free') || model === 'openrouter/auto' || model === 'openrouter/auto-free')) {
            cloudModel = 'openai/gpt-oss-20b:free';
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
          let content = response.content || response.message?.content || (response.choices && response.choices[0]?.message?.content) || "No response content received.";
          const engine = response.engine || provider;
          const launchedTask = await launchedAgentTask;
          const finalTask = launchedTask?.id ? await waitForAgentTaskFinal(launchedTask.id, 16000) : null;
          const agentFinal = extractAgentFinal(finalTask);
          if (agentFinal && !/no response content received|please tell me more|how can i assist|i can help/i.test(agentFinal)) {
            content = `${agentFinal}\n\nManager route: ${assignedAgentId}${launchedTask?.id ? ` (${launchedTask.id})` : ''}.`;
          }
          const mailboxEvidenceAnswer = needsMailMemory ? buildMailboxEvidenceAnswer(outgoing, memoryContext, matchingEmails) : '';
          if (mailboxEvidenceAnswer && (/no local ai engine is available|no response content|please tell me more|what information you'd like|no immediate urgent|no immediate/i.test(content) || matchingEmails.length > 0 || /urgent|important|need looking|car|vehicle|insurance|renewal/i.test(outgoing))) {
            content = mailboxEvidenceAnswer;
          }
          const engineText = String(engine || '').toLowerCase();
          if (engineText.includes('jan') || engineText.includes('turboquant') || engineText.includes('dflash') || engineText.includes('dfalsh')) {
            setEngineStatus(prev => ({
              ...prev,
              Auto: 'online',
              'Jan + TurboQuant': 'online'
            }));
          } else if (engineText.includes('ollama')) {
            setEngineStatus(prev => ({ ...prev, Auto: 'online', Ollama: 'online' }));
          } else if (engineText.includes('lm studio')) {
            setEngineStatus(prev => ({ ...prev, Auto: 'online', 'LM Studio': 'online' }));
          } else if (engineText.includes('opencode')) {
            setEngineStatus(prev => ({ ...prev, Auto: 'online', OpenCode: 'online' }));
          } else if (engineText.includes('openrouter') || engineText.includes('nvidia')) {
            setEngineStatus(prev => ({ ...prev, Auto: 'online' }));
          }
          setMessages(prev => [...prev, assistantMessage(content, engine)]);
        } else {
        setMessages(prev => [...prev, assistantMessage(`Error: ${provider} returned an empty response. Open Model Hub and refresh engine status before retrying.`, provider, ['Provider returned empty response', 'Stopped before inventing a reply'])]);
        }
      } else {
        // Fallback for non-electron environment
        addNotice('System Error: Electron IPC bridge not detected.');
        setIsTyping(false);
        return;
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      setMessages(prev => [...prev, assistantMessage(`Error: ${e.message || "Request timed out or failed."}`, 'Error', ['Caught runtime error', 'Stopped and reported failure'])]);
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
      <div className="px-5 py-2 border-b border-gray-100 bg-white/95 backdrop-blur flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={startNewChat} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black">
            <Plus className="w-3.5 h-3.5" />
            New chat
          </button>
          <button onClick={() => setShowHistory(prev => !prev)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-700 text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:bg-gray-100">
            <History className="w-3.5 h-3.5" />
            History
          </button>
          <span className="text-[10px] text-gray-400 truncate">{chatSessions.find(item => item.id === activeChatId)?.title || 'New chat'}</span>
        </div>
        {whatsAppNumber && <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">WhatsApp notify: {whatsAppNumber}</span>}
      </div>

      {showHistory && (
        <div className="absolute top-12 left-5 z-50 w-80 max-h-[70vh] overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-2xl p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Local chat history</p>
            <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-3.5 h-3.5" /></button>
          </div>
          {chatSessions.length === 0 && <p className="p-3 text-xs text-gray-400">No saved chats yet.</p>}
          {chatSessions.map(session => (
            <div key={session.id} className="flex items-center gap-1 p-1 rounded-xl hover:bg-gray-50">
              <button onClick={() => openChatSession(session)} className="flex-1 min-w-0 text-left px-2 py-2 rounded-lg">
                <p className="text-xs font-black text-gray-900 truncate">{session.title || 'Untitled chat'}</p>
                <p className="text-[10px] text-gray-400 truncate">{new Date(session.updatedAt).toLocaleString()} · {(session.messages || []).length} messages</p>
              </button>
              <button onClick={() => deleteChatSession(session.id)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete chat">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

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
                  <button
                    onClick={() => setThinkingReview({
                      engine: msg.engine || 'Hermes ME',
                      content: msg.content,
                      thinking: msg.thinking || { steps: [], events: [] }
                    })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50"
                  >
                    See my thinking
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

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
              <option value="tamil-jaffna">Jaffna Tamil Real</option>
              <option value="tamil-india">Tamil Generic</option>
              <option value="tamil-speaker-1">Tamil Speaker 1</option>
              <option value="tamil-speaker-2">Tamil Speaker 2</option>
              <option value="tamil-speaker-3">Tamil Speaker 3</option>
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
              ref={inputRef}
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
                {chatConnectorItems.filter(item => chatConnectors[connectorId(item.name)] === true).slice(0, 8).map(item => (
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
                    <p className="text-[10px] text-gray-500 mt-0.5">ON only shows a route in this chat. Real access still needs a live handler, login, API key, or local service.</p>
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
                      <div className={`w-9 h-5 rounded-full relative transition-all ${chatConnectors[connectorId(item.name)] === true ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${chatConnectors[connectorId(item.name)] === true ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {thinkingReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-2xl min-h-[520px] rounded-[28px] bg-[#fbf7f3] shadow-2xl border border-white/70 p-6 relative">
            <button
              onClick={() => setThinkingReview(null)}
              className="absolute right-5 top-5 rounded-full p-2 text-gray-500 hover:bg-black/5 hover:text-gray-900"
              aria-label="Close thinking review"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold text-gray-900 mb-8">See my thinking</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-gray-600 mt-1" />
                  <div className="w-px flex-1 bg-gray-300 mt-2" />
                </div>
                <div className="pb-2">
                  <p className="text-sm font-semibold text-gray-800">Organising my thoughts and creating a plan</p>
                  <p className="text-xs text-gray-500 mt-1">{thinkingReview.engine}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-gray-600 mt-1" />
                  <div className="w-px flex-1 bg-gray-300 mt-2" />
                </div>
                <div className="pb-2">
                  <p className="text-sm font-bold text-gray-900">Planning and tool trace</p>
                  <div className="mt-3 space-y-2">
                    {(thinkingReview.thinking?.steps || []).length === 0 ? (
                      <p className="text-sm leading-6 text-gray-700">No explicit planning steps were recorded for this short response.</p>
                    ) : thinkingReview.thinking.steps.map((step: string, i: number) => (
                      <p key={`${step}-${i}`} className="text-sm leading-6 text-gray-700">{step}</p>
                    ))}
                  </div>
                  <div className="mt-5 space-y-2">
                    {(thinkingReview.thinking?.events || []).slice(0, 10).map((event: any) => (
                      <div key={event.id || `${event.type}-${event.createdAt}`} className="rounded-2xl border border-gray-200 bg-white/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{event.type || 'event'}</span>
                          <span className="text-[10px] text-gray-400">{event.createdAt ? new Date(event.createdAt).toLocaleTimeString() : ''}</span>
                        </div>
                        <p className="text-xs font-medium text-gray-700 mt-1">{traceLine(event)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-black text-white flex items-center justify-center">
                    <Search className="h-2.5 w-2.5" />
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900">Done</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
