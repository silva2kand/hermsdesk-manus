import React, { useEffect, useState } from 'react';
import { Puzzle, Check, Info, Star, Download, Cable, Zap } from 'lucide-react';

export const Plugins = () => {
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const [connectors, setConnectors] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const refresh = async () => {
      const [skills, connectorState] = await Promise.all([
        window.ipcRenderer?.getInstalledSkills?.().catch(() => []),
        window.ipcRenderer?.getConnectors?.().catch(() => ({}))
      ]);
      setInstalledSkills(skills || []);
      setConnectors(connectorState || {});
    };
    refresh();
  }, []);

  const plugins = [
    { id: 'hermes-full', name: 'Hermes Agent', author: 'Local Agent Runtime', description: 'System architecture, coding, terminal, files, and task orchestration.', installed: true, version: '1.8.0' },
    { id: 'paperclip-full', name: 'Paperclips', author: 'Local Agent Runtime', description: 'Mail, document routing, organization, and approval-first workflow intelligence.', installed: true, version: '1.8.0' },
    { id: 'openclaw-full', name: 'OpenClaw', author: 'Local Agent Runtime', description: 'Security checks, system audit, and forensic-style diagnostics.', installed: true, version: '1.8.0' },
    { id: 'solicitor-agent', name: 'Solicitor Core', author: 'UK Legal', description: 'UK legal-style drafting and property/legal issue analysis with safety disclaimers.', installed: true, version: '1.8.0' },
  ];

  const activeConnectorCount = Object.values(connectors).filter(Boolean).length;

  const toggleSkill = async (skillId: string) => {
    const installed = installedSkills.includes(skillId);
    const next = await window.ipcRenderer.toggleSkill?.(skillId, !installed);
    setInstalledSkills(next || []);
    setNotice(`${skillId} ${installed ? 'disabled' : 'enabled'} as a plugin channel.`);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const showPluginDetails = async (plugin: any) => {
    const details = [
      `${plugin.name} v${plugin.version}`,
      `Author: ${plugin.author}`,
      '',
      plugin.description,
      '',
      `Installed: ${plugin.installed ? 'yes' : installedSkills.includes(plugin.id) ? 'enabled as skill channel' : 'no'}`
    ].join('\n');
    await navigator.clipboard?.writeText(details);
    setNotice(`${plugin.name} details copied.`);
    window.setTimeout(() => setNotice(''), 3000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plugin Channels</h1>
        <p className="text-sm text-gray-500 mt-1">Real agent, skill, connector, and model channels available to ME workflows.</p>
      </div>

      {notice && <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">{notice}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-gray-100 rounded-2xl">
          <Cable className="w-5 h-5 text-blue-600 mb-3" />
          <p className="text-xs font-black text-gray-900 uppercase">Connector Channels</p>
          <p className="text-2xl font-black text-gray-900 mt-2">{activeConnectorCount}</p>
          <p className="text-[10px] text-gray-500 mt-1">Enabled connector routes from the Connectors page.</p>
        </div>
        <div className="p-5 bg-white border border-gray-100 rounded-2xl">
          <Puzzle className="w-5 h-5 text-purple-600 mb-3" />
          <p className="text-xs font-black text-gray-900 uppercase">Skill Channels</p>
          <p className="text-2xl font-black text-gray-900 mt-2">{installedSkills.length}</p>
          <p className="text-[10px] text-gray-500 mt-1">Installed reusable workflows exposed to agents.</p>
        </div>
        <div className="p-5 bg-white border border-gray-100 rounded-2xl">
          <Zap className="w-5 h-5 text-orange-600 mb-3" />
          <p className="text-xs font-black text-gray-900 uppercase">Default Model</p>
          <p className="text-sm font-black text-gray-900 mt-2">Jan + TurboQuant</p>
          <p className="text-[10px] text-gray-500 mt-1">Always default, user-changeable in Chat Lab.</p>
        </div>
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
                  <button onClick={() => toggleSkill(plugin.id)} className="flex items-center text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                    <Download className="w-3 h-3 mr-1" />
                    Install
                  </button>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{plugin.name}</h3>
                <p className="text-[10px] text-gray-400 font-medium">by {plugin.author} - v{plugin.version}</p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{plugin.description}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-bold text-gray-700">4.9</span>
              </div>
              <button onClick={() => showPluginDetails(plugin)} className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors">View details</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900">Installed Skill Plugin Channels</h2>
            <p className="text-xs text-gray-500 mt-1">Toggle reusable workflow channels. These are real stored skill flags used by the Skills Engine.</p>
          </div>
          <Info className="w-4 h-4 text-gray-300" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['me-api', 'skill-creator', 'os-control', 'file-explorer', 'wide-research', 'project-workspace', 'scheduled-runner'].map(skill => (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${installedSkills.includes(skill) ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
