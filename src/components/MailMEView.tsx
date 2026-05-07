import React, { useState } from 'react';
import { 
  Mail, Plus, Copy, Check, Shield, User, Globe, 
  Trash2, AlertCircle, ChevronRight, Bell, Tags, WifiOff, RefreshCw, Database, LockKeyhole
} from 'lucide-react';
import { mailCategories } from '../data/hermesAgents';

export const MailMEView = () => {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [workflowEmails, setWorkflowEmails] = useState<{email: string, desc: string}[]>([]);
  const [approvedSenders, setApprovedSenders] = useState<string[]>([]);
  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>({});
  const [connectorState, setConnectorState] = useState<Record<string, boolean>>({});
  const [classicOutlookStatus, setClassicOutlookStatus] = useState<any>(null);
  const [classicOutlookMessages, setClassicOutlookMessages] = useState<any[]>([]);
  const [loadingOutlook, setLoadingOutlook] = useState(false);
  const [graphStatus, setGraphStatus] = useState<any>(null);
  const [graphMessages, setGraphMessages] = useState<any[]>([]);
  const [graphLogin, setGraphLogin] = useState<any>(null);
  const [graphConfig, setGraphConfig] = useState<any>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [mailSyncState, setMailSyncState] = useState<any>(null);
  const [mailMemory, setMailMemory] = useState<any>(null);
  const [batchIndexing, setBatchIndexing] = useState(false);

  React.useEffect(() => {
    const loadSettings = async () => {
      if (window.ipcRenderer) {
        const settings = await (window.ipcRenderer as any).getMailSettings();
        setWorkflowEmails(settings.workflowEmails);
        setApprovedSenders(settings.approvedSenders);
        setEnabledCategories(settings.enabledCategories);
        refreshMailConnectors();
        refreshClassicOutlook();
        refreshGraphStatus();
        refreshMailSyncState();
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (updates: any) => {
    if (window.ipcRenderer) {
      const current = { workflowEmails, approvedSenders, enabledCategories };
      const next = { ...current, ...updates };
      await (window.ipcRenderer as any).saveMailSettings(next);
    }
  };

  const refreshMailConnectors = async () => {
    const state = await window.ipcRenderer?.getConnectors?.();
    setConnectorState(state || {});
  };

  const refreshClassicOutlook = async () => {
    if (!window.ipcRenderer?.getClassicOutlookStatus) return;
    const status = await window.ipcRenderer.getClassicOutlookStatus();
    setClassicOutlookStatus(status);
  };

  const readClassicOutlook = async () => {
    if (!window.ipcRenderer?.listClassicOutlookMessages) return;
    setLoadingOutlook(true);
    try {
      const result = await window.ipcRenderer.listClassicOutlookMessages(1000);
      if (Array.isArray(result)) {
        setClassicOutlookMessages(result);
        showNotice(`Read ${result.length} recent classic Outlook messages across local folders.`);
      } else {
        showNotice(result.error || 'Could not read classic Outlook messages.');
      }
    } finally {
      setLoadingOutlook(false);
    }
  };

  const refreshGraphStatus = async () => {
    const status = await window.ipcRenderer?.getMicrosoftGraphStatus?.();
    if (status) setGraphStatus(status);
    const config = await (window.ipcRenderer as any)?.getMicrosoftGraphConfig?.().catch(() => null);
    if (config) setGraphConfig(config);
  };

  const refreshMailSyncState = async () => {
    const graphState = await (window.ipcRenderer as any)?.getMailSyncState?.();
    const classicState = await (window.ipcRenderer as any)?.getClassicOutlookSyncState?.();
    const state = graphState?.totalIndexed ? graphState : classicState || graphState;
    if (state) setMailSyncState(state);
    const intel = await window.ipcRenderer?.getEmailIntelligence?.().catch(() => null);
    if (intel?.mailboxMemory || intel?.memory) setMailMemory(intel.mailboxMemory || intel.memory);
  };

  const startGraphLogin = async () => {
    const result = await window.ipcRenderer?.startMicrosoftGraphLogin?.();
    setGraphLogin(result);
    if (result?.ok) {
      showNotice(`Microsoft sign-in opened. Enter code ${result.userCode}.`);
    } else {
      showNotice(result?.error || 'Could not start Microsoft sign-in.');
    }
  };

  const completeGraphLogin = async (silent = false) => {
    if (!silent) setLoadingGraph(true);
    try {
      const result = await window.ipcRenderer?.completeMicrosoftGraphLogin?.();
      if (result?.ok) {
        setGraphLogin(null);
        await refreshGraphStatus();
        if (!silent) showNotice(`Microsoft Graph connected: ${result.profile?.mail || result.profile?.userPrincipalName || result.profile?.displayName}`);
        return true;
      } else {
        // If it's a real error (not pending), show it
        if (!silent && result?.error && !/pending|sign-in is not complete/i.test(result.error)) {
          showNotice(result.error);
        }
        return false;
      }
    } finally {
      if (!silent) setLoadingGraph(false);
    }
  };

  // Auto-complete login loop
  React.useEffect(() => {
    let timer: any;
    if (graphLogin?.userCode) {
      timer = setInterval(async () => {
        const success = await completeGraphLogin(true);
        if (success) clearInterval(timer);
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [graphLogin]);

  const readGraphInbox = async () => {
    setLoadingGraph(true);
    try {
      const messages = await window.ipcRenderer?.listMicrosoftGraphMessages?.(12);
      setGraphMessages(messages || []);
      showNotice(`Read ${messages?.length || 0} Microsoft Graph messages.`);
    } catch (error: any) {
      showNotice(error?.message || 'Could not read Microsoft Graph mailbox.');
    } finally {
      setLoadingGraph(false);
    }
  };

  // Auto-sync trigger
  React.useEffect(() => {
    if (graphStatus?.connected && (mailSyncState?.totalIndexed === 0) && !batchIndexing) {
      indexGraphBatch();
    }
  }, [graphStatus?.connected, mailSyncState?.totalIndexed]);

  const indexGraphBatch = async (reset = false) => {
    const canUseGraph = Boolean(graphStatus?.connected && (window.ipcRenderer as any)?.syncEmailBatch);
    const canUseClassic = Boolean(classicOutlookStatus?.ok && (window.ipcRenderer as any)?.syncClassicOutlookBatch);
    if (!canUseGraph && !canUseClassic) return;
    setBatchIndexing(true);
    try {
      const result = canUseGraph
        ? await (window.ipcRenderer as any).syncEmailBatch({ batchSize: 1000, reset })
        : await (window.ipcRenderer as any).syncClassicOutlookBatch({ batchSize: 1000, reset });
      if (result?.ok === false) throw new Error(result.error || 'Microsoft Graph mailbox indexing failed.');
      setMailSyncState(result?.state || null);
      const intel = await window.ipcRenderer?.getEmailIntelligence?.().catch(() => null);
      if (intel?.mailboxMemory || intel?.memory) setMailMemory(intel.mailboxMemory || intel.memory);
      showNotice(`Indexed ${result?.batchCount || result?.messages?.length || 0} real ${result?.source || (canUseGraph ? 'Graph' : 'Classic Outlook')} emails${result?.complete ? '; mailbox complete.' : '; more batches remain.'}`);
    } catch (error: any) {
      showNotice(error?.message || 'Could not index Microsoft Graph mailbox.');
    } finally {
      setBatchIndexing(false);
    }
  };

  const indexUntilComplete = async () => {
    const canUseGraph = Boolean(graphStatus?.connected && (window.ipcRenderer as any)?.syncEmailBatch);
    const canUseClassic = Boolean(classicOutlookStatus?.ok && (window.ipcRenderer as any)?.syncClassicOutlookBatch);
    if (!canUseGraph && !canUseClassic) return;
    setBatchIndexing(true);
    try {
      let complete = false;
      let totalThisRun = 0;
      let safety = 0;
      let latestState: any = null;
      while (!complete && safety < 80) {
        const result = canUseGraph
          ? await (window.ipcRenderer as any).syncEmailBatch({ batchSize: 1000 })
          : await (window.ipcRenderer as any).syncClassicOutlookBatch({ batchSize: 1000 });
        if (result?.ok === false) throw new Error(result.error || 'Microsoft Graph mailbox indexing failed.');
        totalThisRun += result?.batchCount || result?.messages?.length || 0;
        complete = Boolean(result?.complete || result?.state?.complete || (result?.batchCount || 0) === 0);
        latestState = result?.state || latestState;
        setMailSyncState(latestState);
        safety += 1;
        if ((result?.batchCount || 0) === 0) break;
      }
      const intel = await window.ipcRenderer?.getEmailIntelligence?.().catch(() => null);
      if (intel?.mailboxMemory || intel?.memory) setMailMemory(intel.mailboxMemory || intel.memory);
      showNotice(`Mailbox index run processed ${totalThisRun.toLocaleString()} emails${complete ? '; index is complete/up to date.' : '; paused at safety limit, run again to continue.'}`);
    } catch (error: any) {
      showNotice(error?.message || 'Could not complete mailbox indexing.');
    } finally {
      setBatchIndexing(false);
    }
  };

  const resetGraphIndex = async () => {
    if (graphStatus?.connected) await (window.ipcRenderer as any)?.resetMailSyncState?.();
    else await (window.ipcRenderer as any)?.resetClassicOutlookSyncState?.();
    await refreshMailSyncState();
    showNotice('Mailbox index checkpoint reset. Next run starts from newest mail again.');
  };

  const copyEmail = () => {
    const email = graphStatus?.connected ? (graphStatus.profile?.mail || graphStatus.profile?.userPrincipalName) : 'no-mail-connected@me.local';
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

  const addWorkflowEmail = () => {
    const name = window.prompt('Workflow name, for example returns or invoices');
    if (!name) return;
    const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'workflow';
    const next = [...workflowEmails, { email: `${safe}@me.bot`, desc: `Creates ${name} tasks automatically` }];
    setWorkflowEmails(next);
    saveSettings({ workflowEmails: next });
    showNotice(`Workflow email created: ${safe}@me.bot`);
  };

  const addSender = () => {
    const email = window.prompt('Approved sender email');
    if (!email) return;
    const next = approvedSenders.includes(email) ? approvedSenders : [...approvedSenders, email];
    setApprovedSenders(next);
    saveSettings({ approvedSenders: next });
    showNotice(`Approved sender added: ${email}`);
  };

  const removeSender = (email: string) => {
    const next = approvedSenders.filter(sender => sender !== email);
    setApprovedSenders(next);
    saveSettings({ approvedSenders: next });
    showNotice(`Removed approved sender: ${email}`);
  };

  const toggleCategory = (id: string) => {
    const next = { ...enabledCategories, [id]: !enabledCategories[id] };
    setEnabledCategories(next);
    saveSettings({ enabledCategories: next });
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Mail ME</h2>
        <p className="text-sm text-gray-500 mt-1">Create tasks and workflows by sending emails to your ME workspace.</p>
      </div>
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
          {notice}
        </div>
      )}

      {/* Main Email Address */}
      <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Your ME Email</h3>
              <p className="text-[11px] text-gray-500">Anything you email here becomes a task</p>
            </div>
          </div>
          <button 
            onClick={copyEmail}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 shadow-sm'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
          </button>
        </div>
        <div className="bg-white/80 p-3 rounded-xl border border-blue-100/50 flex items-center justify-center">
          <code className="text-sm font-black text-blue-700">{graphStatus?.connected ? (graphStatus.profile?.mail || graphStatus.profile?.userPrincipalName) : 'no-mail-connected@me.local'}</code>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MailConnectorStatus
          label="Mail ME"
          connected
          detail="Workspace email route ready"
          onRefresh={refreshMailConnectors}
        />
        <MailConnectorStatus
          label="Microsoft Graph"
          connected={Boolean(graphStatus?.connected)}
          detail={graphStatus?.connected ? graphStatus.profile?.mail || graphStatus.profile?.userPrincipalName || 'Connected mailbox' : 'OAuth mailbox not connected'}
          onRefresh={refreshGraphStatus}
        />
        <MailConnectorStatus
          label="Classic Outlook"
          connected={Boolean(classicOutlookStatus?.ok)}
          detail={classicOutlookStatus?.ok ? `${classicOutlookStatus.itemCount || 0} inbox items via desktop profile` : 'Desktop profile not readable yet'}
          onRefresh={refreshClassicOutlook}
        />
      </div>

      <div className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-gray-900">Microsoft Graph Mailbox</h3>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-[11px] text-gray-500">
                Uses delegated permissions.
              </p>
              <button
                onClick={async () => {
                  const s = window.prompt('Enter Microsoft App Client Secret (if required)', '');
                  if (s !== null) {
                    await (window.ipcRenderer as any)?.setMicrosoftGraphSecret?.(s);
                    await refreshGraphStatus();
                    showNotice('Microsoft client secret saved locally. Start Microsoft login again to use it.');
                    setGraphLogin(null);
                  }
                }}
                className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest"
              >
                Set Secret
              </button>
              <button
                onClick={async () => {
                  const cid = window.prompt('Enter Azure App Client ID', '');
                  if (cid === null) return;
                  const tid = window.prompt('Enter Azure Tenant ID (use "common" or "consumers" for personal)', '');
                  if (tid === null) return;
                  await (window.ipcRenderer as any)?.setMicrosoftGraphConfig?.({ clientId: cid, tenantId: tid });
                  await refreshGraphStatus();
                  showNotice('Azure App Registration updated. Login will use new IDs.');
                  setGraphLogin(null);
                }}
                className="ml-2 text-[9px] font-black text-gray-500 hover:underline uppercase tracking-widest"
              >
                Configure Azure
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!graphStatus?.connected && (
              <button
                onClick={startGraphLogin}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
              >
                Connect Microsoft
              </button>
            )}
            {graphLogin?.userCode && (
              <button
                onClick={() => completeGraphLogin(false)}
                disabled={loadingGraph}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:bg-gray-300 flex items-center space-x-2"
              >
                {loadingGraph && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{loadingGraph ? 'Verifying...' : 'Complete Login'}</span>
              </button>
            )}
            {graphStatus?.connected && (
              <button
                onClick={readGraphInbox}
                disabled={loadingGraph}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:bg-gray-300"
              >
                {loadingGraph ? 'Reading...' : 'Read Graph Inbox'}
              </button>
            )}
          </div>
        </div>

        {graphLogin?.userCode && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <p className="text-[10px] font-bold text-blue-700">Enter this Microsoft code:</p>
            <p className="text-2xl font-black tracking-widest text-blue-900 mt-1">{graphLogin.userCode}</p>
            <p className="text-[10px] text-blue-700 mt-2">{graphLogin.message}</p>
          </div>
        )}

        {graphConfig && (
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] text-gray-600">
            <span className="font-black text-gray-800">Graph app config:</span> Client ID {graphConfig.clientId || 'not set'} · Tenant {graphConfig.tenantId || 'not set'} · Secret {graphConfig.hasSecret ? 'saved' : 'not saved'}.
            <span className="block mt-1">The Microsoft page only asks for the short code. HermesDesk uses this Client ID/Tenant during token exchange after you approve the code.</span>
          </div>
        )}

        {graphStatus?.connected && (
          <div className="p-3 bg-green-50 border border-green-100 rounded-2xl text-[10px] font-bold text-green-700">
            Connected: {graphStatus.profile?.mail || graphStatus.profile?.userPrincipalName || graphStatus.profile?.displayName}
          </div>
        )}

        {classicOutlookStatus?.ok && classicOutlookStatus.accounts && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Outlook Connected Accounts ({classicOutlookStatus.accounts.length})</h4>
            <div className="space-y-2">
              {classicOutlookStatus.accounts.map((acc: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span className="text-[11px] font-bold text-gray-700">{acc.displayName}</span>
                  </div>
                  {acc.itemCount !== undefined && (
                    <span className="text-[10px] font-black text-gray-400">{acc.itemCount.toLocaleString()} items</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {graphMessages.length > 0 && (
          <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
            {graphMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => {
                  navigator.clipboard.writeText(`From: ${message.sender} <${message.senderEmail}>\nSubject: ${message.subject}\n\n${message.bodyPreview}`);
                  showNotice('Graph email summary copied for ME task input.');
                }}
                className="w-full p-4 text-left hover:bg-blue-50/40 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-gray-900 truncate">{message.subject || '(No subject)'}</p>
                  <span className={`text-[8px] font-black uppercase ${message.unread ? 'text-blue-600' : 'text-gray-300'}`}>
                    {message.unread ? 'Unread' : 'Read'}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-500 mt-1">{message.sender || message.senderEmail} · {new Date(message.receivedAt).toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">{message.bodyPreview}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Full Mailbox Intelligence Index</h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Real paged Microsoft Graph crawl for large mailboxes. It keeps checkpoints, merges folders, and queues high-value analysis tasks.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => indexGraphBatch(false)}
              disabled={(!graphStatus?.connected && !classicOutlookStatus?.ok) || batchIndexing}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:bg-gray-300"
            >
              {batchIndexing ? 'Indexing...' : 'Index next 1,000'}
            </button>
            <button
              onClick={indexUntilComplete}
              disabled={(!graphStatus?.connected && !classicOutlookStatus?.ok) || batchIndexing}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:bg-gray-300"
            >
              Index until complete
            </button>
            <button
              onClick={resetGraphIndex}
              disabled={(!graphStatus?.connected && !classicOutlookStatus?.ok) || batchIndexing}
              className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all disabled:text-gray-300"
            >
              Reset checkpoint
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <IndexStat label="Total indexed" value={(mailSyncState?.totalIndexed || 0).toLocaleString()} />
          <IndexStat label="Last batch" value={(mailSyncState?.lastBatchCount || 0).toLocaleString()} />
          <IndexStat label="Accounts" value={(mailSyncState?.totalAccounts || 0).toString()} />
          <IndexStat label="Status" value={mailSyncState?.complete ? 'Complete' : graphStatus?.connected || classicOutlookStatus?.ok ? 'Ready / Crawling' : 'Sync Pending'} />
        </div>

        {mailMemory && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <IndexStat label="Memory items" value={(mailMemory.totalIndexed || 0).toLocaleString()} />
            <IndexStat label="Unread" value={(mailMemory.unreadCount || 0).toLocaleString()} />
            <IndexStat label="Bills/Payments" value={(mailMemory.billsToPay?.length || 0).toLocaleString()} />
            <IndexStat label="Deadlines" value={(mailMemory.deadlines?.length || 0).toLocaleString()} />
          </div>
        )}

        {mailMemory?.billsToPay?.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Latest possible bills / payments</p>
              <span className="text-[9px] font-bold text-blue-600">from indexed memory</span>
            </div>
            <div className="mt-3 space-y-2">
              {mailMemory.billsToPay.slice(0, 6).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{item.subject || '(No subject)'}</p>
                    <p className="text-[10px] text-gray-500 truncate">{item.sender} · {item.receivedAt ? new Date(item.receivedAt).toLocaleString() : ''}</p>
                  </div>
                  <span className="text-[9px] font-black text-blue-700 uppercase shrink-0">{item.categoryLabel || 'Mail'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mailSyncState?.lastError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-bold text-red-700">
            Last mailbox indexing error: {mailSyncState.lastError}
          </div>
        )}

        <div className="p-4 bg-green-50/60 border border-green-100 rounded-2xl flex items-start space-x-3">
          <LockKeyhole className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
          <p className="text-[10px] text-green-700 leading-relaxed">
            Write routes are real but locked: mark read/unread, move mail, create folders, and create reply drafts require explicit approval. Background indexing never sends, deletes, moves, unsubscribes, or changes mailbox state.
          </p>
        </div>
      </div>

      <div className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-gray-900">Classic Outlook Local Inbox</h3>
            <p className="text-[11px] text-gray-500 mt-1">
              Reads your installed classic Outlook profile on this PC using Windows COM. No paid API, no cloud relay.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.ipcRenderer?.openApp('classic outlook')}
              className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
            >
              Open Outlook
            </button>
            <button
              onClick={readClassicOutlook}
              disabled={loadingOutlook}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:bg-gray-300"
            >
              {loadingOutlook ? 'Reading...' : 'Read Inbox'}
            </button>
          </div>
        </div>

        {classicOutlookStatus?.ok && (
          <div className="p-3 bg-green-50 border border-green-100 rounded-2xl text-[10px] font-bold text-green-700">
            Profile: {classicOutlookStatus.profile || 'Default'} · Accounts: {(classicOutlookStatus.accounts || []).map((a: any) => a.smtpAddress || a.displayName).filter(Boolean).join(', ') || 'local Outlook account'}
          </div>
        )}
        {classicOutlookStatus && !classicOutlookStatus.ok && (
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl text-[10px] font-bold text-orange-700">
            {classicOutlookStatus.error || 'Classic Outlook could not be reached. Open Outlook once, then refresh.'}
          </div>
        )}

        {classicOutlookMessages.length > 0 && (
          <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
            {classicOutlookMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => {
                  navigator.clipboard.writeText(`From: ${message.sender}\nSubject: ${message.subject}\n\n${message.bodyPreview}`);
                  showNotice('Email summary copied for ME task input.');
                }}
                className="w-full p-4 text-left hover:bg-blue-50/40 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-gray-900 truncate">{message.subject || '(No subject)'}</p>
                  <span className={`text-[8px] font-black uppercase ${message.unread ? 'text-blue-600' : 'text-gray-300'}`}>
                    {message.unread ? 'Unread' : 'Read'}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-500 mt-1">{message.sender || message.senderEmail} · {new Date(message.receivedAt).toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">{message.bodyPreview}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">TinyFish AI Web Agents</h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Advanced web automation and research. Bypasses bot detection to extract high-quality legal, tax, and corporate data.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={async () => {
                const key = window.prompt('Enter TinyFish AI API Key', '');
                if (key !== null) {
                  await (window.ipcRenderer as any)?.setTinyFishApiKey?.(key);
                  showNotice('TinyFish API key saved locally.');
                }
              }}
              className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
            >
              Set API Key
            </button>
            <button
              onClick={async () => {
                const url = window.prompt('Target URL (e.g., https://www.gov.uk/search)', '');
                if (!url) return;
                const task = window.prompt('Instruction for the agent (e.g., Extract latest VAT updates)', '');
                if (!task) return;
                showNotice('TinyFish Agent starting... this may take a few minutes.');
                const result = await (window.ipcRenderer as any)?.runTinyFishAgent?.({ url, task });
                if (result?.ok) {
                  showNotice(`Agent run complete. Result: ${result.result?.slice(0, 100)}...`);
                } else {
                  showNotice(`Agent failed: ${result?.error}`);
                }
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all"
            >
              Run Web Agent
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Emails */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Workflow Emails</h3>
          <button onClick={addWorkflowEmail} className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-700">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create workflow email
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflowEmails.map((workflow) => (
            <button
              key={workflow.email}
              onClick={() => {
                navigator.clipboard.writeText(workflow.email);
                showNotice(`Copied ${workflow.email}`);
              }}
              className="p-4 bg-white border border-gray-100 rounded-2xl space-y-2 hover:border-blue-100 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">{workflow.email}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-all" />
              </div>
              <p className="text-[10px] text-gray-500">{workflow.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Approved Senders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Approved Senders</h3>
            <Shield className="w-3.5 h-3.5 text-green-500" />
          </div>
          <button onClick={addSender} className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-700">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add sender
          </button>
        </div>
        <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {approvedSenders.map((email, idx) => (
              <div key={idx} className="flex items-center justify-between px-6 py-3.5 hover:bg-white transition-all group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">{email}</span>
                </div>
                <button onClick={() => removeSender(email)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-start space-x-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
          <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-orange-700 leading-relaxed">
            Only emails from these approved senders will be processed. This ensures your workspace remains secure and prevents unauthorized task creation.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Paperclip Auto Organization</h3>
            <Tags className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase">{Object.values(enabledCategories).filter(Boolean).length} active routes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mailCategories.map(category => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-blue-100 hover:bg-blue-50/30 transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-500">
                  <category.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">{category.label}</p>
                  <p className="text-[10px] text-gray-500">Create task, keep source email, request approval before action.</p>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full relative transition-all ${enabledCategories[category.id] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${enabledCategories[category.id] ? 'left-4' : 'left-0.5'}`} />
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 bg-green-50/60 border border-green-100 rounded-2xl flex items-start space-x-3">
          <Bell className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-green-700 leading-relaxed">
            Mail ME routing is approval-first: ME can organize, summarize, draft replies, and notify you, but it must ask before replying, filing legal/accounting submissions, paying bills, or contacting third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

const MailConnectorStatus = ({ label, connected, detail, onRefresh }: any) => (
  <div className={`p-4 rounded-2xl border flex items-center justify-between ${connected ? 'bg-green-50/60 border-green-100' : 'bg-orange-50/60 border-orange-100'}`}>
    <div className="flex items-center space-x-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${connected ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
        {connected ? <Check className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      </div>
      <div>
        <p className="text-xs font-black text-gray-900">{label}</p>
        <p className={`text-[10px] font-bold ${connected ? 'text-green-700' : 'text-orange-700'}`}>{detail}</p>
      </div>
    </div>
    <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white/60 rounded-xl transition-all" title="Refresh status">
      <RefreshCw className="w-3.5 h-3.5" />
    </button>
  </div>
);

const IndexStat = ({ label, value }: { label: string; value: string }) => (
  <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl">
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-black text-gray-900 mt-1 truncate">{value}</p>
  </div>
);
