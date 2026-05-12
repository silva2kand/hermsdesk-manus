import React, { useEffect, useState } from 'react';
import { Database, Plus, FileText, Globe, Search, Trash2 } from 'lucide-react';

export const Knowledge = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    window.ipcRenderer?.getKnowledge?.().then((items: any[]) => setSources(Array.isArray(items) ? items : [])).catch(() => setSources([]));
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const saveSources = async (next: any[]) => {
    setSources(next);
    await window.ipcRenderer?.saveKnowledge?.(next);
  };

  const addSource = async () => {
    const files = await window.ipcRenderer?.selectFiles?.().catch(() => []);
    if (files?.length) {
      const next = [
        ...files.map((file: string) => ({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.split(/[\\/]/).pop() || file,
          type: (file.split('.').pop() || 'file').toUpperCase(),
          path: file,
          size: 'local file',
          date: new Date().toISOString().slice(0, 10)
        })),
        ...sources
      ];
      await saveSources(next);
      showNotice(`${files.length} local source${files.length === 1 ? '' : 's'} added.`);
      return;
    }
    const url = window.prompt('Add URL knowledge source', 'https://');
    if (!url || url === 'https://') return;
    await saveSources([{
      id: `url-${Date.now()}`,
      name: url,
      type: 'URL',
      path: url,
      size: 'web',
      date: new Date().toISOString().slice(0, 10)
    }, ...sources]);
    showNotice('URL source added.');
  };

  const addFolder = async () => {
    const folder = await window.ipcRenderer?.selectFolder?.().catch(() => null);
    if (!folder) return;
    await saveSources([{
      id: `folder-${Date.now()}`,
      name: folder.split(/[\\/]/).pop() || folder,
      type: 'FOLDER',
      path: folder,
      size: 'local folder',
      date: new Date().toISOString().slice(0, 10)
    }, ...sources]);
    showNotice('Folder source added for local indexing.');
  };

  const removeSource = async (id: string) => {
    await saveSources(sources.filter(source => source.id !== id));
    showNotice('Knowledge source removed from local list.');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">Connect documents and URLs to provide context to your agent.</p>
        </div>
        <button onClick={addSource} className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </button>
      </div>

      {notice && <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">{notice}</div>}

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y">
        {sources.length === 0 && (
          <div className="p-6 text-sm text-gray-500">No knowledge sources saved yet. Add a local file, folder, or URL.</div>
        )}
        {sources.map((source) => (
          <div key={source.id || source.path || source.name} className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                {source.type === 'URL' ? <Globe className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{source.name || source.title || source.path}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{source.type || 'SOURCE'}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{source.size || 'local'}</span>
                  <span className="text-[10px] text-gray-400 font-medium">Added {source.date || 'today'}</span>
                </div>
                {source.path && <p className="text-[10px] text-gray-400 font-mono mt-1 truncate max-w-lg">{source.path}</p>}
              </div>
            </div>
            <button onClick={() => removeSource(source.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Remove source">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
         <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
            <Database className="w-6 h-6 text-gray-400" />
         </div>
         <div>
           <h3 className="text-sm font-bold text-gray-900">Index Local Folder</h3>
           <p className="text-xs text-gray-500 mt-1">Automatically index all documents in a folder for RAG.</p>
         </div>
         <button onClick={addFolder} className="px-4 py-2 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Select Folder</button>
      </div>
    </div>
  );
};
