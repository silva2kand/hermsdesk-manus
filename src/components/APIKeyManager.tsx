import React, { useState, useEffect } from 'react';
import { Key, Shield, Check, RefreshCw, Eye, EyeOff, Save } from 'lucide-react';

export const APIKeyManager = () => {
  const [keys, setKeys] = useState<{[key: string]: string}>({
    gemini: '',
    openrouter: '',
    nvidia: '',
    huggingface: ''
  });
  const [visible, setVisible] = useState<{[key: string]: boolean}>({});
  const [saving, setSaving] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const fetchKeys = async () => {
      if (window.ipcRenderer) {
        const storedKeys = await window.ipcRenderer.getAPIKeys();
        setKeys(prev => ({ ...prev, ...storedKeys }));
      }
    };
    fetchKeys();
  }, []);

  const handleSave = async (provider: string) => {
    if (!window.ipcRenderer) return;
    
    setSaving(prev => ({ ...prev, [provider]: true }));
    try {
      await window.ipcRenderer.saveAPIKey(provider, keys[provider]);
      setTimeout(() => {
        setSaving(prev => ({ ...prev, [provider]: false }));
      }, 1000);
    } catch (e) {
      console.error('Failed to save API key:', e);
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  const toggleVisibility = (provider: string) => {
    setVisible(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const providers = [
    { id: 'gemini', name: 'Google Gemini', icon: Shield, description: 'Required for Gemini 1.5 Pro/Flash' },
    { id: 'openrouter', name: 'OpenRouter', icon: Key, description: 'Access 100+ models via one API' },
    { id: 'nvidia', name: 'NVIDIA NIM', icon: RefreshCw, description: 'High-performance inference' },
    { id: 'huggingface', name: 'Hugging Face', icon: Key, description: 'Required for private models and higher limits' }
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Cloud API Keys</h2>
        <p className="text-sm text-gray-500 mt-1">Manage credentials for cloud-based AI providers. Keys are stored securely on your machine.</p>
      </div>

      <div className="space-y-4">
        {providers.map((p) => (
          <div key={p.id} className="p-6 bg-white border border-gray-100 rounded-[32px] hover:border-blue-100 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                  <p.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{p.name}</h4>
                  <p className="text-[10px] text-gray-400 font-medium">{p.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input 
                  type={visible[p.id] ? 'text' : 'password'}
                  value={keys[p.id] || ''}
                  onChange={(e) => setKeys(prev => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder={`Enter your ${p.name} API key`}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button 
                  onClick={() => toggleVisibility(p.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {visible[p.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button 
                onClick={() => handleSave(p.id)}
                disabled={saving[p.id]}
                className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center space-x-2 ${
                  saving[p.id] ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {saving[p.id] ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Key</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[32px] flex items-start space-x-4">
        <Shield className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-gray-900">Security Note</h4>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Your API keys are stored locally using Electron Store and are never sent to our servers. They are only used to authenticate requests directly with the respective providers.
          </p>
        </div>
      </div>
    </div>
  );
};