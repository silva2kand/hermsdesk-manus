// ═══════════════════════════════════════════════════════════════════
// Tool Definitions — HermesDesk ME 1.8
//
// These definitions describe the tools available to agents.
// They are used in agent system prompts and for tool call parsing.
// ═══════════════════════════════════════════════════════════════════

export const toolDefinitions = [
  {
    name: 'run_powershell',
    description: 'Execute a PowerShell command on the host Windows system.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The PowerShell command to run.' }
      },
      required: ['command']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file on the local filesystem.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative or absolute path to the file.' },
        content: { type: 'string', description: 'The text content to write.' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'read_file',
    description: 'Read the content of a file from the local filesystem.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read.' }
      },
      required: ['path']
    }
  },
  {
    name: 'list_dir',
    description: 'List the contents of a directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the directory (default is current working directory).' }
      }
    }
  },
  {
    name: 'open_app',
    description: 'Open a local application or a URL in the default browser.',
    parameters: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'App name or executable path.' },
        url: { type: 'string', description: 'URL to open (optional, used if app is not specified).' }
      }
    }
  },
  {
    name: 'run_command',
    description: 'Execute a generic shell command (cmd.exe).',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The command to execute.' }
      },
      required: ['command']
    }
  },
  {
    name: 'analyze_document',
    description: 'Read and analyze a document file (PDF, DOCX, TXT, CSV).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the document file.' },
        type: { type: 'string', description: 'Document type: legal, tax, general' }
      },
      required: ['path']
    }
  }
];
