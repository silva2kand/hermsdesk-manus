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
  private baseUrl = 'https://agent.tinyfish.ai/v1';

  constructor(sharedStore?: any) {
    this.store = sharedStore || new Store({ name: 'config', atomically: false, watch: false });
    this.apiKey = this.store.get('tinyFishApiKey', '');
  }

  setApiKey(key: string) {
    this.apiKey = key;
    this.store.set('tinyFishApiKey', key);
    return this.getApiStatus();
  }

  getApiStatus() {
    return {
      configured: Boolean(this.apiKey),
      keyPrefix: this.apiKey ? `${this.apiKey.slice(0, 10)}...` : '',
      baseUrl: this.baseUrl
    };
  }

  async runAgent(options: TinyFishAgentOptions) {
    if (!this.apiKey) {
      throw new Error('TinyFish AI API Key not set.');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/automation/run`, {
        url: options.url,
        goal: options.task,
        browser_profile: 'lite'
      }, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      });

      return {
        ok: true,
        sessionId: response.data.run_id,
        status: response.data.status,
        result: response.data.result,
        streamingUrl: response.data.streaming_url,
        steps: response.data.steps || []
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
      const response = await axios.get(`${this.baseUrl}/runs/${sessionId}`, {
        headers: { 'X-API-Key': this.apiKey },
        timeout: 30000
      });
      return response.data;
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }
}
