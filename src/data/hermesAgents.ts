import {
  Scale, Calculator, Home, Mail, Monitor, Code, Search, Shield,
  Paperclip, Rocket, Brain, FileText, Wrench, Building2, Receipt,
  Car, Landmark, Bell, CreditCard
} from 'lucide-react';

export type HermesAgentStatus = 'ready' | 'needs-connector' | 'needs-approval';

export interface HermesAgent {
  id: string;
  name: string;
  group: 'Hermes' | 'Paperclip' | 'Space';
  role: string;
  capability: string;
  connector: string;
  approval: string;
  status: HermesAgentStatus;
  icon: any;
  color: string;
}

export const hermesAgents: HermesAgent[] = [
  {
    id: 'paperclip-mail',
    name: 'Paperclip Mail Organizer',
    group: 'Paperclip',
    role: 'Email triage and task creation',
    capability: 'Classifies incoming work into general, solicitor, accountant, bills, HMRC, suppliers, invoices, properties, and dev queues.',
    connector: 'Mail ME, Gmail, Outlook Mail',
    approval: 'Ask before sending, filing, deleting, or applying labels.',
    status: 'needs-connector',
    icon: Mail,
    color: 'bg-blue-600'
  },
  {
    id: 'paperclip-docs',
    name: 'Paperclip Document Agent',
    group: 'Paperclip',
    role: 'Files, attachments, and evidence packs',
    capability: 'Builds organized case folders from files, folders, directory uploads, invoices, contracts, screenshots, and notes.',
    connector: 'My Computer',
    approval: 'Ask before moving, renaming, uploading, or deleting local files.',
    status: 'needs-approval',
    icon: Paperclip,
    color: 'bg-indigo-600'
  },
  {
    id: 'hermes-solicitor',
    name: 'Hermes Solicitor Desk',
    group: 'Hermes',
    role: 'UK legal and property support',
    capability: 'Reviews letters, tenancy/property issues, claims, licensing, council matters, and legal timelines for your approval.',
    connector: 'My Computer, Web Research',
    approval: 'Draft only; you approve all letters, filings, and legal decisions.',
    status: 'ready',
    icon: Scale,
    color: 'bg-purple-700'
  },
  {
    id: 'hermes-accountant',
    name: 'Hermes Accountant Desk',
    group: 'Hermes',
    role: 'Accounting, VAT, HMRC, bills, tax',
    capability: 'Organizes invoices, VAT notes, tax deadlines, business bills, home bills, insurance, and HMRC evidence packs.',
    connector: 'My Computer, Accounting APIs',
    approval: 'Ask before submitting, paying, or changing financial records.',
    status: 'needs-connector',
    icon: Calculator,
    color: 'bg-teal-600'
  },
  {
    id: 'hermes-property',
    name: 'Hermes Property Agent',
    group: 'Hermes',
    role: 'Buying, lenders, applications, MOT-style checks',
    capability: 'Tracks properties, lender requirements, forms, dates, council records, insurance, licensing, and supplier follow-ups.',
    connector: 'Web Research, Mail ME',
    approval: 'Ask before contacting agents, lenders, council, or suppliers.',
    status: 'needs-approval',
    icon: Home,
    color: 'bg-emerald-600'
  },
  {
    id: 'hermes-pc',
    name: 'Hermes PC Repair Agent',
    group: 'Hermes',
    role: 'Windows issue diagnosis',
    capability: 'Uses local resource scans and approved commands to diagnose app, model, driver, and performance issues.',
    connector: 'My Computer, Console',
    approval: 'Ask before running commands that change the system.',
    status: 'ready',
    icon: Monitor,
    color: 'bg-slate-700'
  },
  {
    id: 'space-research',
    name: 'Space Research Agent',
    group: 'Space',
    role: 'Real-time web research and cross-checking',
    capability: 'Opens live research routes, compares sources, and turns findings into task evidence with citations when available.',
    connector: 'Cloud Browser, My Browser',
    approval: 'Ask before logging into services, submitting forms, or buying anything.',
    status: 'needs-approval',
    icon: Search,
    color: 'bg-cyan-600'
  },
  {
    id: 'space-code',
    name: 'Space Coding Agent',
    group: 'Space',
    role: 'Programming, app builds, repo work',
    capability: 'Routes coding tasks through local models first, then approved cloud tools such as Claude Code when installed and authorized.',
    connector: 'GitHub, Local Models, optional Claude Code',
    approval: 'Ask before installing tools, pushing code, or changing production branches.',
    status: 'ready',
    icon: Code,
    color: 'bg-gray-900'
  },
  {
    id: 'hermes-scam-shield',
    name: 'Hermes Scam Shield',
    group: 'Hermes',
    role: 'Fraud and risk checks',
    capability: 'Checks suspicious emails, invoices, links, calls, suppliers, sales reps, and property requests for warning signs.',
    connector: 'Mail ME, Web Research',
    approval: 'Never replies or pays without explicit approval.',
    status: 'needs-approval',
    icon: Shield,
    color: 'bg-red-600'
  },
  {
    id: 'space-notify',
    name: 'Space Notify Agent',
    group: 'Space',
    role: 'Reminders, deadlines, scheduled tasks',
    capability: 'Tracks deadlines for HMRC, council, insurance, MOT, licensing, bills, lender forms, and supplier follow-ups.',
    connector: 'Scheduled Tasks, Calendar',
    approval: 'Ask before sending notifications to other people.',
    status: 'needs-connector',
    icon: Bell,
    color: 'bg-orange-500'
  }
];

export const mailCategories = [
  { id: 'general', label: 'General', icon: FileText },
  { id: 'solicitor', label: 'Solicitor / Legal', icon: Scale },
  { id: 'accountant', label: 'Accountant / HMRC / VAT', icon: Calculator },
  { id: 'bills-home', label: 'Home bills', icon: Receipt },
  { id: 'bills-business', label: 'Business bills', icon: CreditCard },
  { id: 'council-tax', label: 'Council / Tax', icon: Landmark },
  { id: 'insurance', label: 'Insurance', icon: Shield },
  { id: 'licensing-mot', label: 'Licensing / MOT', icon: Car },
  { id: 'suppliers', label: 'Suppliers / Sales reps', icon: Building2 },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'devs', label: 'Developers / Coding', icon: Code },
  { id: 'properties', label: 'Properties / Lenders', icon: Home },
  { id: 'pc-repair', label: 'PC issues', icon: Wrench },
  { id: 'research', label: 'Research / Cross-check', icon: Brain },
  { id: 'space', label: 'Space agents', icon: Rocket }
];
