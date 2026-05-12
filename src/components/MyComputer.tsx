import React, { useEffect, useMemo, useState } from 'react';
import {
  HardDrive, Folder, File, Terminal, Monitor, Clock, Shield, Database,
  RefreshCw, ExternalLink, ChevronLeft, ChevronRight, Globe, Search, Radio
} from 'lucide-react';

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

export const MyComputer = () => {
  const [overview, setOverview] = useState<any>(null);
  const [directory, setDirectory] = useState<{ path: string, entries: any[] } | null>(null);
  const [automationEvents, setAutomationEvents] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const refresh = async (folderPath?: string) => {
    if (!window.ipcRenderer) return;
    setLoading(true);
    try {
      const [computer, listing] = await Promise.all([
        window.ipcRenderer.getComputerOverview(),
        window.ipcRenderer.listDirectory(folderPath)
      ]);
      setOverview(computer);
      setDirectory(listing);
    } catch (error: any) {
      showNotice(error?.message || 'Unable to load local computer data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    window.ipcRenderer?.getAutomationEvents?.().then(events => setAutomationEvents(events || [])).catch(() => {});
    const handleAutomation = (_: any, event: any) => {
      setAutomationEvents(prev => [event, ...prev].slice(0, 20));
    };
    window.ipcRenderer?.on?.('automation:event', handleAutomation);
    return () => {
      window.ipcRenderer?.off?.('automation:event', handleAutomation);
    };
  }, []);

  const usedPercent = overview?.systemDrive?.percent || 0;
  const freeBytes = Math.max((overview?.systemDrive?.size || 0) - (overview?.systemDrive?.used || 0), 0);
  const quickAccess = overview?.quickAccess || [];

  const parentPath = useMemo(() => {
    if (!directory?.path) return '';
    const normalized = directory.path.replace(/[\\/]+$/, '');
    const parts = normalized.split(/[\\/]/);
    if (parts.length <= 1) return normalized;
    return parts.slice(0, -1).join('\\');
  }, [directory?.path]);

  const openDirectory = async (path: string) => {
    const result = await window.ipcRenderer?.listDirectory(path);
    if (result) setDirectory(result);
  };

  const reveal = async (path: string) => {
    const result = await window.ipcRenderer?.revealPath(path);
    showNotice(result?.ok ? `Revealed ${path}` : (result?.error || 'Could not reveal path'));
  };

  const openBrowser = async () => {
    const target = window.prompt('Open URL or search the web', 'https://www.google.com');
    if (target === null) return;
    const result = await window.ipcRenderer?.openBrowserOperator?.(target);
    showNotice(result?.ok ? 'Browser Operator opened and logged in ME Computer.' : (result?.error || 'Could not open browser operator.'));
  };

  const researchWeb = async () => {
    const query = window.prompt('Research topic', '');
    if (!query) return;
    const result = await window.ipcRenderer?.researchWebAutomation?.(query);
    showNotice(result?.ok ? 'Web research opened and logged.' : (result?.error || 'Could not start web research.'));
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa] p-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 font-serif tracking-tight">My Computer</h1>
            <p className="text-sm text-gray-500 mt-1">
              {overview ? `${overview.hostname} · ${overview.os}` : 'Local machine access and workspace management.'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.ipcRenderer?.openTerminal(directory?.path)}
              className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center"
            >
              <Terminal className="w-3.5 h-3.5 mr-2" />
              Open Terminal
            </button>
            <button
              onClick={openBrowser}
              className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center"
            >
              <Globe className="w-3.5 h-3.5 mr-2" />
              Open Browser
            </button>
            <button
              onClick={() => refresh(directory?.path)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all flex items-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-start space-x-4 group">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 group-hover:scale-110 transition-transform">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">{overview?.systemDrive?.fs || 'System Drive'}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">{overview?.systemDrive?.mount || 'Local disk'}</p>
              <div className="mt-3 space-y-1.5">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(usedPercent, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500">
                  <span>{formatBytes(freeBytes)} free</span>
                  <span>{formatBytes(overview?.systemDrive?.size)} total</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-start space-x-4 group">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">ME Workspace</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">{overview?.cwd || 'Workspace folder'}</p>
              <div className="mt-3 space-y-1.5">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[18%] h-full bg-blue-600 rounded-full" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-500">
                  <span>{formatBytes(overview?.workspace?.bytes)} tracked</span>
                  <span>{overview?.workspace?.partial ? 'partial scan' : 'local'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-gray-900 to-black text-white rounded-3xl shadow-xl flex items-start space-x-4 relative overflow-hidden group">
            <Shield className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-500" />
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
              <Monitor className="w-6 h-6" />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-sm font-bold text-white">System Monitor</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Live local resources</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div><p className="text-lg font-black">{overview?.cpu ?? 0}%</p><p className="text-[9px] text-gray-400 uppercase">CPU</p></div>
                <div><p className="text-lg font-black">{overview?.ram?.percent ?? 0}%</p><p className="text-[9px] text-gray-400 uppercase">RAM</p></div>
                <div><p className="text-lg font-black">{overview?.gpu?.utilization ?? 0}%</p><p className="text-[9px] text-gray-400 uppercase">GPU</p></div>
              </div>
              {overview?.gpu?.name && (
                <p className="text-[9px] text-gray-400 mt-3 truncate" title={overview.gpu.name}>
                  {overview.gpu.name} · {overview.gpu.memoryUsedMb} / {overview.gpu.memoryTotalMb} MB
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickAccess.map((item: any) => {
              const Icon = item.label === 'Downloads' ? Clock : item.label === 'Desktop' ? Monitor : item.label === 'AI Exports' ? Folder : File;
              return (
                <button
                  key={item.label}
                  onClick={() => openDirectory(item.path)}
                  className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center space-y-3 hover:border-gray-200 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">ME Computer Live Automation</h2>
                <p className="text-xs text-gray-500 mt-2">Real PC and browser actions from the chat bar, tray, and this workspace appear here as they happen.</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={researchWeb}
                  className="px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center"
                >
                  <Search className="w-3.5 h-3.5 mr-2" />
                  Research
                </button>
                <button
                  onClick={() => window.ipcRenderer?.openTerminal(directory?.path)}
                  className="px-3 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center"
                >
                  <Terminal className="w-3.5 h-3.5 mr-2" />
                  Terminal
                </button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => window.ipcRenderer?.openApp?.('whatsapp web')} className="p-3 rounded-2xl border border-gray-100 text-left hover:bg-green-50 hover:border-green-100 transition-all">
                <p className="text-xs font-black text-gray-900">WhatsApp Web</p>
                <p className="text-[10px] text-gray-500 mt-1">Open real web compose surface.</p>
              </button>
              <button onClick={() => window.ipcRenderer?.openApp?.('video call')} className="p-3 rounded-2xl border border-gray-100 text-left hover:bg-blue-50 hover:border-blue-100 transition-all">
                <p className="text-xs font-black text-gray-900">Video Call</p>
                <p className="text-[10px] text-gray-500 mt-1">Create a Google Meet room.</p>
              </button>
              <button onClick={() => window.ipcRenderer?.openApp?.('voice stack')} className="p-3 rounded-2xl border border-gray-100 text-left hover:bg-cyan-50 hover:border-cyan-100 transition-all">
                <p className="text-xs font-black text-gray-900">Voice Stack</p>
                <p className="text-[10px] text-gray-500 mt-1">Open local port 7100.</p>
              </button>
            </div>
          </div>

          <div className="p-6 bg-gray-950 text-white rounded-3xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Radio className="w-4 h-4 text-green-400 mr-2" />
                <h2 className="text-xs font-black uppercase tracking-widest">Live Activity</h2>
              </div>
              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Realtime</span>
            </div>
            <div className="mt-4 space-y-3 max-h-52 overflow-y-auto pr-1">
              {automationEvents.length ? automationEvents.map(event => (
                <div key={event.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black truncate">{event.title}</p>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${event.status === 'error' ? 'text-red-300' : event.status === 'running' ? 'text-blue-300' : 'text-green-300'}`}>
                      {event.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 truncate">{event.detail}</p>
                </div>
              )) : (
                <div className="h-36 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl">
                  <Globe className="w-8 h-8 text-gray-700 mb-3" />
                  <p className="text-xs font-black text-gray-300">No automation events yet</p>
                  <p className="text-[10px] text-gray-500 mt-1">Open browser research from the chat bar or this panel.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center space-x-4 bg-gray-50/50">
            <div className="flex items-center space-x-1">
              <button onClick={() => parentPath && openDirectory(parentPath)} className="p-1.5 hover:bg-gray-200 rounded-md transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => refresh(directory?.path)} className="p-1.5 hover:bg-gray-200 rounded-md transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex items-center truncate">
              <HardDrive className="w-3.5 h-3.5 mr-2 text-gray-400 shrink-0" />
              <span className="truncate">{directory?.path || overview?.cwd || 'Loading...'}</span>
            </div>
            <button onClick={() => directory?.path && reveal(directory.path)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Reveal folder">
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {directory?.entries?.length ? directory.entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => entry.type === 'folder' ? openDirectory(entry.path) : window.ipcRenderer?.openPath(entry.path)}
                onDoubleClick={() => entry.type === 'folder' ? openDirectory(entry.path) : window.ipcRenderer?.openPath(entry.path)}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-blue-50/40 transition-all text-left"
              >
                <div className="flex items-center min-w-0">
                  {entry.type === 'folder' ? <Folder className="w-4 h-4 text-blue-500 mr-3 shrink-0" /> : <File className="w-4 h-4 text-gray-400 mr-3 shrink-0" />}
                  <span className="text-xs font-bold text-gray-700 truncate">{entry.name}</span>
                </div>
                <span className="text-[10px] text-gray-400 ml-4 shrink-0">{entry.type === 'folder' ? 'Folder' : formatBytes(entry.size)}</span>
              </button>
            )) : (
              <div className="h-full p-8 flex flex-col items-center justify-center text-center">
                <Folder className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-sm font-bold text-gray-900">{loading ? 'Loading workspace files' : 'No files found'}</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">Click folders to browse and files to open them with the system default app.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
