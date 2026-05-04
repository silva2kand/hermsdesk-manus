import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const WideResearchView = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [brief, setBrief] = useState('');
  const [items, setItems] = useState('');
  const [notice, setNotice] = useState('');

  const selected = useMemo(() => runs.find(run => run.id === selectedId) || runs[0], [runs, selectedId]);

  const refresh = async () => {
    const data = await window.ipcRenderer.getWideResearchRuns?.();
    setRuns(data || []);
    if (!selectedId && data?.[0]) setSelectedId(data[0].id);
  };

  useEffect(() => {
    refresh();
    const onRun = (_: any, run: any) => {
      setRuns(prev => {
        const next = prev.some(item => item.id === run.id)
          ? prev.map(item => item.id === run.id ? run : item)
          : [run, ...prev];
        return next;
      });
      setSelectedId(run.id);
    };
    window.ipcRenderer?.on?.('wide-research:run', onRun);
    return () => {
      window.ipcRenderer?.off?.('wide-research:run', onRun);
    };
  }, []);

  const startRun = async () => {
    if (!brief.trim()) return;
    const targets = items.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    const run = await window.ipcRenderer.startWideResearch?.(brief.trim(), targets);
    await window.ipcRenderer.researchWebAutomation?.(brief.trim()).catch(() => null);
    setSelectedId(run.id);
    setBrief('');
    setItems('');
    setNotice('Wide Research run started and a live browser verification search was opened.');
    window.setTimeout(() => setNotice(''), 3000);
  };

  const statusIcon = (status: string) => {
    if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === 'failed') return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
  };

  return (
    <div className="min-h-full bg-[#fafafa] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Wide Research</h2>
            <p className="text-sm text-gray-500 mt-1">Split a brief into multiple local model workers, then synthesize the results.</p>
          </div>
          <div className="flex items-center px-3 py-2 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-700">
            <Search className="w-3.5 h-3.5 mr-2" />
            Local parallel research
          </div>
        </div>

        {notice && <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">{notice}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-3xl p-5 space-y-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">New Run</h3>
              <textarea
                value={brief}
                onChange={event => setBrief(event.target.value)}
                placeholder="Research brief, market, companies, leads, products, or decisions to compare..."
                className="w-full min-h-32 p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-50"
              />
              <textarea
                value={items}
                onChange={event => setItems(event.target.value)}
                placeholder="Optional: one item per line. If empty, ME creates broad research lanes."
                className="w-full min-h-28 p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-50"
              />
              <button
                onClick={startRun}
                disabled={!brief.trim()}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-black disabled:bg-gray-200"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Wide Research
              </button>
            </div>

            <div className="space-y-2">
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => setSelectedId(run.id)}
                  className={`w-full p-4 text-left rounded-2xl border transition-all ${selected?.id === run.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-100 hover:border-blue-100'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black truncate">{run.brief}</p>
                    {statusIcon(run.status)}
                  </div>
                  <p className={`text-[10px] mt-1 ${selected?.id === run.id ? 'text-gray-300' : 'text-gray-400'}`}>
                    {run.workers?.length || 0} workers · {new Date(run.createdAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-6 min-h-[520px]">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <Plus className="w-10 h-10 mb-3" />
                <p className="text-sm font-black text-gray-900">No research runs yet</p>
                <p className="text-xs mt-1">Start a run to create worker findings and a synthesis.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-black text-gray-900">Research Run</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      {statusIcon(selected.status)}
                      {selected.status}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{selected.brief}</p>
                </div>

                <section className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Synthesis</h4>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs text-gray-700 whitespace-pre-wrap min-h-24">
                    {selected.synthesis || 'Synthesis appears when all workers finish.'}
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Workers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(selected.workers || []).map((worker: any) => (
                      <div key={worker.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black text-gray-900 truncate">{worker.item}</p>
                          {statusIcon(worker.status)}
                        </div>
                        <p className="text-[11px] text-gray-600 mt-2 whitespace-pre-wrap line-clamp-[12]">
                          {worker.result || worker.error || 'Queued...'}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
