import React from 'react';
import { Database, Plus, FileText, Globe, Search, Trash2 } from 'lucide-react';

export const Knowledge = () => {
  const sources = [
    { name: 'Company Handbook', type: 'PDF', size: '1.2 MB', date: '2024-04-20' },
    { name: 'Project Alpha Specs', type: 'DOCX', size: '450 KB', date: '2024-04-28' },
    { name: 'API Documentation', type: 'URL', size: 'N/A', date: '2024-04-25' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">Connect documents and URLs to provide context to your agent.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y">
        {sources.map((source) => (
          <div key={source.name} className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                {source.type === 'URL' ? <Globe className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{source.name}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{source.type}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{source.size}</span>
                  <span className="text-[10px] text-gray-400 font-medium">Added {source.date}</span>
                </div>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
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
         <button className="px-4 py-2 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Select Folder</button>
      </div>
    </div>
  );
};
