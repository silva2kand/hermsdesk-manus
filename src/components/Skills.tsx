import React from 'react';
import { Wrench, Plus, ChevronRight, Zap, Code, Globe, MessageSquare } from 'lucide-react';

export const Skills = () => {
  const skills = [
    { name: 'Web Search', description: 'Search the internet for real-time information.', icon: Globe, enabled: true },
    { name: 'Python Interpreter', description: 'Run python code to perform calculations and data analysis.', icon: Code, enabled: true },
    { name: 'File Browser', description: 'Read and write local files with user permission.', icon: MessageSquare, enabled: false },
    { name: 'Desktop Automation', description: 'Control windows applications and perform tasks.', icon: Zap, enabled: true },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Skills</h1>
        <p className="text-sm text-gray-500 mt-1">Equip your agent with specialized capabilities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => (
          <div key={skill.name} className="p-6 bg-white border border-gray-100 rounded-2xl flex items-start justify-between group hover:shadow-md transition-all">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <skill.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{skill.name}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{skill.description}</p>
              </div>
            </div>
            <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${skill.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${skill.enabled ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </div>
        ))}

        <button className="p-6 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 hover:bg-gray-50 transition-colors">
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
            <Plus className="w-5 h-5 text-gray-400" />
          </div>
          <span className="text-xs font-bold text-gray-400">Add New Skill</span>
        </button>
      </div>
    </div>
  );
};
