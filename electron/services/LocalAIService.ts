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
  private janUrl = 'http://127.0.0.1:1337/v1';
  private activeJanModel = '';
  private modelsPath = path.join(os.homedir(), 'jan', 'models');

  // Optional External Engines
  private ollamaUrl = 'http://localhost:11434/api';
  private lmStudioUrl = 'http://localhost:1234/v1';
  private openCodeUrls = [
    process.env.OPENCODE_API_URL || '',
    'http://127.0.0.1:4096/v1',
    'http://localhost:4096/v1',
    'http://127.0.0.1:3456/v1',
    'http://localhost:3456/v1'
  ].filter(Boolean);

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
    this.activeJanModel = this.store.get('activeJanModel', '') as string;
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

  private getJanAppSearchPaths() {
    return [
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Jan', 'Jan.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'jan', 'Jan.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'jan', 'jan.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Jan', 'resources', 'app.asar'),
      path.join(process.cwd(), 'bin', 'Jan.exe'),
      path.join(process.cwd(), 'electron', 'bin', 'Jan.exe'),
      path.join(process.resourcesPath || '', 'bin', 'Jan.exe')
    ];
  }

  private getJanRuntimeDiagnostics() {
    const nitroPaths = this.getNitroSearchPaths();
    const janAppPaths = this.getJanAppSearchPaths();
    const nitroPath = nitroPaths.find(p => fs.existsSync(p)) || '';
    const janAppPath = janAppPaths.find(p => fs.existsSync(p) && p.toLowerCase().endsWith('.exe')) || '';
    return {
      nitroPath,
      janAppPath,
      installed: Boolean(nitroPath || janAppPath),
      searchedPaths: [...nitroPaths, ...janAppPaths],
      missingReason: nitroPath || janAppPath
        ? ''
        : 'No bundled nitro.exe or Jan.exe was found in the app bin/resources paths or the user Jan install paths.'
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILT-IN JAN + TURBOQUANT ENGINE (PRIMARY)
  // ═══════════════════════════════════════════════════════════════

  /** Health check for the built-in Jan + TurboQuant engine */
  async checkJanEngine(): Promise<boolean> {
    for (const baseUrl of ['http://127.0.0.1:1337/v1', 'http://localhost:1337/v1']) {
      try {
        const response = await axios.get(`${baseUrl}/models`, { timeout: 2500 });
        if (response.status === 200) {
          this.janUrl = baseUrl;
          return true;
        }
      } catch {
        // Try the next host form before declaring Jan offline.
      }
    }
    return false;
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
        const probe = await axios.get('http://127.0.0.1:1337/v1/models', { timeout: 1500 });
        // If we get a response but it's not Jan format, another service is there
        portOccupiedByOther = probe.status === 200;
      } catch (e: any) {
        // Expected if nothing is running on 1337
        console.log('Port 1337 probe failed/timeout:', e.message);
      }
    }

    const runtime = this.getJanRuntimeDiagnostics();

    return {
      engine: 'Jan + TurboQuant',
      role: 'Primary Built-in Engine',
      apiOnline: isOnline,
      installed: runtime.installed || isOnline,
      port: 1337,
      apiUrl: this.janUrl,
      executablePath: runtime.nitroPath || runtime.janAppPath,
      nitroPath: runtime.nitroPath,
      janAppPath: runtime.janAppPath,
      searchedPaths: runtime.searchedPaths,
      missingReason: runtime.missingReason,
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

    const runtime = this.getJanRuntimeDiagnostics();
    if (runtime.nitroPath) {
      console.log(`ME 1.8: Spawning Jan+TurboQuant Nitro from ${runtime.nitroPath}`);
      const nitro = spawn(runtime.nitroPath, ['--port', '1337'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      nitro.unref();

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await new Promise(r => setTimeout(r, 1000));
        const newStatus = await this.getJanEngineStatus();
        if (newStatus.apiOnline) {
          return { ok: true, engine: 'Jan + TurboQuant', message: 'Built-in Nitro runtime started successfully.', status: newStatus };
        }
      }
      return { ok: false, engine: 'Jan + TurboQuant', error: 'Nitro was launched but the Jan-compatible API did not become ready on port 1337.', status: await this.getJanEngineStatus() };
    }

    if (runtime.janAppPath) {
      console.log(`ME 1.8: Starting Jan desktop runtime from ${runtime.janAppPath}`);
      const jan = spawn(runtime.janAppPath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
      jan.unref();

      for (let attempt = 0; attempt < 18; attempt += 1) {
        await new Promise(r => setTimeout(r, 1000));
        const newStatus = await this.getJanEngineStatus();
        if (newStatus.apiOnline) {
          return { ok: true, engine: 'Jan + TurboQuant', message: 'Jan desktop runtime started and API is ready.', status: newStatus };
        }
      }
      return { ok: false, engine: 'Jan + TurboQuant', error: 'Jan desktop was launched but its OpenAI-compatible API did not become ready on port 1337. Enable Jan local API/server in Jan settings.', status: await this.getJanEngineStatus() };
    }

    return {
      ok: false,
      engine: 'Jan + TurboQuant',
      error: 'Built-in Jan/TurboQuant runtime files are missing. Add nitro.exe to the app bin/resources folder or install Jan so Jan.exe is available; then press Start Jan TurboQuant.',
      status: await this.getJanEngineStatus()
    };
  }

  /** Load a model into the built-in Jan + TurboQuant engine */
  async loadJanModel(model: { name: string, path?: string }) {
    console.log(`ME 1.8: Loading model ${model.name} into Jan+TurboQuant engine`);
    
    try {
      const status = await this.getJanEngineStatus();
      if (!status.apiOnline) {
        return {
          ok: false,
          engine: 'Jan + TurboQuant',
          error: 'Jan + TurboQuant is not online on port 1337. Start the built-in engine first, then load the model.',
          status
        };
      }

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
      return {
        ok: false,
        engine: 'Jan + TurboQuant',
        model: model.name,
        error: e?.response?.data?.error || e?.message || `Jan + TurboQuant could not load ${model.name}.`,
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

    // 4. Try OpenCode/OpenAI-compatible local route (optional external)
    try {
      const openCode = await this.checkOpenCode();
      if (openCode?.online) {
        console.log('ME 1.8: Routing to OpenCode (optional external)');
        const result = await this.chatWithOpenCode(model, messages);
        return { ...result, engine: 'OpenCode (External)' };
      }
    } catch {
      console.log('ME 1.8: OpenCode unavailable...');
    }

    // 5. All local engines offline
    return { 
      message: { content: `Jan + TurboQuant is the built-in primary engine, but it is not responding on port 1337 right now.${options.preferred === 'jan' ? ' Hermes ME did not treat Jan as an external app; it tried the built-in route first.' : ''}\n\nI also checked optional local fallbacks: Ollama, LM Studio, and OpenCode are not available with a usable model. Open Model Hub, press Start Jan TurboQuant, then load a local model. If you want API fallback, choose OpenRouter, Gemini, or NVIDIA from the provider menu; Hermes ME will keep those routes on free-tier models.` },
      engine: 'None (All Offline)'
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // FULL ENGINE STATUS — all engines at once
  // ═══════════════════════════════════════════════════════════════

  async getFullEngineStatus() {
    const [janOnline, ollamaModels, lmStudio, openCode] = await Promise.all([
      this.checkJanEngine().catch(() => false),
      this.listOllamaModels().catch(() => []),
      this.checkLMStudio().catch(() => null),
      this.checkOpenCode().catch(() => null)
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
      },
      openCode: {
        name: 'OpenCode',
        role: 'Optional External / OpenAI-compatible',
        online: openCode?.online || false,
        url: openCode?.url || this.openCodeUrls[0],
        models: openCode?.models || []
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

  private getOpenCodeAuthHeaders() {
    const keys = (this.store.get('api-keys', {}) || {}) as Record<string, string>;
    const token = process.env.OPENCODE_API_KEY || keys.opencode || keys.openCode || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async checkOpenCode() {
    const headers = this.getOpenCodeAuthHeaders();
    for (const baseUrl of this.openCodeUrls) {
      try {
        const response = await axios.get(`${baseUrl}/models`, { timeout: 2000, headers });
        if (response.status === 200) {
          const models = response.data?.data || response.data?.models || [];
          return { online: true, authRequired: false, url: baseUrl, provider: 'OpenCode', models };
        }
      } catch (error: any) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return {
            online: true,
            authRequired: true,
            url: baseUrl,
            provider: 'OpenCode',
            models: [],
            error: 'OpenCode endpoint is running but requires an API key/token.'
          };
        }
        // Try next OpenCode-compatible endpoint.
      }
    }
    return null;
  }

  async listOpenCodeModels() {
    const status = await this.checkOpenCode();
    return status?.models || [];
  }

  async chatWithOpenCode(model: string, messages: any[]) {
    const status = await this.checkOpenCode();
    if (!status?.online) {
      return { message: { content: 'OpenCode is not running on a detected OpenAI-compatible local endpoint. Start OpenCode or set OPENCODE_API_URL.' } };
    }
    if (status.authRequired) {
      return {
        message: {
          content: 'OpenCode is running, but it requires a local API key/token. Add it in Settings -> API & Connections as "OpenCode Local Token", or set OPENCODE_API_KEY, then refresh models.'
        },
        engine: 'OpenCode (Auth Required)'
      };
    }
    try {
      const modelIds = (status.models || []).map((m: any) => m.id || m.name).filter(Boolean);
      const selectedModel = modelIds.includes(model) ? model : modelIds[0] || model || 'local-model';
      const response = await axios.post(`${status.url}/chat/completions`, {
        model: selectedModel,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      }, { timeout: 120000, headers: this.getOpenCodeAuthHeaders() });
      return {
        message: { content: response.data?.choices?.[0]?.message?.content || '' },
        model: selectedModel
      };
    } catch (error: any) {
      return { message: { content: `OpenCode error: ${error.message}` } };
    }
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
