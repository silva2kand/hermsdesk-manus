import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Download, Trash2, CheckCircle2, Box, Cpu, HardDrive, 
  RefreshCw, Plus, Shield, Zap, Sparkles, Filter, Info, Play, 
  AlertCircle, ChevronRight, Activity, Layers, Monitor
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

export const ModelHub = ({ onLoadModel }: { onLoadModel?: (model: string, provider: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSearchingHF, setIsSearchingHF] = useState(false);
  const [hfResults, setHfResults] = useState<any[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<{[key: string]: number}>({});
  const [modelsPath, setModelsPath] = useState('');
  const [janStatus, setJanStatus] = useState<{ apiOnline: boolean, installed: boolean, executablePath: string, activeModel: string, models: any[] }>({
    apiOnline: false,
    installed: false,
    executablePath: '',
    activeModel: '',
    models: []
  });
  const [engineMessage, setEngineMessage] = useState('');
  const [pcCapabilities, setPcCapabilities] = useState({
    gpu: 'Detecting...',
    vram: '...',
    ram: '...',
    os: '...'
  });

  const [localModels, setLocalModels] = useState<LocalModel[]>([]);

  const refreshInstalledModels = async () => {
    if (!window.ipcRenderer) return;

    const [ollamaModels, libraryModels] = await Promise.all([
      window.ipcRenderer.listModels(),
      window.ipcRenderer.listLibraryModels()
    ]);

    const ollama = Array.isArray(ollamaModels) ? ollamaModels.map((m: any) => ({
      id: `ollama:${m.digest || m.name}`,
      name: m.name,
      provider: 'Ollama',
      size: `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB`,
      status: 'installed' as const,
      description: 'Local model detected via Ollama',
      quantization: 'Detected',
      tags: ['Local', 'Ollama'],
      vramRequired: 'Calculated'
    })) : [];

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
  };

  // Fetch real PC capabilities and Jan status on mount
  useEffect(() => {
    const init = async () => {
      if (window.ipcRenderer) {
        const caps = await window.ipcRenderer.scanPC();
        setPcCapabilities(caps);
        
        const path = await window.ipcRenderer.getModelsPath();
        setModelsPath(path);
        await refreshJanStatus();
        
        // Listen for real-time progress
        window.ipcRenderer.on('ai:download-progress', (_: any, data: { modelId: string, progress: number }) => {
          setActiveDownloads(prev => ({ ...prev, [data.modelId]: data.progress }));
        });

        await refreshInstalledModels();
      }
    };
    init();
  }, []);

  const recommendedModels = useMemo(() => {
    return [
      { id: 'bartowski/Meta-Llama-3-8B-Instruct-GGUF', name: 'Llama 3 8B Instruct GGUF', size: '4-8 GB', vram: '6 GB', reason: 'Balanced' },
      { id: 'bartowski/Mistral-7B-Instruct-v0.3-GGUF', name: 'Mistral 7B Instruct GGUF', size: '4-7 GB', vram: '6 GB', reason: 'Fast' },
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
        setPcCapabilities(caps);
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setTimeout(() => setIsScanning(false), 1000);
    }
  };

  const handleDownload = async (modelId: string) => {
    console.log('Downloading model:', modelId);
    if (window.ipcRenderer) {
      setActiveDownloads(prev => ({ ...prev, [modelId]: 0 }));
      
      try {
        const result = await window.ipcRenderer.downloadHF(modelId);
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
            delete next[modelId];
            return next;
          });
        }, 3000);
      } catch (e) {
        console.error('Download failed:', e);
        alert(e instanceof Error ? e.message : 'Download failed. Search for the model first, then try again.');
        setActiveDownloads(prev => {
          const next = { ...prev };
          delete next[modelId];
          return next;
        });
      }
    }
  };

  const handleLoadModel = async (model: LocalModel) => {
    console.log('Loading model:', model.name);
    setEngineMessage(`Loading ${model.name} through Jan/TurboQuant...`);
    if (window.ipcRenderer && model.provider === 'Jan') {
      const result = await window.ipcRenderer.loadJanModel({ name: model.name, path: model.path });
      await refreshJanStatus();
      if (!result.ok) {
        setEngineMessage(result.error || 'Jan/TurboQuant could not start. Install or start Jan and try again.');
        return;
      }
      if (result.warning) {
        setEngineMessage(result.warning);
      } else {
        setEngineMessage(`${result.model || model.name} is selected for Jan/TurboQuant chat.`);
      }
    }
    if (onLoadModel) {
      onLoadModel(model.name, model.provider);
    }
  };

  const handleStartJan = async () => {
    if (!window.ipcRenderer) return;
    setEngineMessage('Starting Jan/TurboQuant engine...');
    const result = await window.ipcRenderer.startJan();
    await refreshJanStatus();
    setEngineMessage(result.ok ? 'Jan/TurboQuant engine is ready.' : (result.error || 'Jan could not be started.'));
  };

  const handleDeleteModel = async (modelId: string) => {
    console.log('Deleting model:', modelId);
    if (!window.ipcRenderer || modelId.startsWith('ollama:')) return;
    await window.ipcRenderer.deleteLibraryModel(modelId);
    await refreshInstalledModels();
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa]">
      <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
        
        {/* PC Capabilities & Jan Detection */}
        <div className="p-6 bg-gray-900 rounded-[32px] text-white flex items-center justify-between shadow-2xl shadow-gray-200">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20">
              <Cpu className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-black tracking-tight uppercase">System Capability Detected</h2>
                <div className="px-2 py-0.5 bg-green-500 text-white text-[8px] font-black uppercase rounded-full animate-pulse">Optimal</div>
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1.5">
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-bold text-gray-300">{pcCapabilities.gpu}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-bold text-gray-300">{pcCapabilities.vram} VRAM</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[11px] font-bold text-gray-300">{pcCapabilities.ram} RAM</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleScan}
            disabled={isScanning}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black transition-all border border-white/10 flex items-center"
          >
            {isScanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2 text-yellow-400" />}
            {isScanning ? 'Detecting...' : 'Rescan PC'}
          </button>
        </div>

        <div className="p-5 bg-white border border-gray-100 rounded-3xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${janStatus.apiOnline ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-gray-900">Built-in Jan + TurboQuant Engine</h3>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${janStatus.apiOnline ? 'bg-green-50 text-green-600' : janStatus.installed ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'}`}>
                  {janStatus.apiOnline ? 'Ready' : janStatus.installed ? 'Installed' : 'Needs Jan'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Search GGUF models, download to the Aion library, then Load to route chat through Jan/TurboQuant.
              </p>
              {engineMessage && <p className="text-[10px] text-blue-600 font-bold mt-2 max-w-2xl">{engineMessage}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={refreshJanStatus} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Refresh Jan status">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleStartJan} className="px-5 py-2 bg-gray-900 text-white rounded-xl text-[11px] font-black hover:bg-gray-800 transition-all">
              {janStatus.apiOnline ? 'Restart Check' : 'Start Jan'}
            </button>
          </div>
        </div>

        {/* Search & TurboQuant Hub */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">TurboQuant Local Model Hub</h1>
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

          {hfResults.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hugging Face Results</span>
                <span className="text-[10px] font-bold text-blue-500">{hfResults.length} found</span>
              </div>
              <div className="divide-y divide-gray-50">
                {hfResults.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors group">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center">
                        <Box className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{m.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {m.size && <span className="text-blue-500 mr-2">{m.size}</span>}
                          ÔÇó {m.downloads.toLocaleString()} downloads
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(m.name)}
                      className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-[10px] font-black hover:bg-gray-800 transition-all group-hover:opacity-100"
                    >
                      {activeDownloads[m.name] !== undefined ? `${activeDownloads[m.name]}%` : 'Download'}
                    </button>
                  </div>
                ))}
              </div>
              {Object.keys(activeDownloads).length > 0 && (
                <div className="p-4 bg-blue-50 border-t border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">TurboQuant Real-Time Monitor</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                      <span className="text-[8px] font-black text-blue-500 uppercase">Processing</span>
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
                      {progress === 100 && (
                        <p className="text-[8px] text-blue-500 font-mono truncate">
                          Saved to: {modelsPath}\{id.replace(/\//g, '_')}.gguf
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommended for Your PC */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-1">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recommended for {pcCapabilities.gpu}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedModels.map((m) => (
              <div key={m.id} className="p-5 bg-white border border-gray-100 rounded-3xl space-y-4 hover:border-blue-200 hover:shadow-xl transition-all group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-full">{m.reason}</div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">{m.name}</h3>
                  <div className="flex items-center space-x-3 mt-1 text-[10px] font-bold text-gray-400 uppercase">
                    <span>{m.size}</span>
                    <span>ÔÇó</span>
                    <span className="text-purple-500">{m.vram} VRAM</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDownload(m.id)}
                  disabled={activeDownloads[m.id] !== undefined}
                  className="w-full py-2 bg-gray-900 text-white rounded-xl text-[11px] font-black hover:bg-gray-800 transition-all flex items-center justify-center disabled:bg-gray-400"
                >
                  {activeDownloads[m.id] !== undefined ? (
                    <div className="flex items-center space-x-2 w-full px-2">
                      <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white transition-all duration-300" style={{ width: `${activeDownloads[m.id]}%` }} />
                      </div>
                      <span className="text-[9px]">{activeDownloads[m.id]}%</span>
                    </div>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 mr-2" />
                      Download
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Local Inventory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Installed Models</h2>
            <button onClick={() => window.ipcRenderer?.revealModelsFolder()} className="text-[10px] font-bold text-blue-600 hover:underline">Open Library Folder</button>
          </div>
          <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm divide-y divide-gray-50">
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
                        {model.tags.map(tag => (
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
              Your NVIDIA RTX 5000A supports high-bit quantization. We recommend using Q4_K_M or higher for Llama-3 models to maintain precision while keeping fast inference speeds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
