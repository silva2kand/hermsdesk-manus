import React, { useMemo, useState } from 'react';
import {
  Activity, CheckCircle2, AlertTriangle, ShieldCheck, Play,
  Search, FolderOpen, Terminal, RefreshCw, Rocket
} from 'lucide-react';
import { hermesAgents, HermesAgent } from '../data/hermesAgents';

const statusStyle: Record<string, string> = {
  ready: 'bg-green-50 text-green-700 border-green-100',
  'needs-connector': 'bg-orange-50 text-orange-700 border-orange-100',
  'needs-approval': 'bg-blue-50 text-blue-700 border-blue-100'
};

const statusLabel: Record<string, string> = {
  ready: 'Ready',
  'needs-connector': 'Needs connector',
  'needs-approval': 'Approval gated'
};

export const AgentsMonitor = ({ 
  agents = [], 
  onAgentAction 
}: { 
  agents?: any[], 
  onAgentAction?: (id: string, action: string) => void 
}) => {
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [activity, setActivity] = useState([
    { agent: 'Space Coding Agent', action: 'Build verification passed', time: new Date().toLocaleTimeString() },
    { agent: 'Paperclip Mail Organizer', action: 'Routing rules ready for Mail ME approvals', time: new Date().toLocaleTimeString() }
  ]);

  const displayAgents = agents.length > 0 ? agents : hermesAgents;

  const filteredAgents = useMemo(() => {
    const q = query.toLowerCase();
    return displayAgents.filter(agent =>
      agent.name.toLowerCase().includes(q) ||
      agent.role.toLowerCase().includes(q) ||
      (agent.capability && agent.capability.toLowerCase().includes(q)) ||
      (agent.connector && agent.connector.toLowerCase().includes(q))
    );
  }, [query, displayAgents]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const runAgentAction = async (agent: any) => {
    const next = { agent: agent.name, action: 'Initializing ME 1.7 production module...', time: new Date().toLocaleTimeString() };
    setActivity(prev => [next, ...prev].slice(0, 8));

    if (onAgentAction) {
      if (agent.id === 'justice-case-agent') {
        const brief = window.prompt('Describe the legal issue, decision, evidence, deadlines, and outcome wanted.');
        if (!brief) return;
        await window.ipcRenderer?.createJusticeCasePack?.('Justice Case Pack', brief);
        await window.ipcRenderer?.openBrowserOperator?.('GOV.UK legal appeal complaint ombudsman court tribunal guidance');
        showNotice('Justice Case Pack created and official route research opened in Browser Operator.');
        return;
      }
      if (agent.id === 'purchase-guardian-agent') {
        const brief = window.prompt('Describe the product, seller, website, payment method, and concern.');
        if (!brief) return;
        await window.ipcRenderer?.createPurchaseProtectionPack?.('Purchase Protection Pack', brief);
        await window.ipcRenderer?.openBrowserOperator?.(brief);
        showNotice('Purchase Protection Pack created and seller/product research opened in Browser Operator.');
        return;
      }
      onAgentAction(agent.id, 'open');
      showNotice(`${agent.name} is now active and monitoring the system. Check the Console for live logs.`);
      return;
    }

    if (agent.id.endsWith('-full')) {
      if (window.ipcRenderer) {
        await window.ipcRenderer.createAgentTask(`Initialize ${agent.name} protocol`, agent.id);
        showNotice(`${agent.name} is now active and monitoring the system. Check the Console for live logs.`);
      }
      return;
    }

    if (agent.id === 'hermes-pc') {
      const scan = await window.ipcRenderer?.scanPC?.();
      showNotice(scan ? `PC scan: ${scan.gpu}, ${scan.ram} RAM, ${scan.os}` : 'PC scan is available in the Electron app.');
      return;
    }

    if (agent.id === 'paperclip-docs') {
      const folder = await window.ipcRenderer?.selectFolder?.();
      showNotice(folder ? `Paperclip can organize after approval: ${folder}` : 'No folder selected.');
      return;
    }

    if (agent.id === 'space-research' || agent.id === 'hermes-scam-shield') {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(agent.role), '_blank');
      showNotice('Opened live research in your browser for review.');
      return;
    }

    showNotice(`${agent.name} is ready. It will ask before sending, filing, paying, installing, or changing anything.`);
  };

  return (
    <div className="h-full bg-[#fafafa] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Hermes Agents Monitor</h1>
                <p className="text-sm text-gray-500 mt-1">Real approval-gated agents for email, documents, web research, PC repair, legal, accounting, property, and coding workflows.</p>
              </div>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {notice && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Metric icon={Activity} label="Agents" value={hermesAgents.length} />
          <Metric icon={ShieldCheck} label="Approval gated" value={hermesAgents.filter(a => a.status !== 'ready').length} />
          <Metric icon={CheckCircle2} label="Ready now" value={hermesAgents.filter(a => a.status === 'ready').length} />
          <Metric icon={AlertTriangle} label="Need connectors" value={hermesAgents.filter(a => a.status === 'needs-connector').length} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.map(agent => (
              <div key={agent.id} className="bg-white border border-gray-100 rounded-[28px] p-5 hover:border-blue-100 hover:shadow-xl hover:shadow-gray-100 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 ${agent.color} rounded-2xl flex items-center justify-center text-white shadow-sm`}>
                      <agent.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-gray-900">{agent.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-[9px] font-black text-gray-400 uppercase">{agent.group}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-600 mt-1">{agent.role}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase ${statusStyle[agent.status]}`}>
                    {statusLabel[agent.status]}
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed mt-4">{agent.capability}</p>

                <div className="mt-4 space-y-2">
                  <InfoLine icon={FolderOpen} label="Connectors" value={agent.connector} />
                  <InfoLine icon={ShieldCheck} label="Approval" value={agent.approval} />
                </div>

                <button
                  onClick={() => runAgentAction(agent)}
                  className="mt-5 w-full flex items-center justify-center px-4 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-gray-800 transition-all"
                >
                  <Play className="w-3.5 h-3.5 mr-2" />
                  Open workflow
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-[28px] p-5 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Live Agent Table</h2>
              <RefreshCw className="w-4 h-4 text-gray-300" />
            </div>
            <div className="space-y-3">
              {activity.map((item, idx) => (
                <div key={`${item.agent}-${idx}`} className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[11px] font-black text-gray-900">{item.agent}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.action}</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase">{item.time}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-2xl flex items-start space-x-2">
              <Terminal className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-orange-700 leading-relaxed">
                Agents can prepare, inspect, and organize. Destructive actions, payments, installs, submissions, and external messages require your approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }: any) => (
  <div className="bg-white border border-gray-100 rounded-3xl p-5">
    <Icon className="w-4 h-4 text-blue-600 mb-3" />
    <p className="text-2xl font-black text-gray-900">{value}</p>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{label}</p>
  </div>
);

const InfoLine = ({ icon: Icon, label, value }: any) => (
  <div className="flex items-start space-x-2">
    <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
    <p className="text-[10px] text-gray-500 leading-relaxed">
      <span className="font-black text-gray-700 uppercase">{label}: </span>
      {value}
    </p>
  </div>
);
