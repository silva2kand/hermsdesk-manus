import React, { useState } from 'react';
import { 
  Globe, Lock, Shield, Database, ChevronRight, ExternalLink, 
  Trash2, RefreshCw, Key, Info
} from 'lucide-react';

export const DataControlsView = ({ mode = 'data' }: { mode?: 'data' | 'cloud' }) => {
  const [notice, setNotice] = useState('');
  const [sessionVersion, setSessionVersion] = useState(1);

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
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
