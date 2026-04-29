import React from 'react';
import { 
  Clock, Plus, Play, Trash2, Calendar, 
  Settings, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';

export const ScheduledTasksView = () => {
  const schedules = [
    {
      id: 'daily-briefing',
      name: 'Daily Research Briefing',
      trigger: 'Every day at 8:00 AM',
      task: 'Summarize top news from TechCrunch and Hacker News',
      status: 'Active',
      color: 'bg-blue-500'
    },
    {
      id: 'weekly-report',
      name: 'Weekly Sales Analysis',
      trigger: 'Every Monday at 9:00 AM',
      task: 'Generate revenue report from Stripe and email to SILVA',
      status: 'Active',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Scheduled Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">Automate recurring workflows and time-based triggers.</p>
        </div>
        <button className="flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Task
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
          <Clock className="w-3.5 h-3.5 mr-2" />
          Recurring Automations
        </h3>
        <div className="space-y-4">
          {schedules.map((item) => (
            <div key={item.id} className="group p-6 bg-white border border-gray-100 rounded-[32px] hover:border-blue-100 hover:shadow-xl hover:shadow-gray-100 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-black text-gray-900">{item.name}</h3>
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-black uppercase rounded-full">{item.status}</span>
                    </div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{item.trigger}</p>
                    <p className="text-[11px] text-gray-500 max-w-md">{item.task}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                    <Play className="w-4 h-4" />
                  </button>
                  <button className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
