import axios from 'axios';
import Store from 'electron-store';
import fs from 'node:fs';
import path from 'node:path';
import { app, shell } from 'electron';

export interface HFModel {
  id: string;
  name: string;
  downloads: number;
  likes: number;
}

export class AIProviderService {
  private store = new Store() as any;
  private connectorsState: {[key: string]: boolean} = {};
  private modelsPath: string;
  private hfMetadataTimeoutMs = 60000;
  private hfDownloadTimeoutMs = 120000;

  constructor() {
    const defaultConnectors = {
      'my-browser': true,
      'ollama': true,
      'lm-studio': true,
      'google-gemini': true,
      'openrouter': true
    };
    this.connectorsState = {
      ...defaultConnectors,
      ...(this.store.get('connectors', {}) as any)
    };
    this.store.set('connectors', this.connectorsState);
    
    // Create models directory in app data
    this.modelsPath = path.join(app.getPath('userData'), 'models');
    if (!fs.existsSync(this.modelsPath)) {
      fs.mkdirSync(this.modelsPath, { recursive: true });
    }
  }

  getModelsPath() {
    return this.modelsPath;
  }

  async listLibraryModels() {
    const files = await fs.promises.readdir(this.modelsPath, { withFileTypes: true });
    return Promise.all(files
      .filter(file => file.isFile() && /\.(gguf|bin|safetensors)$/i.test(file.name))
      .map(async file => {
        const fullPath = path.join(this.modelsPath, file.name);
        const stats = await fs.promises.stat(fullPath);
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
          vramRequired: metadata.vramRequired || 'Auto'
        };
      }));
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
    return match ? match[1].toUpperCase() : 'Detected';
  }

  // Connectors State Management
  async toggleConnector(id: string, state: boolean) {
    this.connectorsState[id] = state;
    this.store.set('connectors', this.connectorsState);
    return this.connectorsState;
  }

  async getConnectorsState() {
    return this.connectorsState;
  }

  // Free Tier / API Providers
  async connectWithGoogle() {
    // Logic for real Google Auth could be added here
    this.connectorsState['google-account'] = true;
    this.store.set('connectors', this.connectorsState);
    return { success: true, email: 'silvak2023@outlook.com' };
  }

  // API Key Management
  async saveAPIKey(provider: string, key: string) {
    this.store.set(`api-keys.${provider}`, key);
    return true;
  }

  async getAPIKeys() {
    return this.store.get('api-keys', {}) as {[key: string]: string};
  }

  async chatGemini(apiKey: string, messages: any[]) {
    // Implementation for Google Gemini API
    try {
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      });
      return response.data;
    } catch (e) {
      return { content: "Gemini error - check API key" };
    }
  }

  async chatNvidiaNIM(apiKey: string, model: string, messages: any[]) {
    try {
      const response = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
        model: model || "meta/llama3-70b-instruct",
        messages,
        temperature: 0.5,
        top_p: 1,
        max_tokens: 1024,
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.data;
    } catch (e) {
      console.error('NVIDIA NIM error', e);
      throw e;
    }
  }

  async chatOpenRouter(apiKey: string, model: string, messages: any[]) {
    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: model || "meta-llama/llama-3-8b-instruct",
        messages,
      }, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/Silva-K/hermsdeskapp',
          'X-Title': 'HermsDesk'
        }
      });
      return response.data;
    } catch (e) {
      console.error('OpenRouter error', e);
      throw e;
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
