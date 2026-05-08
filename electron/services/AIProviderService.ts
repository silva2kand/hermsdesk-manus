import axios from 'axios';
import Store from 'electron-store';
import electron from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const { app, shell } = electron;

export interface HFModel {
  id: string;
  name: string;
  downloads: number;
  likes: number;
}

export class AIProviderService {
  private store: any;
  private connectorsState: {[key: string]: boolean} = {};
  private modelsPath: string;
  private hfMetadataTimeoutMs = 10000;
  private hfDownloadTimeoutMs = 30000;

  constructor(sharedStore?: any) {
    // Use the main store passed from main.ts
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
    
    // Create models directory first
    this.modelsPath = path.join(app.getPath('userData'), 'models');
    if (!fs.existsSync(this.modelsPath)) {
      fs.mkdirSync(this.modelsPath, { recursive: true });
    }

    // Initialize in-memory state from store (which now has defaults)
    this.connectorsState = this.store.get('connectors');
  }

  getModelsPath() {
    return this.modelsPath;
  }

  private getModelLibraryPaths() {
    const candidates = [
      this.modelsPath,
      path.join(app.getPath('appData'), 'hermsdeskapp', 'models'),
      path.join(app.getPath('appData'), 'HermsDesk', 'models'),
      path.join(app.getPath('appData'), 'aion-os', 'models'),
      path.join(process.cwd(), 'models')
    ];
    return [...new Set(candidates.map(folder => path.resolve(folder)))];
  }

  async listLibraryModels() {
    const allModels: any[] = [];
    const seen = new Set<string>();
    for (const libraryPath of this.getModelLibraryPaths()) {
      if (!fs.existsSync(libraryPath)) continue;
      const files = await fs.promises.readdir(libraryPath, { withFileTypes: true });
      const models = await Promise.all(files
        .filter(file => file.isFile() && /\.(gguf|bin|safetensors)$/i.test(file.name))
        .map(async file => {
        const fullPath = path.join(libraryPath, file.name);
        const stats = await fs.promises.stat(fullPath);
        if (stats.size < 1024 * 1024) return null;
        const key = path.resolve(fullPath).toLowerCase();
        if (seen.has(key)) return null;
        seen.add(key);
        const metadata = this.store.get(`models.${file.name}`, {}) as any;
        const name = metadata.name || file.name.replace(/\.(gguf|bin|safetensors)$/i, '');

        return {
          id: file.name,
          name,
          provider: 'Jan',
          path: fullPath,
          size: stats.size,
          status: 'installed',
          description: metadata.description || 'Downloaded model in the Aion local library',
          quantization: metadata.quantization || this.detectQuantization(file.name),
          tags: metadata.tags || ['Library', 'Jan', 'TurboQuant'],
          vramRequired: metadata.vramRequired || 'Auto',
          libraryPath
        };
      }));
      allModels.push(...models.filter(Boolean));
    }
    return allModels.sort((a, b) => {
      const score = (model: any) => /qwen/i.test(model.name) ? 0 : /phi/i.test(model.name) ? 1 : 2;
      return score(a) - score(b) || String(a.name).localeCompare(String(b.name));
    });
  }

  async deleteLibraryModel(modelId: string) {
    const safeName = path.basename(modelId);
    const fullPath = path.join(this.modelsPath, safeName);
    const resolved = path.resolve(fullPath);
    const root = path.resolve(this.modelsPath);

    if (!resolved.startsWith(root + path.sep)) {
      throw new Error('Refusing to delete a file outside the model library');
    }

    await fs.promises.unlink(resolved);
    this.store.delete(`models.${safeName}`);
    return true;
  }

  async revealModelsFolder() {
    await shell.openPath(this.modelsPath);
    return true;
  }

  private detectQuantization(fileName: string) {
    const match = fileName.match(/(?:^|[-_.])(Q\d(?:_[KMS])?)(?:[-_.]|$)/i);
    return match ? match[1].toUpperCase() : 'Standard';
  }

  // Connectors State Management
  async getConnectorsState() {
    // If we have a lot of connectors, it's better to just return the state
    // and let the UI handle defaults.
    // However, to fix the user's "NOT CONNECTED" issue, we will mark ALL known 
    // connectors as true if they haven't been explicitly disabled.
    
    const saved = this.store.get('connectors', {});
    
    // We'll trust the store, but if it's empty, we'll initialize with 'true' for everything
    // that might be in the connectorsData list.
    return saved;
  }

  async toggleConnector(id: string, state: boolean) {
    const current = this.store.get('connectors', {}) as {[key: string]: boolean};
    current[id] = state;
    this.store.set('connectors', current);
    this.connectorsState = current;
    return current;
  }

  // Free Tier / API Providers
  async connectWithGoogle() {
    return {
      success: false,
      provider: 'google',
      error: 'Google OAuth is not configured in this build. Save a Gemini API key for Gemini, or add a Google OAuth client before Gmail/Drive/Calendar can read private data.',
      authRequired: true
    };
  }

  // API Key Management
  async saveAPIKey(provider: string, key: string) {
    this.store.set(`api-keys.${provider}`, key);
    return true;
  }

  async getAPIKeys() {
    return this.store.get('api-keys', {}) as {[key: string]: string};
  }

  getKnowledge() {
    return this.store.get('knowledge', []);
  }

  queryKnowledge(query: string) {
    const knowledge = this.getKnowledge();
    const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 3);
    const results = knowledge.map((item: any) => {
      const itemTokens = (item.title + ' ' + item.desc + ' ' + (item.rules || '')).toLowerCase().split(/\W+/);
      let score = 0;
      queryTokens.forEach(t => {
        if (itemTokens.includes(t)) score++;
      });
      return { ...item, score };
    }).filter((r: any) => r.score > 0).sort((a: any, b: any) => b.score - a.score);

    return results.slice(0, 3);
  }

  saveKnowledge(knowledge: any) {
    this.store.set('knowledge', knowledge);
    return true;
  }

  async chatGemini(apiKey: string, messages: any[], model = 'gemini-2.5-flash') {
    try {
      const targetModel = String(model || 'gemini-2.5-flash').replace(/^models\//, '');
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      });
      return response.data;
    } catch (e: any) {
      const message = e?.response?.data?.error?.message || e?.message || 'Gemini error';
      return { content: `Gemini error: ${message}` };
    }
  }

  async chatNvidiaNIM(apiKey: string, model: string, messages: any[]) {
    try {
      // NVIDIA NIM Free Tier Models
      const freeModels = [
        "meta/llama-3.1-405b-instruct",
        "meta/llama-3.1-70b-instruct",
        "meta/llama-3.1-8b-instruct",
        "mistralai/mistral-7b-instruct-v0.3",
        "google/gemma-2-9b",
        "google/gemma-2-2b"
      ];

      let targetModel = model;
      if (!model || !freeModels.some(m => model.includes(m))) {
        targetModel = "meta/llama-3.1-8b-instruct";
      }

      console.log(`Routing to NVIDIA NIM Free: ${targetModel}`);

      const response = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
        model: targetModel,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.5,
        top_p: 1,
        max_tokens: 1024,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('NVIDIA NIM error:', error.response?.data || error.message);
      throw error;
    }
  }

  async chatOpenRouter(apiKey: string, model: string, messages: any[]) {
    try {
      // Popular free models on OpenRouter
      const freeModels = [
        "openai/gpt-oss-20b:free",
        "openai/gpt-oss-120b:free",
        "google/gemma-4-26b-a4b-it:free",
        "minimax/minimax-m2.5:free",
        "qwen/qwen3-next-80b-a3b-instruct:free",
        "nvidia/nemotron-3-nano-30b-a3b:free"
      ];
      
      let targetModel = model;
      if (!model || !model.includes(':free')) {
        targetModel = "openai/gpt-oss-20b:free";
      }

      console.log(`Routing to OpenRouter Free: ${targetModel}`);

      // Filter messages to ensure they are valid
      const cleanMessages = messages
        .filter(m => m.role && m.content && m.content.trim() !== '')
        .map(m => ({ role: m.role, content: m.content }));

      if (cleanMessages.length === 0) {
        throw new Error("No valid messages to send to OpenRouter.");
      }

      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: targetModel,
        messages: cleanMessages,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://hermesdesk.app',
          'X-Title': 'HermesDesk ME'
        },
        timeout: 90000
      });
      return response.data;
    } catch (error: any) {
      console.error('OpenRouter error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Hugging Face Integration
  async searchHuggingFace(query: string) {
    try {
      const response = await axios.get(`https://huggingface.co/api/models?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=10&full=true`, {
        timeout: this.hfMetadataTimeoutMs
      });
      return response.data.map((m: any) => {
        // Try to find a GGUF file or just use the first sibling's size as an estimate
        const ggufFiles = (m.siblings || []).filter((s: any) => s.rfilename?.toLowerCase().endsWith('.gguf'));
        const ggufFile = ggufFiles.sort((a: any, b: any) => this.scoreGgufName(b.rfilename) - this.scoreGgufName(a.rfilename))[0];
        const size = ggufFile?.size || m.siblings?.[0]?.size || 0;

        if (m.modelId && ggufFiles.length > 0) {
          this.store.set(`hf-cache.${m.modelId}`, {
            siblings: ggufFiles,
            cachedAt: new Date().toISOString()
          });
        }
        
        return {
          id: m.modelId,
          name: m.modelId,
          downloads: m.downloads,
          tags: m.tags,
          size: size > 0 ? `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'Size unknown'
        };
      });
    } catch (e) {
      return [];
    }
  }

  async downloadHFModel(modelId: string, onProgress?: (p: number) => void) {
    try {
      const safeModelId = modelId.split('/').map(part => encodeURIComponent(part)).join('/');
      const modelInfo = await this.getHFModelInfo(safeModelId, modelId);
      const siblings = modelInfo?.siblings || [];
      const gguf = siblings
        .filter((s: any) => typeof s.rfilename === 'string' && s.rfilename.toLowerCase().endsWith('.gguf'))
        .sort((a: any, b: any) => this.scoreGgufName(b.rfilename) - this.scoreGgufName(a.rfilename))[0];

      if (!gguf?.rfilename) {
        throw new Error(`No GGUF file was found for ${modelId}. Try a GGUF model repository.`);
      }

      const fileName = `${modelId.replace(/\//g, '_')}__${path.basename(gguf.rfilename)}`;
      const filePath = path.join(this.modelsPath, fileName);

      const safeFilePath = gguf.rfilename.split('/').map((part: string) => encodeURIComponent(part)).join('/');
      const url = `https://huggingface.co/${safeModelId}/resolve/main/${safeFilePath}`;
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: this.hfDownloadTimeoutMs,
        maxRedirects: 5
      });

      const total = Number(response.headers['content-length'] || gguf.size || 0);
      let downloaded = 0;

      await new Promise<void>((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);

        response.data.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (total > 0 && onProgress) {
            onProgress(Math.min(99, Math.floor((downloaded / total) * 100)));
          }
        });

        response.data.on('error', reject);
        writer.on('error', reject);
        writer.on('finish', resolve);
        response.data.pipe(writer);
      });

      this.store.set(`models.${fileName}`, {
        name: modelId,
        source: 'Hugging Face',
        file: gguf.rfilename,
        description: `Downloaded from Hugging Face: ${gguf.rfilename}`,
        quantization: this.detectQuantization(gguf.rfilename),
        tags: ['Library', 'Jan', 'TurboQuant', 'GGUF'],
        downloadedAt: new Date().toISOString()
      });

      if (onProgress) onProgress(100);
      return filePath;
    } catch (e) {
      throw this.toUserFacingDownloadError(e, modelId);
    }
  }

  private async getHFModelInfo(safeModelId: string, modelId: string) {
    try {
      const response = await axios.get(`https://huggingface.co/api/models/${safeModelId}?full=true`, {
        timeout: this.hfMetadataTimeoutMs
      });

      if (response.data?.siblings?.length) {
        this.store.set(`hf-cache.${modelId}`, {
          siblings: response.data.siblings,
          cachedAt: new Date().toISOString()
        });
      }

      return response.data;
    } catch (error) {
      const cached = this.store.get(`hf-cache.${modelId}`) as any;
      if (cached?.siblings?.length) {
        return { siblings: cached.siblings };
      }
      throw error;
    }
  }

  private toUserFacingDownloadError(error: any, modelId: string) {
    if (error?.code === 'ECONNABORTED') {
      return new Error(`Hugging Face was too slow to respond for ${modelId}. Search for the model first, then try Download again, or try a smaller GGUF model.`);
    }

    if (error?.response?.status === 404) {
      return new Error(`Hugging Face could not find ${modelId}. Try another GGUF model.`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(`Download failed for ${modelId}.`);
  }

  private scoreGgufName(fileName: string) {
    const name = fileName.toLowerCase();
    if (name.includes('q4_k_m')) return 60;
    if (name.includes('q5_k_m')) return 55;
    if (name.includes('q4')) return 50;
    if (name.includes('q6')) return 40;
    if (name.includes('q8')) return 30;
    return 10;
  }
}
