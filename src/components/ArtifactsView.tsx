import React, { useEffect, useMemo, useState } from 'react';
import { FolderOpen, RefreshCw, ExternalLink, FileText, Globe, Palette, Table, Scale, CreditCard, Layout, Video, Music, Briefcase } from 'lucide-react';

const kindIcon: Record<string, any> = {
  slides: Layout,
  website: Globe,
  design: Palette,
  'data-analysis': Table,
  'justice-case': Scale,
  'purchase-protection': CreditCard,
  'video-plan': Video,
  'audio-plan': Music,
  'business-plan': Briefcase
};

const kindLabel: Record<string, string> = {
  slides: 'Slides',
  website: 'Website',
  design: 'Design',
  'data-analysis': 'Data Analysis',
  'justice-case': 'Justice Case',
  'purchase-protection': 'Purchase Protection',
  'video-plan': 'Video Plan',
  'audio-plan': 'Audio Plan',
  'business-plan': 'Business Plan'
};

const primaryFile = (artifact: any) => {
  const files = artifact.files || [];
  return files.find((file: string) => /index\.html$|deck\.html$|chart\.html$|design-preview\.svg$|00-readme\.md$|00-brief\.md$|00-opportunity\.md$/i.test(file)) || files[0];
};

export const ArtifactsView = ({ kind = 'all', title = 'Artifacts', desc = 'Generated local files and packs.' }: { kind?: string; title?: string; desc?: string }) => {
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [root, setRoot] = useState('');
  const [notice, setNotice] = useState('');

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const refresh = async () => {
    const result = await window.ipcRenderer?.listArtifacts?.(kind).catch((error: any) => ({ ok: false, error: error?.message }));
    if (result?.ok) {
      setArtifacts(result.artifacts || []);
      setRoot(result.root || '');
    } else {
      showNotice(result?.error || 'Could not read artifact folder.');
    }
  };

  useEffect(() => {
    refresh();
  }, [kind]);

  const counts = useMemo(() => artifacts.reduce((acc: Record<string, number>, item) => {
    acc[item.kind] = (acc[item.kind] || 0) + 1;
    return acc;
  }, {}), [artifacts]);

  return (
    <div className="min-h-full bg-[#fafafa] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{desc}</p>
            {root && <p className="text-[10px] text-gray-400 font-mono mt-2 truncate max-w-2xl">{root}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-700 hover:bg-gray-50 flex items-center">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Refresh
            </button>
            <button onClick={() => window.ipcRenderer?.revealArtifactsRoot?.()} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black flex items-center">
              <FolderOpen className="w-3.5 h-3.5 mr-2" />
              Open Folder
            </button>
          </div>
        </div>

        {notice && <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">{notice}</div>}

        {kind === 'all' && artifacts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {Object.entries(counts).map(([itemKind, count]) => (
              <div key={itemKind} className="p-3 bg-white border border-gray-100 rounded-2xl">
                <p className="text-lg font-black text-gray-900">{count}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{kindLabel[itemKind] || itemKind}</p>
              </div>
            ))}
          </div>
        )}

        {artifacts.length === 0 ? (
          <div className="p-10 bg-white border border-gray-100 rounded-3xl text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-sm font-black text-gray-900">No generated artifacts yet</p>
            <p className="text-xs text-gray-500 mt-1">Use the dashboard creation buttons to create websites, decks, designs, data reports, or protection packs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {artifacts.map(artifact => {
              const Icon = kindIcon[artifact.kind] || FileText;
              const mainFile = primaryFile(artifact);
              return (
                <div key={artifact.id} className="bg-white border border-gray-100 rounded-3xl p-5 space-y-4 hover:border-blue-100 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900 capitalize truncate">{artifact.title}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mt-1">{kindLabel[artifact.kind] || artifact.kind}</p>
                      </div>
                    </div>
                    <button onClick={() => window.ipcRenderer?.openPath?.(artifact.folder)} title="Open artifact folder" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl">
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(artifact.files || []).slice(0, 4).map((file: string) => (
                      <button key={file} onClick={() => window.ipcRenderer?.openPath?.(file)} className="w-full p-2 bg-gray-50 rounded-xl text-left text-[10px] font-mono text-gray-600 truncate hover:bg-blue-50">
                        {file.split(/[\\/]/).pop()}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <p className="text-[9px] text-gray-400">{new Date(artifact.updatedAt).toLocaleString()}</p>
                    <button
                      onClick={() => mainFile ? window.ipcRenderer?.openPath?.(mainFile) : window.ipcRenderer?.openPath?.(artifact.folder)}
                      className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-[10px] font-black hover:bg-black flex items-center"
                    >
                      <ExternalLink className="w-3 h-3 mr-1.5" />
                      Open
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
