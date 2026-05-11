import Store from 'electron-store';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ═══════════════════════════════════════════════════════════════════
// ToolRegistryService — HermesDesk ME 1.8
//
// Manages tools and connectors. Provides agent-specific tool access
// and LLM-compatible tool definitions for the agentic runtime.
// ═══════════════════════════════════════════════════════════════════

export interface Tool {
  id: string;
  name: string;
  category: 'llm' | 'storage' | 'email' | 'os' | 'custom_api' | 'research';
  description: string;
  configSchema?: any;
}

export interface Connector {
  id: string;
  name: string;
  enabled: boolean;
  status: 'connected' | 'needs-auth' | 'disabled' | 'available';
  type: 'local-engine' | 'cloud-api' | 'oauth' | 'url' | 'mcp';
}

// Which tools each agent is allowed to use
const AGENT_TOOL_MAP: Record<string, string[]> = {
  'general-agent': ['file-system'],
  'hermes-full': ['file-system'],
  'paperclip-full': ['file-system'],
  'solicitor-agent': ['file-system'],
  'accountant-agent': ['file-system'],
  'space-agent-full': ['file-system'],
  'openclaw-full': ['file-system'],
  'justice-case-agent': ['file-system'],
  'purchase-guardian-agent': ['file-system']
};

export class ToolRegistryService {
  private store: any;
  private tools: Tool[] = [
    { id: 'file-system', name: 'File System', category: 'storage', description: 'Direct executable local file operations: read_file, list_directory, write_file with approval.' }
  ];

  constructor(sharedStore?: any) {
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
  }

  getTools() {
    return this.tools;
  }

  /** Get only the tools a specific agent is allowed to use */
  getToolsForAgent(agentId: string): Tool[] {
    const allowedIds = AGENT_TOOL_MAP[agentId] || [];
    return this.tools.filter(t => allowedIds.includes(t.id));
  }

  /** Get tool definitions in a format suitable for LLM system prompts */
  getToolDefinitionsForLLM(agentId?: string): string {
    const tools = agentId ? this.getToolsForAgent(agentId) : this.tools;
    return tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
  }

  private resolveLocalPath(inputPath: string) {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('A real local path is required.');
    }
    return path.resolve(inputPath.replace(/^~(?=$|[\\/])/, os.homedir()));
  }

  async executeTool(toolId: string, params: any = {}) {
    if (toolId !== 'file-system') {
      return {
        ok: false,
        toolId,
        error: `${toolId} has no local executable handler yet. Configure a real connector/API before running it.`
      };
    }

    const action = params.action || params.operation;
    if (action === 'read_file') {
      const filePath = this.resolveLocalPath(params.path);
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) throw new Error(`Not a file: ${filePath}`);
      const maxBytes = Math.min(Number(params.maxBytes || 1024 * 1024), 5 * 1024 * 1024);
      const handle = await fs.promises.open(filePath, 'r');
      try {
        const buffer = Buffer.alloc(Math.min(stats.size, maxBytes));
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        return {
          ok: true,
          path: filePath,
          bytesRead,
          truncated: stats.size > bytesRead,
          content: buffer.subarray(0, bytesRead).toString('utf8')
        };
      } finally {
        await handle.close();
      }
    }

    if (action === 'list_directory') {
      const folderPath = this.resolveLocalPath(params.path || process.cwd());
      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
      return {
        ok: true,
        path: folderPath,
        files: entries.slice(0, 500).map(entry => ({
          name: entry.name,
          path: path.join(folderPath, entry.name),
          type: entry.isDirectory() ? 'folder' : 'file'
        })),
        truncated: entries.length > 500
      };
    }

    if (action === 'write_file') {
      if (!params.approved) {
        return {
          ok: false,
          requiresApproval: true,
          action: 'write_file',
          path: this.resolveLocalPath(params.path),
          message: 'Writing files is real and requires explicit approval.'
        };
      }
      const filePath = this.resolveLocalPath(params.path);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, String(params.content ?? ''), 'utf8');
      return { ok: true, path: filePath, bytesWritten: Buffer.byteLength(String(params.content ?? ''), 'utf8') };
    }

    return {
      ok: false,
      toolId,
      error: `Unsupported file-system action: ${action || 'missing action'}`
    };
  }

  async getConnectors(): Promise<Record<string, boolean>> {
    let connectors = this.store.get('connectors', {}) as Record<string, boolean>;
    const defaults: Record<string, boolean> = {
      'my-browser': true,
      'jan-turboquant': true,
      'outlook-mail': true,
      'mcp-filesystem': true,
      'mcp-windows-shell': true,
      'whatsapp': false
    };
    if (!this.store.get('connectorTruthResetV2')) {
      connectors = { ...defaults };
      this.store.set('connectors', connectors);
      this.store.set('connectorTruthResetV2', true);
    }
    return { ...defaults, ...connectors };
  }

  /** Get connector status with real-world awareness */
  async getConnectorStatuses(): Promise<Connector[]> {
    const enabled = await this.getConnectors();
    
    return [
      { id: 'jan-turboquant', name: 'Jan + TurboQuant', enabled: enabled['jan-turboquant'] ?? true, status: 'available', type: 'local-engine' },
      { id: 'ollama', name: 'Ollama', enabled: enabled['ollama'] ?? true, status: 'available', type: 'local-engine' },
      { id: 'lm-studio', name: 'LM Studio', enabled: enabled['lm-studio'] ?? true, status: 'available', type: 'local-engine' },
      { id: 'opencode', name: 'OpenCode', enabled: enabled['opencode'] ?? true, status: 'needs-auth', type: 'local-engine' },
      { id: 'tinyfish', name: 'TinyFish Web Agent', enabled: enabled['tinyfish'] ?? true, status: 'needs-auth', type: 'cloud-api' },
      { id: 'openrouter', name: 'OpenRouter', enabled: enabled['openrouter'] ?? true, status: 'needs-auth', type: 'cloud-api' },
      { id: 'google-gemini', name: 'Google Gemini', enabled: enabled['google-gemini'] ?? true, status: 'available', type: 'cloud-api' },
      { id: 'github', name: 'GitHub', enabled: enabled['github'] ?? true, status: 'needs-auth', type: 'oauth' },
      { id: 'gmail', name: 'Gmail', enabled: enabled['gmail'] ?? true, status: 'needs-auth', type: 'oauth' },
      { id: 'google-drive', name: 'Google Drive', enabled: enabled['google-drive'] ?? true, status: 'needs-auth', type: 'oauth' },
      { id: 'notion', name: 'Notion', enabled: enabled['notion'] ?? true, status: 'needs-auth', type: 'oauth' },
      { id: 'slack', name: 'Slack', enabled: enabled['slack'] ?? true, status: 'needs-auth', type: 'oauth' },
      { id: 'stripe', name: 'Stripe', enabled: enabled['stripe'] ?? true, status: 'needs-auth', type: 'cloud-api' },
      { id: 'xero', name: 'Xero', enabled: enabled['xero'] ?? true, status: 'needs-auth', type: 'cloud-api' },
      { id: 'mcp-filesystem', name: 'MCP Filesystem', enabled: enabled['mcp-filesystem'] ?? true, status: 'available', type: 'mcp' },
      { id: 'mcp-windows-shell', name: 'MCP Windows Shell', enabled: enabled['mcp-windows-shell'] ?? true, status: 'available', type: 'mcp' },
    ];
  }

  async saveConnector(id: string, enabled: boolean) {
    if (!id) {
      throw new Error('Connector id is required');
    }
    const connectors = this.store.get('connectors', {});
    connectors[id] = enabled;
    this.store.set('connectors', connectors);
    console.log(`ME 1.8: Connector ${id} is now ${enabled ? 'ACTIVE' : 'DISABLED'}`);
    return connectors;
  }

  async toggleConnector(id: string, enabled: boolean) {
    return this.saveConnector(id, enabled);
  }
}
