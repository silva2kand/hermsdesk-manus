import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Database, 
  Zap, 
  Share2, 
  Info,
  ChevronRight,
  User,
  Check,
  Briefcase,
  Mail,
  Scale,
  Calculator,
  Globe,
  Cpu,
  Smile,
  Monitor
} from 'lucide-react';

const SettingTab = ({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  onClick: () => void 
}) => (
  <button 
    onClick={onClick}
    className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
      active 
        ? "bg-gray-100 text-gray-900" 
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
    }`}
  >
    <Icon className="w-4 h-4 mr-3" />
    {label}
  </button>
);

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('Personalization');

  return (
    <div className="flex h-full bg-[#fafafa]">
      {/* Sidebar Tabs */}
      <div className="w-64 p-4 border-r bg-white space-y-1">
        <h2 className="px-3 mb-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</h2>
        <SettingTab icon={SettingsIcon} label="General" active={activeTab === 'General'} onClick={() => setActiveTab('General')} />
        <SettingTab icon={Palette} label="Personalization" active={activeTab === 'Personalization'} onClick={() => setActiveTab('Personalization')} />
        <SettingTab icon={Briefcase} label="Professional" active={activeTab === 'Professional'} onClick={() => setActiveTab('Professional')} />
        <SettingTab icon={Database} label="Data control" active={activeTab === 'Data control'} onClick={() => setActiveTab('Data control')} />
        <SettingTab icon={Zap} label="Task" active={activeTab === 'Task'} onClick={() => setActiveTab('Task')} />
        <SettingTab icon={Globe} label="API & Connections" active={activeTab === 'API & Connections'} onClick={() => setActiveTab('API & Connections')} />
        <SettingTab icon={Share2} label="Integration" active={activeTab === 'Integration'} onClick={() => setActiveTab('Integration')} />
        <SettingTab icon={Info} label="About Manus" active={activeTab === 'About Manus'} onClick={() => setActiveTab('About Manus')} />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1 className="text-xl font-bold text-gray-900">{activeTab}</h1>

          {activeTab === 'API & Connections' && (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-gray-900">Cloud AI Providers</h3>
                 <span className="text-[10px] font-bold text-gray-400 uppercase">Free Tiers Available</span>
               </div>
               
               {[
                 { name: 'Google Gemini', icon: Globe, connected: true, color: 'bg-blue-500' },
                 { name: 'NVIDIA NIM', icon: Cpu, connected: false, color: 'bg-green-600' },
                 { name: 'OpenRouter', icon: Zap, connected: true, color: 'bg-purple-600' },
                 { name: 'Hugging Face', icon: Smile, connected: false, color: 'bg-orange-500' },
               ].map((p) => (
                 <div key={p.name} className="p-4 rounded-xl border border-gray-100 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${p.color} rounded-xl flex items-center justify-center`}>
                        <p.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{p.name}</p>
                        <input 
                          type="password" 
                          placeholder="Enter API Key" 
                          className="text-[10px] border-none p-0 focus:ring-0 text-gray-400 bg-transparent w-40"
                          defaultValue={p.connected ? '********' : ''}
                        />
                      </div>
                    </div>
                    <button className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      p.connected ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}>
                      {p.connected ? 'Connected' : 'Connect'}
                    </button>
                 </div>
               ))}

               <div className="pt-4 flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-gray-900">Local AI Engines</h3>
               </div>

               {[
                 { name: 'Ollama', status: 'Running', port: '11434' },
                 { name: 'LM Studio', status: 'Disconnected', port: '1234' },
               ].map((l) => (
                 <div key={l.name} className="p-4 rounded-xl border border-gray-100 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{l.name}</p>
                        <p className="text-[10px] text-gray-400">localhost:{l.port}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-[10px] font-bold uppercase ${l.status === 'Running' ? 'text-green-500' : 'text-gray-400'}`}>
                        {l.status}
                      </span>
                      <button className="px-4 py-1.5 bg-gray-100 text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-200">
                        Refresh
                      </button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'Professional' && (
            <div className="space-y-8">
              {/* UK Solicitor Module */}
              <section className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Scale className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">UK Solicitor Assistant</h3>
                    <p className="text-xs text-gray-500">Legal document analysis, compliance checks, and SRA standard support.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Auto-detect legal documents</span>
                    <div className="w-8 h-4 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Email organization (Client Matters)</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full relative cursor-pointer">
                      <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              </section>

              {/* UK Accountant Module */}
              <section className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">UK Accountant Assistant</h3>
                    <p className="text-xs text-gray-500">HMRC compliance, tax deadline tracking, and automated bookkeeping help.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">HMRC Portal Integration</span>
                    <button className="text-[10px] font-bold text-blue-600 uppercase">Connect</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">VAT Return Reminders</span>
                    <div className="w-8 h-4 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'Personalization' && (
            <div className="space-y-8">
              {/* User Persona Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">User persona</h3>
                  <button className="text-xs text-blue-600 font-medium hover:underline">Edit</button>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Professional User</p>
                      <p className="text-xs text-gray-500">I am a developer focused on building AI applications.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Memory Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Manus's memory</h3>
                  <button className="text-xs text-blue-600 font-medium hover:underline">Manage</button>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Manus can remember information across conversations to provide more relevant responses. 
                  You can manage what Manus remembers or turn off memory entirely.
                </p>
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">Enable memory</span>
                    <span className="text-xs text-gray-500">Keep context across different chats</span>
                  </div>
                  <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </section>

              {/* Theme Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Appearance</h3>
                <div className="grid grid-cols-3 gap-4">
                  <button className="flex flex-col items-center space-y-2 p-3 rounded-xl border-2 border-blue-600 bg-white">
                    <div className="w-full h-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center">
                       <div className="w-8 h-8 rounded-full border border-gray-200" />
                    </div>
                    <span className="text-xs font-medium text-gray-900">System</span>
                  </button>
                  <button className="flex flex-col items-center space-y-2 p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
                    <div className="w-full h-16 bg-white rounded-lg border border-gray-100" />
                    <span className="text-xs font-medium text-gray-500">Light</span>
                  </button>
                  <button className="flex flex-col items-center space-y-2 p-3 rounded-xl border border-gray-100 bg-gray-900">
                    <div className="w-full h-16 bg-gray-800 rounded-lg" />
                    <span className="text-xs font-medium text-gray-400">Dark</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'Integration' && (
            <div className="space-y-6">
               <div className="p-4 rounded-xl border border-gray-100 bg-white flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Telegram</p>
                      <p className="text-xs text-gray-500">Connect to your Telegram account</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">Connect</button>
               </div>
               {/* More integrations... */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
