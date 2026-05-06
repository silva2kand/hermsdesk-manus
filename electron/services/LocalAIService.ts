import axios from 'axios';
import si from 'systeminformation';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { app } from 'electron';
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
//   1. Jan + TurboQuant  (built-in, primary, port 6767; 1337 compatibility)
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
  private janUrl = 'http://127.0.0.1:6767/v1';
  private activeJanModel = '';
  private modelsPath = path.join(app.getPath('userData'), 'models');

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
    fs.mkdirSync(this.modelsPath, { recursive: true });
    fs.mkdirSync(this.getHermsDeskJanProfileRoot(), { recursive: true });
  }

  private getHermsDeskJanProfileRoot() {
    return path.join(app.getPath('userData'), 'jan-runtime-profile');
  }

  private getHermsDeskJanDataRoot() {
    return path.join(this.getHermsDeskJanProfileRoot(), 'Jan', 'data');
  }

  private getJanProcessEnv() {
    const profileRoot = this.getHermsDeskJanProfileRoot();
    const localRoot = path.join(profileRoot, 'Local');
    fs.mkdirSync(profileRoot, { recursive: true });
    fs.mkdirSync(localRoot, { recursive: true });
    fs.mkdirSync(this.getHermsDeskJanDataRoot(), { recursive: true });
    return {
      ...process.env,
      APPDATA: profileRoot,
      LOCALAPPDATA: localRoot,
      JAN_DATA_FOLDER: this.getHermsDeskJanDataRoot(),
      HERMESDESK_JAN_BUILTIN: '1'
    };
  }

  private getNitroSearchPaths() {
    return [
      path.join(process.cwd(), 'bin', 'nitro.exe'),
      path.join(process.cwd(), 'electron', 'bin', 'nitro.exe'),
      path.join(process.cwd(), 'resources', 'bin', 'nitro.exe'),
      path.join(process.resourcesPath || '', 'bin', 'nitro.exe'),
      path.join(process.resourcesPath || '', 'electron', 'bin', 'nitro.exe')
    ];
  }

  private getJanCliSearchPaths() {
    return [
      path.join(process.cwd(), 'bin', 'jan-runtime', 'app', 'resources', 'bin', 'jan.exe'),
      path.join(process.resourcesPath || '', 'bin', 'jan-runtime', 'app', 'resources', 'bin', 'jan.exe')
    ];
  }

  private getJanAppSearchPaths() {
    return [
      path.join(process.cwd(), 'bin', 'jan-runtime', 'app', 'Jan.exe'),
      path.join(process.cwd(), 'bin', 'jan-runtime', 'app', 'jan.exe'),
      path.join(process.resourcesPath || '', 'bin', 'jan-runtime', 'app', 'Jan.exe'),
      path.join(process.resourcesPath || '', 'bin', 'jan-runtime', 'app', 'jan.exe'),
      path.join(process.cwd(), 'bin', 'Jan.exe'),
      path.join(process.cwd(), 'electron', 'bin', 'Jan.exe'),
      path.join(process.resourcesPath || '', 'bin', 'Jan.exe')
    ];
  }

  private getJanRuntimeDiagnostics() {
    const nitroPaths = this.getNitroSearchPaths();
    const janCliPaths = this.getJanCliSearchPaths();
    const janAppPaths = this.getJanAppSearchPaths();
    const nitroPath = nitroPaths.find(p => fs.existsSync(p)) || '';
    const janCliPath = janCliPaths.find(p => fs.existsSync(p)) || '';
    const janAppPath = janAppPaths.find(p => fs.existsSync(p) && p.toLowerCase().endsWith('.exe')) || '';
    return {
      nitroPath,
      janCliPath,
      janAppPath,
      janProfileRoot: this.getHermsDeskJanProfileRoot(),
      janDataRoot: this.getHermsDeskJanDataRoot(),
      modelLibraryPath: this.modelsPath,
      installed: Boolean(nitroPath || janCliPath || janAppPath),
      searchedPaths: [...nitroPaths, ...janCliPaths, ...janAppPaths],
      missingReason: nitroPath || janCliPath || janAppPath
        ? ''
        : 'No bundled nitro.exe, Jan CLI, or Jan.exe was found inside HermsDesk app bin/resources paths.'
    };
  }

  private getJanAuthHeaders() {
    const keys = (this.store.get('api-keys', {}) || {}) as Record<string, string>;
    const token = process.env.JAN_API_KEY || keys.jan || keys['jan-turboquant'] || keys.janTurboQuant || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private buildDfalshTurboQuantPolicy(modelPath?: string) {
    const stats = modelPath && fs.existsSync(modelPath) ? fs.statSync(modelPath) : null;
    const modelGb = stats ? stats.size / (1024 * 1024 * 1024) : 0;
    const cpuThreads = Math.max(2, Math.min(os.cpus().length || 4, 12));
    const ramGb = os.totalmem() / (1024 * 1024 * 1024);
    const vramText = String(this.pcCache.vram || '');
    const vramGb = Number(vramText.match(/\d+(?:\.\d+)?/)?.[0] || 0);
    const ctxSize = modelGb >= 24 || ramGb < 32 ? 8192 : modelGb >= 12 ? 16384 : 32768;
    const timeout = modelGb >= 24 ? 240 : modelGb >= 12 ? 180 : 120;
    const gpuLayers = vramGb > 0 ? -1 : 0;
    const policy = {
      name: 'DFALSH + TurboQuant',
      mode: 'adaptive-local-inference',
      modelGb: Number(modelGb.toFixed(2)),
      ctxSize,
      threads: cpuThreads,
      gpuLayers,
      timeout,
      fit: true,
      heuristics: [
        'auto-fit context to available VRAM',
        'offload all viable layers to GPU',
        'bound context for large models to avoid VRAM paging',
        'pin CPU threads below full system count for UI responsiveness',
        'persist llama.cpp timings from OpenAI-compatible responses'
      ]
    };
    this.store.set('turboQuant.lastPolicy', { ...policy, updatedAt: new Date().toISOString() });
    return policy;
  }

  private saveJanMetrics(responseData: any, model: string) {
    const timings = responseData?.timings || {};
    const usage = responseData?.usage || {};
    const metrics = {
      model,
      engine: 'Jan + TurboQuant',
      policy: this.store.get('turboQuant.lastPolicy', null),
      updatedAt: new Date().toISOString(),
      tokensPerSecond: timings.predicted_per_second || timings.prompt_per_second || 0,
      promptPerSecond: timings.prompt_per_second || 0,
      completionTokens: usage.completion_tokens || timings.predicted_n || 0,
      promptTokens: usage.prompt_tokens || timings.prompt_n || 0,
      totalTokens: usage.total_tokens || 0,
      rawTimings: timings
    };
    this.store.set('turboQuant.lastMetrics', metrics);
    return metrics;
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILT-IN JAN + TURBOQUANT ENGINE (PRIMARY)
  // ═══════════════════════════════════════════════════════════════

  /** Health check for the built-in Jan + TurboQuant engine */
  async checkJanEngine(): Promise<boolean> {
    const headers = this.getJanAuthHeaders();
    for (const baseUrl of ['http://127.0.0.1:6767/v1', 'http://localhost:6767/v1', 'http://127.0.0.1:1337/v1', 'http://localhost:1337/v1']) {
      try {
        const response = await axios.get(`${baseUrl}/models`, { timeout: 2500, headers });
        if (response.status === 200) {
          this.janUrl = baseUrl;
          return true;
        }
      } catch (error: any) {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          this.janUrl = baseUrl;
          return true;
        }
        // Try the next host form before declaring Jan offline.
      }
    }
    return false;
  }

  /** Full status report for the built-in engine */
  async getJanEngineStatus(): Promise<any> {
    const isOnline = await this.checkJanEngine();
    let models: any[] = [];
    let authRequired = false;
    if (isOnline) {
      try {
        const resp = await axios.get(`${this.janUrl}/models`, { headers: this.getJanAuthHeaders() });
        models = resp.data?.data || resp.data?.models || [];
        const firstModel = models.map((m: any) => m.id || m.name || m.model).filter(Boolean)[0];
        if (firstModel && !this.activeJanModel) {
          this.activeJanModel = firstModel;
          this.store.set('activeJanModel', firstModel);
        }
      } catch (e: any) {
        authRequired = e?.response?.status === 401 || e?.response?.status === 403;
        console.error('Failed to fetch Jan models:', e.message);
      }
    }

    // Detect if another service is occupying the Jan API port
    let portOccupiedByOther = false;
    if (!isOnline) {
      try {
        const probe = await axios.get('http://127.0.0.1:6767/v1/models', { timeout: 1500 });
        // If we get a response but it's not Jan format, another service is there
        portOccupiedByOther = probe.status === 200;
      } catch (e: any) {
        // Expected if nothing is running on 6767
        console.log('Port 6767 probe failed/timeout:', e.message);
      }
    }

    const runtime = this.getJanRuntimeDiagnostics();

    return {
      engine: 'Jan + TurboQuant',
      role: 'Primary Built-in Engine',
      apiOnline: isOnline,
      installed: runtime.installed || isOnline,
      port: this.janUrl.includes(':6767') ? 6767 : 1337,
      apiUrl: this.janUrl,
      executablePath: runtime.nitroPath || runtime.janAppPath,
      nitroPath: runtime.nitroPath,
      janCliPath: runtime.janCliPath,
      janAppPath: runtime.janAppPath,
      janProfileRoot: runtime.janProfileRoot,
      janDataRoot: runtime.janDataRoot,
      modelLibraryPath: runtime.modelLibraryPath,
      searchedPaths: runtime.searchedPaths,
      missingReason: runtime.missingReason,
      activeModel: this.activeJanModel,
      authRequired,
      portOccupiedByOther,
      models,
      turboQuant: {
        policy: this.store.get('turboQuant.lastPolicy', null),
        metrics: this.store.get('turboQuant.lastMetrics', null)
      },
      externalAccessUrl: this.janUrl
    };
  }

  /** Start the built-in Jan + TurboQuant Nitro server */
  async startJanEngine() {
    const status = await this.getJanEngineStatus();
    if (status.apiOnline) {
      return { ok: true, engine: 'Jan + TurboQuant', message: 'Built-in engine is already running.', status };
    }
    if (status.portOccupiedByOther) {
      return { ok: false, engine: 'Jan + TurboQuant', error: 'Jan API port is occupied by another service. Please free port 6767/1337 so the built-in engine can start.' };
    }

    const runtime = this.getJanRuntimeDiagnostics();
    if (runtime.janCliPath) {
      return {
        ok: false,
        engine: 'Jan + TurboQuant',
        error: 'Bundled Jan CLI is installed. Download a GGUF model in Model Hub and press Load; HermsDesk will start `jan serve` for that model on port 6767.',
        status
      };
    }

    if (runtime.nitroPath) {
      console.log(`ME 1.8: Spawning Jan+TurboQuant Nitro from ${runtime.nitroPath}`);
      const nitro = spawn(runtime.nitroPath, ['--port', '6767'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: this.getJanProcessEnv()
      });
      nitro.unref();

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await new Promise(r => setTimeout(r, 1000));
        const newStatus = await this.getJanEngineStatus();
        if (newStatus.apiOnline) {
          return { ok: true, engine: 'Jan + TurboQuant', message: 'Built-in Nitro runtime started successfully.', status: newStatus };
        }
      }
      return { ok: false, engine: 'Jan + TurboQuant', error: 'Nitro was launched but the Jan-compatible API did not become ready on port 6767.', status: await this.getJanEngineStatus() };
    }

    if (runtime.janAppPath) {
      console.log(`ME 1.8: Starting bundled Jan desktop runtime from ${runtime.janAppPath}`);
      const jan = spawn(runtime.janAppPath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        env: this.getJanProcessEnv()
      });
      jan.unref();

      for (let attempt = 0; attempt < 18; attempt += 1) {
        await new Promise(r => setTimeout(r, 1000));
        const newStatus = await this.getJanEngineStatus();
        if (newStatus.apiOnline) {
          return { ok: true, engine: 'Jan + TurboQuant', message: 'Bundled Jan desktop runtime started and API is ready.', status: newStatus };
        }
      }
      return { ok: false, engine: 'Jan + TurboQuant', error: 'Bundled Jan desktop runtime was launched but its OpenAI-compatible API did not become ready on port 6767. Load a GGUF model from Model Hub to start Jan CLI serve inside HermsDesk.', status: await this.getJanEngineStatus() };
    }

    return {
      ok: false,
      engine: 'Jan + TurboQuant',
      error: 'Built-in Jan/TurboQuant runtime files are missing. Run `npm run setup:jan` to place the official Jan runtime inside this app, then rebuild.',
      status: await this.getJanEngineStatus()
    };
  }

  private async startJanCliServe(modelPath: string, modelName: string) {
    const runtime = this.getJanRuntimeDiagnostics();
    if (!runtime.janCliPath) {
      return { ok: false, error: 'Bundled Jan CLI was not found. Run npm run setup:jan first.' };
    }
    if (!modelPath || !fs.existsSync(modelPath)) {
      return { ok: false, error: `Model file not found: ${modelPath || modelName}` };
    }

    const logDir = path.join(this.getHermsDeskJanDataRoot(), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'turboquant-serve.log');
    const apiKey = process.env.JAN_API_KEY || ((this.store.get('api-keys', {}) || {}) as any)['jan-turboquant'] || '';
    const policy = this.buildDfalshTurboQuantPolicy(modelPath);
    const args = [
      'serve',
      modelName || path.basename(modelPath),
      '--model-path',
      modelPath,
      '--port',
      '6767',
      '--fit',
      '--ctx-size',
      String(policy.ctxSize),
      '--threads',
      String(policy.threads),
      '--n-gpu-layers',
      String(policy.gpuLayers),
      '--timeout',
      String(policy.timeout),
      '--detach',
      '--log',
      logPath
    ];
    if (apiKey) args.push('--api-key', apiKey);

    const child = spawn(runtime.janCliPath, args, {
      cwd: path.dirname(runtime.janCliPath),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: this.getJanProcessEnv()
    });
    child.unref();

    for (let attempt = 0; attempt < 90; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const online = await this.checkJanEngine();
      if (online) return { ok: true, logPath };
    }
    return { ok: false, error: `Jan CLI started but the model server did not become ready on port 6767. Check log: ${logPath}`, logPath };
  }

  /** Load a model into the built-in Jan + TurboQuant engine */
  async loadJanModel(model: { name: string, path?: string }) {
    console.log(`ME 1.8: Loading model ${model.name} into Jan+TurboQuant engine`);
    
    try {
      const status = await this.getJanEngineStatus();
      const library = await providerService.listLibraryModels();
      const target = library.find((m: any) => m.name === model.name || m.id === model.name);
      
      if (!target) {
        throw new Error(`Model ${model.name} not found in library. Download it first from Model Hub.`);
      }

      const runtime = this.getJanRuntimeDiagnostics();
      if (runtime.janCliPath && (!status.apiOnline || this.janUrl.includes(':6767'))) {
        const started = await this.startJanCliServe(target.path, target.name || model.name);
        if (!started.ok) {
          return {
            ok: false,
            engine: 'Jan + TurboQuant',
            model: model.name,
            error: started.error,
            status: await this.getJanEngineStatus()
          };
        }
        this.activeJanModel = model.name;
        this.store.set('activeJanModel', model.name);
        return { ok: true, engine: 'Jan + TurboQuant', model: model.name, status: await this.getJanEngineStatus() };
      }

      if (!status.apiOnline) {
        return {
          ok: false,
          engine: 'Jan + TurboQuant',
          error: 'Jan + TurboQuant is not online. Start the built-in engine first, then load the model.',
          status
        };
      }
      if (status.authRequired) {
        return {
          ok: false,
          engine: 'Jan + TurboQuant',
          error: 'Jan local API is running but requires an API key. Save the Jan Local API key in Settings -> API & Connections as Jan + TurboQuant, or set JAN_API_KEY.',
          status
        };
      }

      // 2. Load model into the built-in engine via Jan API
      const response = await axios.post(`${this.janUrl}/models/load`, {
        model: target.id
      }, { timeout: 30000, headers: this.getJanAuthHeaders() });

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
      const status = await this.getJanEngineStatus();
      if (status.authRequired) {
        throw new Error('Jan local API is running but requires an API key. Save the Jan Local API key in Settings -> API & Connections as Jan + TurboQuant, or set JAN_API_KEY.');
      }
      const response = await axios.post(`${this.janUrl}/chat/completions`, {
        model: model || this.activeJanModel || 'local-model',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      }, { timeout: 120000, headers: this.getJanAuthHeaders() });
      
      const content = response.data?.choices?.[0]?.message?.content || '';
      const metrics = this.saveJanMetrics(response.data, model || this.activeJanModel);
      return { 
        message: { content }, 
        engine: 'Jan + TurboQuant',
        model: model || this.activeJanModel,
        metrics
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Built-in Jan+TurboQuant engine is not responding on port 6767/1337.');
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
      message: { content: `Jan + TurboQuant is the built-in primary engine, but it is not responding on port 6767/1337 right now.${options.preferred === 'jan' ? ' Hermes ME did not treat Jan as an external app; it tried the built-in route first.' : ''}\n\nI also checked optional local fallbacks: Ollama, LM Studio, and OpenCode are not available with a usable model. Open Model Hub, press Load on a GGUF model to start the bundled Jan CLI server. If you want API fallback, choose OpenRouter, Gemini, or NVIDIA from the provider menu; Hermes ME will keep those routes on free-tier models.` },
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
        port: janOnline ? (this.janUrl.includes(':6767') ? 6767 : 1337) : 6767,
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
