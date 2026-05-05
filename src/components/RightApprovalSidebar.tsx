import React, { useEffect, useMemo, useState } from 'react';
import { Check, X, RefreshCw, ShieldCheck, Mail, Bot, FolderOpen, Activity, Globe, Search, CalendarClock, Monitor, Scale, CreditCard, Radio } from 'lucide-react';

const agentNames: Record<string, string> = {
  'hermes-full': 'Hermes',
  'paperclip-full': 'Paperclips',
  'solicitor-agent': 'Solicitor',
  'accountant-agent': 'Accountant',
  'space-agent-full': 'Space',
  'openclaw-full': 'OpenClaw',
  'justice-case-agent': 'Justice',
  'purchase-guardian-agent': 'Purchase Guard'
};

const notificationIcons: Record<string, any> = {
  agent: Bot,
  automation: Activity,
  browser: Globe,
  research: Search,
  scheduler: CalendarClock,
  system: ShieldCheck
};

export const RightApprovalSidebar = ({ agents = [] }: { agents?: any[] }) => {
  const [pendingSkills, setPendingSkills] = useState<any[]>([]);
  const [emailIntel, setEmailIntel] = useState<any>({ folders: [], messages: [], summary: {} });
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [silvaEvents, setSilvaEvents] = useState<any[]>([]);

  const refresh = async () => {
    const [skills, intel] = await Promise.all([
      window.ipcRenderer?.getPendingSkills?.().catch(() => []),
      window.ipcRenderer?.getEmailIntelligence?.().catch(() => null)
    ]);
    setPendingSkills(skills || []);
    if (intel) setEmailIntel(intel);
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const push = (item: any) => setNotifications(prev => [{
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString(),
      ...item
    }, ...prev].slice(0, 20));

    const onAppLog = (_: any, log: any) => push({ type: log?.type || 'system', title: 'System', message: log?.content || 'Update' });
    const onAgentLog = (_: any, data: any) => push({ type: 'agent', title: agentNames[data?.agentId] || data?.agentId || 'Agent', message: data?.content || data?.status || 'Agent update' });
    const onAutomation = (_: any, event: any) => push({ type: 'automation', title: event?.title || event?.name || 'Automation', message: event?.detail || event?.message || event?.url || 'Automation step ran' });
    const onBrowser = (_: any, event: any) => push({ type: 'browser', title: event?.title || event?.action || 'Browser Operator', message: event?.text || event?.url || event?.message || 'Browser event' });
    const onWideResearch = (_: any, event: any) => push({ type: 'research', title: event?.title || 'Wide Research', message: event?.brief || event?.status || event?.message || 'Research lane updated' });
    const onScheduler = (_: any, event: any) => push({ type: 'scheduler', title: event?.title || 'Scheduled Task', message: event?.task || event?.message || 'Scheduled task updated' });
    const onMailUpdated = (_: any, event: any) => {
      push({ type: 'automation', title: `Mail ME ${event?.source || ''}`, message: `${event?.messageCount || 0} emails analyzed, ${event?.newTasks || 0} new agent tasks queued.` });
      refresh();
    };
    const onSilvaEvent = (_: any, event: any) => {
      setSilvaEvents(prev => [event, ...prev].slice(0, 80));
      push({
        type: event?.type?.startsWith('search.') ? 'research' : event?.type?.startsWith('agent.') ? 'agent' : 'automation',
        title: event?.type || 'Silva Event',
        message: event?.payload?.message || event?.payload?.query || event?.payload?.tool || event?.payload?.engine || event?.source || 'Event bus update'
      });
    };
    const onSyncMail = () => syncMail();

    window.ipcRenderer?.getSilvaEvents?.(80).then(events => setSilvaEvents(events || [])).catch(() => {});

    window.ipcRenderer?.on?.('app:log', onAppLog);
    window.ipcRenderer?.on?.('agent:update', onAgentLog);
    window.ipcRenderer?.on?.('automation:event', onAutomation);
    window.ipcRenderer?.on?.('browser-operator:event', onBrowser);
    window.ipcRenderer?.on?.('wide-research:run', onWideResearch);
    window.ipcRenderer?.on?.('scheduler:run', onScheduler);
    window.ipcRenderer?.on?.('mail:intelligence-updated', onMailUpdated);
    window.ipcRenderer?.on?.('mail:sync-intelligence', onSyncMail);
    window.ipcRenderer?.on?.('silva:event', onSilvaEvent);
    return () => {
      window.ipcRenderer?.off?.('app:log', onAppLog);
      window.ipcRenderer?.off?.('agent:update', onAgentLog);
      window.ipcRenderer?.off?.('automation:event', onAutomation);
      window.ipcRenderer?.off?.('browser-operator:event', onBrowser);
      window.ipcRenderer?.off?.('wide-research:run', onWideResearch);
      window.ipcRenderer?.off?.('scheduler:run', onScheduler);
      window.ipcRenderer?.off?.('mail:intelligence-updated', onMailUpdated);
      window.ipcRenderer?.off?.('mail:sync-intelligence', onSyncMail);
      window.ipcRenderer?.off?.('silva:event', onSilvaEvent);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      window.ipcRenderer?.getMicrosoftGraphStatus?.().then(status => {
        if (status?.connected) syncMail();
      }).catch(() => {});
    }, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const syncMail = async () => {
    setSyncing(true);
    try {
      const data = await window.ipcRenderer?.syncEmailIntelligence?.(20);
      if (data) setEmailIntel(data);
      setNotice(`Synced ${data?.messages?.length || 0} mail items across ${data?.folders?.length || 0} folders.`);
    } catch (error: any) {
      setNotice(error?.message || 'Connect Microsoft Graph before syncing mail.');
    } finally {
      setSyncing(false);
      window.setTimeout(() => setNotice(''), 4000);
    }
  };

  const approveSkill = async (id: string) => {
    await window.ipcRenderer?.approveSkill?.(id);
    refresh();
  };

  const denySkill = async (id: string) => {
    await window.ipcRenderer?.denySkill?.(id);
    refresh();
  };

  const routeItems = useMemo(() => {
    return (emailIntel.messages || [])
      .filter((message: any) => message.approvalStatus !== 'done')
      .slice(0, 30);
  }, [emailIntel]);

  const approveEmail = async (id: string, status: 'approved' | 'denied' | 'done') => {
    const target = routeItems.find((message: any) => message.id === id);
    const updated = await window.ipcRenderer?.approveEmailRoute?.(id, status);
    if (updated) setEmailIntel(updated);
    if (status === 'approved' && target?.agentId) {
      await window.ipcRenderer?.createAgentTask?.(
        `Approved email route for ${target.categoryLabel}.
Folder: ${target.folderName}
From: ${target.sender} <${target.senderEmail}>
Subject: ${target.subject}
Preview: ${target.bodyPreview}

Organize, summarize, and propose next actions. Do not send, delete, pay, submit, or externally contact anyone without approval.`,
        target.agentId
      );
      setNotice(`Fed email to ${agentNames[target.agentId] || target.agentId}.`);
      window.setTimeout(() => setNotice(''), 3000);
    }
  };

  return (
    <aside className="w-80 h-full bg-white border-l border-gray-100 flex flex-col shrink-0 z-[100] shadow-[-12px_0_32px_rgba(15,23,42,0.04)]">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Live Operations</h2>
          </div>
          <button onClick={refresh} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={syncMail}
          disabled={syncing}
          className="w-full px-3 py-2 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-300 flex items-center justify-center"
        >
          <Mail className="w-3.5 h-3.5 mr-2" />
          {syncing ? 'Syncing mail...' : 'Sync all mail folders'}
        </button>
        {notice && <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-bold text-blue-700">{notice}</div>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <section className="rounded-2xl bg-gray-950 text-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Operations Cockpit</p>
              <h3 className="text-sm font-black tracking-tight">Real-time tasking</h3>
            </div>
            <Activity className="w-5 h-5 text-blue-300" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 p-2">
              <p className="text-lg font-black">{agents.filter(a => a.status !== 'stopped').length}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-300">Agents</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2">
              <p className="text-lg font-black">{silvaEvents.length}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-300">Bus</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2">
              <p className="text-lg font-black">{pendingSkills.length + routeItems.length}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-300">Review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.ipcRenderer?.openBrowserOperator?.('HermesDesk ME live research').catch(() => {})}
              className="flex-1 h-8 rounded-xl bg-white text-gray-950 hover:bg-blue-50 flex items-center justify-center"
              title="Open live Browser Operator"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.ipcRenderer?.startWideResearch?.('HermesDesk ME active research check', ['Current facts', 'Risks', 'Evidence', 'Next actions']).catch(() => {})}
              className="flex-1 h-8 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
              title="Start Wide Research"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Bus</h3>
            <span className="text-[9px] font-black text-gray-400">{silvaEvents.length}</span>
          </div>
          {silvaEvents.length === 0 && <p className="text-[10px] text-gray-400">No engine/tool/research events yet.</p>}
          {silvaEvents.slice(0, 10).map(event => (
            <div key={event.id} className="p-3 bg-gray-950 text-white rounded-2xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-200 truncate">{event.type}</span>
                <span className="text-[8px] text-gray-400">{new Date(event.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-[10px] font-bold text-white mt-1 truncate">{event.source}</p>
              <p className="text-[9px] text-gray-300 mt-1 line-clamp-3">
                {event.payload?.query || event.payload?.title || event.payload?.message || event.payload?.tool || event.payload?.engine || JSON.stringify(event.payload || {}).slice(0, 180)}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Stream</h3>
            <button onClick={() => setNotifications([])} className="text-[9px] font-black text-gray-400 hover:text-gray-900">Clear</button>
          </div>
          {notifications.length === 0 && <p className="text-[10px] text-gray-400">No live events yet. Start AutoResearch, Browser Operator, mail sync, or an agent task.</p>}
          {notifications.slice(0, 12).map(item => {
            const Icon = notificationIcons[item.type] || ShieldCheck;
            return (
            <div key={item.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <p className="text-[10px] font-black text-gray-900 truncate">{item.title}</p>
                </div>
                <span className="text-[8px] font-black text-blue-500">{item.time}</span>
              </div>
              <p className="text-[9px] text-blue-700 mt-1 line-clamp-2">{item.message}</p>
            </div>
          )})}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agents Active</h3>
            <span className="text-[10px] font-black text-green-600">{agents.filter(a => a.status !== 'stopped').length}/{agents.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {agents.map(agent => (
              <div key={agent.id} className="p-2 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="flex items-center space-x-2">
                  {agent.id === 'justice-case-agent' ? <Scale className="w-3 h-3 text-gray-400" /> : agent.id === 'purchase-guardian-agent' ? <CreditCard className="w-3 h-3 text-gray-400" /> : <Bot className="w-3 h-3 text-gray-400" />}
                  <span className="text-[10px] font-black text-gray-700 truncate">{agentNames[agent.id] || agent.name}</span>
                </div>
                <p className={`text-[8px] font-black uppercase mt-1 ${agent.status === 'stopped' ? 'text-gray-400' : 'text-green-600'}`}>
                  {agent.status === 'stopped' ? 'Stopped' : 'Active'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mail Folders</h3>
            <FolderOpen className="w-3.5 h-3.5 text-gray-300" />
          </div>
          {(emailIntel.folders || []).slice(0, 10).map((folder: any) => (
            <div key={folder.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
              <span className="text-[10px] font-bold text-gray-700 truncate">{folder.displayName}</span>
              <span className="text-[9px] font-black text-blue-600">{folder.syncedCount || 0}</span>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skill Actions</h3>
          {pendingSkills.length === 0 && <p className="text-[10px] text-gray-400">No pending tool approvals.</p>}
          {pendingSkills.map(action => (
            <div key={action.id} className="p-3 bg-orange-50 border border-orange-100 rounded-2xl space-y-2">
              <p className="text-[11px] font-black text-gray-900">{action.name}</p>
              <p className="text-[9px] text-orange-700 line-clamp-2">{JSON.stringify(action.params || {})}</p>
              <div className="flex items-center space-x-2">
                <button onClick={() => approveSkill(action.id)} className="flex-1 py-1.5 bg-green-600 text-white rounded-xl text-[9px] font-black">Approve</button>
                <button onClick={() => denySkill(action.id)} className="flex-1 py-1.5 bg-white text-red-600 border border-red-100 rounded-xl text-[9px] font-black">Deny</button>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Routing</h3>
          {routeItems.length === 0 && <p className="text-[10px] text-gray-400">No synced email routes yet.</p>}
          {routeItems.map((message: any) => (
            <div key={message.id} className="p-3 bg-white border border-gray-100 rounded-2xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black text-blue-600 uppercase truncate">{message.categoryLabel}</span>
                <span className="text-[8px] font-black text-gray-400 uppercase">{agentNames[message.agentId]}</span>
              </div>
              <p className="text-[11px] font-black text-gray-900 line-clamp-2">{message.subject || '(No subject)'}</p>
              <p className="text-[9px] text-gray-500 truncate">{message.folderName} · {message.sender || message.senderEmail}</p>
              <div className="flex items-center space-x-2">
                <button onClick={() => approveEmail(message.id, 'approved')} className="p-1.5 bg-green-50 text-green-600 rounded-lg" title="Approve route">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => approveEmail(message.id, 'denied')} className="p-1.5 bg-red-50 text-red-600 rounded-lg" title="Deny route">
                  <X className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => approveEmail(message.id, 'done')} className="flex-1 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-[9px] font-black">Archive</button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
};
