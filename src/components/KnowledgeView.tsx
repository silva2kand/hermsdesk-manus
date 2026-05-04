import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Layout, Video, Music, Monitor, 
  BarChart3, MessageSquare, Code, BookOpen, Clock, 
  ChevronRight, Trash2, Edit3, Globe, Palette, Shield, Sparkles
} from 'lucide-react';

export const KnowledgeView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [knowledgeData, setKnowledgeData] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchKnowledge = async () => {
      if (window.ipcRenderer) {
        const data = await window.ipcRenderer.getKnowledge();
        setKnowledgeData(data);
      }
    };
    fetchKnowledge();
  }, []);

  const filteredKnowledge = useMemo(() => {
    return (knowledgeData || []).filter(k => 
      k.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      k.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, knowledgeData]);

  const editingItem = useMemo(() => 
    knowledgeData.find(k => k.id === editingId), 
    [editingId, knowledgeData]
  );

  const handleUpdateRules = async (id: string, newRules: string) => {
    const newData = knowledgeData.map(k => k.id === id ? { ...k, rules: newRules } : k);
    setKnowledgeData(newData);
    if (window.ipcRenderer) {
      await window.ipcRenderer.saveKnowledge(newData);
    }
  };

  if (editingId && editingItem) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setEditingId(null)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Knowledge Rules</h2>
            <p className="text-sm text-gray-500 mt-1">{editingItem.title}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
            <textarea 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all h-24 resize-none"
              value={editingItem.desc}
              readOnly
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Rules</label>
              <span className="text-[10px] text-blue-600 font-bold">Applied to Agent Context</span>
            </div>
            <textarea 
              className="w-full px-6 py-4 bg-gray-900 text-blue-100 font-mono text-xs border border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-64 resize-none leading-relaxed"
              value={editingItem.rules}
              onChange={(e) => handleUpdateRules(editingId, e.target.value)}
              placeholder="Enter instructions/rules for this knowledge item..."
            />
            <p className="text-[10px] text-gray-400 italic">These rules will be injected into the prompt when this knowledge is relevant.</p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button 
              onClick={() => setEditingId(null)}
              className="px-8 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
            >
              Done Editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Knowledge</h2>
          <p className="text-sm text-gray-500 mt-1">Manage what ME remembers and how it applies context.</p>
        </div>
        <button className="flex items-center px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
          <Plus className="w-4 h-4 mr-2" />
          Add Knowledge
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text"
          placeholder="Search knowledge by title, content, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-[24px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      {/* Knowledge Cards */}
      <div className="space-y-4">
        {filteredKnowledge.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setEditingId(item.id)}
            className="group p-6 bg-white border border-gray-100 rounded-[32px] hover:border-blue-100 hover:shadow-xl hover:shadow-gray-100 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[9px] font-black uppercase rounded-full border border-gray-100">{item.type}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">{item.desc}</p>
                  <div className="flex items-center space-x-4 pt-2">
                    <span className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3 mr-1.5" />
                      Created {item.created}
                    </span>
                    <span className="flex items-center text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:underline">
                      <Edit3 className="w-3 h-3 mr-1.5" />
                      View Rules
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingId(item.id); }}
                  className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Styles */}
      <div className="pt-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Quick Preferences</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StylePill icon={Palette} label="Professional" active />
          <StylePill icon={Code} label="Technical" active />
          <StylePill icon={Sparkles} label="Creative" />
          <StylePill icon={Shield} label="Privacy-First" active />
        </div>
      </div>
    </div>
  );
};

const StylePill = ({ icon: Icon, label, active }: any) => (
  <button className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl text-xs font-bold border transition-all ${
    active 
      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
      : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
  }`}>
    <Icon className="w-3.5 h-3.5" />
    <span>{label}</span>
  </button>
);
