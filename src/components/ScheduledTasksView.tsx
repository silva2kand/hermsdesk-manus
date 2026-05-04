import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, Play, Trash2, Calendar, 
  Settings, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';

export const ScheduledTasksView = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const fetchTasks = async () => {
      if (window.ipcRenderer) {
        const [tasks, taskRuns] = await Promise.all([
          window.ipcRenderer.getScheduledTasks(),
          window.ipcRenderer.getScheduledRuns?.().catch(() => [])
        ]);
        setSchedules(tasks);
        setRuns(taskRuns || []);
      }
    };
    fetchTasks();

    const onTasksUpdated = (_: any, tasks: any[]) => setSchedules(tasks || []);
    const onRun = (_: any, run: any) => {
      setRuns(prev => [run, ...prev].slice(0, 20));
      showNotice(`Queued scheduled task: ${run.scheduleName}`);
    };

    window.ipcRenderer?.on?.('scheduler:tasks-updated', onTasksUpdated);
    window.ipcRenderer?.on?.('scheduler:run', onRun);
    return () => {
      window.ipcRenderer?.off?.('scheduler:tasks-updated', onTasksUpdated);
      window.ipcRenderer?.off?.('scheduler:run', onRun);
    };
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const saveTasks = async (newTasks: any[]) => {
    if (window.ipcRenderer) {
      await window.ipcRenderer.saveScheduledTasks(newTasks);
    }
  };

  const handleAddTask = () => {
    const name = window.prompt('Task name');
    if (!name) return;
    const trigger = window.prompt('Trigger, for example: Every day at 9:00 AM, Every Monday at 8am, Every 30 minutes', 'Every day at 9:00 AM') || 'Every day at 9:00 AM';
    const task = window.prompt('What should ME do when this runs?', `Run this recurring workflow: ${name}`) || `Run this recurring workflow: ${name}`;
    const newTask = {
      id: Math.random().toString(36).substring(7),
      name,
      trigger,
      task,
      status: 'Active',
      color: 'bg-green-500',
      agentId: 'hermes-full'
    };
    const next = [...schedules, newTask];
    setSchedules(next);
    saveTasks(next);
  };

  const handleDeleteTask = (id: string) => {
    const next = schedules.filter(t => t.id !== id);
    setSchedules(next);
    saveTasks(next);
  };

  const handleToggleStatus = (id: string) => {
    const next = schedules.map(t => t.id === id ? { ...t, status: t.status === 'Active' ? 'Paused' : 'Active' } : t);
    setSchedules(next);
    saveTasks(next);
  };

  const handleRunNow = async (id: string) => {
    const result = await window.ipcRenderer.runScheduledTask?.(id);
    if (result?.ok) {
      showNotice(`Queued ${result.run?.scheduleName || 'scheduled task'} for agent execution.`);
      const tasks = await window.ipcRenderer.getScheduledTasks();
      setSchedules(tasks);
    } else {
      showNotice(result?.error || 'Could not run scheduled task.');
    }
  };

  const handleEditTask = (item: any) => {
    const name = window.prompt('Task name', item.name);
    if (!name) return;
    const trigger = window.prompt('Trigger', item.trigger) || item.trigger;
    const task = window.prompt('Task instructions', item.task) || item.task;
    const next = schedules.map(schedule => schedule.id === item.id ? { ...schedule, name, trigger, task } : schedule);
    setSchedules(next);
    saveTasks(next);
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Scheduled Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">Automate recurring workflows and time-based triggers.</p>
        </div>
        <button 
          onClick={handleAddTask}
          className="flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Task
        </button>
      </div>

      <div className="space-y-4">
        {notice && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
            {notice}
          </div>
        )}
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
          <Clock className="w-3.5 h-3.5 mr-2" />
          Recurring Automations
        </h3>
        <div className="space-y-4">
          {schedules.map((item) => (
            <div key={item.id} className="group p-6 bg-white border border-gray-100 rounded-[32px] hover:border-blue-100 hover:shadow-xl hover:shadow-gray-100 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start x-4">
                  <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 ml-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-black text-gray-900">{item.name}</h3>
                      <button 
                        onClick={() => handleToggleStatus(item.id)}
                        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full transition-all ${
                          item.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {item.status}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{item.trigger}</p>
                    <p className="text-[11px] text-gray-500 max-w-md">{item.task}</p>
                    {item.lastRunSummary && (
                      <p className={`text-[10px] font-bold ${item.lastRunStatus === 'failed' ? 'text-red-500' : 'text-green-600'}`}>
                        {item.lastRunSummary}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRunNow(item.id)}
                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Run now"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditTask(item)}
                    className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                    title="Edit schedule"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(item.id)}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {runs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-2" />
            Recent Runs
          </h3>
          <div className="bg-white border border-gray-100 rounded-3xl divide-y divide-gray-50 overflow-hidden">
            {runs.slice(0, 6).map(run => (
              <div key={run.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-gray-900">{run.scheduleName}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{new Date(run.startedAt).toLocaleString()} · {run.agentId}</p>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${run.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-100 flex items-start space-x-4">
        <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-gray-900">Automation Engine</h4>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Scheduled tasks run in the background using your default model routing. Ensure your computer is powered on for local-first triggers.
          </p>
        </div>
      </div>
    </div>
  );
};
