import Store from 'electron-store';
import axios from 'axios';

export interface TinyFishAgentOptions {
  url: string;
  task: string;
  model?: string;
  maxSteps?: number;
}

export class TinyFishService {
  private store: any;
  private apiKey: string;
  private baseUrl = 'https://api.tinyfish.ai/v1';

  constructor(sharedStore?: any) {
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
    this.apiKey = this.store.get('tinyFishApiKey', '');
  }

  setApiKey(key: string) {
    this.apiKey = key;
    this.store.set('tinyFishApiKey', key);
  }

  async runAgent(options: TinyFishAgentOptions) {
    if (!this.apiKey) {
      throw new Error('TinyFish AI API Key not set.');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/agents/run`, {
        url: options.url,
        instruction: options.task,
        model: options.model || 'gpt-4o', // TinyFish usually wraps an LLM
        max_steps: options.maxSteps || 10
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        ok: true,
        sessionId: response.data.session_id,
        status: response.data.status,
        result: response.data.result
      };
    } catch (error: any) {
      console.error('TinyFish Agent execution failed:', error.response?.data || error.message);
      return {
        ok: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getSessionStatus(sessionId: string) {
    if (!this.apiKey) throw new Error('TinyFish AI API Key not set.');

    try {
      const response = await axios.get(`${this.baseUrl}/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return response.data;
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }
}
