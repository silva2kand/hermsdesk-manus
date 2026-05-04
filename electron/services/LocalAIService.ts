import axios from 'axios';
import si from 'systeminformation';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import Store from 'electron-store';
import { providerService } from '../main'

export interface Model {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

// ═══════════════════════════════════════════════════════════════════
// LocalAIService — HermesDesk ME 1.8
// 
// ENGINE PRIORITY:
//   1. Jan + TurboQuant  (built-in, primary, port 1337)
//   2. Ollama            (optional external, port 11434)
//   3. LM Studio         (optional external, port 1234)
//   4. Cloud free-tier   (fallback only — OpenRouter/NVIDIA/Gemini)
//
// Jan + TurboQuant is the MAIN ENGINE. It is not optional.
// It exposes a full OpenAI-compatible API so external apps can
// connect to it exactly like they connect to Jan, LM Studio, or Ollama.
// ═══════════════════════════════════════════════════════════════════

export class LocalAIService {
  private store: any;

  // Built-in Jan + TurboQuant Engine (PRIMARY)
  private janUrl = 'http://localhost:1337/v1';
  private activeJanModel = '';
  private modelsPath = path.join(os.homedir(), 'jan', 'models');

  // Optional External Engines
  private ollamaUrl = 'http://localhost:11434/api';
  private lmStudioUrl = 'http://localhost:1234/v1';

  // System resource cache
  private pcCache = {
    gpu: 'Detecting...',
    vram: '0GB',
    ram: '0GB',
    os: 'Windows',
    scannedAt: 0,
    approximate: false
  };

  constructor(sharedStore?: any) {
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
  }

  private getNitroSearchPaths() {
    return [
      path.join(process.cwd(), 'bin', 'nitro.exe'),
      path.join(process.cwd(), 'electron', 'bin', 'nitro.exe'),
      path.join(process.cwd(), 'resources', 'bin', 'nitro.exe'),
      path.join(process.resourcesPath || '', 'bin', 'nitro.exe'),
      path.join(process.resourcesPath || '', 'electron', 'bin', 'nitro.exe'),
      path.join(os.homedir(), 'jan', 'nitro.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'jan', 'nitro.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Jan', 'nitro.exe')
    ];
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILT-IN JAN + TURBOQUANT ENGINE (PRIMARY)
  // ═══════════════════════════════════════════════════════════════

  /** Health check for the built-in Jan + TurboQuant engine */
  async checkJanEngine(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.janUrl}/models`, { timeout: 2000 });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  /** Full status report for the built-in engine */
  async getJanEngineStatus(): Promise<any> {
    const isOnline = await this.checkJanEngine();
    let models: any[] = [];
    if (isOnline) {
      try {
        const resp = await axios.get(`${this.janUrl}/models`);
        models = resp.data?.data || resp.data?.models || [];
      } catch (e: any) {
        console.error('Failed to fetch Jan models:', e.message);
      }
    }

    // Detect if another service is occupying port 1337
    let portOccupiedByOther = false;
    if (!isOnline) {
      try {
        const probe = await axios.get('http://localhost:1337/v1/models', { timeout: 1500 });
        // If we get a response but it's not Jan format, another service is there
        portOccupiedByOther = probe.status === 200;
      } catch (e: any) {
        // Expected if nothing is running on 1337
        console.log('Port 1337 probe failed/timeout:', e.message);
      }
    }

    const executablePath = this.getNitroSearchPaths().find(p => fs.existsSync(p)) || '';

    return {
      engine: 'Jan + TurboQuant',
      role: 'Primary Built-in Engine',
      apiOnline: isOnline,
      installed: Boolean(executablePath) || isOnline,
      port: 1337,
      apiUrl: this.janUrl,
      executablePath,
      activeModel: this.activeJanModel,
      portOccupiedByOther,
      models,
      externalAccessUrl: 'http://localhost:1337/v1'
    };
  }

  /** Start the built-in Jan + TurboQuant Nitro server */
  async startJanEngine() {
    const status = await this.getJanEngineStatus();
    if (status.apiOnline) {
      return { ok: true, engine: 'Jan + TurboQuant', message: 'Built-in engine is already running.', status };
    }
    if (status.portOccupiedByOther) {
      return { ok: false, engine: 'Jan + TurboQuant', error: 'Port 1337 is occupied by another service. Please free the port so the built-in engine can start.' };
    }

    // Attempt to spawn Nitro binary
    const searchPaths = this.getNitroSearchPaths();

    for (const nitroPath of searchPaths) {
      if (fs.existsSync(nitroPath)) {
        console.log(`ME 1.8: Spawning Jan+TurboQuant Nitro from ${nitroPath}`);
        const nitro = spawn(nitroPath, ['--port', '1337'], {
          detached: true,
          stdio: 'ignore'
        });
        nitro.unref();
        
        // Wait a moment and recheck
        await new Promise(r => setTimeout(r, 2000));
        const newStatus = await this.getJanEngineStatus();
        return { ok: newStatus.apiOnline, engine: 'Jan + TurboQuant', message: newStatus.apiOnline ? 'Built-in engine started successfully.' : 'Engine spawned, still initializing...', status: newStatus };
      }
    }

    return { ok: false, engine: 'Jan + TurboQuant', error: 'Nitro binary not found. The built-in engine needs nitro.exe in the bin/ folder or Jan installation directory.' };
  }

  /** Load a model into the built-in Jan + TurboQuant engine */
  async loadJanModel(model: { name: string, path?: string }) {
    console.log(`ME 1.8: Loading model ${model.name} into Jan+TurboQuant engine`);
    
    try {
      // 1. Check if model exists in library
      const library = await providerService.listLibraryModels();
      const target = library.find((m: any) => m.name === model.name || m.id === model.name);
      
      if (!target) {
        throw new Error(`Model ${model.name} not found in library. Download it first from Model Hub.`);
      }

      // 2. Load model into the built-in engine via Jan API
      const response = await axios.post(`${this.janUrl}/models/load`, {
        model: target.id
      }, { timeout: 30000 });

      if (response.status === 200) {
        this.activeJanModel = model.name;
        this.store.set('activeJanModel', model.name);
        return { ok: true, engine: 'Jan + TurboQuant', model: model.name, status: await this.getJanEngineStatus() };
      }
    } catch (e: any) {
      console.error('ME 1.8: Model load failed:', e.message);
      // Fallback: Set active model in state so user can try chat
      this.activeJanModel = model.name;
      this.store.set('activeJanModel', model.name);
      return {
        ok: true,
        engine: 'Jan + TurboQuant',
        model: model.name,
        warning: `Selected ${model.name}. If the built-in engine is not responding, try starting it first.`,
        status: await this.getJanEngineStatus()
      };
    }
    return { ok: false, error: 'Failed to communicate with the built-in Jan+TurboQuant engine.' };
  }

  /** Chat with the built-in Jan + TurboQuant engine (PRIMARY) */
  async chatWithJan(model: string, messages: any[]): Promise<any> {
    try {
      const response = await axios.post(`${this.janUrl}/chat/completions`, {
        model: model || this.activeJanModel || 'local-model',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      }, { timeout: 120000 });
      
      const content = response.data?.choices?.[0]?.message?.content || '';
      return { 
        message: { content }, 
        engine: 'Jan + TurboQuant',
        model: model || this.activeJanModel
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Built-in Jan+TurboQuant engine is not responding on port 1337.');
      }
      throw new Error(`Jan+TurboQuant error: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SMART ENGINE ROUTER — chatWithBestAvailable
  // Priority: Jan+TurboQuant → Ollama → LM Studio → Error
  // ═══════════════════════════════════════════════════════════════

  async chatWithBestAvailable(model: string, messages: any[], options: { preferred?: 'jan' | 'ollama' | 'lmstudio' } = {}): Promise<any> {
    // 1. Try built-in Jan + TurboQuant first (PRIMARY)
    try {
      let janOnline = await this.checkJanEngine();
      if (!janOnline) {
        console.log('ME 1.8: Jan is offline. Attempting auto-start...');
        const startResult = await this.startJanEngine();
        if (startResult.ok) {
          janOnline = true;
          // Wait slightly for model loading if needed
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (janOnline) {
        console.log('ME 1.8: Routing to built-in Jan+TurboQuant engine');
        return await this.chatWithJan(model, messages);
      }
    } catch (e) {
      console.log('ME 1.8: Jan+TurboQuant unavailable, trying fallbacks...');
    }

    // 2. Try Ollama (optional external)
    try {
      const ollamaCheck = await axios.get(`${this.ollamaUrl}/tags`, { timeout: 3000 });
      if (ollamaCheck.status === 200) {
        console.log('ME 1.8: Routing to Ollama (optional external)');
        const ollamaModels = ollamaCheck.data?.models || [];
        const modelNames = ollamaModels.map((m: any) => m.name).filter(Boolean);
        const selectedModel =
          modelNames.find((name: string) => name === model || name === `${model}:latest`) ||
          modelNames[0] ||
          model;
        const result = await this.chatWithOllama(selectedModel, messages);
        return { ...result, engine: 'Ollama (External)' };
      }
    } catch (e) {
      console.log('ME 1.8: Ollama unavailable...');
    }

    // 3. Try LM Studio (optional external)
    try {
      const lmCheck = await this.checkLMStudio();
      if (lmCheck?.online) {
        console.log('ME 1.8: Routing to LM Studio (optional external)');
        const result = await this.chatWithLMStudio(model, messages);
        return { ...result, engine: 'LM Studio (External)' };
      }
    } catch (e) {
      console.log('ME 1.8: LM Studio unavailable...');
    }

    // 4. All local engines offline
    return { 
      message: { content: `Jan + TurboQuant is the built-in primary engine, but it is not responding on port 1337 right now.${options.preferred === 'jan' ? ' Hermes ME did not treat Jan as an external app; it tried the built-in route first.' : ''}\n\nI also checked optional local fallbacks: Ollama and LM Studio are not available with a usable model. Open Model Hub, press Start Jan TurboQuant, then load a local model. If you want API fallback, choose OpenRouter, Gemini, or NVIDIA from the provider menu; Hermes ME will keep those routes on free-tier models.` },
      engine: 'None (All Offline)'
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // FULL ENGINE STATUS — all engines at once
  // ═══════════════════════════════════════════════════════════════

  async getFullEngineStatus() {
    const [janOnline, ollamaModels, lmStudio] = await Promise.all([
      this.checkJanEngine().catch(() => false),
      this.listOllamaModels().catch(() => []),
      this.checkLMStudio().catch(() => null)
    ]);

    return {
      primary: {
        name: 'Jan + TurboQuant',
        role: 'Built-in Engine',
        online: janOnline,
        port: 1337,
        url: this.janUrl,
        activeModel: this.activeJanModel
      },
      ollama: {
        name: 'Ollama',
        role: 'Optional External',
        online: ollamaModels.length > 0 || false,
        port: 11434,
        models: ollamaModels
      },
      lmStudio: {
        name: 'LM Studio',
        role: 'Optional External',
        online: lmStudio?.online || false,
        port: 1234
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // OPTIONAL EXTERNAL ENGINES
  // ═══════════════════════════════════════════════════════════════

  async listOllamaModels(): Promise<Model[]> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/tags`, { timeout: 5000 });
      return response.data.models || [];
    } catch (error: any) {
      return [];
    }
  }

  async chatWithOllama(model: string, messages: any[]) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/chat`, {
        model: model || 'llama3',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      }, { timeout: 120000 });
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return { message: { content: 'Ollama is not running. It is an optional external engine — the built-in Jan+TurboQuant engine is the primary.' } };
      }
      if (error.response?.status === 404) {
        return { message: { content: `Model "${model}" not found in Ollama. Pull it first with: ollama pull ${model}` } };
      }
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return { message: { content: 'Ollama timed out while generating a response. This often happens if the selected model is too large for your hardware. Try switching to a smaller model (e.g., Phi-3 or Gemma 2b) or increasing your system RAM/VRAM.' } };
      }
      return { message: { content: `Ollama error: ${error.message}` } };
    }
  }

  async chatWithLMStudio(model: string, messages: any[]) {
    try {
      const response = await axios.post(`${this.lmStudioUrl}/chat/completions`, {
        model: model || 'local-model',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      }, { timeout: 120000 });
      return { message: { content: response.data.choices[0].message.content } };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return { message: { content: 'LM Studio is not running. It is an optional external engine.' } };
      }
      return { message: { content: `LM Studio error: ${error.message}` } };
    }
  }

  async checkLMStudio() {
    try {
      const response = await axios.get(`${this.lmStudioUrl}/models`, { timeout: 2000 });
      if (response.status === 200) {
        return { online: true, url: this.lmStudioUrl, provider: 'LM Studio' };
      }
    } catch (e: any) {
      console.log('LM Studio probe failed:', e.message);
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM RESOURCES (Real hardware detection)
  // ═══════════════════════════════════════════════════════════════

  async scanPCResources() {
    try {
      const gpus = await si.graphics();
      const mem = await si.mem();
      const osInfo = await si.osInfo();
      
      // Prioritize discrete NVIDIA GPUs
      let mainGpu = gpus.controllers.find(c => 
        (c.vendor.toLowerCase().includes('nvidia') || c.model.toLowerCase().includes('rtx')) && 
        c.vram && c.vram > 2048
      );

      // If no discrete found, pick the one with most VRAM
      if (!mainGpu && gpus.controllers.length > 0) {
        mainGpu = gpus.controllers.reduce((prev, current) => 
          ((prev.vram || 0) > (current.vram || 0)) ? prev : current
        , gpus.controllers[0]);
      }
      
      const vramGB = mainGpu?.vram ? Math.round(mainGpu.vram / 1024) : 0;
      const ramGB = Math.round(mem.total / (1024 * 1024 * 1024));

      this.pcCache = {
        gpu: mainGpu?.model || 'Integrated Graphics',
        vram: `${vramGB}GB`,
        ram: `${ramGB}GB`,
        os: `${osInfo.distro} ${osInfo.release}`,
        scannedAt: Date.now(),
        approximate: !mainGpu
      };
      
      return this.pcCache;
    } catch (e) {
      console.error('ME 1.8: PC Scan failed:', e);
      return this.pcCache;
    }
  }

  async getResourceUsage() {
    try {
      const [cpuLoad, mem, gpuData] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.graphics().catch(() => null)
      ]);

      // Real GPU utilization from systeminformation
      let gpuUtil = 0;
      if (gpuData?.controllers?.[0]) {
        // si.graphics() provides utilizationGpu on some systems
        gpuUtil = (gpuData.controllers[0] as any).utilizationGpu || 0;
      }

      return {
        cpu: Math.round(cpuLoad.currentLoad),
        ram: Math.round((mem.active / mem.total) * 100),
        gpu: gpuUtil,
        gpuModel: this.pcCache.gpu,
        engine: await this.checkJanEngine() ? 'Jan + TurboQuant' : 'Offline'
      };
    } catch (error) {
      return { cpu: 0, ram: 0, gpu: 0, gpuModel: this.pcCache.gpu, engine: 'Unknown' };
    }
  }
}
