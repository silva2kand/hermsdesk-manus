import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, Save, RefreshCw, Phone, Shield, Copy, ExternalLink, Bot, Radio, Users } from 'lucide-react';

const templates = [
  {
    label: 'Professional follow-up',
    message: 'Hi, just following up on this. Please let me know when you have a chance. Thanks.'
  },
  {
    label: 'Customer support',
    message: 'Hi, thanks for your message. I am checking this now and will come back to you shortly.'
  },
  {
    label: 'Appointment confirm',
    message: 'Hi, confirming our appointment. Please let me know if the time still works for you.'
  },
  {
    label: 'Payment reminder',
    message: 'Hi, a quick reminder that the payment is still outstanding. Please confirm when it has been sent. Thanks.'
  }
];

export const WhatsAppMEView = () => {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('WhatsApp draft');
  const [incomingMessage, setIncomingMessage] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [draftingReply, setDraftingReply] = useState(false);
  const [channelStatus, setChannelStatus] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [routerInput, setRouterInput] = useState('');
  const [routing, setRouting] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [bridgeLoading, setBridgeLoading] = useState(false);

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const refresh = async () => {
    const [data, status, routeList, settings] = await Promise.all([
      window.ipcRenderer?.getWhatsAppDrafts?.().catch(() => []),
      window.ipcRenderer?.getWhatsAppChannelStatus?.().catch(() => null),
      window.ipcRenderer?.getWhatsAppRoutes?.().catch(() => []),
      window.ipcRenderer?.getWhatsAppChannelSettings?.().catch(() => null)
    ]);
    setDrafts(data || []);
    setChannelStatus(status);
    setRoutes(routeList || []);
    if (settings?.ownerPhone) setOwnerPhone(settings.ownerPhone);
  };

  useEffect(() => {
    refresh();
    const onSilvaEvent = (_: any, event: any) => {
      if (event?.source === 'whatsapp' || event?.payload?.channel === 'whatsapp') {
        refresh();
        if (event?.type === 'channel.message.out' && event?.payload?.draftId) {
          showNotice(event?.payload?.status === 'ready' ? 'Agent WhatsApp reply draft is ready.' : 'WhatsApp draft updated from agent output.');
        }
      }
    };
    window.ipcRenderer?.on?.('silva:event', onSilvaEvent);
    return () => {
      window.ipcRenderer?.off?.('silva:event', onSilvaEvent);
    };
  }, []);

  const saveDraft = async (status: 'drafted' | 'opened' = 'drafted') => {
    const draft = await window.ipcRenderer?.saveWhatsAppDraft?.({
      phone,
      label: label || 'WhatsApp draft',
      message,
      status
    });
    await refresh();
    showNotice(status === 'opened' ? 'Draft saved and marked opened.' : 'WhatsApp draft saved locally.');
    return draft;
  };

  const openCompose = async () => {
    if (!message.trim()) {
      showNotice('Write a message first.');
      return;
    }
    setLoading(true);
    try {
      const draft = await saveDraft('drafted');
      const result = await window.ipcRenderer?.composeWhatsApp?.(message, phone);
      if (result?.ok && draft?.id) {
        await window.ipcRenderer?.markWhatsAppOpened?.(draft.id);
        await refresh();
      }
      showNotice(result?.ok ? 'Opened WhatsApp composer. Review and press Send manually.' : 'Could not open WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const keepActive = async () => {
    const status = await window.ipcRenderer?.ensureWhatsAppActive?.();
    setChannelStatus(status);
    showNotice('WhatsApp status checked. Auto-open/auto-monitor is disabled for stability; use Compose when needed.');
  };

  const startLocalBridge = async () => {
    setBridgeLoading(true);
    try {
      await window.ipcRenderer?.saveWhatsAppChannelSettings?.({
        ownerPhone,
        localBridgeEnabled: false,
        localAutoReplyToOwner: false
      });
      const result = await window.ipcRenderer?.startWhatsAppLocalBridge?.(ownerPhone);
      await refresh();
      showNotice(result?.error || 'Local WhatsApp Web bridge is disabled for stability. Use drafts/composer.');
    } finally {
      setBridgeLoading(false);
    }
  };

  const stopLocalBridge = async () => {
    setBridgeLoading(true);
    try {
      const result = await window.ipcRenderer?.stopWhatsAppLocalBridge?.();
      await refresh();
      showNotice(result?.ok ? 'Local WhatsApp bridge stopped.' : 'Could not stop local WhatsApp bridge.');
    } finally {
      setBridgeLoading(false);
    }
  };

  const routeMessage = async () => {
    const text = routerInput.trim() || incomingMessage.trim();
    if (!text) {
      showNotice('Paste or type a WhatsApp command/message first.');
      return;
    }
    setRouting(true);
    try {
      const result = await window.ipcRenderer?.routeWhatsAppMessage?.(text, 'Silva');
      await refresh();
      showNotice(result?.ok ? `Routed to ${result.route?.broadcast ? 'all agents' : result.route?.routeLabel}.` : 'Could not route WhatsApp message.');
    } finally {
      setRouting(false);
    }
  };

  const draftProfessionalReply = async () => {
    const source = incomingMessage.trim() || message.trim();
    if (!source) {
      showNotice('Paste the message you received first.');
      return;
    }
    setDraftingReply(true);
    try {
      const prompt = `Draft a concise, professional WhatsApp reply. Keep it natural, helpful, and clear. Do not over-explain. Received message:\n\n${source}`;
      const response = await window.ipcRenderer?.chatBest?.({
        model: 'Auto local model',
        messages: [
          { role: 'system', content: 'You are ME WhatsApp Reply Assistant. Write polished, human, professional WhatsApp replies. No markdown unless useful.' },
          { role: 'user', content: prompt }
        ]
      }).catch(() => null);
      const content = response?.message?.content || response?.content || '';
      if (content.trim()) {
        setLabel('Professional reply');
        setMessage(content.trim());
        showNotice('Professional reply drafted with the local model route.');
      } else {
        setLabel('Professional reply');
        setMessage(`Hi, thanks for your message. I have seen this and I am checking it now. I will come back to you shortly with a clear update.`);
        showNotice('Local model did not reply, so ME used a safe professional fallback.');
      }
    } finally {
      setDraftingReply(false);
    }
  };

  const draftCount = useMemo(() => drafts.filter(d => d.status !== 'archived').length, [drafts]);

  return (
    <div className="min-h-full bg-[#fafafa] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 font-serif tracking-tight">WhatsApp ME</h1>
            <p className="text-sm text-gray-500 mt-1">Real WhatsApp communication workspace: draft, professional reply, save, then open the real composer.</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={keepActive}
              className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 shadow-sm transition-all flex items-center"
            >
              <Radio className="w-3.5 h-3.5 mr-2" />
              Keep Active
            </button>
            <button
              onClick={() => window.ipcRenderer?.openApp?.('whatsapp web')}
              className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-2" />
              WhatsApp Web
            </button>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {notice && (
          <div className="p-3 bg-green-50 border border-green-100 rounded-2xl text-xs font-bold text-green-700">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mr-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900">Compose</h2>
                  <p className="text-[10px] text-gray-500">ME opens the real composer. You decide when to send.</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                {draftCount} drafts
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact / phone</span>
                  <div className="flex items-center border border-gray-100 rounded-2xl bg-gray-50 px-3">
                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Optional phone number"
                      className="w-full py-3 bg-transparent text-sm outline-none"
                    />
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Draft label</span>
                  <input
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-50"
                  />
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message received</span>
                <textarea
                  value={incomingMessage}
                  onChange={e => setIncomingMessage(e.target.value)}
                  placeholder="Paste the WhatsApp message you received here, then click Draft Pro Reply..."
                  className="w-full h-24 px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-50 resize-none"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message to send</span>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write the message ME should prepare..."
                  className="w-full h-44 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-50 resize-none"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {templates.map(template => (
                  <button
                    key={template.label}
                    onClick={() => {
                      setLabel(template.label);
                      setMessage(template.message);
                    }}
                    className="px-3 py-2 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-100 rounded-xl text-[10px] font-black text-gray-600 hover:text-green-700 uppercase tracking-widest transition-all"
                  >
                    {template.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={draftProfessionalReply}
                  disabled={draftingReply}
                  className="px-4 py-2 bg-green-50 border border-green-100 rounded-xl text-xs font-black text-green-700 hover:bg-green-100 transition-all flex items-center disabled:opacity-60"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-2" />
                  {draftingReply ? 'Drafting...' : 'Draft Pro Reply'}
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(message).then(() => showNotice('Message copied.'))}
                  className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center"
                >
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copy
                </button>
                <button
                  onClick={() => saveDraft()}
                  className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center"
                >
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save Draft
                </button>
                <button
                  onClick={openCompose}
                  disabled={loading}
                  className="px-5 py-2 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 shadow-md shadow-green-100 transition-all flex items-center disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  Open Composer
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center">
                  <div className="w-9 h-9 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mr-3">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900">WhatsApp Channel</h2>
                    <p className="text-[10px] text-gray-500">One WhatsApp identity routed to many agents.</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${channelStatus?.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {channelStatus?.ok ? 'Active' : 'Offline'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-3 rounded-2xl bg-gray-50">
                  <p className="text-lg font-black text-gray-900">{routes.length}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Agent routes</p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50">
                  <p className="text-lg font-black text-gray-900">{channelStatus?.drafts || drafts.length}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Drafts</p>
                </div>
              </div>
              <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black text-green-900 uppercase tracking-widest">Local Free Bridge</p>
                    <p className="text-[10px] text-green-700 mt-1">Disabled for stability. Use manual drafts/composer.</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${channelStatus?.localBridgeRunning ? 'bg-green-600 text-white' : 'bg-white text-green-700 border border-green-200'}`}>
                    {channelStatus?.localBridgeRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={ownerPhone}
                    onChange={e => setOwnerPhone(e.target.value)}
                    placeholder="Your WhatsApp number, e.g. 447..."
                    className="flex-1 px-3 py-2 bg-white border border-green-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-green-100"
                  />
                  <button
                    onClick={startLocalBridge}
                    disabled={true}
                    className="px-3 py-2 bg-gray-200 text-gray-500 rounded-xl text-[10px] font-black cursor-not-allowed"
                  >
                    Disabled
                  </button>
                  <button
                    onClick={stopLocalBridge}
                    disabled={bridgeLoading}
                    className="px-3 py-2 bg-white text-green-700 border border-green-100 rounded-xl text-[10px] font-black hover:bg-green-100 disabled:opacity-60"
                  >
                    Stop
                  </button>
                </div>
                <p className="text-[9px] text-green-700 leading-4">
                  The live Web bridge is turned off because it froze HermesDesk. WhatsApp ME still saves drafts, opens WhatsApp, and lets you approve sends manually.
                </p>
                {channelStatus?.localBridgeLastState && (
                  <div className="p-2 bg-white border border-green-100 rounded-xl">
                    <p className="text-[9px] font-black text-green-900">
                      Last scan: {channelStatus.localBridgeLastState.loggedIn ? 'logged in' : 'needs login'} · {channelStatus.localBridgeLastState.messageCount || 0} messages · {channelStatus.localBridgeLastState.commandCount || 0} commands
                    </p>
                    <p className="text-[9px] text-green-700 truncate mt-1">
                      {channelStatus.localBridgeLastState.lastMessages?.slice(-1)?.[0] || channelStatus.localBridgeLastState.bodySample || 'No readable WhatsApp message yet.'}
                    </p>
                  </div>
                )}
              </div>
              <textarea
                value={routerInput}
                onChange={e => setRouterInput(e.target.value)}
                placeholder="Try: baba: any important updates? or accountant: unpaid bills?"
                className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-green-50 resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={routeMessage}
                  disabled={routing}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black disabled:opacity-60 flex items-center justify-center"
                >
                  <Bot className="w-3.5 h-3.5 mr-2" />
                  {routing ? 'Routing...' : 'Route to Agent'}
                </button>
                <button
                  onClick={() => setRouterInput('all: ')}
                  className="px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-black hover:bg-green-100 flex items-center"
                >
                  <Users className="w-3.5 h-3.5 mr-2" />
                  All
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {routes.map(route => (
                  <button
                    key={route.prefix}
                    onClick={() => setRouterInput(`${route.prefix}: `)}
                    className="p-2 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-100 rounded-xl text-left transition-all"
                  >
                    <p className="text-[10px] font-black text-gray-900">{route.prefix}:</p>
                    <p className="text-[8px] text-gray-500 truncate">{route.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 bg-gray-950 text-white rounded-3xl shadow-xl">
              <div className="flex items-center mb-3">
                <Shield className="w-4 h-4 text-green-400 mr-2" />
                <h2 className="text-xs font-black uppercase tracking-widest">Real Safety</h2>
              </div>
              <p className="text-xs text-gray-300 leading-6">
                WhatsApp personal/free has no official background API. Local Bridge uses your signed-in WhatsApp Web session, watches your own command chat, routes commands to agents, and can reply only back to you. Sending to customers, suppliers, solicitors, banks, or anyone else stays manual approval.
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recent Drafts</h2>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                {drafts.length ? drafts.map(draft => (
                  <button
                    key={draft.id}
                    onClick={() => {
                      setPhone(draft.phone || '');
                      setLabel(draft.label || 'WhatsApp draft');
                      setMessage(draft.message || '');
                    }}
                    className="w-full p-4 text-left hover:bg-green-50/40 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-gray-900 truncate">{draft.label}</p>
                      <span className="text-[8px] font-black uppercase tracking-widest text-green-600">{draft.status}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 max-h-8 overflow-hidden">{draft.message}</p>
                  </button>
                )) : (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-900">No WhatsApp drafts yet</p>
                    <p className="text-xs text-gray-500 mt-1">Create one, then open it in the real composer.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
