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
    id: 'hermes-full',
    name: 'Hermes Agent',
    group: 'Hermes',
    role: 'System Architect & Coder',
    capability: 'Advanced coding, terminal access, OS control, and system-level automation. v1.7.0.',
    connector: 'Console, My Computer, GitHub, OS',
    approval: 'Full approval gated. Each OS/Command action requires manual user confirmation.',
    status: 'ready',
    icon: Rocket,
    color: 'bg-black'
  },
  {
    id: 'paperclip-full',
    name: 'Paperclips',
    group: 'Paperclip',
    role: 'Full Intelligence Organizer',
    capability: 'End-to-end document routing, email-to-task conversion, and UK compliance. v1.7.0.',
    connector: 'Mail ME, My Computer, File System',
    approval: 'Approval gated for all file and mail operations.',
    status: 'ready',
    icon: Paperclip,
    color: 'bg-blue-900'
  },
  {
    id: 'solicitor-agent',
    name: 'Solicitor Agent',
    group: 'Hermes',
    role: 'Legal Reasoning & Drafting',
    capability: 'Reviews letters, tenancy/property issues, claims, and legal timelines for UK law.',
    connector: 'My Computer, Web Research',
    approval: 'Draft only; you approve all legal decisions.',
    status: 'ready',
    icon: Scale,
    color: 'bg-slate-700'
  },
  {
    id: 'accountant-agent',
    name: 'Accountant Agent',
    group: 'Hermes',
    role: 'Ledger Parsing & VAT',
    capability: 'Parses bank statements, reconciles invoices, and calculates VAT/tax obligations.',
    connector: 'Stripe, Xero, Bank Feeds',
    approval: 'Ask before submitting financial records.',
    status: 'ready',
    icon: Calculator,
    color: 'bg-emerald-600'
  },
  {
    id: 'space-agent-full',
    name: 'Space Agent',
    group: 'Space',
    role: 'Full Monitoring Agent',
    capability: 'Deep system monitoring (RTX optimization), terminal monitoring, and real-time research.',
    connector: 'Console, Web Research, Resource Monitor',
    approval: 'Approval gated for all system changes.',
    status: 'ready',
    icon: Brain,
    color: 'bg-indigo-900'
  },
  {
    id: 'openclaw-full',
    name: 'OpenClaw',
    group: 'Space',
    role: 'Security & Forensics Agent',
    capability: 'System security audit, log analysis, and vulnerability detection.',
    connector: 'Console, My Computer, OS Control',
    approval: 'Full approval gated for all security actions.',
    status: 'ready',
    icon: Shield,
    color: 'bg-red-900'
  }
];

export const mailCategories = [
  { id: 'general', label: 'General', icon: FileText },
  { id: 'solicitor', label: 'Solicitor / Legal', icon: Scale },
  { id: 'accountant', label: 'Accountant / HMRC / VAT', icon: Calculator },
  { id: 'bills-home', label: 'Home bills', icon: Receipt },
  { id: 'bills-business', label: 'Business bills', icon: CreditCard },
  { id: 'council-tax', label: 'Council / Tax', icon: Landmark },
  { id: 'land-registry', label: 'Land Registry', icon: Home },
  { id: 'insurance', label: 'Insurance', icon: Shield },
  { id: 'tax-vat-mot', label: 'Tax / VAT / MOT', icon: Car },
  { id: 'visa-sponsors', label: 'Visa / Sponsors', icon: Scale },
  { id: 'suppliers', label: 'Suppliers / Sales reps', icon: Building2 },
  { id: 'sales', label: 'Sales reps / Sales', icon: Bell },
  { id: 'parcel-services', label: 'Parcel services', icon: Mail },
  { id: 'companies', label: 'My companies', icon: Building2 },
  { id: 'business', label: 'Business / Retail', icon: CreditCard },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'devs', label: 'Developers / Coding', icon: Code },
  { id: 'properties', label: 'Properties / Lenders', icon: Home },
  { id: 'pc-repair', label: 'PC issues', icon: Wrench },
  { id: 'research', label: 'Research / Cross-check', icon: Brain },
  { id: 'space', label: 'Space agents', icon: Rocket }
];
