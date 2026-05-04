import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Video, Music, Globe, BarChart3, 
  Cpu, Wrench, ChevronRight, Star, Clock, Info,
  ExternalLink, Check, Sparkles, Layout, Zap, Database, Brain, RefreshCw, Monitor, MessageSquare, Shield
} from 'lucide-react';

export const SkillsRegistry = () => {
  const [activeTab, setActiveTab] = useState('Mythos');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);

  useEffect(() => {
    const fetchInstalled = async () => {
      if (window.ipcRenderer) {
        const installed = await (window.ipcRenderer as any).getInstalledSkills();
        setInstalledSkills(installed);
      }
    };
    fetchInstalled();
  }, []);

  const handleToggleSkill = async (skillId: string) => {
    if (window.ipcRenderer) {
      const isInstalled = installedSkills.includes(skillId);
      const updated = await (window.ipcRenderer as any).toggleSkill(skillId, !isInstalled);
      setInstalledSkills(updated);
    }
  };

  const handleAddCustomSkill = async () => {
    const folder = await window.ipcRenderer?.selectFolder?.();
    if (!folder) return;
    const name = window.prompt('Custom skill name', folder.split(/[\\/]/).pop() || 'custom-skill');
    if (!name) return;
    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
    const updated = await (window.ipcRenderer as any).toggleSkill(id, true);
    setInstalledSkills(updated);
    const imports = JSON.parse(window.localStorage.getItem('hermsdesk.customSkillImports') || '[]');
    window.localStorage.setItem('hermsdesk.customSkillImports', JSON.stringify([{ id, name, folder, importedAt: new Date().toISOString() }, ...imports]));
  };

  const skills = [
    {
      id: 'mythos-execution',
      name: 'mythos-execution',
      desc: 'Real execution discipline: plan steps, use available tools, verify results, continue until finished or blocked by permission.',
      icon: Brain,
      color: 'bg-gray-900',
      category: 'Mythos',
      updated: 'Built-in'
    },
    {
      id: 'mythos-recovery',
      name: 'mythos-recovery',
      desc: 'Diagnose errors, retry smaller, choose fallback routes, and keep going instead of stopping at the first error.',
      icon: RefreshCw,
      color: 'bg-blue-600',
      category: 'Mythos',
      updated: 'Built-in'
    },
    {
      id: 'mythos-pc-operator',
      name: 'mythos-pc-operator',
      desc: 'Use ME Computer, local files, terminal, browser open/research, app launch, and approval-first OS actions.',
      icon: Monitor,
      color: 'bg-slate-700',
      category: 'Mythos',
      updated: 'Built-in'
    },
    {
      id: 'mythos-whatsapp-reply',
      name: 'mythos-whatsapp-reply',
      desc: 'Draft professional WhatsApp replies from pasted messages, save drafts, and open real WhatsApp composer.',
      icon: MessageSquare,
      color: 'bg-green-600',
      category: 'Mythos',
      updated: 'Built-in'
    },
    {
      id: 'mythos-truthful-connectors',
      name: 'mythos-truthful-connectors',
      desc: 'Never claim connected/private data access unless login or API key is actually present.',
      icon: Shield,
      color: 'bg-orange-600',
      category: 'Mythos',
      updated: 'Built-in'
    },
    {
      id: 'video-generator',
      name: 'video-generator',
      desc: 'Professional AI video production workflow. MUST read this skill BEFORE entering generation for short films or commercials.',
      icon: Video,
      color: 'bg-red-500',
      category: 'Official',
      updated: 'Apr 23, 2026'
    },
    {
      id: 'music-prompter',
      name: 'music-prompter',
      desc: 'Music tasks. Covers prompt crafting, frame selection, and leveraging ME agents to build automated music workflows.',
      icon: Music,
      color: 'bg-blue-500',
      category: 'Official',
      updated: 'Apr 23, 2026'
    },
    {
      id: 'similarweb-analytics',
      name: 'similarweb-analytics',
      desc: 'Analyze websites and domains using Similarweb data. Get traffic metrics, engagement stats, and competitor insights.',
      icon: Globe,
      color: 'bg-blue-600',
      category: 'Official',
      updated: 'Apr 23, 2026'
    },
    {
      id: 'me-api',
      name: 'me-api',
      desc: 'Manage ME tasks, projects, and configurations or leverage specialized knowledge for system-level automation.',
      icon: Zap,
      color: 'bg-orange-500',
      category: 'Official',
      updated: 'Jan 23, 2026'
    },
    {
      id: 'stock-analysis',
      name: 'stock-analysis',
      desc: 'Analyze stocks and companies using financial data. Get company profiles, technical insights, and market trends.',
      icon: BarChart3,
      color: 'bg-green-600',
      category: 'Official',
      updated: 'Jan 23, 2026'
    },
    {
      id: 'skill-creator',
      name: 'skill-creator',
      desc: 'Guide for creating or updating skills that provide specialized workflows, knowledge, or tool integrations.',
      icon: Wrench,
      color: 'bg-purple-600',
      category: 'Official',
      updated: 'Feb 16, 2026'
    }
  ];

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Skills</h2>
          <p className="text-sm text-gray-500 mt-1">Prepackaged and repeatable best practices for specialized tasks.</p>
        </div>
        <button onClick={handleAddCustomSkill} className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Skill
        </button>
      </div>

      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 border-b border-gray-100 flex-1">
            <button 
              onClick={() => setActiveTab('Mythos')}
              className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'Mythos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Mythos
            </button>
            <button 
              onClick={() => setActiveTab('Official')}
              className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'Official' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Official
            </button>
            <button 
              onClick={() => setActiveTab('Community')}
              className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'Community' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Community
            </button>
            <button 
              onClick={() => setActiveTab('Custom')}
              className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'Custom' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Custom
            </button>
          </div>
          <div className="relative ml-8 max-w-xs flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.filter(skill =>
            skill.category === activeTab &&
            (!searchQuery || skill.name.toLowerCase().includes(searchQuery.toLowerCase()) || skill.desc.toLowerCase().includes(searchQuery.toLowerCase()))
          ).map((skill) => (
            <div key={skill.id} className="group p-6 bg-white border border-gray-100 rounded-[32px] hover:border-blue-100 hover:shadow-xl hover:shadow-gray-100 transition-all cursor-pointer">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 ${skill.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-gray-200 transition-transform group-hover:scale-105`}>
                  <skill.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-900">{skill.name}</h3>
                    <Star className="w-3.5 h-3.5 text-gray-200 hover:text-yellow-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{skill.desc}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Updated {skill.updated}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSkill(skill.id);
                      }}
                      className={`flex items-center text-[10px] font-black uppercase tracking-widest transition-all ${
                        installedSkills.includes(skill.id) 
                        ? 'text-green-600 bg-green-50 px-2 py-1 rounded-lg' 
                        : 'text-blue-600 hover:underline'
                      }`}
                    >
                      {installedSkills.includes(skill.id) ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Installed
                        </>
                      ) : (
                        <>
                          Install
                          <Plus className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
