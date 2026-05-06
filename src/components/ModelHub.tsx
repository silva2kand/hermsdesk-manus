import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Download, Trash2, CheckCircle2, Box, Cpu, HardDrive, 
  RefreshCw, Plus, Shield, Zap, Sparkles, Filter, Info, Play, 
  AlertCircle, ChevronRight, Activity, Layers, Monitor,
  Globe, Share2, Copy
} from 'lucide-react';

interface LocalModel {
  id: string;
  name: string;
  path?: string;
  size: string;
  provider: string;
  status: 'installed' | 'available' | 'downloading';
  description: string;
  quantization: string;
  tags: string[];
  vramRequired: string;
}

const RuntimeLine = ({ label, value, ok }: { label: string; value: string; ok: boolean }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-white/10 border border-white/10 px-3 py-2">
    <span className="text-[9px] font-black uppercase tracking-widest text-white/70">{label}</span>
    <span className={`text-[10px] font-bold truncate ${ok ? 'text-white' : 'text-white/60'}`} title={value}>
      {value}
    </span>
  </div>
);

export const ModelHub = ({ onLoadModel }: { onLoadModel?: (model: string, provider: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSearchingHF, setIsSearchingHF] = useState(false);
  const [hfResults, setHfResults] = useState<any[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<{[key: string]: number}>({});
  const [modelsPath, setModelsPath] = useState('');
  const [libraryModels, setLibraryModels] = useState<any[]>([]);
  const [janStatus, setJanStatus] = useState<{ apiOnline: boolean, installed: boolean, executablePath: string, nitroPath?: string, janCliPath?: string, janAppPath?: string, janProfileRoot?: string, janDataRoot?: string, modelLibraryPath?: string, turboQuantBackendPath?: string, missingReason?: string, activeModel: string, models: any[], turboQuant?: any }>({
    apiOnline: false,
    installed: false,
    executablePath: '',
    nitroPath: '',
    janCliPath: '',
    janAppPath: '',
    janProfileRoot: '',
    janDataRoot: '',
    modelLibraryPath: '',
    turboQuantBackendPath: '',
    missingReason: '',
    activeModel: '',
    models: [],
    turboQuant: null
  });
  const [engineMessage, setEngineMessage] = useState('');
  const [otherEngines, setOtherEngines] = useState<{ ollamaOnline: boolean, lmStudioOnline: boolean }>({
    ollamaOnline: false,
    lmStudioOnline: false
  });
  const [pcCapabilities, setPcCapabilities] = useState({
    gpu: 'Detecting...',
    vram: '...',
    ram: '...',
    os: '...',
    approximate: false
  });

  const [localModels, setLocalModels] = useState<LocalModel[]>([]);

  const fetchLibrary = async () => {
    if (window.ipcRenderer?.listLibraryModels) {
      try {
        const models = await window.ipcRenderer.listLibraryModels();
        setLibraryModels(models);
      } catch (e) {
        console.error('Failed to fetch library models:', e);
      }
    }
  };

  const refreshInstalledModels = async () => {
    if (!window.ipcRenderer) return;

    const [ollamaModels, libraryModels] = await Promise.all([
      window.ipcRenderer.listModels(),
      window.ipcRenderer.listLibraryModels()
    ]);
    setOtherEngines(prev => ({ ...prev, ollamaOnline: Array.isArray(ollamaModels) && ollamaModels.length > 0 }));

    const ollama = Array.isArray(ollamaModels) ? ollamaModels.map((m: any) => {
      const gbSize = m.size / (1024 * 1024 * 1024);
      return {
        id: `ollama:${m.digest || m.name}`,
        name: m.name,
        provider: 'Ollama',
        size: `${gbSize.toFixed(1)} GB`,
        status: 'installed' as const,
        description: 'Local model detected via Ollama',
        quantization: m.name.includes('q4') ? 'Q4' : m.name.includes('q8') ? 'Q8' : m.name.includes('fp16') ? 'FP16' : 'Unknown',
        tags: ['Local', 'Ollama'],
        vramRequired: `~${(gbSize * 1.2).toFixed(1)} GB`
      };
    }) : [];

    const library = Array.isArray(libraryModels) ? libraryModels.map((m: any) => ({
      id: m.id,
      name: m.name,
      path: m.path,
      provider: m.provider || 'Jan',
      size: `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB`,
      status: 'installed' as const,
      description: m.description,
      quantization: m.quantization,
      tags: m.tags,
      vramRequired: m.vramRequired
    })) : [];

    setLocalModels([...library, ...ollama]);
  };

  const refreshJanStatus = async () => {
    if (!window.ipcRenderer) return;
    const status = await window.ipcRenderer.janStatus();
    setJanStatus(status);
    if (status.apiOnline) {
      await fetchLibrary();
    }
  };

  // Fetch real PC capabilities and Jan status on mount
  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval>;

    const init = async () => {
      if (window.ipcRenderer) {
        try {
          const caps = await window.ipcRenderer.scanPC();
          if (isMounted) setPcCapabilities({ ...caps, approximate: Boolean(caps.approximate) });
          
          const path = await window.ipcRenderer.getModelsPath();
          if (isMounted) setModelsPath(path);
          
          const status = await window.ipcRenderer.janStatus();
          if (isMounted) setJanStatus(status);
          const lmStudio = await window.ipcRenderer.checkLMStudio();
          if (isMounted) setOtherEngines(prev => ({ ...prev, lmStudioOnline: Boolean(lmStudio?.online) }));

          await refreshInstalledModels();
        } catch (e) {
          console.error('ModelHub init error:', e);
        }
      }
    };

    init();
    
    // Refresh library and local models every 30 seconds
    interval = setInterval(() => {
      if (isMounted && window.ipcRenderer) {
        refreshInstalledModels();
      }
    }, 30000);

    const handleProgress = (_: any, data: { modelId: string, progress: number }) => {
      if (isMounted) {
        setActiveDownloads(prev => ({ ...prev, [data.modelId]: data.progress }));
        if (data.progress === 100) {
          setTimeout(() => isMounted && fetchLibrary(), 1000);
        }
      }
    };

    window.ipcRenderer?.on('ai:download-progress', handleProgress);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (window.ipcRenderer?.removeAllListeners) {
        window.ipcRenderer.removeAllListeners('ai:download-progress');
      }
    };
  }, []);

  const recommendedModels = useMemo(() => {
    return [
      { id: 'MiniMaxAI/MiniMax-M2.5-GGUF', name: 'MiniMax M2.5 GGUF (mimo2.5)', size: '15-30 GB', vram: '12 GB', reason: 'SOTA Agentic' },
      { id: 'bartowski/Meta-Llama-3-8B-Instruct-GGUF', name: 'Llama 3 8B Instruct GGUF', size: '4-8 GB', vram: '6 GB', reason: 'Balanced' },
      { id: 'bartowski/Mistral-7B-Instruct-v0.3-GGUF', name: 'Mistral 7B Instruct v0.3', size: '4-7 GB', vram: '6 GB', reason: 'Fast' },
      { id: 'bartowski/Phi-3-mini-4k-instruct-GGUF', name: 'Phi-3 Mini GGUF', size: '2-4 GB', vram: '4 GB', reason: 'Lightning Fast' }
    ];
  }, []);

  const [inferenceStats, setInferenceStats] = useState({
    speed: 0,
    tokens: 0,
    active: false
  });

  useEffect(() => {
    const search = async () => {
      if (searchQuery.length > 2 && window.ipcRenderer) {
        setIsSearchingHF(true);
        const results = await window.ipcRenderer.searchHF(searchQuery);
        setHfResults(results);
        setIsSearchingHF(false);
      } else {
        setHfResults([]);
      }
    };
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      if (window.ipcRenderer) {
        const caps = await window.ipcRenderer.scanPC();
        setPcCapabilities({ ...caps, approximate: Boolean(caps.approximate) });
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setTimeout(() => setIsScanning(false), 1000);
    }
  };

  const handleDownload = async (modelId: string) => {
    // Handle alias
    const targetId = modelId.toLowerCase() === 'mimo2.5' ? 'MiniMaxAI/MiniMax-M2.5-GGUF' : modelId;
    console.log('Downloading model:', targetId);
    if (window.ipcRenderer) {
      setActiveDownloads(prev => ({ ...prev, [targetId]: 0 }));
      
      try {
        const result = await window.ipcRenderer.downloadHF(targetId);
        if (!result.ok) {
          throw new Error(result.error || 'Download failed. Try a GGUF model repository.');
        }
        console.log('Download complete, file at:', result.path);
        await refreshInstalledModels();
        await refreshJanStatus();
        setEngineMessage('Downloaded into the Aion Jan/TurboQuant library. Press Load to use it in chat.');
        
        // Remove from active downloads after a short delay
        setTimeout(() => {
          setActiveDownloads(prev => {
            const next = { ...prev };
            delete next[targetId];
            return next;
          });
        }, 3000);
      } catch (e) {
        console.error('Download failed:', e);
        alert(e instanceof Error ? e.message : 'Download failed. Search for the model first, then try again.');
        setActiveDownloads(prev => {
          const next = { ...prev };
          delete next[targetId];
          return next;
        });
      }
    }
  };

  const handleLoadModel = async (model: LocalModel) => {
    try {
      console.log('Loading model:', model.name);
      setEngineMessage(`Loading ${model.name} through Jan/TurboQuant...`);
      
      if (window.ipcRenderer && model.provider === 'Jan') {
        // Wrap IPC in a try-catch and add a timeout safety
        const result = await window.ipcRenderer.loadJanModel({ name: model.name, path: model.path });
        
        if (result && result.ok) {
          await refreshJanStatus();
          if (result.warning) {
            setEngineMessage(result.warning);
          } else {
            setEngineMessage(`${result.model || model.name} is selected for Jan/TurboQuant chat.`);
          }
        } else {
          setEngineMessage(result?.error || 'Jan/TurboQuant could not start. Install or start Jan and try again.');
          return;
        }
      }

      // Final step: Update global state and navigate
      if (onLoadModel) {
        onLoadModel(model.name, model.provider);
      }
    } catch (error) {
      console.error('CRITICAL: handleLoadModel crashed:', error);
      setEngineMessage('A system error occurred while loading the model. Please check the console.');
    }
  };

  const handleStartJan = async () => {
    if (!window.ipcRenderer) return;
    setEngineMessage('Starting Jan/TurboQuant engine...');
    const result = await window.ipcRenderer.startJan();
    await refreshJanStatus();
    setEngineMessage(result.ok ? (result.message || 'Jan/TurboQuant engine is ready.') : (result.error || 'Jan could not be started.'));
  };

  const handleDeleteModel = async (modelId: string) => {
    console.log('Deleting model:', modelId);
    if (!window.ipcRenderer || modelId.startsWith('ollama:')) return;
    await window.ipcRenderer.deleteLibraryModel(modelId);
    await refreshInstalledModels();
  };

  return (
    <div className="flex flex-col h-full bg-[#f7f8fb]">
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.24em]">HermsDesk Built-In AI</p>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight mt-1">Jan + TurboQuant Model Hub</h1>
            <p className="text-sm text-gray-500 mt-1">Built-in Jan is the primary engine. Ollama, LM Studio, and OpenCode are external fallback routes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshInstalledModels} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-50">
              Refresh
            </button>
            <button onClick={handleStartJan} className="px-4 py-2 bg-gray-950 text-white rounded-xl text-xs font-black hover:bg-gray-800">
              {janStatus.apiOnline ? 'Jan Ready' : 'Start Jan'}
            </button>
          </div>
        </div>

        {engineMessage && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-800">
            {engineMessage}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-gray-950 rounded-3xl text-white space-y-4 shadow-xl shadow-gray-200 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <Cpu className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">System Capability Detected</h2>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${pcCapabilities.approximate ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                  {pcCapabilities.approximate ? 'Fast Estimate' : 'Optimal'}
                </span>
                <span className="text-[10px] font-bold text-gray-400">Windows 11 x64</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">GPU</p>
                  <p className="text-sm font-black text-white truncate">{pcCapabilities.gpu}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">VRAM</p>
                  <p className="text-sm font-black text-blue-400">{pcCapabilities.vram}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">RAM</p>
                  <p className="text-sm font-black text-white">{pcCapabilities.ram}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={handleScan}
              className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {isScanning ? 'Scanning...' : 'Rescan PC'}
            </button>
          </div>

          <div className={`p-6 rounded-3xl text-white space-y-4 shadow-xl transition-all duration-500 relative overflow-hidden group ${janStatus.apiOnline ? 'bg-blue-600 shadow-blue-100' : janStatus.installed ? 'bg-amber-500 shadow-amber-100' : 'bg-gray-800 shadow-gray-200'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Zap className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Built-in Jan + TurboQuant Engine</h2>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${janStatus.apiOnline ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                  {janStatus.apiOnline ? 'Online' : janStatus.installed ? 'Runtime Found' : 'Runtime Missing'}
                </div>
              </div>
              <p className="text-sm text-white/80 font-medium leading-relaxed mb-4">
                {janStatus.apiOnline 
                  ? 'Jan/TurboQuant engine is active. Your RTX 5000A is optimized for high-speed GGUF inference.' 
                  : janStatus.installed
                    ? 'The built-in Jan + TurboQuant runtime is present. Load a GGUF model to start Jan CLI serve on port 6767, or press Start to open the runtime.'
                    : 'The built-in Jan + TurboQuant runtime was not found in the app runtime paths. Place nitro.exe in the app bin folder to enable the primary engine.'}
              </p>
              <div className="grid grid-cols-1 gap-2">
                <RuntimeLine label="Nitro" value={janStatus.nitroPath || 'Not found'} ok={Boolean(janStatus.nitroPath)} />
                <RuntimeLine label="Jan CLI" value={janStatus.janCliPath || 'Not found'} ok={Boolean(janStatus.janCliPath)} />
                <RuntimeLine label="Backend" value={janStatus.turboQuantBackendPath || 'Not found'} ok={Boolean(janStatus.turboQuantBackendPath)} />
                <RuntimeLine label="API" value={janStatus.apiOnline ? 'Port 6767/1337 online' : 'Port 6767 offline'} ok={janStatus.apiOnline} />
                <RuntimeLine label="Data" value={janStatus.janDataRoot || 'HermsDesk owned'} ok={Boolean(janStatus.janDataRoot)} />
                <RuntimeLine label="DFALSH" value={janStatus.turboQuant?.policy ? `${janStatus.turboQuant.policy.ctxSize} ctx / ${janStatus.turboQuant.policy.threads} threads` : 'Armed on load'} ok />
                <RuntimeLine label="Speed" value={janStatus.turboQuant?.metrics?.tokensPerSecond ? `${Math.round(janStatus.turboQuant.metrics.tokensPerSecond)} tok/s` : 'No run yet'} ok={Boolean(janStatus.turboQuant?.metrics)} />
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-6">
              <button 
                onClick={handleStartJan}
                className="flex-1 py-4 bg-white text-gray-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl shadow-black/10"
              >
                {janStatus.apiOnline ? 'Restart Server' : 'Start Jan TurboQuant'}
              </button>
            </div>
          </div>
        </div>

        {/* Connect to Other Apps Section */}
        <div className="p-6 bg-blue-600 rounded-3xl text-white space-y-6 shadow-xl shadow-blue-100 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Globe className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Local Engine Routes</h2>
            </div>
            <p className="text-sm text-blue-100 max-w-xl font-medium leading-relaxed">
              Jan + TurboQuant is the built-in primary route. Ollama and LM Studio are optional external local routes. Use these OpenAI-style endpoints for apps like 
              <span className="font-bold text-white mx-1">Cursor</span>, 
              <span className="font-bold text-white mx-1">AnythingLLM</span>, 
              or <span className="font-bold text-white mx-1">VS Code Extensions</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {[
              { name: 'Jan/TurboQuant', port: '6767', url: 'http://localhost:6767/v1', online: janStatus.apiOnline },
              { name: 'Ollama', port: '11434', url: 'http://localhost:11434', online: otherEngines.ollamaOnline },
              { name: 'LM Studio', port: '1234', url: 'http://localhost:1234/v1', online: otherEngines.lmStudioOnline }
            ].map((engine) => (
              <div key={engine.name} className="p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">{engine.name}</span>
                  <div className={`w-2 h-2 rounded-full ${engine.online ? 'bg-green-400 animate-pulse' : 'bg-orange-300'}`} />
                </div>
                <div className="bg-black/20 p-2 rounded-xl border border-white/5 flex items-center justify-between group/url">
                  <code className="text-[10px] font-mono text-blue-100 truncate mr-2">{engine.url}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(engine.url);
                      setEngineMessage(`Copied ${engine.name} URL to clipboard!`);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <Copy className="w-3 h-3 text-white" />
                  </button>
                </div>
                <p className="text-[9px] text-blue-200 font-bold">API Key: <span className="text-white">not-needed</span></p>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between relative z-10 border-t border-white/10">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-blue-200" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Model Files:</span>
              <code className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white font-mono">{modelsPath}</code>
            </div>
            <button 
              onClick={() => window.ipcRenderer?.revealModelsFolder()}
              className="text-[10px] font-black uppercase tracking-widest bg-white text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all shadow-lg shadow-black/10"
            >
              Open Model Files
            </button>
          </div>
        </div>

        {/* Search & TurboQuant Hub */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Download and Load Models</h2>
              <p className="text-sm text-gray-500 font-medium">Jan-powered local engine with TurboQuant optimization for RTX GPUs.</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search local or Hugging Face models (Llama, Mistral, Gemma...)"
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearchingHF && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Recommended Models */}
          {!searchQuery && hfResults.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 px-1">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recommended for Your PC</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedModels.map((m) => (
                  <div key={m.id} className="p-5 bg-white border border-gray-100 rounded-[28px] flex items-center justify-between group hover:border-blue-100 transition-all">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900">{m.name}</h3>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{m.size}</span>
                          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{m.reason}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(m.id)}
                      disabled={activeDownloads[m.id] !== undefined}
                      className="p-2.5 bg-gray-50 text-gray-900 rounded-xl hover:bg-gray-100 transition-all"
                    >
                      {activeDownloads[m.id] !== undefined ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jan Models */}
          {janStatus.apiOnline && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 px-1">
                <Cpu className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Jan/TurboQuant Engine</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {janStatus.models.map((m: any) => (
                  <div key={m.id} className="p-5 bg-white border border-gray-100 rounded-[28px] flex items-center justify-between group hover:border-blue-100 transition-all">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900">{m.id}</h3>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Jan Library</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onLoadModel?.(m.id, 'Jan')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {hfResults.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-blue-500" />
                  <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Hugging Face GGUF Search</h2>
                </div>
                <span className="text-[10px] font-bold text-gray-400">{hfResults.length} models found</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {hfResults.map((model) => (
                  <div key={model.id} className="group p-5 bg-white border border-gray-100 rounded-[28px] hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{model.name}</h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                            <Download className="w-3 h-3 mr-1" />
                            {model.downloads.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{model.size}</span>
                          {model.tags?.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[8px] font-black uppercase rounded border border-gray-100">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(model.name)}
                      disabled={activeDownloads[model.name] !== undefined}
                      className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeDownloads[model.name] !== undefined 
                          ? 'bg-blue-50 text-blue-400 cursor-not-allowed' 
                          : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
                      }`}
                    >
                      {activeDownloads[model.name] !== undefined ? `Downloading ${activeDownloads[model.name]}%` : 'Download'}
                    </button>
                  </div>
                ))}
              </div>
              {Object.keys(activeDownloads).length > 0 && (
                <div className="p-4 bg-blue-50 border-t border-blue-100 space-y-3 rounded-[28px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">TurboQuant Real-Time Monitor</span>
                    </div>
                  </div>
                  {Object.entries(activeDownloads).map(([id, progress]) => (
                    <div key={id} className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-bold text-blue-800">
                        <span className="truncate max-w-[240px]">{id}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-blue-100/50 rounded-full overflow-hidden border border-blue-200/50">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cloud Providers (Free Tier Only) */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Free Cloud APIs (Ready)</h2>
            </div>
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Unlimited Free Tier Only</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white border border-gray-100 rounded-[28px] flex items-center justify-between group hover:border-blue-100 transition-all">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">OpenRouter (Free Tier)</h3>
                  <p className="text-[10px] text-gray-500">Auto-routes to best free model (Llama 3, Gemma 2...)</p>
                </div>
              </div>
              <button 
                onClick={() => onLoadModel?.('openrouter/auto-free', 'OpenRouter')}
                className="px-4 py-2 bg-gray-50 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100"
              >
                Use
              </button>
            </div>
            <div className="p-5 bg-white border border-gray-100 rounded-[28px] flex items-center justify-between group hover:border-green-100 transition-all">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">NVIDIA NIM (Free)</h3>
                  <p className="text-[10px] text-gray-500">Fast inference on Llama 3 70B & 8B</p>
                </div>
              </div>
              <button 
                onClick={() => onLoadModel?.('meta/llama3-70b-instruct', 'Nvidia')}
                className="px-4 py-2 bg-gray-50 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100"
              >
                Use
              </button>
            </div>
          </div>
        </div>

        {/* Local Library Section */}
          {libraryModels.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-green-500" />
                  <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Local TurboQuant Library</h2>
                </div>
                <button 
                  onClick={() => window.ipcRenderer?.revealModelsFolder()}
                  className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-widest"
                >
                  Open Folder
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {libraryModels.map((model) => (
                  <div key={model.id} className="group p-6 bg-white border border-gray-100 rounded-[32px] hover:border-green-200 hover:shadow-xl hover:shadow-green-50/50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
                          <Cpu className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-gray-900">{model.name}</h3>
                          <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{model.description}</p>
                          <div className="flex items-center space-x-3 pt-2">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{model.quantization}</span>
                            <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">{(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleLoadModel({
                            id: model.id,
                            name: model.name,
                            path: model.path,
                            provider: model.provider || 'Jan',
                            size: `${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB`,
                            status: 'installed',
                            description: model.description,
                            quantization: model.quantization,
                            tags: model.tags || [],
                            vramRequired: model.vramRequired || 'N/A'
                          })}
                          className="p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                          title="Load Model"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteModel(model.id)}
                          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                          title="Delete Model"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Local Inventory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Installed Models</h2>
            <button onClick={() => window.ipcRenderer?.revealModelsFolder()} className="text-[10px] font-bold text-blue-600 hover:underline">Open Library Folder</button>
          </div>
          <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm divide-y divide-gray-50">
            {localModels.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm font-black text-gray-900">No installed local models detected yet</p>
                <p className="text-xs text-gray-500 mt-1">Ollama, LM Studio, or Jan models will appear here after refresh.</p>
                <button onClick={refreshInstalledModels} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black">
                  Refresh Models
                </button>
              </div>
            )}
            {localModels.map((model) => (
              <div key={model.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                    <Box className="w-7 h-7 text-gray-400 group-hover:text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-black text-gray-900">{model.name}</h3>
                      {model.status === 'installed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed max-w-md">{model.description}</p>
                    <div className="flex items-center space-x-4 pt-1">
                      <div className="flex items-center space-x-2">
                        {(model.tags || []).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[8px] font-black uppercase rounded border border-gray-100">{tag}</span>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{model.size}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{model.quantization}</span>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{model.vramRequired} VRAM</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleLoadModel(model)}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-2xl text-[11px] font-black hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 mr-2" />
                    Load
                  </button>
                  <button 
                    onClick={() => handleDeleteModel(model.id)}
                    disabled={model.id.startsWith('ollama:')}
                    className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title={model.id.startsWith('ollama:') ? 'Remove Ollama models from Ollama' : 'Delete from Aion library'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning / Tip */}
        <div className="p-6 bg-orange-50/50 rounded-[32px] border border-orange-100 flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-gray-900">Optimization Tip</h4>
            <p className="text-[11px] text-orange-700 leading-relaxed">
              If Windows takes too long to report VRAM, Aion uses fast cached estimates so the app stays responsive. We recommend Q4_K_M or Q5_K_M GGUF models for reliable local Jan/TurboQuant speed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
