import React, { useState } from 'react';
import { 
  Monitor, User, FolderPlus, Trash2, Shield, HardDrive, 
  ChevronRight, MoreVertical, Plus, Power, Terminal
} from 'lucide-react';

export const MyComputerSettings = () => {
  const [localFolders, setLocalFolders] = useState([
    { path: 'C:\\Users\\Silva\\WorkSpace', name: 'WorkSpace', size: '1.2 GB' },
    { path: 'C:\\Users\\Silva\\Downloads\\ME_Exports', name: 'Exports', size: '240 MB' }
  ]);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Computer</h2>
          <p className="text-sm text-gray-500 mt-1">Connect ME to your local machine for file access and OS integration.</p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-wider">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          System Connected
        </div>
      </div>

      {/* Local User Profile */}
      <div className="p-6 bg-gray-900 rounded-[32px] text-white flex items-center justify-between shadow-xl shadow-gray-200">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-2xl font-black shadow-lg">
            S
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">SILVA</h3>
            <div className="flex items-center space-x-3 mt-1">
              <span className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <User className="w-3 h-3 mr-1" />
                Local Admin
              </span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">C:\Users\Silva</span>
            </div>
          </div>
        </div>
        <button className="flex items-center space-x-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black transition-all border border-white/10">
          <Power className="w-4 h-4 text-red-400" />
          <span>Disconnect</span>
        </button>
      </div>

      {/* Local Folder Access */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
            <HardDrive className="w-3.5 h-3.5 mr-2" />
            File System Access
          </h3>
          <button className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-700">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add local folder
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden divide-y divide-gray-50">
          {localFolders.map((folder, idx) => (
            <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{folder.name}</p>
                  <p className="text-[10px] font-medium text-gray-400 font-mono mt-0.5">{folder.path}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{folder.size}</span>
                <button className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OS Integration Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <h4 className="text-[11px] font-black text-gray-900 uppercase">Terminal Access</h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">Execute scripts and commands in PowerShell/CMD.</p>
        </div>
        <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-2">
          <HardDrive className="w-4 h-4 text-gray-400" />
          <h4 className="text-[11px] font-black text-gray-900 uppercase">Local Storage</h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">Read, write, and organize files on your local drives.</p>
        </div>
        <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <h4 className="text-[11px] font-black text-gray-900 uppercase">System Bridge</h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">Full OS integration via Electron context bridge.</p>
        </div>
      </div>
    </div>
  );
};
