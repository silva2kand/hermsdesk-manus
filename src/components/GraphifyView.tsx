import React, { useMemo, useState } from 'react';
import { Copy, Download, Network, RefreshCw } from 'lucide-react';

type NodeKind = 'agent' | 'system' | 'task' | 'document' | 'concept';

type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
};

const starter = `HermsDesk -> Jan + TurboQuant
HermsDesk -> Mail ME
Mail ME -> Paperclips Agent
WhatsApp ME -> Hermes Agent
Wide Research -> Browser Operator
Solicitor Agent -> Justice Case Builder
Purchase Guardian -> Evidence Pack`;

const kindFor = (label: string): NodeKind => {
  const text = label.toLowerCase();
  if (text.includes('agent') || text.includes('guardian')) return 'agent';
  if (/(jan|turbo|browser|mail|whatsapp|system|connector|api)/.test(text)) return 'system';
  if (/(task|case|research|workflow|pack)/.test(text)) return 'task';
  if (/(email|file|document|evidence|invoice|pdf)/.test(text)) return 'document';
  return 'concept';
};

const colors: Record<NodeKind, string> = {
  agent: '#2563eb',
  system: '#111827',
  task: '#7c3aed',
  document: '#059669',
  concept: '#64748b'
};

const parseGraph = (text: string) => {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const addNode = (label: string) => {
    const clean = label.trim().slice(0, 60);
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `node-${nodes.size + 1}`;
    if (!nodes.has(id)) nodes.set(id, { id, label: clean, kind: kindFor(clean), x: 0, y: 0 });
    return nodes.get(id)!;
  };

  text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).forEach(line => {
    const [left, right] = line.split(/\s*(?:->|=>|-->| to | routes to | uses )\s*/i);
    if (!right) {
      addNode(left);
      return;
    }
    const source = addNode(left);
    const target = addNode(right);
    edges.push({ id: `edge-${edges.length + 1}`, source: source.id, target: target.id });
  });

  const list = Array.from(nodes.values());
  const radius = Math.max(120, Math.min(220, list.length * 24));
  list.forEach((node, index) => {
    const angle = ((Math.PI * 2) / Math.max(list.length, 1)) * index - Math.PI / 2;
    node.x = Math.round(360 + Math.cos(angle) * radius);
    node.y = Math.round(250 + Math.sin(angle) * radius);
  });

  return { nodes: list, edges };
};

export const GraphifyView = () => {
  const [input, setInput] = useState(starter);
  const graph = useMemo(() => parseGraph(input), [input]);
  const graphJson = useMemo(() => JSON.stringify(graph, null, 2), [graph]);

  const copyJson = async () => navigator.clipboard?.writeText(graphJson);
  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([graphJson], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `graphify-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-[#f7f8fb] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-[0.24em]">Local Visual Intelligence</p>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight mt-1">Graphify</h1>
            <p className="text-sm text-gray-500 mt-1">Map agents, tools, emails, cases, evidence, suppliers, tasks, and workflows into a local graph.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setInput(starter)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Reset</button>
            <button onClick={copyJson} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black flex items-center gap-2"><Copy className="w-3.5 h-3.5" /> Copy JSON</button>
            <button onClick={exportJson} className="px-4 py-2 bg-gray-950 text-white rounded-xl text-xs font-black flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Export</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-gray-900">Graph Input</h2>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} className="w-full h-[470px] resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs font-semibold text-gray-700 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-50" spellCheck={false} />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-lg font-black">{graph.nodes.length}</p><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Nodes</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-lg font-black">{graph.edges.length}</p><p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Links</p></div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="h-12 border-b border-gray-100 px-5 flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-black text-gray-900">Live Graph</h2>
            </div>
            <div className="overflow-auto">
              <svg viewBox="0 0 720 500" className="w-full min-w-[720px] h-[560px] bg-[radial-gradient(circle_at_1px_1px,#e5e7eb_1px,transparent_0)] [background-size:22px_22px]">
                {graph.edges.map(edge => {
                  const source = graph.nodes.find(node => node.id === edge.source);
                  const target = graph.nodes.find(node => node.id === edge.target);
                  if (!source || !target) return null;
                  return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#94a3b8" strokeWidth="2" />;
                })}
                {graph.nodes.map(node => (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r="30" fill={colors[node.kind]} />
                    <foreignObject x={node.x - 62} y={node.y + 38} width="124" height="48">
                      <div className="text-center text-[10px] leading-tight font-black text-gray-800 break-words">{node.label}</div>
                    </foreignObject>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
