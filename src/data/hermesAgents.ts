import {
  Scale, Calculator, Home, Mail, Monitor, Code, Search, Shield,
  Paperclip, Rocket, Brain, FileText, Wrench, Building2, Receipt,
  Car, Landmark, Bell, CreditCard, Workflow, Globe
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
    id: 'general-agent',
    name: 'General ME / Mythos Manager',
    group: 'Hermes',
    role: 'Manager, Router, Clarifier & Verifier',
    capability: 'Receives every unclear/mixed task, chooses the lead specialist, adds collaborators, checks connector truth, enforces approval gates, coordinates peer verification, and returns the final action plan.',
    connector: 'Jan + TurboQuant, Mail ME memory, TinyFish, Browser Operator, Skills',
    approval: 'Approval gated for sending, deleting, filing, purchases, legal submissions, and external actions.',
    status: 'ready',
    icon: Workflow,
    color: 'bg-zinc-900'
  },
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
    id: 'justice-case-agent',
    name: 'Justice Case Builder',
    group: 'Hermes',
    role: 'Legal Fight, Evidence, Appeal & Complaint Pack',
    capability: 'Builds a real case pack: chronology, evidence index, legal issues, loophole/risk analysis, UK appeal/review route map, complaint drafts, and hearing prep. It researches current official routes before action.',
    connector: 'My Computer, Browser Operator, Mail ME, File System',
    approval: 'Draft/research only. You approve filing, sending, court submissions, public claims, money, and external messages.',
    status: 'ready',
    icon: Landmark,
    color: 'bg-red-950'
  },
  {
    id: 'purchase-guardian-agent',
    name: 'Purchase Guardian',
    group: 'Hermes',
    role: 'Online Buying, Scam Check & Refund Strategy',
    capability: 'Researches sellers/products, compares prices, checks scam signals, records evidence, and builds refund/chargeback/complaint routes.',
    connector: 'Browser Operator, My Computer, WhatsApp ME, Mail ME',
    approval: 'Draft only; you approve purchases, payments, disputes, reviews, and messages.',
    status: 'ready',
    icon: Receipt,
    color: 'bg-emerald-950'
  },
  {
    id: 'browser-automation-agent',
    name: 'Browser Automation Agent',
    group: 'Hermes',
    role: 'Real Browser Click, Type, Extract & Verify',
    capability: 'Controls the ME browser computer with real open/read/click/type/screenshot/inspect steps, extracts links/text, compares pages, and stops before risky purchase/submit actions.',
    connector: 'Browser Operator, TinyFish, Web Research',
    approval: 'Approval required before pay, buy, checkout, submit, sign, book, password, bank, legal, or account-changing actions.',
    status: 'ready',
    icon: Globe,
    color: 'bg-indigo-700'
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
