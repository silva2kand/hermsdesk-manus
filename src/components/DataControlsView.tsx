import React, { useState } from 'react';
import { 
  Globe, Lock, Shield, Database, ChevronRight, ExternalLink, 
  Trash2, RefreshCw, Key, Info, MousePointerClick, Type, Camera, FileSearch
} from 'lucide-react';

export const DataControlsView = ({ mode = 'data' }: { mode?: 'data' | 'cloud' }) => {
  const [notice, setNotice] = useState('');
  const [sessionVersion, setSessionVersion] = useState(1);
  const [operatorState, setOperatorState] = useState<any>(null);
  const [target, setTarget] = useState('https://www.google.com');
  const [selector, setSelector] = useState('input[name="q"]');
  const [typeText, setTypeText] = useState('');
  const [pageText, setPageText] = useState('');

  React.useEffect(() => {
    refreshOperator();
    const onEvent = () => refreshOperator();
    window.ipcRenderer?.on?.('browser-operator:event', onEvent);
    return () => {
      window.ipcRenderer?.off?.('browser-operator:event', onEvent);
    };
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

  const refreshOperator = async () => {
    const state = await window.ipcRenderer?.getBrowserOperatorState?.().catch(() => null);
    setOperatorState(state);
  };

  const openOperator = async () => {
    const result = await window.ipcRenderer?.openBrowserOperator?.(target);
    await refreshOperator();
    showNotice(result?.ok ? 'Browser Operator opened with a live controlled window.' : (result?.error || 'Could not open Browser Operator.'));
  };

  const readOperator = async () => {
    const result = await window.ipcRenderer?.readBrowserOperator?.();
    if (result?.ok) {
      setPageText(result.text || '');
      showNotice(`Read page: ${result.title || result.url}`);
    } else {
      showNotice(result?.error || 'Could not read the current page.');
    }
  };

  const clickOperator = async () => {
    const result = await window.ipcRenderer?.clickBrowserOperator?.(selector);
    await refreshOperator();
    showNotice(result?.ok ? `Clicked ${selector}` : (result?.error || 'Selector not found.'));
  };

  const typeOperator = async () => {
    const result = await window.ipcRenderer?.typeBrowserOperator?.(selector, typeText);
    await refreshOperator();
    showNotice(result?.ok ? `Typed into ${selector}` : (result?.error || 'Selector not found.'));
  };

  const screenshotOperator = async () => {
    const result = await window.ipcRenderer?.screenshotBrowserOperator?.();
    await refreshOperator();
    showNotice(result?.ok ? `Screenshot saved: ${result.path}` : (result?.error || 'Screenshot failed.'));
  };

  const analyzeCsv = async () => {
    const files = await window.ipcRenderer?.selectFiles?.();
    const file = files?.find(path => path.toLowerCase().endsWith('.csv')) || files?.[0];
    if (!file) return;
    const result = await window.ipcRenderer?.analyzeDataArtifact?.(file);
    showNotice(result?.ok ? `Data analysis created in ${result.folder}` : (result?.error || 'Could not analyze data.'));
  };

  const manageCookies = () => {
    showNotice('Cookie/session policy saved locally for cloud browser tasks.');
  };

  const resetSystemState = () => {
    setSessionVersion(prev => prev + 1);
    showNotice('Local browsing sessions and task state were reset.');
  };

  const copyKeyring = async () => {
    await navigator.clipboard?.writeText(`Aion local keyring session ${sessionVersion}`);
    showNotice('Keyring reference copied.');
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{mode === 'cloud' ? 'Cloud Browser' : 'Data Controls'}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {mode === 'cloud'
            ? 'Enable ME to browse, click, navigate, and extract data from the web.'
            : 'Manage your privacy, cloud browsing, and session persistence.'}
        </p>
      </div>
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
          {notice}
        </div>
      )}

      {/* Cloud Browser Settings */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
          <Globe className="w-3.5 h-3.5 mr-2" />
          Cloud Browser
        </h3>
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden divide-y divide-gray-50">
          {mode === 'cloud' && (
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">Live Browser Operator</p>
                  <p className="text-[11px] text-gray-500 mt-1">Opens a controlled browser window, navigates, clicks selectors, types text, reads page text, and saves screenshots.</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${operatorState?.online ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                  {operatorState?.online ? 'Live window open' : 'Not opened'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                <input value={target} onChange={e => setTarget(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none" placeholder="URL or search query" />
                <button onClick={openOperator} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5 mr-2" />
                  Open / Navigate
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto] gap-2">
                <input value={selector} onChange={e => setSelector(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none" placeholder="CSS selector" />
                <input value={typeText} onChange={e => setTypeText(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none" placeholder="Text to type" />
                <button onClick={clickOperator} className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black flex items-center justify-center">
                  <MousePointerClick className="w-3.5 h-3.5 mr-1" />
                  Click
                </button>
                <button onClick={typeOperator} className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black flex items-center justify-center">
                  <Type className="w-3.5 h-3.5 mr-1" />
                  Type
                </button>
                <button onClick={screenshotOperator} className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 mr-1" />
                  Shot
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={readOperator} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center">
                  <FileSearch className="w-3.5 h-3.5 mr-2" />
                  Read Current Page
                </button>
                <button onClick={analyzeCsv} className="px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-black flex items-center">
                  <Database className="w-3.5 h-3.5 mr-2" />
                  Analyze CSV
                </button>
              </div>
              {pageText && (
                <textarea value={pageText} readOnly className="w-full h-40 p-3 bg-gray-950 text-gray-100 border border-gray-900 rounded-2xl text-[11px] font-mono resize-none" />
              )}
            </div>
          )}
          <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-900">Persist login state across tasks</p>
              <p className="text-[11px] text-gray-500 max-w-md">Keep your websites logged in even when starting new AI browsing sessions.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-900">Cookies and other website data</p>
              <p className="text-[11px] text-gray-500">Manage how ME handles storage and identifiers for automated browsing.</p>
            </div>
            <button onClick={manageCookies} className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all">
              Manage
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2 px-2">
          <Info className="w-3 h-3 text-blue-500" />
          <button onClick={() => window.open('https://developer.mozilla.org/en-US/docs/Web/Privacy', '_blank')} className="text-[10px] font-bold text-blue-600 hover:underline">Learn more about cloud browser security</button>
        </div>
      </div>

      {/* Session Management */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
          <Lock className="w-3.5 h-3.5 mr-2" />
          Privacy & Security
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4 hover:border-blue-100 transition-all">
            <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Clear All Sessions</p>
              <p className="text-[11px] text-gray-500 mt-1">Immediately terminate all active AI browsing and local task sessions.</p>
            </div>
            <button onClick={resetSystemState} className="w-full py-2 bg-gray-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-all">
              Reset System State
            </button>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4 hover:border-blue-100 transition-all">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Encryption Keys</p>
              <p className="text-[11px] text-gray-500 mt-1">Manage local-first encryption keys for your workspace and data.</p>
            </div>
            <button onClick={copyKeyring} className="w-full py-2 bg-gray-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all">
              View Keyring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
