import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Globe, Mail, Github, Layout, 
  Puzzle, Database, Monitor, Cpu, Zap, X, ChevronRight,
  Filter, ExternalLink
} from 'lucide-react';
import { connectorsData, Connector } from '../data/connectors';

interface ConnectorsManagerProps {
  onAddCustomAPI?: () => void;
  onAddCustomMCP?: () => void;
}

const CategoryTab = ({ label, active, onClick, count }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
      active 
        ? 'text-blue-600 border-blue-600' 
        : 'text-gray-400 border-transparent hover:text-gray-600'
    }`}
  >
    <span>{label}</span>
    {count !== undefined && (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
        active ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const ConnectorItem = ({ connector, isConnected, onToggle }: { connector: Connector, isConnected: boolean, onToggle: () => void }) => (
  <div className="group p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-blue-100 hover:shadow-sm transition-all">
    <div className="flex items-center space-x-4">
      <div className={`w-12 h-12 ${connector.color} rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105`}>
        <connector.icon className="w-6 h-6" />
      </div>
      <div>
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-bold text-gray-900">{connector.title}</h4>
          {connector.isNew && (
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-full">New</span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 leading-tight mt-1 max-w-[240px]">{connector.desc}</p>
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <button 
        onClick={onToggle}
        className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
        isConnected 
          ? 'bg-gray-50 text-gray-400 border border-gray-100' 
          : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
      }`}>
        {isConnected ? 'Connected' : 'Add'}
      </button>
    </div>
  </div>
);

export const ConnectorsManager = ({ onAddCustomAPI, onAddCustomMCP }: ConnectorsManagerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Apps' | 'Custom API' | 'Custom MCP'>('Apps');
  const [connectorsState, setConnectorsState] = useState<{[key: string]: boolean}>({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const fetchState = async () => {
      if (window.ipcRenderer) {
        const state = await window.ipcRenderer.getConnectors();
        setConnectorsState(state);
      }
    };
    fetchState();
  }, []);

  const toggleConnector = async (id: string) => {
    if (window.ipcRenderer) {
      const newState = !connectorsState[id];
      const updatedState = await window.ipcRenderer.toggleConnector(id, newState);
      setConnectorsState(updatedState);
      setNotice(`${newState ? 'Connected' : 'Disconnected'} ${id}`);
      setTimeout(() => setNotice(''), 2500);
    }
  };

  const handleGoogleConnect = async () => {
    if (window.ipcRenderer) {
      const result = await window.ipcRenderer.connectGoogle();
      if (result.success) {
        const state = await window.ipcRenderer.getConnectors();
        setConnectorsState(state);
      }
    }
  };

  const filteredConnectors = useMemo(() => {
    return connectorsData.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = c.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const counts = useMemo(() => ({
    Apps: connectorsData.filter(c => c.category === 'Apps').length,
    'Custom API': connectorsData.filter(c => c.category === 'Custom API').length,
    'Custom MCP': connectorsData.filter(c => c.category === 'Custom MCP').length,
  }), []);

  const recommended = useMemo(() => {
    return connectorsData.filter(c => c.category === 'Apps' && (c.isNew || c.id === 'my-browser'));
  }, []);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
          {notice}
        </div>
      )}
      {/* Header Area */}
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search connectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div className="flex items-center space-x-3">
             <button className="p-2.5 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl border border-gray-100 transition-all">
               <Filter className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-6 border-b border-gray-100">
          <CategoryTab 
            label="Apps" 
            active={activeCategory === 'Apps'} 
            onClick={() => setActiveCategory('Apps')}
            count={counts.Apps}
          />
          <CategoryTab 
            label="Custom API" 
            active={activeCategory === 'Custom API'} 
            onClick={() => setActiveCategory('Custom API')}
            count={counts['Custom API']}
          />
          <CategoryTab 
            label="Custom MCP" 
            active={activeCategory === 'Custom MCP'} 
            onClick={() => setActiveCategory('Custom MCP')}
            count={counts['Custom MCP']}
          />
        </div>
      </div>

      {/* Dynamic Content */}
      <div className="space-y-10">
        {activeCategory === 'Apps' && !searchQuery && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recommended</h3>
              <button className="text-[10px] font-bold text-blue-600 hover:underline">View all</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommended.map(c => (
                <ConnectorItem 
                  key={c.id} 
                  connector={c} 
                  isConnected={connectorsState[c.id]} 
                  onToggle={() => toggleConnector(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'Custom API' && (
          <div className="p-6 bg-gray-50/50 border border-dashed border-gray-200 rounded-3xl flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Custom API Keys</h3>
              <p className="text-xs text-gray-500 mt-1">Connect Manus to any third-party service using your own API keys.</p>
            </div>
            <button 
              onClick={onAddCustomAPI || (() => {
                setActiveCategory('Custom API');
                setNotice('Open Settings > API Keys to save provider credentials.');
              })}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add custom API
            </button>
          </div>
        )}

        {activeCategory === 'Custom MCP' && (
          <div className="p-6 bg-gray-50/50 border border-dashed border-gray-200 rounded-3xl flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-purple-600">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Model Context Protocol</h3>
              <p className="text-xs text-gray-500 mt-1">No custom MCP added yet. Connect to any MCP server for extended tool capabilities.</p>
            </div>
            <button 
              onClick={onAddCustomMCP || (() => {
                setNotice('Custom MCP registry is ready; add server details when your MCP endpoint is available.');
              })}
              className="px-6 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add custom MCP
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {searchQuery ? `Search Results (${filteredConnectors.length})` : activeCategory}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredConnectors.map(c => (
              <ConnectorItem 
                key={c.id} 
                connector={c} 
                isConnected={connectorsState[c.id]} 
                onToggle={() => toggleConnector(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-gray-50 text-center">
          <p className="text-[11px] text-gray-400">
            Can't find what you're looking for? 
            <button
              onClick={() => {
                navigator.clipboard?.writeText('Connector request: ');
                setNotice('Connector request template copied.');
              }}
              className="ml-1 text-blue-600 font-bold hover:underline"
            >
              Let us know!
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
