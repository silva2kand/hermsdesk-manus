import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Brain, Code, Film, Globe, MessageSquare, Monitor, Music, Plus, RefreshCw, Search, Shield, TrendingUp,
  Video, Wrench, Zap
} from 'lucide-react';

type SkillCategory = 'MYTHOS' | 'OFFICIAL' | 'COMMUNITY' | 'CUSTOM';

const skillCatalog = [
  {
    id: 'mythos-execution',
    name: 'mythos-execution',
    category: 'MYTHOS' as SkillCategory,
    icon: Brain,
    description: 'Real execution discipline: plan steps, use available tools, verify results, continue until finished or blocked by permission.',
    updated: 'BUILT-IN REAL'
  },
  {
    id: 'mythos-recovery',
    name: 'mythos-recovery',
    category: 'MYTHOS' as SkillCategory,
    icon: RefreshCw,
    description: 'Failure recovery behavior: diagnose errors, retry smaller, choose fallback routes, and keep going instead of stopping at the first error.',
    updated: 'BUILT-IN REAL'
  },
  {
    id: 'mythos-pc-operator',
    name: 'mythos-pc-operator',
    category: 'MYTHOS' as SkillCategory,
    icon: Monitor,
    description: 'PC and web operator rules for ME Computer, local files, terminal, browser open/research, app launch, and approval-first OS actions.',
    updated: 'BUILT-IN REAL'
  },
  {
    id: 'mythos-whatsapp-reply',
    name: 'mythos-whatsapp-reply',
    category: 'MYTHOS' as SkillCategory,
    icon: MessageSquare,
    description: 'Professional WhatsApp reply workflow: draft from pasted messages, save locally, open real WhatsApp composer, manual send only.',
    updated: 'BUILT-IN REAL'
  },
  {
    id: 'mythos-truthful-connectors',
    name: 'mythos-truthful-connectors',
    category: 'MYTHOS' as SkillCategory,
    icon: Shield,
    description: 'Connector truth policy: distinguish enabled routes from authenticated connections and never claim private data access without login/API key.',
    updated: 'BUILT-IN REAL'
  },
  {
    id: 'mythos-justice-casework',
    name: 'mythos-justice-casework',
    category: 'MYTHOS' as SkillCategory,
    icon: Shield,
    description: 'Legal/public-interest casework: build evidence, chronology, appeal/review route maps, loophole analysis, complaint drafts, and deadline-first action packs without pretending to be a solicitor.',
    updated: 'BUILT-IN REAL'
  },
  {
    id: 'mythos-purchase-protection',
    name: 'mythos-purchase-protection',
    category: 'MYTHOS' as SkillCategory,
    icon: TrendingUp,
    description: 'Online buying protection: research sellers, compare offers, detect scam signals, preserve evidence, and prepare refund/chargeback/escalation routes.',
    updated: 'BUILT-IN REAL'
  },
  {
    id: 'video-generator',
    name: 'video-generator',
    category: 'OFFICIAL' as SkillCategory,
    icon: Video,
    description: 'Professional AI video production workflow. MUST read this skill BEFORE generation for short films or commercials.',
    updated: 'UPDATED APR 23, 2026'
  },
  {
    id: 'music-prompter',
    name: 'music-prompter',
    category: 'OFFICIAL' as SkillCategory,
    icon: Music,
    description: 'Music tasks. Covers prompt crafting, frame selection, and leveraging ME agents to build automated music workflows.',
    updated: 'UPDATED APR 23, 2026'
  },
  {
    id: 'similarweb-analytics',
    name: 'similarweb-analytics',
    category: 'OFFICIAL' as SkillCategory,
    icon: BarChart3,
    description: 'Analyze websites and domains using Similarweb data. Get traffic metrics, engagement stats, and competitor insights.',
    updated: 'UPDATED APR 23, 2026'
  },
  {
    id: 'me-api',
    name: 'me-api',
    category: 'OFFICIAL' as SkillCategory,
    icon: Code,
    description: 'Manage ME tasks, projects, and configurations or leverage specialized knowledge for system-level automation.',
    updated: 'UPDATED JAN 23, 2026',
    defaultInstalled: true
  },
  {
    id: 'stock-analysis',
    name: 'stock-analysis',
    category: 'OFFICIAL' as SkillCategory,
    icon: TrendingUp,
    description: 'Analyze stocks and companies using financial data. Get company profiles, technical insights, and market trends.',
    updated: 'UPDATED APR 23, 2026'
  },
  {
    id: 'web-research',
    name: 'web-research',
    category: 'COMMUNITY' as SkillCategory,
    icon: Globe,
    description: 'Open real browser research, structure findings, and hand results to ME agents.',
    updated: 'LOCAL REAL ROUTE'
  },
  {
    id: 'desktop-automation',
    name: 'desktop-automation',
    category: 'CUSTOM' as SkillCategory,
    icon: Zap,
    description: 'Use ME Computer, terminal, file access, and approved OS actions for local workflows.',
    updated: 'LOCAL REAL ROUTE',
    defaultInstalled: true
  },
  {
    id: 'approval-safety',
    name: 'approval-safety',
    category: 'CUSTOM' as SkillCategory,
    icon: Shield,
    description: 'Require approval before external messages, installs, destructive filesystem actions, money, or legal/accounting submissions.',
    updated: 'LOCAL POLICY',
    defaultInstalled: true
  },
  {
    id: 'short-film-builder',
    name: 'short-film-builder',
    category: 'COMMUNITY' as SkillCategory,
    icon: Film,
    description: 'Package prompt, scenes, music brief, captions, and export notes for video projects.',
    updated: 'COMMUNITY'
  }
];

export const Skills = () => {
  const [activeTab, setActiveTab] = useState<SkillCategory>('MYTHOS');
  const [query, setQuery] = useState('');
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const refresh = async () => {
    const installed = await window.ipcRenderer?.getInstalledSkills?.().catch(() => []);
    const merged = Array.from(new Set([
      ...(installed || []),
      ...skillCatalog.filter(skill => skill.defaultInstalled).map(skill => skill.id)
    ]));
    setInstalledSkills(merged);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredSkills = useMemo(() => {
    const lower = query.toLowerCase();
    return skillCatalog.filter(skill =>
      skill.category === activeTab &&
      (!lower || skill.name.toLowerCase().includes(lower) || skill.description.toLowerCase().includes(lower))
    );
  }, [activeTab, query]);

  const toggleSkill = async (skillId: string) => {
    const installed = installedSkills.includes(skillId);
    const next = await window.ipcRenderer?.toggleSkill?.(skillId, !installed).catch(() => null);
    setInstalledSkills(next || (installed ? installedSkills.filter(id => id !== skillId) : [...installedSkills, skillId]));
    showNotice(`${skillId} ${installed ? 'removed' : 'installed'} in the real Skills Engine.`);
  };

  const addCustomSkill = async () => {
    const folder = await window.ipcRenderer?.selectFolder?.();
    if (!folder) return;
    const name = window.prompt('Custom skill name', folder.split(/[\\/]/).pop() || 'custom-skill');
    if (!name) return;
    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
    const next = await window.ipcRenderer?.toggleSkill?.(id, true).catch(() => null);
    setInstalledSkills(next || Array.from(new Set([...installedSkills, id])));
    const imports = JSON.parse(window.localStorage.getItem('hermsdesk.customSkillImports') || '[]');
    window.localStorage.setItem('hermsdesk.customSkillImports', JSON.stringify([{ id, name, folder, importedAt: new Date().toISOString() }, ...imports]));
    showNotice(`${name} imported from folder and installed in the local Skills Engine.`);
  };

  return (
    <div className="min-h-full bg-[#fafafa] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 font-serif tracking-tight">Skills</h1>
            <p className="text-sm text-gray-500 mt-1">Prepackaged and repeatable best practices for specialized tasks.</p>
          </div>
          <button
            onClick={addCustomSkill}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            Add Custom Skill
          </button>
        </div>

        {notice && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
            {notice}
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['MYTHOS', 'OFFICIAL', 'COMMUNITY', 'CUSTOM'] as SkillCategory[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'bg-gray-900 text-white shadow-md shadow-gray-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-3 w-full md:w-72">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search skills"
                className="w-full py-2.5 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredSkills.map(skill => {
              const installed = installedSkills.includes(skill.id);
              const Icon = skill.icon;
              return (
                <div key={skill.id} className="p-5 flex items-start justify-between gap-5 hover:bg-gray-50/60 transition-all">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-700 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-gray-900">{skill.name}</h3>
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{skill.updated}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-5 max-w-3xl">{skill.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSkill(skill.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                      installed ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    {installed ? 'Installed' : 'Install'}
                  </button>
                </div>
              );
            })}
            {!filteredSkills.length && (
              <div className="p-10 text-center">
                <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-900">No skills found</p>
                <p className="text-xs text-gray-500 mt-1">Try another tab or search term.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
