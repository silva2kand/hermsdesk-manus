import React, { useEffect, useMemo, useState } from 'react';
import { FolderKanban, Plus, Paperclip, Play, Trash2, Save, Cable, Clock } from 'lucide-react';

const connectorOptions = ['jan-turboquant', 'ollama', 'lm-studio', 'openrouter', 'microsoft-graph', 'classic-outlook', 'github', 'file-system', 'mcp-windows-shell'];

export const ProjectsView = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<any>(null);
  const [notice, setNotice] = useState('');

  const selected = useMemo(() => projects.find(project => project.id === selectedId) || projects[0], [projects, selectedId]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const refresh = async () => {
    const data = await window.ipcRenderer.getProjects?.();
    setProjects(data || []);
    if (!selectedId && data?.[0]) setSelectedId(data[0].id);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setDraft(selected ? { ...selected } : null);
  }, [selected?.id]);

  const createProject = async () => {
    const name = window.prompt('Project name');
    if (!name) return;
    const project = await window.ipcRenderer.saveProject?.({
      name,
      description: '',
      instructions: 'Use this project context for every related task. Prefer local-first tools and ask for approval before external actions.',
      files: [],
      connectors: ['jan-turboquant', 'file-system'],
      taskHistory: []
    });
    await refresh();
    setSelectedId(project.id);
    showNotice(`Created project: ${project.name}`);
  };

  const saveProject = async () => {
    if (!draft) return;
    const saved = await window.ipcRenderer.saveProject?.(draft);
    await refresh();
    setSelectedId(saved.id);
    showNotice('Project saved.');
  };

  const deleteProject = async () => {
    if (!selected || !window.confirm(`Delete project "${selected.name}"?`)) return;
    const next = await window.ipcRenderer.deleteProject?.(selected.id);
    setProjects(next || []);
    setSelectedId(next?.[0]?.id || '');
    showNotice('Project deleted.');
  };

  const attachFiles = async () => {
    if (!selected) return;
    const files = await window.ipcRenderer.selectFiles?.();
    if (!files?.length) return;
    const updated = await window.ipcRenderer.addProjectFiles?.(selected.id, files);
    await refresh();
    setSelectedId(updated.id);
    showNotice(`${files.length} file${files.length === 1 ? '' : 's'} attached.`);
  };

  const startTask = async () => {
    if (!selected) return;
    const prompt = window.prompt('Project task');
    if (!prompt) return;
    const result = await window.ipcRenderer.startProjectTask?.(selected.id, prompt, 'hermes-full');
    if (result?.ok) {
      await refresh();
      setSelectedId(selected.id);
      showNotice('Project task queued for Hermes Agent.');
    } else {
      showNotice(result?.error || 'Could not start project task.');
    }
  };

  const toggleConnector = (id: string) => {
    if (!draft) return;
    const current = draft.connectors || [];
    setDraft({
      ...draft,
      connectors: current.includes(id) ? current.filter((item: string) => item !== id) : [...current, id]
    });
  };

  return (
    <div className="min-h-full bg-[#fafafa] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Projects</h2>
            <p className="text-sm text-gray-500 mt-1">Persistent workspaces for instructions, files, connectors, and reusable task context.</p>
          </div>
          <button onClick={createProject} className="flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-black">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </button>
        </div>

        {notice && <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">{notice}</div>}

        {projects.length === 0 ? (
          <div className="p-10 bg-white border border-gray-100 rounded-3xl text-center">
            <FolderKanban className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-black text-gray-900">No projects yet</p>
            <p className="text-xs text-gray-500 mt-1">Create one to give ME reusable context across tasks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <div className="space-y-2">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedId(project.id)}
                  className={`w-full p-4 text-left rounded-2xl border transition-all ${selected?.id === project.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-100 hover:border-blue-100'}`}
                >
                  <p className="text-xs font-black truncate">{project.name}</p>
                  <p className={`text-[10px] mt-1 truncate ${selected?.id === project.id ? 'text-gray-300' : 'text-gray-400'}`}>{project.files?.length || 0} files · {project.connectors?.length || 0} connectors</p>
                </button>
              ))}
            </div>

            {draft && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <input
                      value={draft.name}
                      onChange={event => setDraft({ ...draft, name: event.target.value })}
                      className="w-full text-xl font-black text-gray-900 bg-transparent border-b border-gray-100 pb-2 outline-none focus:border-blue-200"
                    />
                    <textarea
                      value={draft.description}
                      onChange={event => setDraft({ ...draft, description: event.target.value })}
                      placeholder="Project description"
                      className="w-full min-h-20 p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={saveProject} className="p-2.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl" title="Save">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={deleteProject} className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <section className="space-y-3">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instructions</h3>
                  <textarea
                    value={draft.instructions}
                    onChange={event => setDraft({ ...draft, instructions: event.target.value })}
                    className="w-full min-h-36 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-50"
                  />
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Connectors</h3>
                    <Cable className="w-4 h-4 text-gray-300" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {connectorOptions.map(id => (
                      <button
                        key={id}
                        onClick={() => toggleConnector(id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${draft.connectors?.includes(id) ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Files</h3>
                    <button onClick={attachFiles} className="flex items-center text-[10px] font-black text-blue-600 uppercase">
                      <Paperclip className="w-3.5 h-3.5 mr-1" />
                      Attach
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(draft.files || []).length === 0 && <p className="text-xs text-gray-400">No files attached yet.</p>}
                    {(draft.files || []).slice(0, 8).map((file: string) => (
                      <div key={file} className="p-2 bg-gray-50 rounded-xl text-[10px] font-mono text-gray-600 truncate">{file}</div>
                    ))}
                  </div>
                </section>

                <section className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Task History</h3>
                    <p className="text-xs text-gray-500 mt-1">{draft.taskHistory?.length || 0} project-aware tasks queued</p>
                  </div>
                  <button onClick={startTask} className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black hover:bg-blue-700">
                    <Play className="w-4 h-4 mr-2" />
                    Start Project Task
                  </button>
                </section>

                {(draft.taskHistory || []).slice(0, 5).map((task: any) => (
                  <div key={task.id} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(task.createdAt).toLocaleString()} · {task.agentId || 'hermes-full'}
                    </div>
                    <p className="text-xs text-gray-700 mt-1">{task.prompt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
