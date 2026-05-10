import axios from 'axios';
import si from 'systeminformation';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import Store from 'electron-store';
import { providerService } from '../main'

const require = createRequire(import.meta.url);
const electron = require('electron');
const { app } = electron;
const execFileAsync = promisify(execFile);

export interface Model {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

export class LocalAIService {
  private store: any;
  private janUrl = 'http://127.0.0.1:6767/v1';
  private activeJanModel = '';
  private janStartPromise: Promise<any> | null = null;
  private modelsPath = path.join(app.getPath('userData'), 'models');
  private ollamaUrl = 'http://localhost:11434/api';
  private lmStudioUrl = 'http://localhost:1234/v1';
  private openCodeUrls = [
    process.env.OPENCODE_API_URL || '',
    'http://127.0.0.1:4096/v1',
    'http://localhost:4096/v1',
    'http://127.0.0.1:3456/v1',
    'http://localhost:3456/v1'
  ].filter(Boolean);

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
    const cachedPc = this.store.get('pcHardwareCache', null) as any;
    if (cachedPc?.gpu && !/detecting/i.test(cachedPc.gpu)) {
      this.pcCache = cachedPc;
    }
    if (!fs.existsSync(this.modelsPath)) fs.mkdirSync(this.modelsPath, { recursive: true });
    if (!fs.existsSync(this.getHermsDeskJanProfileRoot())) fs.mkdirSync(this.getHermsDeskJanProfileRoot(), { recursive: true });
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
    if (!fs.existsSync(profileRoot)) fs.mkdirSync(profileRoot, { recursive: true });
    if (!fs.existsSync(localRoot)) fs.mkdirSync(localRoot, { recursive: true });
    if (!fs.existsSync(this.getHermsDeskJanDataRoot())) fs.mkdirSync(this.getHermsDeskJanDataRoot(), { recursive: true });
    return {
      ...process.env,
      APPDATA: profileRoot,
      LOCALAPPDATA: localRoot,
      JAN_DATA_FOLDER: this.getHermsDeskJanDataRoot(),
      HERMESDESK_JAN_BUILTIN: '1'
    };
  }

  private getRuntimeRoots() {
    const roots = [
      process.cwd(),
      path.join(process.cwd(), '..'),
      app.getAppPath(),
      path.join(app.getAppPath(), '..'),
      path.join(os.homedir(), 'WorkSpace', 'hermsdeskapp'),
      app.getPath('userData'),
      path.join(app.getPath('userData'), 'runtime'),
      path.dirname(process.execPath),
      path.join(path.dirname(process.execPath), 'resources')
    ].filter(Boolean);
    return [...new Set(roots.map(root => path.resolve(root)))];
  }

  private runtimePath(...parts: string[]) {
    return this.getRuntimeRoots().map(root => path.join(root, ...parts));
  }

  private getNitroSearchPaths() {
    return [
      ...this.runtimePath('bin', 'nitro.exe'),
      ...this.runtimePath('electron', 'bin', 'nitro.exe'),
      ...this.runtimePath('resources', 'bin', 'nitro.exe')
    ];
  }

  private getJanCliSearchPaths() {
    return [
      ...this.runtimePath('bin', 'jan-runtime', 'app', 'resources', 'bin', 'jan.exe'),
      ...this.runtimePath('resources', 'bin', 'jan-runtime', 'app', 'resources', 'bin', 'jan.exe')
    ];
  }

  private getJanAppSearchPaths() {
    return [
      ...this.runtimePath('bin', 'jan-runtime', 'app', 'Jan.exe'),
      ...this.runtimePath('bin', 'jan-runtime', 'app', 'jan.exe'),
      ...this.runtimePath('resources', 'bin', 'jan-runtime', 'app', 'Jan.exe'),
      ...this.runtimePath('resources', 'bin', 'jan-runtime', 'app', 'jan.exe'),
      ...this.runtimePath('bin', 'Jan.exe'),
      ...this.runtimePath('electron', 'bin', 'Jan.exe')
    ];
  }

  private getTurboQuantBackendSearchPaths() {
    return [
      ...this.runtimePath('bin', 'jan-runtime', 'backends', 'llamacpp', 'win-cuda', 'bin', 'llama-server.exe'),
      ...this.runtimePath('resources', 'bin', 'jan-runtime', 'backends', 'llamacpp', 'win-cuda', 'bin', 'llama-server.exe')
    ];
  }

  private getTurboQuantBackendPath() {
    return this.getTurboQuantBackendSearchPaths().find(p => fs.existsSync(p)) || '';
  }

  private getJanRuntimeDiagnostics() {
    const nitroPaths = this.getNitroSearchPaths();
    const janCliPaths = this.getJanCliSearchPaths();
    const janAppPaths = this.getJanAppSearchPaths();
    const nitroPath = nitroPaths.find(p => fs.existsSync(p)) || '';
    const janCliPath = janCliPaths.find(p => fs.existsSync(p)) || '';
    const janAppPath = janAppPaths.find(p => fs.existsSync(p) && p.toLowerCase().endsWith('.exe')) || '';
    const turboQuantBackendPath = this.getTurboQuantBackendPath();

    return {
      nitroPath,
      janCliPath,
      janAppPath,
      janProfileRoot: this.getHermsDeskJanProfileRoot(),
      janDataRoot: this.getHermsDeskJanDataRoot(),
      modelLibraryPath: this.modelsPath,
      turboQuantBackendPath,
      installed: Boolean(nitroPath || janCliPath || janAppPath),
      searchedPaths: [...new Set([...nitroPaths, ...janCliPaths, ...janAppPaths, ...this.getTurboQuantBackendSearchPaths()])],
      runtimeRoots: this.getRuntimeRoots(),
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

  private chooseBestJanModel(modelIds: string[], requested?: string) {
    if (requested && modelIds.includes(requested)) return requested;
    if (this.activeJanModel && modelIds.includes(this.activeJanModel)) return this.activeJanModel;
    return (
      modelIds.find(id => /qwen/i.test(id)) ||
      modelIds.find(id => /phi/i.test(id)) ||
      modelIds[0] ||
      requested ||
      'local-model'
    );
  }

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
      }
    }
    return false;
  }

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
      }
    }

    let portOccupiedByOther = false;
    if (!isOnline) {
      try {
        const probe = await axios.get('http://127.0.0.1:6767/v1/models', { timeout: 1500 });
        portOccupiedByOther = probe.status === 200;
      } catch (e: any) {
        console.log('Port 6767 probe failed/timeout:', e.message);
      }
    }

    const runtime = this.getJanRuntimeDiagnostics();

    return {
      engine: 'Jan + TurboQuant',
      optimizer: 'DFLASH/DFALSH + TurboQuant',
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
      turboQuantBackendPath: runtime.turboQuantBackendPath,
      searchedPaths: runtime.searchedPaths,
      missingReason: runtime.missingReason,
      activeModel: this.activeJanModel,
      authRequired,
      portOccupiedByOther,
      models,
      turboQuant: {
        dflash: true,
        dfalsh: true,
        label: 'DFLASH/DFALSH + TurboQuant adaptive scheduler',
        policy: this.store.get('turboQuant.lastPolicy', null),
        metrics: this.store.get('turboQuant.lastMetrics', null)
      },
      externalAccessUrl: this.janUrl
    };
  }

  async startJanEngine() {
    if (this.janStartPromise) return this.janStartPromise;
    this.janStartPromise = this.startJanEngineInternal().finally(() => {
      this.janStartPromise = null;
    });
    return this.janStartPromise;
  }

  private async startJanEngineInternal() {
    const status = await this.getJanEngineStatus();
    if (status.apiOnline) return { ok: true, engine: 'Jan + TurboQuant', message: 'Built-in engine is already running.', status };
    if (status.portOccupiedByOther) return { ok: false, engine: 'Jan + TurboQuant', error: 'Jan API port is occupied by another service.' };

    const runtime = this.getJanRuntimeDiagnostics();
    if (runtime.janCliPath) {
      const library = await providerService.listLibraryModels().catch(() => []);
      const models = Array.isArray(library) ? library.filter((model: any) => model?.path && fs.existsSync(model.path)) : [];
      const preferred = models.find((model: any) => /qwen/i.test(model.name || model.id || '')) || models.find((model: any) => /phi/i.test(model.name || model.id || '')) || models[0];
      if (preferred) {
        const started = await this.startJanCliServe(preferred.path, preferred.name || preferred.id);
        const newStatus = await this.getJanEngineStatus();
        if (started.ok || newStatus.apiOnline) {
          this.activeJanModel = preferred.name || preferred.id;
          this.store.set('activeJanModel', this.activeJanModel);
          return { ok: true, engine: 'Jan + TurboQuant', message: `Started with ${this.activeJanModel}.`, model: this.activeJanModel, status: newStatus };
        }
        return { ok: false, engine: 'Jan + TurboQuant', error: started.error || 'Jan CLI did not become ready.', status: newStatus };
      }
    }

    if (runtime.nitroPath) {
      const nitro = spawn(runtime.nitroPath, ['--port', '6767'], { detached: true, stdio: 'ignore', windowsHide: true, env: this.getJanProcessEnv() });
      nitro.unref();
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await new Promise(r => setTimeout(r, 1000));
        const newStatus = await this.getJanEngineStatus();
        if (newStatus.apiOnline) return { ok: true, engine: 'Jan + TurboQuant', message: 'Nitro started.', status: newStatus };
      }
    }

    if (runtime.janAppPath) {
      const jan = spawn(runtime.janAppPath, [], { detached: true, stdio: 'ignore', windowsHide: false, env: this.getJanProcessEnv() });
      jan.unref();
      for (let attempt = 0; attempt < 18; attempt += 1) {
        await new Promise(r => setTimeout(r, 1000));
        const newStatus = await this.getJanEngineStatus();
        if (newStatus.apiOnline) return { ok: true, engine: 'Jan + TurboQuant', message: 'Jan desktop started.', status: newStatus };
      }
    }

    return { ok: false, engine: 'Jan + TurboQuant', error: 'Built-in Jan/TurboQuant runtime files are missing.', status: await this.getJanEngineStatus() };
  }

  private async startJanCliServe(modelPath: string, modelName: string) {
    const runtime = this.getJanRuntimeDiagnostics();
    if (!runtime.janCliPath) return { ok: false, error: 'Bundled Jan CLI not found.' };
    const logDir = path.join(this.getHermsDeskJanDataRoot(), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'turboquant-serve.log');
    const apiKey = process.env.JAN_API_KEY || ((this.store.get('api-keys', {}) || {}) as any)['jan-turboquant'] || '';
    const policy = this.buildDfalshTurboQuantPolicy(modelPath);
    const args = ['serve', modelName || path.basename(modelPath), '--model-path', modelPath, '--port', '6767', '--fit', `--ctx-size=${policy.ctxSize}`, `--threads=${policy.threads}`, `--n-gpu-layers=${policy.gpuLayers}`, `--timeout=${policy.timeout}`, '--detach', '--log', logPath];
    if (runtime.turboQuantBackendPath) args.push('--bin', runtime.turboQuantBackendPath);
    if (apiKey) args.push('--api-key', apiKey);

    const child = spawn(runtime.janCliPath, args, { cwd: path.dirname(runtime.janCliPath), detached: true, stdio: 'ignore', windowsHide: true, env: this.getJanProcessEnv() });
    child.unref();

    for (let attempt = 0; attempt < 90; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await this.checkJanEngine()) return { ok: true, logPath };
    }
    return { ok: false, error: 'Jan CLI server did not become ready.', logPath };
  }

  async loadJanModel(model: { name: string, path?: string }) {
    try {
      const status = await this.getJanEngineStatus();
      const library = await providerService.listLibraryModels();
      const target = library.find((m: any) => m.name === model.name || m.id === model.name);
      if (!target) throw new Error(`Model ${model.name} not found in library.`);

      const runtime = this.getJanRuntimeDiagnostics();
      if (runtime.janCliPath && !status.apiOnline) {
        const started = await this.startJanCliServe(target.path, target.name || model.name);
        if (!started.ok) return { ok: false, error: started.error, status: await this.getJanEngineStatus() };
        this.activeJanModel = model.name;
        this.store.set('activeJanModel', model.name);
        return { ok: true, engine: 'Jan + TurboQuant', model: model.name, status: await this.getJanEngineStatus() };
      }

      if (!status.apiOnline) return { ok: false, engine: 'Jan + TurboQuant', error: 'Jan is offline.', status };
      const response = await axios.post(`${this.janUrl}/models/load`, { model: target.id }, { timeout: 30000, headers: this.getJanAuthHeaders() });
      if (response.status === 200) {
        this.activeJanModel = model.name;
        this.store.set('activeJanModel', model.name);
        return { ok: true, engine: 'Jan + TurboQuant', model: model.name, status: await this.getJanEngineStatus() };
      }
    } catch (e: any) {
      return { ok: false, engine: 'Jan + TurboQuant', error: e.message, status: await this.getJanEngineStatus() };
    }
    return { ok: false, error: 'Failed to communicate with Jan engine.' };
  }

  async chatWithJan(model: string, messages: any[]): Promise<any> {
    const status = await this.getJanEngineStatus();
    const modelIds = (status.models || []).map((m: any) => m.id || m.name || m.model).filter(Boolean);
    const selectedModel = this.chooseBestJanModel(modelIds, model);
    const response = await axios.post(`${this.janUrl}/chat/completions`, { model: selectedModel, messages: messages.map(m => ({ role: m.role, content: m.content })), stream: false }, { timeout: 120000, headers: this.getJanAuthHeaders() });
    const metrics = this.saveJanMetrics(response.data, selectedModel);
    return { message: { content: response.data?.choices?.[0]?.message?.content || '' }, engine: 'Jan + TurboQuant + DFLASH', model: selectedModel, metrics };
  }

  async chatWithBestAvailable(model: string, messages: any[], options: { preferred?: 'jan' | 'ollama' | 'lmstudio' } = {}): Promise<any> {
    try {
      let janOnline = await this.checkJanEngine();
      if (!janOnline) {
        const startResult = await this.startJanEngine();
        if (startResult.ok) janOnline = true;
      }
      if (janOnline) return await this.chatWithJan(model, messages);
    } catch (e) {}

    try {
      const ollamaCheck = await axios.get(`${this.ollamaUrl}/tags`, { timeout: 3000 });
      if (ollamaCheck.status === 200) return await this.chatWithOllama(model, messages);
    } catch (e) {}

    try {
      const lmStudio = await this.checkLMStudio();
      if (lmStudio?.online) return await this.chatWithLMStudio(model, messages);
    } catch (e) {}

    try {
      const openCode = await this.checkOpenCode();
      if (openCode?.online) return await this.chatWithOpenCode(model, messages);
    } catch (e) {}

    return { message: { content: 'No local AI engine is available.' }, engine: 'None' };
  }

  async getFullEngineStatus() {
    const [janOnline, ollamaModels, lmStudio, openCode] = await Promise.all([this.checkJanEngine().catch(() => false), this.listOllamaModels().catch(() => []), this.checkLMStudio().catch(() => null), this.checkOpenCode().catch(() => null)]);
    return { primary: { name: 'Jan + TurboQuant + DFLASH', online: janOnline, activeModel: this.activeJanModel }, ollama: { name: 'Ollama', online: ollamaModels.length > 0 }, lmStudio: { name: 'LM Studio', online: lmStudio?.online || false }, openCode: { name: 'OpenCode', online: openCode?.online || false } };
  }

  async listOllamaModels(): Promise<Model[]> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/tags`, { timeout: 5000 });
      return response.data.models || [];
    } catch (error: any) { return []; }
  }

  async chatWithOllama(model: string, messages: any[]) {
    const response = await axios.post(`${this.ollamaUrl}/chat`, { model: model || 'llama3', messages: messages.map(m => ({ role: m.role, content: m.content })), stream: false }, { timeout: 120000 });
    return response.data;
  }

  async chatWithLMStudio(model: string, messages: any[]) {
    const response = await axios.post(`${this.lmStudioUrl}/chat/completions`, { model: model || 'local-model', messages: messages.map(m => ({ role: m.role, content: m.content })), stream: false }, { timeout: 120000 });
    return { message: { content: response.data.choices[0].message.content } };
  }

  async checkLMStudio() {
    try {
      const response = await axios.get(`${this.lmStudioUrl}/models`, { timeout: 2000 });
      if (response.status === 200) return { online: true, url: this.lmStudioUrl };
    } catch (e) {}
    return null;
  }

  private getOpenCodeAuthHeaders() {
    const keys = (this.store.get('api-keys', {}) || {}) as Record<string, string>;
    const token = process.env.OPENCODE_API_KEY || keys.opencode || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async checkOpenCode() {
    const headers = this.getOpenCodeAuthHeaders();
    for (const baseUrl of this.openCodeUrls) {
      try {
        const response = await axios.get(`${baseUrl}/models`, { timeout: 2000, headers });
        if (response.status === 200) return { online: true, url: baseUrl, models: response.data?.data || [] };
      } catch (error: any) {}
    }
    return null;
  }

  async listOpenCodeModels() {
    const status = await this.checkOpenCode();
    return status?.models || [];
  }

  async chatWithOpenCode(model: string, messages: any[]) {
    const status = await this.checkOpenCode();
    const response = await axios.post(`${status!.url}/chat/completions`, { model: model || 'local-model', messages: messages.map(m => ({ role: m.role, content: m.content })), stream: false }, { timeout: 120000, headers: this.getOpenCodeAuthHeaders() });
    return { message: { content: response.data?.choices?.[0]?.message?.content || '' } };
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs))]);
  }

  private async scanNvidiaSmi() {
    const candidates = [
      'nvidia-smi',
      'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe',
      'C:\\Windows\\System32\\nvidia-smi.exe'
    ];
    for (const candidate of candidates) {
      try {
        const { stdout } = await execFileAsync(candidate, ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], { timeout: 2500, windowsHide: true });
        const line = stdout.split(/\r?\n/).find(Boolean) || '';
        const [name, memoryMb] = line.split(',').map(v => v.trim());
        if (name) return { name, vramGb: Math.round(Number(memoryMb) / 1024) };
      } catch {}
    }
    return null;
  }

  private cachePcResources(next: any) {
    const clean = {
      ...next,
      gpu: next?.gpu && !/detecting/i.test(next.gpu) ? next.gpu : 'GPU not detected',
      vram: next?.vram || '0GB',
      ram: next?.ram || `${Math.round(os.totalmem() / (1024 ** 3))}GB`,
      os: next?.os || `${os.type()} ${os.release()}`,
      scannedAt: Date.now()
    };
    this.pcCache = clean;
    this.store.set('pcHardwareCache', clean);
    return clean;
  }

  private async scanNvidiaSmiLegacy() {
    try {
      const { stdout } = await execFileAsync('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], { timeout: 2500, windowsHide: true });
      const [name, memoryMb] = stdout.split(',').map(v => v.trim());
      return { name, vramGb: Math.round(Number(memoryMb) / 1024) };
    } catch { return null; }
  }

  private async scanWindowsHardwareFallback() {
    const nvidiaGpu = await this.scanNvidiaSmi();
    try {
      const script = `$ErrorActionPreference = 'SilentlyContinue'; $gpu = Get-CimInstance Win32_VideoController | Sort-Object AdapterRAM -Descending | Select-Object -First 1; $os = Get-CimInstance Win32_OperatingSystem; [pscustomobject]@{ gpu = if ($gpu.Name) { [string]$gpu.Name } else { 'GPU not detected' }; vram = if ($gpu.AdapterRAM) { [math]::Round([double]$gpu.AdapterRAM / 1GB) } else { 0 }; ram = if ($os.TotalVisibleMemorySize) { [math]::Round([double]$os.TotalVisibleMemorySize / 1MB) } else { 0 }; os = "$($os.Caption) $($os.Version)" } | ConvertTo-Json -Compress`;
      const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { timeout: 5000, windowsHide: true });
      const parsed = JSON.parse(stdout.trim());
      return this.cachePcResources({ gpu: nvidiaGpu?.name || parsed.gpu, vram: `${nvidiaGpu?.vramGb || parsed.vram || 0}GB`, ram: `${parsed.ram || Math.round(os.totalmem() / (1024 ** 3))}GB`, os: parsed.os, approximate: false });
    } catch {
      return this.cachePcResources({ gpu: nvidiaGpu?.name || this.pcCache.gpu || 'GPU not detected', vram: `${nvidiaGpu?.vramGb || Number(String(this.pcCache.vram || '').match(/\d+/)?.[0] || 0)}GB`, ram: `${Math.round(os.totalmem() / (1024 ** 3))}GB`, os: `${os.type()} ${os.release()}`, approximate: true });
    }
  }

  async scanPCResources() {
    try {
      const [gpus, mem, osInfo] = await Promise.all([this.withTimeout(si.graphics(), 3500, 'GPU'), this.withTimeout(si.mem(), 2500, 'RAM'), this.withTimeout(si.osInfo(), 2500, 'OS')]);
      const mainGpu = gpus.controllers[0];
      const nvidiaGpu = await this.scanNvidiaSmi();
      return this.cachePcResources({ 
        gpu: nvidiaGpu?.name || mainGpu?.model || 'Integrated', 
        vram: `${nvidiaGpu?.vramGb || Math.round((mainGpu?.vram || 0) / 1024) || 0}GB`, 
        ram: `${Math.round(mem.total / (1024 ** 3))}GB`, 
        os: `${osInfo.distro} ${osInfo.release}`, 
        scannedAt: Date.now(), 
        approximate: !mainGpu 
      });
    } catch (e) {
      return this.scanWindowsHardwareFallback();
    }
  }

  async getResourceUsage() {
    try {
      const [cpuLoad, mem] = await Promise.all([si.currentLoad(), si.mem()]);
      return { cpu: Math.round(cpuLoad.currentLoad), ram: Math.round((mem.active / mem.total) * 100), gpu: 0, gpuModel: this.pcCache.gpu, engine: await this.checkJanEngine() ? 'Jan + TurboQuant' : 'Offline' };
    } catch (error) { return { cpu: 0, ram: 0, gpu: 0, gpuModel: this.pcCache.gpu, engine: 'Unknown' }; }
  }
}
