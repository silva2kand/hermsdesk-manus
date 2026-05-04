import Store from 'electron-store';
import { toolDefinitions } from '../data/toolDefinitions';

// ═══════════════════════════════════════════════════════════════════
// MultiAgentOrchestrator — HermesDesk ME 1.8
//
// Real agent runtime with:
// - LLM-driven agentic loop (calls Jan+TurboQuant / Ollama / LM Studio)
// - Per-agent task queue
// - Rich personality system prompts
// - Tool calling via SkillsEngine
// - Background persistence via electron-store
// - Cancellation support
// ═══════════════════════════════════════════════════════════════════

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  tools: string[];
  status: 'running' | 'idle' | 'stopped';
  version: string;
  type: 'coding' | 'research' | 'creative' | 'security' | 'legal' | 'accounting';
  background: boolean;
  currentTask?: string;
}

export interface Task {
  id: string;
  input: string;
  status: 'planning' | 'running' | 'done' | 'failed' | 'cancelled';
  assignedAgentId: string;
  steps: { label: string; status: 'pending' | 'running' | 'done' }[];
  history: any[];
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════════════
// AGENT PERSONALITY PROMPTS
// ═══════════════════════════════════════════════════════════════════

const PERSONALITIES: Record<string, string> = {
  'hermes-full': `You are Hermes, the System Architect & Coder agent for HermesDesk ME 1.8.

Your capabilities:
- Full access to the local filesystem (read, write, list directories)
- PowerShell command execution on Windows
- Code generation, debugging, and refactoring
- Workspace automation and build system management
- Git operations and repository management

Your personality: You are precise, technical, and efficient. You explain your reasoning before acting. You write production-quality code. When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: run_powershell(command="your command here")]
- [TOOL: write_file(path="file/path", content="file content")]
- [TOOL: read_file(path="file/path")]
- [TOOL: list_dir(path="directory/path")]
- [TOOL: open_app(app="app name or URL")]

Always think step-by-step before executing tools. Report results clearly.`,

  'paperclip-full': `You are Paperclips, the Full Intelligence Organizer agent for HermesDesk ME 1.8.

Your capabilities:
- Document routing and classification
- Email-to-task conversion workflows
- UK regulatory compliance checking
- Data organization and filing
- Calendar and schedule management

Your personality: You are meticulous, organized, and thorough. You classify everything. You flag compliance issues. You create structured summaries. When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: read_file(path="document/path")]
- [TOOL: write_file(path="output/path", content="organized content")]
- [TOOL: list_dir(path="folder/path")]

Always organize information hierarchically. Flag anything that requires human review.`,

  'solicitor-agent': `You are the Solicitor Agent, a UK Legal Reasoning & Drafting specialist for HermesDesk ME 1.8.

Your capabilities:
- UK property law analysis (tenancy disputes, Section 21/Section 8 notices)
- HMCTS procedure guidance and timeline planning
- Legal letter drafting (before-action letters, formal complaints)
- Contract review and risk assessment
- Housing disrepair claims under the Landlord and Tenant Act 1985

Your personality: You are formal, precise, and cautious. You cite relevant legislation. You always include disclaimers that this is AI-assisted analysis, not legal advice. You structure legal arguments clearly.

When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: read_file(path="document/path")]
- [TOOL: write_file(path="legal_document.txt", content="drafted content")]

Always cite the relevant UK statute or case law. Structure responses with numbered points.`,

  'accountant-agent': `You are the Accountant Agent, a UK Ledger Parsing & VAT specialist for HermesDesk ME 1.8.

Your capabilities:
- Bank statement parsing and reconciliation
- VAT calculation and return preparation (UK MTD compliant)
- Invoice processing and matching
- HMRC Self Assessment guidance
- Corporation Tax computation
- Payroll calculations (PAYE, National Insurance)

Your personality: You are precise with numbers, conservative in estimates, and thorough in documentation. You flag discrepancies immediately. You always show your working.

When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: read_file(path="statement.csv")]
- [TOOL: write_file(path="vat_return.txt", content="calculated return")]
- [TOOL: run_powershell(command="calculation command")]

Always show the calculation methodology. Flag any figures that seem unusual.`,

  'space-agent-full': `You are Space Agent, the Full System Monitoring Agent for HermesDesk ME 1.8.

Your capabilities:
- Real-time system resource monitoring (CPU, RAM, GPU, VRAM)
- Process management and optimization
- Network diagnostics and latency testing
- Storage analysis and cleanup recommendations
- Performance benchmarking and bottleneck detection

Your personality: You are observant, analytical, and proactive. You monitor silently but alert on anomalies. You provide data-driven recommendations.

When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: run_powershell(command="Get-Process | Sort-Object CPU -Descending | Select-Object -First 10")]
- [TOOL: run_powershell(command="systeminfo")]
- [TOOL: list_dir(path="C:\\")]

Always include metrics and percentages. Compare against baselines when available.`,

  'openclaw-full': `You are OpenClaw, the Security & Forensics Agent for HermesDesk ME 1.8.

Your capabilities:
- System security audit and hardening
- Log analysis and anomaly detection
- Vulnerability scanning and assessment
- File integrity monitoring
- Network security checks
- Windows Defender and firewall status

Your personality: You are vigilant, thorough, and security-first. You assume breach until proven otherwise. You classify findings by severity (Critical/High/Medium/Low/Info).

When you need to perform a system action, use the tool format:
[TOOL: tool_name(param="value")]

Available tools:
- [TOOL: run_powershell(command="Get-MpComputerStatus")]
- [TOOL: run_powershell(command="Get-NetFirewallProfile")]
- [TOOL: list_dir(path="path/to/check")]
- [TOOL: read_file(path="log/file")]

Always classify findings by severity. Recommend immediate actions for Critical/High items.`
};

export class MultiAgentOrchestrator {
  private store: any;
  private aiService: any;
  private skillsEngine: any;
  private cancelFlags: Map<string, boolean> = new Map();

  private agents: Agent[] = [
    {
      id: 'hermes-full',
      name: 'Hermes Agent',
      role: 'System Architect & Coder',
      description: 'Advanced coding, terminal access, and system-level automation.',
      personality: PERSONALITIES['hermes-full'],
      tools: ['ollama', 'github', 'os-control', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'coding',
      background: false
    },
    {
      id: 'paperclip-full',
      name: 'Paperclips',
      role: 'Full Intelligence Organizer',
      description: 'End-to-end document routing, email-to-task conversion, and UK compliance.',
      personality: PERSONALITIES['paperclip-full'],
      tools: ['gmail', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'accounting',
      background: false
    },
    {
      id: 'solicitor-agent',
      name: 'Solicitor Agent',
      role: 'Legal Reasoning & Drafting',
      description: 'Reviews letters, tenancy/property issues, claims, and legal timelines for UK law.',
      personality: PERSONALITIES['solicitor-agent'],
      tools: ['google-search', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'legal',
      background: false
    },
    {
      id: 'accountant-agent',
      name: 'Accountant Agent',
      role: 'Ledger Parsing & VAT',
      description: 'Parses bank statements, reconciles invoices, and calculates VAT/tax obligations.',
      personality: PERSONALITIES['accountant-agent'],
      tools: ['stripe', 'xero', 'file-system'],
      status: 'idle',
      version: '1.8.0',
      type: 'accounting',
      background: false
    },
    {
      id: 'space-agent-full',
      name: 'Space Agent',
      role: 'Full Monitoring Agent',
      description: 'Deep system monitoring, terminal monitoring, and real-time research.',
      personality: PERSONALITIES['space-agent-full'],
      tools: ['google-search', 'os-control'],
      status: 'idle',
      version: '1.8.0',
      type: 'research',
      background: false
    },
    {
      id: 'openclaw-full',
      name: 'OpenClaw',
      role: 'Security & Forensics Agent',
      description: 'System security audit, log analysis, and vulnerability detection.',
      personality: PERSONALITIES['openclaw-full'],
      tools: ['os-control', 'terminal'],
      status: 'idle',
      version: '1.8.0',
      type: 'security',
      background: false
    }
  ];

  private taskQueues: Map<string, Task[]> = new Map();

  constructor(sharedStore?: any, aiService?: any, skillsEngine?: any) {
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
    this.aiService = aiService;
    this.skillsEngine = skillsEngine;
    
    // Initialize task queues per agent
    this.agents.forEach(agent => {
      this.taskQueues.set(agent.id, []);
    });

    // Load persisted agent status
    const savedAgents = this.store.get('agents_status', {});
    this.agents.forEach(agent => {
      if (savedAgents[agent.id]) {
        agent.status = savedAgents[agent.id].status || 'idle';
        agent.background = savedAgents[agent.id].background || false;
      }
    });
  }

  getAgents() {
    return this.agents.map(a => ({
      ...a,
      personality: undefined // Don't send full prompt to frontend
    }));
  }

  updateAgentStatus(id: string, status: Agent['status'], background: boolean = false) {
    const agent = this.agents.find(a => a.id === id);
    if (agent) {
      agent.status = status;
      agent.background = background;
      
      const savedAgents = this.store.get('agents_status', {});
      savedAgents[id] = { status, background };
      this.store.set('agents_status', savedAgents);

      // If stopping, set cancel flag
      if (status === 'stopped') {
        this.cancelFlags.set(id, true);
      }
    }
    return this.getAgents();
  }

  async createTask(input: string, agentId?: string, win?: any) {
    const assignedId = agentId || 'hermes-full';
    const task: Task = {
      id: Math.random().toString(36).substring(7),
      input,
      status: 'running',
      assignedAgentId: assignedId,
      steps: [
        { label: 'Initializing ME 1.8 Runtime', status: 'done' },
        { label: 'Agent Loop Active', status: 'running' }
      ],
      history: [],
      createdAt: Date.now()
    };

    // Add to agent's task queue
    const queue = this.taskQueues.get(assignedId) || [];
    queue.push(task);
    this.taskQueues.set(assignedId, queue);

    // Clear cancel flag
    this.cancelFlags.set(assignedId, false);

    const sendUpdate = (step: string, type: 'step' | 'thinking' | 'tool' | 'code' | 'info' | 'error' | 'result' = 'info') => {
      win?.webContents.send('agent:update', { 
        agentId: assignedId, 
        taskId: task.id,
        type, 
        content: step, 
        time: new Date().toLocaleTimeString() 
      });
    };

    const agent = this.agents.find(a => a.id === assignedId);
    if (!agent) {
      task.status = 'failed';
      return task;
    }

    // Run the agent loop asynchronously
    this.runAgentLoop(agent, task, sendUpdate);
    return task;
  }

  private async runAgentLoop(
    agent: Agent,
    task: Task,
    sendUpdate: (step: string, type: 'step' | 'thinking' | 'tool' | 'code' | 'info' | 'error' | 'result') => void
  ) {
    this.updateAgentStatus(agent.id, 'running', agent.background);
    agent.currentTask = task.input.slice(0, 100);
    sendUpdate(`${agent.name} v${agent.version} starting...`, 'info');

    const skillGuidance = this.skillsEngine?.getSkillGuidance?.();
    const messages: any[] = [
      { role: 'system', content: `${agent.personality}${skillGuidance?.prompt ? `\n\nInstalled ME/Mythos skills:\n${skillGuidance.prompt}` : ''}` },
      { role: 'user', content: task.input }
    ];

    let iterations = 0;
    const maxIterations = 8;
    let recoveryAttempts = 0;
    const maxRecoveryAttempts = 3;
    let completed = false;

    while (iterations < maxIterations) {
      // Check cancel flag
      if (this.cancelFlags.get(agent.id)) {
        sendUpdate('Agent stopped by user.', 'info');
        task.status = 'cancelled';
        break;
      }

      iterations++;
      sendUpdate(`Iteration ${iterations}/${maxIterations}: Thinking...`, 'thinking');

      try {
        // Call LLM through the smart engine router (Jan+TQ first)
        const response = await this.aiService.chatWithBestAvailable(
          '', // Let the engine pick the model
          messages
        );

        const content = response?.message?.content || '';
        const engine = response?.engine || 'Unknown';

        if (!content) {
          recoveryAttempts++;
          const recoveryMessage = `No response from ${engine}. Recovery ${recoveryAttempts}/${maxRecoveryAttempts}: retrying with a smaller continuation prompt.`;
          sendUpdate(recoveryMessage, 'error');
          task.history.push({ role: 'system', content: recoveryMessage, engine, iteration: iterations, recoveryAttempts });
          messages.push({
            role: 'user',
            content: `The previous engine response was empty. Continue the task from the last reliable state. If a tool failed, choose another approach. Task: ${task.input}`
          });
          if (recoveryAttempts < maxRecoveryAttempts) continue;
          task.status = 'failed';
          break;
        }

        sendUpdate(`Engine: ${engine}`, 'info');

        // Check for tool calls in the response
        const toolCalls = this.extractAllToolCalls(content);

        if (toolCalls.length > 0) {
          // Execute each tool call
          for (const toolCall of toolCalls) {
            if (this.cancelFlags.get(agent.id)) break;

            sendUpdate(`Tool: ${toolCall.name}(${JSON.stringify(toolCall.params)})`, 'tool');

            try {
              const action = this.skillsEngine.proposeAction({
                name: toolCall.name,
                type: this.getToolType(toolCall.name),
                params: toolCall.params
              });

              // Auto-approve for agent execution
              const result = await this.skillsEngine.approveAction(action.id);
              const resultStr = typeof result.result === 'string' 
                ? result.result.slice(0, 2000) 
                : JSON.stringify(result.result || result.error).slice(0, 2000);

              sendUpdate(resultStr, 'result');

              messages.push({ role: 'assistant', content });
              messages.push({ role: 'user', content: `Tool "${toolCall.name}" result:\n${resultStr}\n\nContinue with the task or provide your final answer.` });
            } catch (toolErr: any) {
              sendUpdate(`Tool error: ${toolErr.message}`, 'error');
              messages.push({ role: 'assistant', content });
              messages.push({ role: 'user', content: `Tool "${toolCall.name}" failed: ${toolErr.message}. Try a different approach.` });
            }
          }
        } else {
          // No tool calls — this is the agent's final response
          sendUpdate(content, 'info');
          task.history.push({ role: 'assistant', content, engine, iteration: iterations });
          completed = true;
          break;
        }
      } catch (err: any) {
        recoveryAttempts++;
        const message = err?.message || 'Unknown engine error';
        sendUpdate(`Engine error: ${message}`, 'error');
        task.history.push({ role: 'system', content: `Engine error: ${message}`, iteration: iterations, recoveryAttempts });
        if (recoveryAttempts >= maxRecoveryAttempts) {
          task.status = 'failed';
          sendUpdate(`Recovery exhausted after ${maxRecoveryAttempts} attempts. Task needs review.`, 'error');
          break;
        }
        messages.push({
          role: 'user',
          content: `The engine/tool route failed with: ${message}\nRecover and continue. Try a smaller answer, another local route, or produce the safest partial result with next actions. Do not abandon the task unless impossible.`
        });
        sendUpdate(`Recovery pass ${recoveryAttempts}/${maxRecoveryAttempts}: continuing instead of stopping.`, 'info');
        continue;
      }
    }

    if (iterations >= maxIterations) {
      sendUpdate(`Reached maximum iterations (${maxIterations}). Task paused.`, 'info');
    }

    sendUpdate(task.status === 'failed' ? 'Agent loop stopped after recovery attempts.' : 'Agent loop complete.', task.status === 'failed' ? 'error' : 'info');
    task.status = task.status === 'cancelled' ? 'cancelled' : task.status === 'failed' ? 'failed' : completed || task.history.length > 0 ? 'done' : 'failed';
    task.steps = task.steps.map(s => ({ ...s, status: 'done' as const }));
    agent.currentTask = undefined;

    // Only set idle if not cancelled/stopped
    if (agent.status === 'running') {
      this.updateAgentStatus(agent.id, 'idle', agent.background);
    }
  }

  /** Extract ALL tool calls from LLM output */
  private extractAllToolCalls(content: string): { name: string; params: any }[] {
    const calls: { name: string; params: any }[] = [];
    const regex = /\[TOOL:\s*(\w+)\(([^)]*)\)\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      try {
        const name = match[1];
        const paramsStr = match[2];
        const params: any = {};
        
        // Parse key="value" pairs
        const paramRegex = /(\w+)="([^"]*)"/g;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(paramsStr)) !== null) {
          params[paramMatch[1]] = paramMatch[2];
        }
        
        calls.push({ name, params });
      } catch (e) {
        // Skip malformed tool calls
      }
    }

    return calls;
  }

  private getToolType(name: string): 'file' | 'script' | 'os' {
    if (name.includes('powershell') || name.includes('command')) return 'script';
    if (name.includes('file') || name.includes('dir')) return 'file';
    return 'os';
  }

  getTasks() {
    const allTasks: Task[] = [];
    this.taskQueues.forEach(queue => allTasks.push(...queue));
    return allTasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  getAgentTasks(agentId: string) {
    return this.taskQueues.get(agentId) || [];
  }
}
