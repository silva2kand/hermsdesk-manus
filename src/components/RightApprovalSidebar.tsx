import React, { useEffect, useMemo, useState } from 'react';
import { Check, X, RefreshCw, ShieldCheck, Mail, Bot, FolderOpen, Activity, Globe, Search, CalendarClock, Monitor, Scale, CreditCard, Radio, MousePointerClick } from 'lucide-react';

const agentNames: Record<string, string> = {
  'general-agent': 'Mythos Manager',
  'hermes-full': 'Hermes',
  'paperclip-full': 'Paperclips',
  'solicitor-agent': 'Solicitor',
  'accountant-agent': 'Accountant',
  'space-agent-full': 'Space',
  'openclaw-full': 'OpenClaw',
  'justice-case-agent': 'Justice',
  'purchase-guardian-agent': 'Purchase Guard',
  'browser-automation-agent': 'Browser Automation'
};

const notificationIcons: Record<string, any> = {
  agent: Bot,
  automation: Activity,
  browser: Globe,
  research: Search,
  scheduler: CalendarClock,
  system: ShieldCheck
};

const approvalAccent = (domain = '') => {
  const d = domain.toLowerCase();
  if (/legal|visa|sponsor|council|land/.test(d)) return 'bg-purple-50 border-purple-100 text-purple-800';
  if (/fund|account|tax|hmrc|payment|bank/.test(d)) return 'bg-emerald-50 border-emerald-100 text-emerald-800';
  if (/property|business|buy/.test(d)) return 'bg-blue-50 border-blue-100 text-blue-800';
  if (/whatsapp|message|contact/.test(d)) return 'bg-green-50 border-green-100 text-green-800';
  if (/pc|web|browser/.test(d)) return 'bg-orange-50 border-orange-100 text-orange-800';
  return 'bg-gray-50 border-gray-100 text-gray-800';
};

const eventLabel = (event: any) => {
  const payload = event?.payload || {};
  return payload.content || payload.message || payload.query || payload.title || payload.tool || payload.engine || payload.url || payload.status || event?.source || event?.type || 'Event';
};

const shortTime = (value: any) => {
  try { return new Date(value).toLocaleTimeString(); } catch { return ''; }
};

export const RightApprovalSidebar = ({ agents = [] }: { agents?: any[] }) => {
  const [pendingSkills, setPendingSkills] = useState<any[]>([]);
  const [emailIntel, setEmailIntel] = useState<any>({ folders: [], messages: [], summary: {} });
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [silvaEvents, setSilvaEvents] = useState<any[]>([]);
  const [computerSessions, setComputerSessions] = useState<any[]>([]);
  const [agentTasks, setAgentTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [operatorText, setOperatorText] = useState('');
  const [operatorAgent, setOperatorAgent] = useState('browser-automation-agent');

  const refresh = async () => {
    const [skills, intel, browserState, tasks] = await Promise.all([
      window.ipcRenderer?.getPendingSkills?.().catch(() => []),
      window.ipcRenderer?.getEmailIntelligence?.().catch(() => null),
      window.ipcRenderer?.getBrowserOperatorState?.().catch(() => null),
      window.ipcRenderer?.getAgentTasks?.().catch(() => [])
    ]);
    setPendingSkills(skills || []);
    if (intel) setEmailIntel(intel);
    setComputerSessions(browserState?.sessions || []);
    setAgentTasks(tasks || []);
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
    const onBrowser = (_: any, event: any) => {
      push({ type: 'browser', title: event?.title || event?.action || 'Browser Operator', message: event?.detail || event?.text || event?.url || event?.message || 'Browser event' });
      window.ipcRenderer?.getBrowserOperatorState?.().then(state => setComputerSessions(state?.sessions || [])).catch(() => {});
    };
    const onWideResearch = (_: any, event: any) => push({ type: 'research', title: event?.title || 'Wide Research', message: event?.brief || event?.status || event?.message || 'Research lane updated' });
    const onScheduler = (_: any, event: any) => push({ type: 'scheduler', title: event?.title || 'Scheduled Task', message: event?.task || event?.message || 'Scheduled task updated' });
    const onMailUpdated = (_: any, event: any) => {
      const arrivals = event?.newArrivals?.length || event?.incomingCount || 0;
      push({ type: 'automation', title: arrivals ? `New mail: ${arrivals}` : `Mail ME ${event?.source || ''}`, message: `${event?.messageCount || 0} emails analyzed, ${event?.newTasks || 0} new agent tasks queued.${event?.newArrivals?.[0]?.subject ? ` Latest: ${event.newArrivals[0].subject}` : ''}` });
      refresh();
    };
    const onSilvaEvent = (_: any, event: any) => {
      setSilvaEvents(prev => [event, ...prev].slice(0, 80));
      push({
        type: event?.type?.startsWith('search.') ? 'research' : event?.type?.startsWith('agent.') ? 'agent' : 'automation',
        title: event?.type || 'Silva Event',
        message: event?.payload?.message || event?.payload?.query || event?.payload?.tool || event?.payload?.engine || event?.source || 'Event bus update'
      });
      if (/^agent\.task\.|manager\.decision|agent\.thought/.test(event?.type || '')) {
        window.ipcRenderer?.getAgentTasks?.().then(tasks => setAgentTasks(tasks || [])).catch(() => {});
      }
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
      const graphStatus = await window.ipcRenderer?.getMicrosoftGraphStatus?.().catch(() => null);
      const data = graphStatus?.mailboxConnected
        ? await window.ipcRenderer?.syncEmailBatch?.({ batchSize: 1000 })
        : await window.ipcRenderer?.syncClassicOutlookBatch?.({ batchSize: 1000 });
      if (data) setEmailIntel(data);
      setNotice(`Indexed ${data?.batchCount || data?.messages?.length || 0} ${data?.source || (graphStatus?.mailboxConnected ? 'Graph' : 'Classic Outlook')} mail items. Total indexed: ${data?.state?.totalIndexed || data?.messages?.length || 0}.`);
    } catch (error: any) {
      setNotice(error?.message || 'Could not sync mail from Graph or Classic Outlook.');
    } finally {
      setSyncing(false);
      window.setTimeout(() => setNotice(''), 4000);
    }
  };

  const runDoctor = async () => {
    setNotice('Self-Improvement Doctor is checking routes...');
    const result = await window.ipcRenderer?.runSelfImprovementCheck?.('Manual cockpit check').catch((error: any) => ({ ok: false, error: error?.message }));
    if (result?.ok) {
      const findings = result.run?.weaknesses?.length || 0;
      const high = result.run?.weaknesses?.filter((item: any) => item.severity === 'high').length || 0;
      setNotice(`Doctor completed: ${findings} findings, ${high} high priority.`);
      refresh();
    } else {
      setNotice(result?.error || 'Self-Improvement Doctor failed.');
    }
    window.setTimeout(() => setNotice(''), 5000);
  };

  const stopOperator = async () => {
    const reason = operatorText.trim() || 'Stop now from Live Operations';
    const result = await window.ipcRenderer?.stopOperatorMode?.(reason).catch((error: any) => ({ ok: false, error: error?.message }));
    setNotice(result?.ok ? `STOP NOW sent: ${reason}` : `Stop failed: ${result?.error || 'unknown error'}`);
    setOperatorText('');
    refresh();
  };

  const sendOperatorInstruction = async () => {
    const instruction = operatorText.trim();
    if (!instruction) {
      setNotice('Type an instruction first, for example: click second result, scroll more, stop wrong page.');
      return;
    }
    const result = await window.ipcRenderer?.injectOperatorInstruction?.(operatorAgent, instruction).catch((error: any) => ({ ok: false, error: error?.message }));
    setNotice(result?.ok ? `Instruction sent to ${agentNames[operatorAgent] || operatorAgent}` : `Instruction failed: ${result?.error || 'unknown error'}`);
    setOperatorText('');
  };

  const approveSkill = async (id: string) => {
    const action = pendingSkills.find(item => item.id === id);
    const result = await window.ipcRenderer?.approveSkill?.(id);
    const contract = action?.approvalContract;
    if (contract) {
      await window.ipcRenderer?.createAgentTask?.(
        `Silva approved this prepared approval card. Continue only inside this approved scope; do not exceed it.

Domain: ${contract.domain || 'general'}
Title: ${contract.title || ''}
Target: ${contract.target || ''}
Approved action: ${contract.action || action.name}
Why: ${contract.why || ''}
Summary: ${contract.summary || ''}
Details: ${contract.details || ''}
Amount: ${contract.amount || ''}
Term: ${contract.term || ''}
APR/rate: ${contract.apr || ''}
Repayment: ${contract.repayment || ''}
Evidence checked: ${contract.evidence || ''}
Evidence items: ${(contract.evidenceItems || []).join('; ')}
Draft/form preview: ${contract.draftPreview || ''}
Will do: ${(contract.willDo || []).join('; ')}
Will not do: ${(contract.willNotDo || []).join('; ')}
Risk Silva saw: ${contract.risk || ''}
Missing facts: ${contract.missing || ''}
Approved next step: ${contract.nextStep || ''}

Now complete the next safe step using real tools where available. If the next step would send, pay, submit, sign, delete, or contact externally and no concrete execution approval/tool is available, prepare the final manual draft/composer/form and stop.`,
        'general-agent'
      );
      setNotice(result?.ok ? 'Approval recorded and Mythos continuation task queued.' : `Approval failed: ${result?.error || 'unknown error'}`);
      window.setTimeout(() => setNotice(''), 5000);
    }
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

  const selectedTask = useMemo(() => {
    return agentTasks.find(task => task.id === selectedTaskId) || null;
  }, [agentTasks, selectedTaskId]);

  const selectedTaskEvents = useMemo(() => {
    if (!selectedTask) return [];
    return silvaEvents
      .filter(event => event.sessionId === selectedTask.id || event.payload?.taskId === selectedTask.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [selectedTask, silvaEvents]);

  const selectedApprovals = useMemo(() => {
    if (!selectedTask) return [];
    return pendingSkills.filter(action => action.approvalContract?.taskId === selectedTask.id || action.params?.taskId === selectedTask.id);
  }, [pendingSkills, selectedTask]);

  const selectedTaskStats = useMemo(() => {
    const events = selectedTaskEvents;
    const toolEvents = events.filter(event => /^tool\.|browser|pc_ui|pc-window/i.test(`${event.type} ${event.source} ${event.payload?.tool || ''}`));
    const webEvents = events.filter(event => /browser|search|tinyfish|web/i.test(`${event.type} ${event.source} ${event.payload?.url || ''}`));
    const mailEvents = events.filter(event => /mail|outlook|email/i.test(`${event.type} ${event.source} ${event.payload?.message || ''}`));
    const fileEvents = events.filter(event => /file|pdf|document|read_file|list_dir/i.test(`${event.type} ${event.source} ${event.payload?.tool || ''}`));
    return {
      tools: toolEvents.length,
      web: webEvents.length,
      mail: mailEvents.length,
      files: fileEvents.length,
      approvals: selectedApprovals.length
    };
  }, [selectedTaskEvents, selectedApprovals]);

  const sendTaskCorrection = async () => {
    const text = correctionText.trim();
    if (!text || !selectedTask) return;
    const result = await window.ipcRenderer?.injectOperatorInstruction?.(selectedTask.assignedAgentId, `Correction for task ${selectedTask.id}: ${text}`).catch((error: any) => ({ ok: false, error: error?.message }));
    setNotice(result?.ok ? 'Correction sent to the live agent.' : `Correction failed: ${result?.error || 'unknown error'}`);
    setCorrectionText('');
    window.setTimeout(() => setNotice(''), 4000);
  };

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
            <button
              onClick={runDoctor}
              className="flex-1 h-8 rounded-xl bg-blue-500 hover:bg-blue-400 flex items-center justify-center"
              title="Run Self-Improvement Doctor"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-red-50 border border-red-100 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-red-700">Operator Mode</p>
              <h3 className="text-xs font-black text-red-950">Stop / Guide Live Agent</h3>
            </div>
            <button
              onClick={stopOperator}
              className="px-3 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700"
            >
              Stop Now
            </button>
          </div>
          <select
            value={operatorAgent}
            onChange={event => setOperatorAgent(event.target.value)}
            className="w-full rounded-xl border border-red-100 bg-white px-2 py-2 text-[10px] font-bold text-gray-800"
          >
            {agents.map(agent => <option key={agent.id} value={agent.id}>{agentNames[agent.id] || agent.name || agent.id}</option>)}
          </select>
          <textarea
            value={operatorText}
            onChange={event => setOperatorText(event.target.value)}
            placeholder="Live correction: click second result, scroll more, stop wrong page..."
            className="w-full min-h-[62px] rounded-xl border border-red-100 bg-white px-2 py-2 text-[10px] font-bold text-gray-800 outline-none focus:border-red-300"
          />
          <button
            onClick={sendOperatorInstruction}
            className="w-full px-3 py-2 rounded-xl bg-white border border-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest hover:bg-red-100"
          >
            Send Live Instruction
          </button>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Task Monitor</h3>
            <span className="text-[9px] font-black text-gray-400">{agentTasks.length}</span>
          </div>
          {agentTasks.length === 0 && <p className="text-[10px] text-gray-400">No agent tasks yet.</p>}
          {agentTasks.slice(0, 8).map(task => {
            const last = (task.history || []).slice(-1)[0];
            const status = String(task.status || 'unknown');
            const statusClass = status === 'done' ? 'text-green-700 bg-green-50 border-green-100'
              : status === 'failed' ? 'text-red-700 bg-red-50 border-red-100'
              : status === 'queued' ? 'text-amber-700 bg-amber-50 border-amber-100'
              : 'text-blue-700 bg-blue-50 border-blue-100';
            return (
              <button key={task.id} onClick={() => setSelectedTaskId(task.id)} className="w-full p-3 bg-white border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 rounded-2xl space-y-2 text-left transition-all">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 truncate">{task.id}</span>
                  <span className={`px-2 py-1 rounded-full border text-[8px] font-black uppercase ${statusClass}`}>{status}</span>
                </div>
                <p className="text-[10px] font-black text-gray-900 line-clamp-2">{task.input}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gray-50 p-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Lead</p>
                    <p className="text-[9px] font-bold text-gray-700 truncate">{agentNames[task.assignedAgentId] || task.assignedAgentId}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Priority</p>
                    <p className="text-[9px] font-bold text-gray-700 truncate">{task.manager?.priority || 'normal'}</p>
                  </div>
                </div>
                <p className="text-[9px] text-gray-500 line-clamp-2">
                  Last: {last?.content || task.manager?.routeReason || 'Waiting for first live event'}
                </p>
                {task.manager?.approvalGates?.length > 0 && (
                  <p className="text-[8px] font-bold text-amber-700 line-clamp-2">
                    Gates: {task.manager.approvalGates.join(', ')}
                  </p>
                )}
              </button>
            );
          })}
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
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Computers</h3>
            <button
              onClick={() => window.ipcRenderer?.openBrowserOperator?.('https://www.google.com', `computer-${Date.now()}`, 'Research Computer').catch(() => {})}
              className="text-[9px] font-black text-blue-600 hover:text-blue-800"
            >
              New
            </button>
          </div>
          {computerSessions.length === 0 && <p className="text-[10px] text-gray-400">No browser computer sessions yet.</p>}
          {computerSessions.slice(0, 5).map(session => (
            <button
              key={session.id}
              onClick={() => window.ipcRenderer?.screenshotBrowserOperator?.(session.id).catch(() => {})}
              className="w-full p-3 bg-white border border-gray-100 hover:border-blue-100 rounded-2xl text-left transition-all"
              title="Capture a real thumbnail/screenshot"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Monitor className={`w-3.5 h-3.5 ${session.online ? 'text-green-600' : 'text-gray-300'}`} />
                  <p className="text-[10px] font-black text-gray-900 truncate">{session.label || session.id}</p>
                </div>
                <span className={`text-[8px] font-black uppercase ${session.online ? 'text-green-600' : 'text-gray-400'}`}>{session.online ? 'Live' : 'Closed'}</span>
              </div>
              <p className="text-[9px] text-gray-500 truncate mt-1">{session.url || 'No page loaded'}</p>
              <p className="text-[8px] text-gray-400 mt-1">{session.thumbnailPath ? 'Thumbnail captured' : 'Click to capture thumbnail'}</p>
            </button>
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
          {pendingSkills.map(action => {
            const contract = action.approvalContract;
            const domain = contract?.domain || action.params?.domain || action.type || 'Tool';
            return (
            <div key={action.id} className={`p-3 border rounded-2xl space-y-2 ${contract ? approvalAccent(domain) : 'bg-orange-50 border-orange-100 text-orange-800'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-black uppercase tracking-widest truncate">{domain}</p>
                <span className="text-[8px] font-black uppercase opacity-70">{contract ? 'Approval card' : action.type}</span>
              </div>
              <p className="text-[11px] font-black text-gray-950">{contract?.title || contract?.action || action.name}</p>
              {contract?.target && <p className="text-[9px] font-black text-gray-500">Target: {contract.target}</p>}
              {contract?.why && <p className="text-[9px] text-gray-700"><span className="font-black">Why:</span> {contract.why}</p>}
              {contract?.summary && <p className="text-[10px] font-bold text-gray-700">{contract.summary}</p>}
              {(contract?.amount || contract?.term || contract?.apr || contract?.repayment) && (
                <div className="grid grid-cols-2 gap-2">
                  {contract?.amount && <div className="rounded-xl bg-white/70 border border-white/80 p-2"><p className="text-[8px] font-black uppercase text-gray-400">Amount</p><p className="text-[9px] font-black text-gray-800">{contract.amount}</p></div>}
                  {contract?.term && <div className="rounded-xl bg-white/70 border border-white/80 p-2"><p className="text-[8px] font-black uppercase text-gray-400">Term</p><p className="text-[9px] font-black text-gray-800">{contract.term}</p></div>}
                  {contract?.apr && <div className="rounded-xl bg-white/70 border border-white/80 p-2"><p className="text-[8px] font-black uppercase text-gray-400">Rate</p><p className="text-[9px] font-black text-gray-800">{contract.apr}</p></div>}
                  {contract?.repayment && <div className="rounded-xl bg-white/70 border border-white/80 p-2"><p className="text-[8px] font-black uppercase text-gray-400">Repayment</p><p className="text-[9px] font-black text-gray-800">{contract.repayment}</p></div>}
                </div>
              )}
              {contract?.details && (
                <div className="rounded-xl bg-white/70 border border-white/80 p-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Details</p>
                  <p className="text-[9px] text-gray-700 line-clamp-4">{contract.details}</p>
                </div>
              )}
              {contract?.evidence && (
                <div className="rounded-xl bg-white/70 border border-white/80 p-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Evidence Checked</p>
                  <p className="text-[9px] text-gray-700 line-clamp-4">{contract.evidence}</p>
                </div>
              )}
              {contract?.evidenceItems?.length > 0 && (
                <div className="rounded-xl bg-white/70 border border-white/80 p-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Evidence Items</p>
                  <ul className="mt-1 space-y-1">
                    {contract.evidenceItems.slice(0, 8).map((item: string, index: number) => (
                      <li key={`${action.id}-ev-${index}`} className="text-[9px] text-gray-700 truncate">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {contract?.draftPreview && (
                <div className="rounded-xl bg-white/70 border border-white/80 p-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Draft / Form Preview</p>
                  <p className="text-[9px] text-gray-700 whitespace-pre-wrap line-clamp-6">{contract.draftPreview}</p>
                </div>
              )}
              {(contract?.willDo?.length > 0 || contract?.willNotDo?.length > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-green-50 border border-green-100 p-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-green-700">Will Do</p>
                    {(contract?.willDo || []).slice(0, 5).map((item: string, index: number) => <p key={`${action.id}-do-${index}`} className="text-[8px] text-green-800 truncate">{item}</p>)}
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-100 p-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-red-700">Will Not Do</p>
                    {(contract?.willNotDo || []).slice(0, 5).map((item: string, index: number) => <p key={`${action.id}-not-${index}`} className="text-[8px] text-red-800 truncate">{item}</p>)}
                  </div>
                </div>
              )}
              {(contract?.risk || contract?.missing || contract?.nextStep) && (
                <div className="space-y-1">
                  {contract?.risk && <p className="text-[9px] text-red-700"><span className="font-black">Risk:</span> {contract.risk}</p>}
                  {contract?.missing && <p className="text-[9px] text-amber-700"><span className="font-black">Missing:</span> {contract.missing}</p>}
                  {contract?.nextStep && <p className="text-[9px] text-gray-700"><span className="font-black">After approval:</span> {contract.nextStep}</p>}
                </div>
              )}
              {!contract && <p className="text-[9px] text-orange-700 line-clamp-2">{JSON.stringify(action.params || {})}</p>}
              <div className="flex items-center space-x-2">
                <button onClick={() => approveSkill(action.id)} className="flex-1 py-1.5 bg-green-600 text-white rounded-xl text-[9px] font-black">Approve</button>
                <button onClick={() => denySkill(action.id)} className="flex-1 py-1.5 bg-white text-red-600 border border-red-100 rounded-xl text-[9px] font-black">Deny</button>
              </div>
            </div>
          )})}
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
      {selectedTask && (
        <div className="fixed top-4 bottom-4 right-[21rem] w-[30rem] bg-white border border-gray-100 rounded-3xl shadow-2xl z-[120] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-950 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Task Detail</p>
                <h3 className="text-sm font-black mt-1 line-clamp-2">{selectedTask.input}</h3>
                <p className="text-[9px] text-gray-300 mt-1">{selectedTask.id} · {agentNames[selectedTask.assignedAgentId] || selectedTask.assignedAgentId}</p>
              </div>
              <button onClick={() => setSelectedTaskId('')} className="p-2 rounded-xl bg-white/10 hover:bg-white/15" aria-label="Close task detail">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-4">
              <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-black">{selectedTaskStats.tools}</p><p className="text-[8px] uppercase font-black text-gray-300">Tools</p></div>
              <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-black">{selectedTaskStats.web}</p><p className="text-[8px] uppercase font-black text-gray-300">Web</p></div>
              <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-black">{selectedTaskStats.mail}</p><p className="text-[8px] uppercase font-black text-gray-300">Mail</p></div>
              <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-black">{selectedTaskStats.files}</p><p className="text-[8px] uppercase font-black text-gray-300">Files</p></div>
              <div className="rounded-xl bg-white/10 p-2"><p className="text-sm font-black">{selectedTaskStats.approvals}</p><p className="text-[8px] uppercase font-black text-gray-300">Cards</p></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <section className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Status</p>
                <p className="text-xs font-black text-gray-900 uppercase mt-1">{selectedTask.status}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Priority</p>
                <p className="text-xs font-black text-gray-900 uppercase mt-1">{selectedTask.manager?.priority || 'normal'}</p>
              </div>
            </section>

            {selectedTask.manager && (
              <section className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-blue-700">Mythos Route</p>
                <p className="text-[10px] font-bold text-blue-900 mt-1">{selectedTask.manager.routeReason}</p>
                {selectedTask.manager.collaborators?.length > 0 && (
                  <p className="text-[9px] text-blue-700 mt-2">Verifiers: {selectedTask.manager.collaborators.map((item: any) => item.name || item.id).join(', ')}</p>
                )}
                {selectedTask.manager.approvalGates?.length > 0 && (
                  <p className="text-[9px] text-amber-700 mt-2">Approval gates: {selectedTask.manager.approvalGates.join(', ')}</p>
                )}
              </section>
            )}

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Timeline</p>
                <span className="text-[9px] font-black text-gray-400">{selectedTaskEvents.length}</span>
              </div>
              {selectedTaskEvents.length === 0 && <p className="text-[10px] text-gray-400">No task-scoped events captured yet.</p>}
              {selectedTaskEvents.map(event => (
                <div key={event.id} className="relative pl-4 pb-3 border-l border-gray-200">
                  <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-gray-900" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 truncate">{event.type}</p>
                    <span className="text-[8px] text-gray-400">{shortTime(event.createdAt)}</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-900 mt-1">{event.source}</p>
                  <p className="text-[9px] text-gray-600 mt-1 whitespace-pre-wrap line-clamp-5">{eventLabel(event)}</p>
                </div>
              ))}
            </section>

            {selectedApprovals.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Linked Approval Cards</p>
                {selectedApprovals.map(action => (
                  <div key={action.id} className={`p-3 border rounded-2xl ${approvalAccent(action.approvalContract?.domain)}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest">{action.approvalContract?.domain || 'approval'}</p>
                    <p className="text-[11px] font-black text-gray-950 mt-1">{action.approvalContract?.title || action.approvalContract?.action || action.name}</p>
                    <p className="text-[9px] text-gray-700 mt-1 line-clamp-3">{action.approvalContract?.summary || action.approvalContract?.details || 'Waiting for review.'}</p>
                  </div>
                ))}
              </section>
            )}

            <section className="rounded-2xl bg-gray-50 border border-gray-100 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Correction Loop</p>
              <textarea
                value={correctionText}
                onChange={event => setCorrectionText(event.target.value)}
                placeholder="Tell the agent what is wrong or what to verify next..."
                className="w-full min-h-[76px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-bold text-gray-800 outline-none focus:border-blue-300"
              />
              <div className="flex items-center gap-2">
                <button onClick={sendTaskCorrection} className="flex-1 py-2 rounded-xl bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest">
                  Send Correction
                </button>
                <button onClick={() => setCorrectionText('This extraction or route looks wrong. Re-check the evidence and explain what changed.')} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[9px] font-black text-gray-700">
                  Mark Wrong
                </button>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <button onClick={() => window.ipcRenderer?.openBrowserOperator?.('https://www.google.com', `review-${selectedTask.id}`, `Review ${selectedTask.id}`).catch(() => {})} className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-left">
                <Globe className="w-4 h-4 text-blue-700" />
                <p className="text-[10px] font-black text-blue-900 mt-2">Open Web Review</p>
              </button>
              <button onClick={() => window.ipcRenderer?.getBrowserOperatorState?.().then(state => setComputerSessions(state?.sessions || [])).catch(() => {})} className="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-left">
                <MousePointerClick className="w-4 h-4 text-gray-700" />
                <p className="text-[10px] font-black text-gray-900 mt-2">Refresh Live Views</p>
              </button>
            </section>
          </div>
        </div>
      )}
    </aside>
  );
};
