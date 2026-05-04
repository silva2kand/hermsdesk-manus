import React, { useEffect, useState } from 'react';
import { Brain, Save, Shield } from 'lucide-react';

export const Memory = () => {
  const [memory, setMemory] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    window.ipcRenderer?.getSilvaMemory?.().then(setMemory);
  }, []);

  const save = async () => {
    await window.ipcRenderer?.saveSilvaMemory?.(memory);
    setNotice('Silva master memory saved locally.');
    window.setTimeout(() => setNotice(''), 3000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Silva Master Memory</h1>
            <p className="text-sm text-gray-500 mt-1">Canonical local memory for Silva agents. Additive, approval-first, never overwritten silently.</p>
          </div>
        </div>
        <button onClick={save} className="px-5 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-gray-800 transition-all flex items-center">
          <Save className="w-4 h-4 mr-2" />
          Save Memory
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
          {notice}
        </div>
      )}

      <textarea
        value={memory}
        onChange={(e) => setMemory(e.target.value)}
        className="w-full min-h-[520px] p-5 bg-white border border-gray-100 rounded-3xl text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-100"
      />

      <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start space-x-4">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-gray-900">Privacy & Control</h3>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Stored locally with Electron Store. Agents can reference it, but updates are saved only through explicit app workflows.
          </p>
        </div>
      </div>
    </div>
  );
};
