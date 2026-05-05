import axios from 'axios';
import { EventBusService } from './EventBusService';

export class SilvaWebResearchService {
  constructor(private eventBus: EventBusService) {}

  async search(query: string, sessionId = `research-${Date.now()}`) {
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) return { ok: false, error: 'Search query is empty', results: [] };

    const startedAt = Date.now();
    this.eventBus.emit('search.query', 'silva-web', {
      query: cleanQuery,
      engine: 'duckduckgo-html',
      cache: 'none'
    }, sessionId);

    try {
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
      const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'HermesDesk-ME/1.8 local research' }
      });
      const results: any[] = [];
      const blocks = String(response.data).split(/<div class="result results_links/).slice(1, 9);
      blocks.forEach((block, index) => {
        const href = this.decodeHtml((block.match(/class="result__a"[^>]+href="([^"]+)"/) || [])[1] || '');
        const rawTitle = (block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '';
        const rawSnippet = (block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) || block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
        const title = this.textFromHtml(rawTitle);
        const snippet = this.textFromHtml(rawSnippet);
        const result = {
          rank: index + 1,
          title,
          url: href,
          snippet,
          status: response.status,
          score: Math.max(1, 100 - index * 8)
        };
        if (title || href || snippet) {
          results.push(result);
          this.eventBus.emit('search.result', 'silva-web', {
            query: cleanQuery,
            ...result,
            crawlDepth: 1,
            crawlMs: Date.now() - startedAt,
            cacheHit: false
          }, sessionId);
        }
      });

      this.eventBus.emit('tool.result', 'silva-web', {
        tool: 'silva.search_web',
        query: cleanQuery,
        resultCount: results.length,
        durationMs: Date.now() - startedAt
      }, sessionId);

      return { ok: true, query: cleanQuery, engine: 'duckduckgo-html', status: response.status, results, durationMs: Date.now() - startedAt, sessionId };
    } catch (error: any) {
      this.eventBus.emit('tool.result', 'silva-web', {
        tool: 'silva.search_web',
        query: cleanQuery,
        error: error?.message || 'Search failed',
        durationMs: Date.now() - startedAt
      }, sessionId);
      return { ok: false, query: cleanQuery, error: error?.message || 'Search failed', results: [], sessionId };
    }
  }

  private textFromHtml(value: string) {
    return this.decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }

  private decodeHtml(value: string) {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
}
