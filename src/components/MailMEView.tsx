import React, { useState } from 'react';
import { 
  Mail, Plus, Copy, Check, Shield, User, Globe, 
  Trash2, AlertCircle, ChevronRight, Bell, Tags
} from 'lucide-react';
import { mailCategories } from '../data/hermesAgents';

export const MailMEView = () => {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [workflowEmails, setWorkflowEmails] = useState([
    { email: 'support@me.bot', desc: 'Automatically creates support tickets' },
    { email: 'orders@me.bot', desc: 'Processes incoming customer orders' }
  ]);
  const [approvedSenders, setApprovedSenders] = useState([
    'newtonstore0@gmail.com',
    'silvak2023@outlook.com',
    'sva23@live.co.uk',
    'yourshop1@hotmail.com',
    'shivakand115@gmail.com',
    'silvakretail@gmail.com'
  ]);
  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(mailCategories.map(category => [category.id, true]))
  );

  const copyEmail = () => {
    navigator.clipboard.writeText('newtonstore0422@me.bot');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

  const addWorkflowEmail = () => {
    const name = window.prompt('Workflow name, for example returns or invoices');
    if (!name) return;
    const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'workflow';
    setWorkflowEmails(prev => [...prev, { email: `${safe}@me.bot`, desc: `Creates ${name} tasks automatically` }]);
    showNotice(`Workflow email created: ${safe}@me.bot`);
  };

  const addSender = () => {
    const email = window.prompt('Approved sender email');
    if (!email) return;
    setApprovedSenders(prev => prev.includes(email) ? prev : [...prev, email]);
    showNotice(`Approved sender added: ${email}`);
  };

  const removeSender = (email: string) => {
    setApprovedSenders(prev => prev.filter(sender => sender !== email));
    showNotice(`Removed approved sender: ${email}`);
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Mail ME</h2>
        <p className="text-sm text-gray-500 mt-1">Create tasks and workflows by sending emails to your ME workspace.</p>
      </div>
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
          {notice}
        </div>
      )}

      {/* Main Email Address */}
      <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Your ME Email</h3>
              <p className="text-[11px] text-gray-500">Anything you email here becomes a task</p>
            </div>
          </div>
          <button 
            onClick={copyEmail}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 shadow-sm'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
          </button>
        </div>
        <div className="bg-white/80 p-3 rounded-xl border border-blue-100/50 flex items-center justify-center">
          <code className="text-sm font-black text-blue-700">newtonstore0422@me.bot</code>
        </div>
      </div>

      {/* Workflow Emails */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Workflow Emails</h3>
          <button onClick={addWorkflowEmail} className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-700">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create workflow email
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflowEmails.map((workflow) => (
            <button
              key={workflow.email}
              onClick={() => {
                navigator.clipboard.writeText(workflow.email);
                showNotice(`Copied ${workflow.email}`);
              }}
              className="p-4 bg-white border border-gray-100 rounded-2xl space-y-2 hover:border-blue-100 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">{workflow.email}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-all" />
              </div>
              <p className="text-[10px] text-gray-500">{workflow.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Approved Senders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Approved Senders</h3>
            <Shield className="w-3.5 h-3.5 text-green-500" />
          </div>
          <button onClick={addSender} className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-700">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add sender
          </button>
        </div>
        <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {approvedSenders.map((email, idx) => (
              <div key={idx} className="flex items-center justify-between px-6 py-3.5 hover:bg-white transition-all group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">{email}</span>
                </div>
                <button onClick={() => removeSender(email)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-start space-x-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
          <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-orange-700 leading-relaxed">
            Only emails from these approved senders will be processed. This ensures your workspace remains secure and prevents unauthorized task creation.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Paperclip Auto Organization</h3>
            <Tags className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase">{Object.values(enabledCategories).filter(Boolean).length} active routes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mailCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setEnabledCategories(prev => ({ ...prev, [category.id]: !prev[category.id] }))}
              className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-blue-100 hover:bg-blue-50/30 transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-500">
                  <category.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">{category.label}</p>
                  <p className="text-[10px] text-gray-500">Create task, keep source email, request approval before action.</p>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full relative transition-all ${enabledCategories[category.id] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${enabledCategories[category.id] ? 'left-4' : 'left-0.5'}`} />
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 bg-green-50/60 border border-green-100 rounded-2xl flex items-start space-x-3">
          <Bell className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-green-700 leading-relaxed">
            Mail ME routing is approval-first: ME can organize, summarize, draft replies, and notify you, but it must ask before replying, filing legal/accounting submissions, paying bills, or contacting third parties.
          </p>
        </div>
      </div>
    </div>
  );
};
