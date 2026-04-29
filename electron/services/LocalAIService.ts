import axios from 'axios';
import si from 'systeminformation';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export interface Model {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

export class LocalAIService {
  private ollamaUrl = 'http://localhost:11434/api';
  private lmStudioUrl = 'http://localhost:1234/v1';
  private janUrl = 'http://localhost:1337/v1'; // Jan default API port
  private activeJanModel = '';
  private pcCache = {
    gpu: 'NVIDIA RTX 5000A',
    vram: '16GB',
    ram: '64GB',
    os: 'Windows 11',
    scannedAt: 0,
    approximate: true
  };
  private resourceCache = {
    cpu: 0,
    ram: 0,
    gpu: 0,
    gpuModel: 'NVIDIA RTX 5000A',
    scannedAt: 0
  };

  async listOllamaModels(): Promise<Model[]> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/tags`);
      return response.data.models || [];
    } catch (error) {
      return [];
    }
  }

  async checkJanEngine() {
    try {
      const response = await axios.get(`${this.janUrl}/models`, { timeout: 2000 });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getJanEngineStatus() {
    const api = await this.checkJanEngine();
    const executablePath = this.findJanExecutable();
    const models = Array.isArray(api?.data) ? api.data : Array.isArray(api) ? api : [];

    return {
      apiOnline: Boolean(api),
      installed: Boolean(executablePath),
      executablePath,
      activeModel: this.activeJanModel,
      models
    };
  }

  async startJanEngine() {
    const alreadyOnline = await this.checkJanEngine();
    if (alreadyOnline) {
      return { ok: true, alreadyOnline: true, status: await this.getJanEngineStatus() };
    }

    const executablePath = this.findJanExecutable();
    if (!executablePath) {
      return {
        ok: false,
        error: 'Jan is not installed. Install Jan, then come back to Model Hub and press Start Jan.'
      };
    }

    const child = spawn(executablePath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();

    const online = await this.waitForJanApi(20000);
    return {
      ok: online,
      error: online ? undefined : 'Jan opened, but the local API did not become ready yet. Enable Jan local API/server and try Load again.',
      status: await this.getJanEngineStatus()
    };
  }

  async loadJanModel(model: { name: string, path?: string }) {
    const start = await this.startJanEngine();
    if (!start.ok && !start.status?.apiOnline) {
      return start;
    }

    const candidates = [
      model.name,
      model.path,
      model.path ? path.basename(model.path) : ''
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      const loaded = await this.tryJanLoadCandidate(candidate, model.path);
      if (loaded) {
        this.activeJanModel = candidate;
        return { ok: true, model: candidate, status: await this.getJanEngineStatus() };
      }
    }

    this.activeJanModel = model.name;
    return {
      ok: true,
      model: model.name,
      warning: 'Jan API is online, but it did not expose a supported load endpoint. The app selected the model for chat; if Jan replies model-not-found, import the GGUF once in Jan.',
      status: await this.getJanEngineStatus()
    };
  }

  private findJanExecutable() {
    const home = os.homedir();
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidates = [
      path.join(localAppData, 'Programs', 'Jan', 'Jan.exe'),
      path.join(localAppData, 'Programs', 'jan', 'Jan.exe'),
      path.join(localAppData, 'Jan', 'Jan.exe'),
      path.join(programFiles, 'Jan', 'Jan.exe'),
      path.join(programFilesX86, 'Jan', 'Jan.exe')
    ];

    return candidates.find(candidate => fs.existsSync(candidate)) || '';
  }

  private async waitForJanApi(timeoutMs: number) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await this.checkJanEngine()) return true;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }

  private async tryJanLoadCandidate(model: string, filePath?: string) {
    const payloads = [
      { model },
      { id: model },
      { model, path: filePath },
      { id: model, path: filePath }
    ];
    const endpoints = [
      `${this.janUrl}/models/load`,
      `${this.janUrl}/model/load`,
      `${this.janUrl}/models/${encodeURIComponent(model)}/load`
    ];

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          await axios.post(endpoint, payload, { timeout: 10000 });
          return true;
        } catch (error: any) {
          if (error?.response?.status && ![404, 405].includes(error.response.status)) {
            console.warn(`Jan load attempt failed at ${endpoint}: ${error.message}`);
          }
        }
      }
    }

    return false;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>(resolve => {
          timer = setTimeout(() => resolve(fallback), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private fallbackPcResources() {
    return {
      gpu: this.pcCache.gpu,
      vram: this.pcCache.vram,
      ram: this.pcCache.ram,
      os: this.pcCache.os,
      approximate: this.pcCache.approximate
    };
  }

  async scanPCResources() {
    if (Date.now() - this.pcCache.scannedAt < 60_000) {
      return this.fallbackPcResources();
    }

    try {
      const [graphics, mem, osInfo] = await Promise.all([
        this.withTimeout(si.graphics(), 1800, { controllers: [] } as any),
        this.withTimeout(si.mem(), 1200, { total: 0 } as any),
        this.withTimeout(si.osInfo(), 1200, { distro: 'Windows', release: '11' } as any)
      ]);
      
      // Filter for discrete GPUs, prefer NVIDIA
      const controllers = graphics.controllers || [];
      
      // Look for NVIDIA discrete GPU first
      const nvidiaGpu = controllers.find((c: any) =>
        (c.vendor.toLowerCase().includes('nvidia') || c.model.toLowerCase().includes('nvidia')) && 
        !c.model.toLowerCase().includes('uhd') &&
        !c.model.toLowerCase().includes('iris')
      );
      
      // If we found an NVIDIA GPU, use it. Otherwise, use the first controller but check if it's actually integrated.
      let gpu = nvidiaGpu;
      if (!gpu) {
        // Try to find any discrete GPU (not Intel UHD/Iris)
        gpu = controllers.find((c: any) =>
          !c.model.toLowerCase().includes('uhd') && 
          !c.model.toLowerCase().includes('iris') &&
          !c.vendor.toLowerCase().includes('intel')
        );
      }
      
      // Final fallback to the first controller
      if (!gpu) gpu = controllers[0];
      
      const next = {
        gpu: gpu?.model || 'NVIDIA RTX 5000A',
        vram: gpu?.vram ? `${(gpu.vram / 1024).toFixed(0)}GB` : '16GB',
        ram: mem.total ? `${(mem.total / (1024 * 1024 * 1024)).toFixed(0)}GB` : this.pcCache.ram,
        os: `${osInfo.distro} ${osInfo.release}`,
        scannedAt: Date.now(),
        approximate: controllers.length === 0
      };
      this.pcCache = next;

      return {
        gpu: next.gpu,
        vram: next.vram,
        ram: next.ram,
        os: next.os,
        approximate: next.approximate
      };
    } catch (error) {
      console.warn('Fast PC capability scan fell back to cached values.');
      return this.fallbackPcResources();
    }
  }

  async getResourceUsage() {
    if (Date.now() - this.resourceCache.scannedAt < 2500) {
      return {
        cpu: this.resourceCache.cpu,
        ram: this.resourceCache.ram,
        gpu: this.resourceCache.gpu,
        gpuModel: this.resourceCache.gpuModel
      };
    }

    try {
      const [cpuLoad, mem] = await Promise.all([
        this.withTimeout(si.currentLoad(), 900, { currentLoad: this.resourceCache.cpu } as any),
        this.withTimeout(si.mem(), 900, { active: 0, total: 0 } as any)
      ]);

      const next = {
        cpu: Math.round(cpuLoad.currentLoad),
        ram: mem.total ? Math.round((mem.active / mem.total) * 100) : this.resourceCache.ram,
        gpu: this.resourceCache.gpu || 0,
        gpuModel: this.pcCache.gpu,
        scannedAt: Date.now()
      };

      this.resourceCache = next;
      return {
        cpu: next.cpu,
        ram: next.ram,
        gpu: next.gpu,
        gpuModel: next.gpuModel
      };
    } catch (error) {
      return {
        cpu: this.resourceCache.cpu,
        ram: this.resourceCache.ram,
        gpu: this.resourceCache.gpu,
        gpuModel: this.pcCache.gpu
      };
    }
  }

  async pullOllamaModel(name: string, onProgress?: (status: string, percent: number) => void) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/pull`, { name }, { responseType: 'stream' });
      
      // In Electron main process, we'd handle the stream and send events to renderer
      // This is a simplified version for the logic
      return response.data;
    } catch (error) {
      console.error('Failed to pull Ollama model:', error);
      throw error;
    }
  }

  async chatWithOllama(model: string, messages: any[]) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/chat`, {
        model,
        messages,
        stream: false
      }, { timeout: 30000 }); // 30s timeout
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        const installed = await this.listOllamaModels();
        const installedList = installed.map(m => m.name).join(', ');
        console.warn(`Ollama model not found: ${model}`);
        return {
          message: {
            content: installedList
              ? `Model "${model}" is not installed in Ollama. Choose one of the installed models: ${installedList}.`
              : `Model "${model}" is not installed in Ollama. Open Model Hub and download a model, or run "ollama pull ${model}".`
          }
        };
      }
      console.error('Ollama chat error:', error.message);
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
        return { message: { content: 'Error: Ollama is not running. Please start Ollama and try again.' } };
      }
      return { message: { content: `Ollama error: ${error.message}` } };
    }
  }

  async chatWithLMStudio(model: string, messages: any[]) {
    try {
      const response = await axios.post(`${this.lmStudioUrl}/chat/completions`, {
        model: model || 'local-model',
        messages,
        stream: false
      }, { timeout: 45000 }); // Increased timeout
      return { content: response.data.choices[0].message.content };
    } catch (error: any) {
      console.error('LM Studio chat error:', error.message);
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
        return { content: 'Error: LM Studio is not running. Please start LM Studio and ensure "Local Server" is ON.' };
      }
      if (error.code === 'ECONNABORTED') {
        return { content: 'Error: LM Studio connection timed out. The model might be too large for your VRAM or the server is busy.' };
      }
      return { content: `LM Studio error: ${error.message}` };
    }
  }

  async chatWithJan(model: string, messages: any[]) {
    try {
      const response = await axios.post(`${this.janUrl}/chat/completions`, {
        model: this.activeJanModel || model || 'llama-3-8b-q4',
        messages,
        stream: false
      }, { timeout: 45000 }); // Increased timeout
      return { content: response.data.choices[0].message.content };
    } catch (error: any) {
      console.error('Jan chat error:', error.message);
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
        return { content: 'Jan/TurboQuant engine is not running. Open Model Hub and press Start Jan, then load a downloaded model.' };
      }
      if (error.code === 'ECONNABORTED') {
        return { content: 'Error: Jan connection timed out. Please check if the model is loaded correctly in Jan.' };
      }
      if (error.response?.status === 404) {
        return { content: `Jan could not find "${model}". Load it from Model Hub first, or import the downloaded GGUF from the Aion model library into Jan once.` };
      }
      return { content: `Jan/TurboQuant error: ${error.message}` };
    }
  }

  async checkLMStudio() {
    try {
      const response = await axios.get(`${this.lmStudioUrl}/models`, { timeout: 2000 });
      return response.data;
    } catch (error) {
      return null;
    }
  }
}
