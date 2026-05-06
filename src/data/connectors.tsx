import { 
  Globe, Mail, Calendar, Github, Layout, MessageSquare, Share2,
  Database, Briefcase, BarChart3, Video, Music, Smile, 
  Cpu, Zap, Cloud, HardDrive, Monitor, Palette, Search, 
  Terminal, Layers, Activity, Bug, 
  Play, Mic, Check,
  CreditCard, PieChart, Target, Filter, 
  Book, Headphones, Users, 
  Camera, Shield, Table, Zap as Bolt
} from 'lucide-react';

export interface Connector {
  id: string;
  title: string;
  desc: string;
  icon: any;
  color: string;
  category: 'Apps' | 'Custom API' | 'Custom MCP';
  isNew?: boolean;
  connected?: boolean;
}

export const connectorsData: Connector[] = [
  // Apps - Recommended
  {
    id: 'instagram',
    title: 'Instagram',
    desc: 'Generate and publish Posts, Stories, or Reels to Instagram',
    icon: Camera,
    color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500',
    category: 'Apps',
    isNew: true
  },
  {
    id: 'instagram-marketplace',
    title: 'Instagram Creator Marketplace',
    desc: 'Discover creators that fit your brand’s reach, topics, and style',
    icon: Users,
    color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500',
    category: 'Apps',
    isNew: true
  },
  {
    id: 'meta-ads',
    title: 'Meta Ads Manager',
    desc: 'Automate ads insights and optimization to save hours and maximize profits',
    icon: BarChart3,
    color: 'bg-blue-600',
    category: 'Apps',
    isNew: true
  },
  {
    id: 'my-browser',
    title: 'My Browser',
    desc: 'Access the web on your own browser',
    icon: Globe,
    color: 'bg-blue-500',
    category: 'Apps',
    connected: true
  },
  // Apps - General
  {
    id: 'gmail',
    title: 'Gmail',
    desc: 'Draft replies, search your inbox, and summarize email threads instantly',
    icon: Mail,
    color: 'bg-red-500',
    category: 'Apps'
  },
  {
    id: 'google-calendar',
    title: 'Google Calendar',
    desc: 'Understand your schedule, manage events, and optimize your time effectively',
    icon: Calendar,
    color: 'bg-blue-600',
    category: 'Apps'
  },
  {
    id: 'google-drive',
    title: 'Google Drive',
    desc: 'Access your files, search instantly, and let ME help you manage documents intelligently',
    icon: Cloud,
    color: 'bg-green-600',
    category: 'Apps'
  },
  {
    id: 'outlook-mail',
    title: 'Outlook Mail',
    desc: 'Write, search, and manage your Outlook emails seamlessly within ME',
    icon: Mail,
    color: 'bg-blue-700',
    category: 'Apps'
  },
  {
    id: 'outlook-calendar',
    title: 'Outlook Calendar',
    desc: 'Schedule, view, and manage your Outlook events just with a prompt',
    icon: Calendar,
    color: 'bg-blue-800',
    category: 'Apps'
  },
  {
    id: 'github',
    title: 'GitHub',
    desc: 'Manage repositories, track code changes, and collaborate on team projects',
    icon: Github,
    color: 'bg-gray-900',
    category: 'Apps'
  },
  {
    id: 'slack',
    title: 'Slack',
    desc: 'Read and write Slack conversations in ME',
    icon: MessageSquare,
    color: 'bg-purple-600',
    category: 'Apps'
  },
  {
    id: 'notion',
    title: 'Notion',
    desc: 'Search workspace content, update notes, and automate workflows in Notion',
    icon: Layout,
    color: 'bg-gray-400',
    category: 'Apps'
  },
  {
    id: 'zapier',
    title: 'Zapier',
    desc: 'Connect ME and automate workflows across thousands of apps',
    icon: Zap,
    color: 'bg-orange-500',
    category: 'Apps'
  },
  {
    id: 'asana',
    title: 'Asana',
    desc: 'Streamline project and task management with Asana',
    icon: Briefcase,
    color: 'bg-red-400',
    category: 'Apps'
  },
  {
    id: 'monday',
    title: 'monday.com',
    desc: 'Coordinate tasks, manage boards, and streamline your project workflows',
    icon: Activity,
    color: 'bg-pink-500',
    category: 'Apps'
  },
  {
    id: 'make',
    title: 'Make',
    desc: 'Turn Make workflows into AI tools for intelligent automation execution',
    icon: Bolt,
    color: 'bg-purple-500',
    category: 'Apps'
  },
  {
    id: 'linear',
    title: 'Linear',
    desc: 'Track issues, manage projects, and organize workflows across your team',
    icon: Target,
    color: 'bg-blue-400',
    category: 'Apps'
  },
  {
    id: 'atlassian',
    title: 'Atlassian',
    desc: 'Search, create, and manage Jira, Confluence, and Compass',
    icon: Briefcase,
    color: 'bg-blue-600',
    category: 'Apps'
  },
  {
    id: 'clickup',
    title: 'ClickUp',
    desc: 'Automate task management and project workflows with ClickUp',
    icon: Check,
    color: 'bg-purple-500',
    category: 'Apps'
  },
  {
    id: 'supabase',
    title: 'Supabase',
    desc: 'Manage Supabase projects, query databases, and organize data efficiently',
    icon: Database,
    color: 'bg-emerald-500',
    category: 'Apps'
  },
  {
    id: 'vercel',
    title: 'Vercel',
    desc: 'Manage Vercel projects, deployments, and domains',
    icon: Monitor,
    color: 'bg-black',
    category: 'Apps'
  },
  {
    id: 'neon',
    title: 'Neon',
    desc: 'Use natural language to query and manage Postgres',
    icon: Database,
    color: 'bg-emerald-600',
    category: 'Apps'
  },
  {
    id: 'prisma',
    title: 'Prisma Postgres',
    desc: 'Connect to Postgres, manage databases, and query data securely and efficiently',
    icon: Database,
    color: 'bg-blue-900',
    category: 'Apps'
  },
  {
    id: 'sentry',
    title: 'Sentry',
    desc: 'Review errors, analyze root causes, and suggest fixes for rapid issue resolution',
    icon: Bug,
    color: 'bg-purple-900',
    category: 'Apps'
  },
  {
    id: 'huggingface',
    title: 'Hugging Face',
    desc: 'Explore AI models, access datasets, and discover the latest research trends',
    icon: Smile,
    color: 'bg-yellow-400',
    category: 'Apps'
  },
  {
    id: 'hubspot',
    title: 'HubSpot',
    desc: 'Search CRM data, track contacts, and analyze sales and marketing insights',
    icon: Filter,
    color: 'bg-orange-600',
    category: 'Apps'
  },
  {
    id: 'intercom',
    title: 'Intercom',
    desc: 'Access customer conversations, analyze feedback, and generate actionable insights',
    icon: MessageSquare,
    color: 'bg-blue-500',
    category: 'Apps'
  },
  {
    id: 'stripe',
    title: 'Stripe',
    desc: 'Streamline business billing, payments, and account management',
    icon: CreditCard,
    color: 'bg-blue-600',
    category: 'Apps'
  },
  {
    id: 'paypal',
    title: 'PayPal for Business',
    desc: 'Manage transactions, invoices, and business operations efficiently',
    icon: CreditCard,
    color: 'bg-blue-800',
    category: 'Apps'
  },
  {
    id: 'revenuecat',
    title: 'RevenueCat',
    desc: 'Manage subscription apps, control entitlements, and automate workflows',
    icon: Activity,
    color: 'bg-red-500',
    category: 'Apps'
  },
  {
    id: 'close',
    title: 'Close',
    desc: 'Automate your sales leads pipeline with Close CRM',
    icon: Target,
    color: 'bg-blue-500',
    category: 'Apps'
  },
  {
    id: 'xero',
    title: 'Xero',
    desc: 'View financial data, generate reports, and gain personalized business insights',
    icon: PieChart,
    color: 'bg-blue-400',
    category: 'Apps'
  },
  {
    id: 'airtable',
    title: 'Airtable',
    desc: 'Organize structured data, manage records, and collaborate with your team',
    icon: Table,
    color: 'bg-blue-500',
    category: 'Apps'
  },
  {
    id: 'dify',
    title: 'Dify',
    desc: 'Connect Dify and orchestrate AI-powered workflows across your favorite tools',
    icon: Zap,
    color: 'bg-blue-600',
    category: 'Apps'
  },
  {
    id: 'cloudflare',
    title: 'Cloudflare',
    desc: 'Manage Cloudflare Workers, build applications, and deploy online resources',
    icon: Cloud,
    color: 'bg-orange-500',
    category: 'Apps'
  },
  {
    id: 'posthog',
    title: 'PostHog',
    desc: 'Perform product analytics, manage feature flags, and run experiments',
    icon: BarChart3,
    color: 'bg-blue-900',
    category: 'Apps'
  },
  {
    id: 'playwright',
    title: 'Playwright',
    desc: 'Automate browsers for testing, scraping, and more with Playwright',
    icon: Monitor,
    color: 'bg-green-600',
    category: 'Apps'
  },
  {
    id: 'jam',
    title: 'Jam',
    desc: 'Analyze screen recordings, context, and issues automatically',
    icon: Video,
    color: 'bg-blue-500',
    category: 'Apps'
  },
  {
    id: 'canva',
    title: 'Canva',
    desc: 'Discover, autofill, and export Canva designs in one place',
    icon: Palette,
    color: 'bg-purple-500',
    category: 'Apps'
  },
  {
    id: 'webflow',
    title: 'Webflow',
    desc: 'Manage Webflow sites, edit pages, and organize your CMS content with ease',
    icon: Layout,
    color: 'bg-blue-600',
    category: 'Apps'
  },
  {
    id: 'wix',
    title: 'Wix',
    desc: 'Search website data, access content, and automate workflows within Wix',
    icon: Globe,
    color: 'bg-blue-500',
    category: 'Apps'
  },
  {
    id: 'granola',
    title: 'Granola',
    desc: 'Search, summarize and gather insights from every meeting transcript',
    icon: Mic,
    color: 'bg-green-500',
    category: 'Apps'
  },
  {
    id: 'fireflies',
    title: 'Fireflies',
    desc: 'Automate meeting transcription and conversation insights',
    icon: Mic,
    color: 'bg-blue-400',
    category: 'Apps'
  },
  {
    id: 'tldv',
    title: 'tl;dv',
    desc: 'Streamline meeting workflows with transcriptions and call highlights',
    icon: Play,
    color: 'bg-purple-600',
    category: 'Apps'
  },
  {
    id: 'firecrawl',
    title: 'Firecrawl',
    desc: 'Unlock powerful web scraping, crawling, and search capabilities',
    icon: Search,
    color: 'bg-orange-600',
    category: 'Apps'
  },
  {
    id: 'todoist',
    title: 'Todoist',
    desc: 'Organize your to-dos, streamline projects, and boost productivity',
    icon: Check,
    color: 'bg-red-500',
    category: 'Apps'
  },
  {
    id: 'zoominfo',
    title: 'ZoomInfo',
    desc: 'Access comprehensive B2B contact and company intelligence data',
    icon: Search,
    color: 'bg-blue-700',
    category: 'Apps'
  },
  {
    id: 'metabase',
    title: 'Metabase',
    desc: 'Access Metabase data analytics with caching and response optimization',
    icon: BarChart3,
    color: 'bg-blue-600',
    category: 'Apps'
  },
  {
    id: 'explorium',
    title: 'Explorium',
    desc: 'Access comprehensive business and contact data for AI-powered insights',
    icon: Database,
    color: 'bg-blue-800',
    category: 'Apps'
  },
  {
    id: 'serena',
    title: 'Serena',
    desc: 'Unlock efficient code management with Serena’s semantic and editing tools',
    icon: Terminal,
    color: 'bg-blue-500',
    category: 'Apps'
  },
  {
    id: 'heygen',
    title: 'HeyGen',
    desc: 'Create lifelike AI avatars, generate voices, and produce realistic videos',
    icon: Video,
    color: 'bg-blue-600',
    category: 'Apps'
  },
  {
    id: 'context7',
    title: 'Context7',
    desc: 'Access to current, library-specific technical documentation and implementation examples',
    icon: Book,
    color: 'bg-blue-500',
    category: 'Apps'
  },
  {
    id: 'hume',
    title: 'Hume',
    desc: 'Create expressive text-to-speech audio with Hume AI',
    icon: Headphones,
    color: 'bg-blue-400',
    category: 'Apps'
  },
  {
    id: 'line',
    title: 'LINE',
    desc: 'Connect to LINE Official Accounts for automated messaging',
    icon: MessageSquare,
    color: 'bg-green-500',
    category: 'Apps'
  },
  {
    id: 'jotform',
    title: 'Jotform',
    desc: 'Create, manage, and collect data through powerful online forms',
    icon: Layout,
    color: 'bg-orange-500',
    category: 'Apps'
  },
  {
    id: 'pophive',
    title: 'PopHIVE',
    desc: 'Access public health data from PopHIVE dashboards',
    icon: Activity,
    color: 'bg-blue-500',
    category: 'Apps'
  },
  {
    id: 'minimax',
    title: 'MiniMax',
    desc: 'Generate speech, music, images, and videos with MiniMax',
    icon: Music,
    color: 'bg-red-500',
    category: 'Apps'
  },

  // Custom API
  {
    id: 'jan-turboquant',
    title: 'Jan + TurboQuant',
    desc: 'Built-in primary local AI engine exposed inside HermsDesk on port 6767',
    icon: Cpu,
    color: 'bg-gray-950',
    category: 'Custom API',
    connected: true
  },
  {
    id: 'ollama',
    title: 'Ollama',
    desc: 'Connect to local Ollama API',
    icon: Monitor,
    color: 'bg-gray-700',
    category: 'Custom API',
    connected: true
  },
  {
    id: 'lm-studio',
    title: 'LM Studio',
    desc: 'Connect to local LM Studio server',
    icon: Monitor,
    color: 'bg-blue-700',
    category: 'Custom API',
    connected: true
  },
  {
    id: 'opencode',
    title: 'OpenCode',
    desc: 'Use a local OpenAI-compatible OpenCode endpoint when a token is saved',
    icon: Terminal,
    color: 'bg-slate-900',
    category: 'Custom API',
    connected: true
  },
  {
    id: 'openai',
    title: 'OpenAI',
    desc: 'Leverage GPT model series for intelligent text generation and processing',
    icon: Zap,
    color: 'bg-emerald-600',
    category: 'Custom API'
  },
  {
    id: 'anthropic',
    title: 'Anthropic',
    desc: 'Access reliable AI assistant services with safe and intelligent conversations',
    icon: Shield,
    color: 'bg-orange-800',
    category: 'Custom API'
  },
  {
    id: 'google-gemini',
    title: 'Google Gemini',
    desc: 'Process multimodal content including text, images, and code seamlessly',
    icon: Globe,
    color: 'bg-blue-500',
    category: 'Custom API',
    connected: true
  },
  {
    id: 'perplexity',
    title: 'Perplexity',
    desc: 'Search real-time information and get accurate answers with reliable citations',
    icon: Search,
    color: 'bg-cyan-600',
    category: 'Custom API'
  },
  {
    id: 'cohere',
    title: 'Cohere',
    desc: 'Build enterprise AI applications and optimize text processing workflows',
    icon: Layers,
    color: 'bg-blue-400',
    category: 'Custom API'
  },
  {
    id: 'elevenlabs',
    title: 'ElevenLabs',
    desc: 'Generate realistic voices, clone speech, and create custom audio content',
    icon: Headphones,
    color: 'bg-blue-600',
    category: 'Custom API'
  },
  {
    id: 'grok',
    title: 'Grok',
    desc: 'Access real-time information and engage in intelligent conversations',
    icon: Cpu,
    color: 'bg-gray-900',
    category: 'Custom API'
  },
  {
    id: 'openrouter',
    title: 'OpenRouter',
    desc: 'Access multiple AI models and manage API calls through unified interface',
    icon: Zap,
    color: 'bg-purple-600',
    category: 'Custom API',
    connected: true
  },
  {
    id: 'ahrefs',
    title: 'Ahrefs',
    desc: 'Optimize SEO strategies, analyze keywords, and track backlink performance',
    icon: Search,
    color: 'bg-blue-600',
    category: 'Custom API'
  },
  {
    id: 'similarweb',
    title: 'Similarweb',
    desc: 'Analyze website traffic and gain competitive market intelligence insights',
    icon: BarChart3,
    color: 'bg-blue-500',
    category: 'Custom API'
  },
  {
    id: 'dropbox',
    title: 'Dropbox',
    desc: 'Manage files, folders, and sharing in Dropbox',
    icon: Cloud,
    color: 'bg-blue-600',
    category: 'Custom API'
  },
  {
    id: 'flux',
    title: 'Flux',
    desc: 'Create stunning AI-generated images with diverse artistic styles and concepts',
    icon: Palette,
    color: 'bg-orange-500',
    category: 'Custom API'
  },
  {
    id: 'kling',
    title: 'Kling',
    desc: 'Generate high-quality AI video content and bring creative visual concepts to life',
    icon: Video,
    color: 'bg-blue-500',
    category: 'Custom API'
  },
  {
    id: 'tripo-ai',
    title: 'Tripo AI',
    desc: 'Transform text or images into detailed 3D models quickly and efficiently',
    icon: Layers,
    color: 'bg-purple-600',
    category: 'Custom API'
  },
  {
    id: 'n8n',
    title: 'n8n',
    desc: 'Create automated workflows and seamlessly connect different applications',
    icon: Zap,
    color: 'bg-red-500',
    category: 'Custom API'
  },
  {
    id: 'stripe-api',
    title: 'Stripe API',
    desc: 'Programmatically manage transactions, and automate billing for your business',
    icon: CreditCard,
    color: 'bg-blue-600',
    category: 'Custom API'
  },
  {
    id: 'cloudflare-api',
    title: 'Cloudflare API',
    desc: 'Automate and manage your web infrastructure with the Cloudflare API',
    icon: Cloud,
    color: 'bg-orange-500',
    category: 'Custom API'
  },
  {
    id: 'supabase-api',
    title: 'Supabase API',
    desc: 'Manage Postgres databases with authentication, file storage, and more',
    icon: Database,
    color: 'bg-emerald-500',
    category: 'Custom API'
  },
  {
    id: 'polygon',
    title: 'Polygon.io',
    desc: 'Access real-time and historical market data for stocks, forex, crypto, and options',
    icon: BarChart3,
    color: 'bg-blue-700',
    category: 'Custom API'
  },
  {
    id: 'mailchimp',
    title: 'Mailchimp Marketing',
    desc: 'Manage audiences, send campaigns, and track email marketing performance',
    icon: Mail,
    color: 'bg-yellow-600',
    category: 'Custom API'
  },
  {
    id: 'apollo',
    title: 'Apollo',
    desc: 'Automate B2B sales prospecting, lead generation, and deal execution',
    icon: Target,
    color: 'bg-blue-600',
    category: 'Custom API'
  },
  {
    id: 'jsonbin',
    title: 'JSONBin.io',
    desc: 'Store and manage JSON data with fast API access for development projects',
    icon: Database,
    color: 'bg-blue-500',
    category: 'Custom API'
  },
  {
    id: 'typeform',
    title: 'Typeform',
    desc: 'Create forms, collect responses, and manage webhooks',
    icon: Layout,
    color: 'bg-emerald-500',
    category: 'Custom API'
  },
  {
    id: 'heygen-api',
    title: 'HeyGen API',
    desc: 'Generate AI-powered videos with realistic avatars with HeyGen API',
    icon: Video,
    color: 'bg-blue-600',
    category: 'Custom API'
  },

  // Custom MCP
  {
    id: 'mcp-filesystem',
    title: 'Filesystem MCP',
    desc: 'Expose approved local folders to ME through Model Context Protocol with file read/write permission gates',
    icon: HardDrive,
    color: 'bg-gray-700',
    category: 'Custom MCP'
  },
  {
    id: 'mcp-github',
    title: 'GitHub MCP',
    desc: 'Use MCP tools for repositories, issues, pull requests, code search, and release workflows',
    icon: Github,
    color: 'bg-gray-900',
    category: 'Custom MCP'
  },
  {
    id: 'mcp-playwright',
    title: 'Playwright MCP',
    desc: 'Let ME inspect websites and apps through browser automation with approval before form submission',
    icon: Monitor,
    color: 'bg-green-600',
    category: 'Custom MCP'
  },
  {
    id: 'mcp-memory',
    title: 'Memory MCP',
    desc: 'Store durable project facts, preferences, and task state so work can continue where it left off',
    icon: Database,
    color: 'bg-blue-600',
    category: 'Custom MCP'
  },
  {
    id: 'mcp-context7',
    title: 'Context7 MCP',
    desc: 'Fetch current library documentation and examples for coding tasks',
    icon: Book,
    color: 'bg-blue-500',
    category: 'Custom MCP'
  },
  {
    id: 'mcp-fetch',
    title: 'Fetch MCP',
    desc: 'Retrieve web pages and structured data for research, extraction, and cross-checking',
    icon: Search,
    color: 'bg-cyan-600',
    category: 'Custom MCP'
  },
  {
    id: 'mcp-sqlite',
    title: 'SQLite MCP',
    desc: 'Query approved local databases for invoices, bills, properties, suppliers, and task logs',
    icon: Table,
    color: 'bg-indigo-600',
    category: 'Custom MCP'
  },
  {
    id: 'graphify',
    title: 'Graphify',
    desc: 'Local relationship graph builder for agents, emails, cases, evidence, suppliers, tasks, and workflows',
    icon: Share2,
    color: 'bg-purple-600',
    category: 'Apps',
    isNew: true
  },
  {
    id: 'mcp-windows-shell',
    title: 'Windows Shell MCP',
    desc: 'Run approved diagnostic commands for PC repair, app builds, and local automation',
    icon: Terminal,
    color: 'bg-slate-800',
    category: 'Custom MCP'
  }
];
