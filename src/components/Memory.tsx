import React from 'react';
import { Brain, Trash2, Search, Clock, Shield } from 'lucide-react';

export const Memory = () => {
  const memories = [
    { text: 'User prefers dark mode for coding tasks.', date: '2024-04-29' },
    { text: 'Project "Hermes" uses React and Electron.', date: '2024-04-28' },
    { text: 'Solicitor contact: Jane Doe (jane@example.com)', date: '2024-04-27' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Long-term Memory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage information the agent has learned about you and your projects.</p>
        </div>
        <div className="flex items-center space-x-2">
           <div className={`w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer`}>
              <div className={`absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm`} />
           </div>
           <span className="text-xs font-bold text-gray-700">Enabled</span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y">
        {memories.map((m, i) => (
          <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mt-1">
                <Brain className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-800 leading-relaxed">{m.text}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] text-gray-400 font-medium">Learned on {m.date}</span>
                </div>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start space-x-4">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-gray-900">Privacy & Control</h3>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            All memories are stored locally on your machine. We never upload your personal data to any server. 
            You can clear specific memories or reset the entire database at any time.
          </p>
        </div>
      </div>
    </div>
  );
};
