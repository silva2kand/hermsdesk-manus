import React from 'react';
import { Puzzle, Check, Info, Star, Download } from 'lucide-react';

export const Plugins = () => {
  const plugins = [
    { name: 'Hermes Agent', author: 'OpenSource', description: 'Specialized for coding and complex logic.', installed: true, version: '1.2.0' },
    { name: 'Paperclips', author: 'AI Research', description: 'Advanced reasoning and mathematical solver.', installed: false, version: '0.8.5' },
    { name: 'OpenClaw', author: 'Community', description: 'Creative writing and long-form content generation.', installed: true, version: '2.1.1' },
    { name: 'Solicitor Core', author: 'UK Legal', description: 'UK-specific legal framework and compliance agent.', installed: true, version: '1.0.0' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Plugins</h1>
        <p className="text-sm text-gray-500 mt-1">Install and switch between different agent personalities and specialized engines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map((plugin) => (
          <div key={plugin.name} className="p-6 bg-white border border-gray-100 rounded-2xl flex flex-col justify-between group hover:shadow-md transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <Puzzle className="w-6 h-6 text-gray-600" />
                </div>
                {plugin.installed ? (
                  <span className="flex items-center text-[10px] font-bold text-green-600 uppercase bg-green-50 px-2 py-1 rounded-lg">
                    <Check className="w-3 h-3 mr-1" />
                    Installed
                  </span>
                ) : (
                  <button className="flex items-center text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                    <Download className="w-3 h-3 mr-1" />
                    Install
                  </button>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{plugin.name}</h3>
                <p className="text-[10px] text-gray-400 font-medium">by {plugin.author} ÔÇó v{plugin.version}</p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{plugin.description}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-bold text-gray-700">4.9</span>
              </div>
              <button className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors">View details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
