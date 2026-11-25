import type { Article, Laws } from './laws';
import type { Settings } from './store';
import { resolveLang, tr, type Lang } from './i18n';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type Source = { id: string; code: string; number: string; title: string; country: string; text: string };

const trim = (value: string, max: number) => (value.length > max ? value.slice(0, max) + '…' : value);

export function buildSources(query: string, country: string, laws: Laws, limit = 5): Source[] {
  const hits = laws.search(query, country, limit + 3).hits;
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const hit of hits) {
    if (seen.has(hit.article.id)) continue;
    seen.add(hit.article.id);
    sources.push({
      id: hit.article.id,
      code: hit.article.code,
      number: hit.article.number,
      title: hit.article.title,
      country: hit.article.country,
      text: hit.article.text
    });
    if (sources.length >= limit) break;
  }
  return sources;
}

export function buildSystemPrompt(sources: Source[], country: string | undefined, countryName: string | undefined, language: string) {
  const lang = resolveLang(language);
  const context = sources
    .map((source, i) => `[${i + 1}] (${source.country}) ${source.code}, ${source.number}. ${source.title}\n${trim(source.text, 1400)}`)
    .join('\n\n');
  const jurisdictions = [...new Set(sources.map((source) => source.country))];

  return [
    tr(lang, 'prompt.role'),
    tr(lang, language === 'en' ? 'prompt.answerEn' : language === 'de' ? 'prompt.answerDe' : 'prompt.answerRu'),
    countryName ? tr(lang, 'prompt.country', { country: countryName, code: country ?? '' }) : '',
    !countryName && jurisdictions.length ? `Jurisdictions in the retrieved norms: ${jurisdictions.join(', ')}.` : '',
    tr(lang, 'prompt.structure'),
    tr(lang, 'prompt.cite'),
    tr(lang, 'prompt.disclaimer'),
    context ? tr(lang, 'prompt.context', { context }) : tr(lang, 'prompt.noContext'),
    tr(lang, 'prompt.style')
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function offlineAnswer(query: string, sources: Source[], countryName: string | undefined, language: string) {
  const lang: Lang = resolveLang(language);
  const head = tr(lang, 'offline.head', { query: trim(query, 160) });
  if (!sources.length) {
    return `${head}\n\n${tr(lang, 'offline.noNorms')}\n\n${tr(lang, 'offline.disclaimer')}`;
  }
  const body = sources
    .map(
      (source, i) =>
        `- **[${i + 1}] ${source.code}, ${source.number}. ${source.title}** (${source.country}) — ${trim(
          source.text.replace(/\s+/g, ' '),
          320
        )}`
    )
    .join('\n');
  const system = countryName ? `${tr(lang, 'offline.system', { country: countryName })}\n\n` : '';
  return `${head}\n\n${system}${tr(lang, 'offline.found')}\n${body}\n\n${tr(lang, 'offline.actions')}\n\n${tr(lang, 'offline.disclaimer')}`;
}

const openAiBase = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export async function listModels(settings: Settings): Promise<{ models: string[]; ok: boolean; error?: string }> {
  const base = openAiBase(settings.baseUrl);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
  try {
    const response = await fetch(`${base}/models`, { headers, signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { data?: { id: string }[] };
    const models = (data.data ?? []).map((item) => item.id).filter(Boolean);
    if (models.length) return { models, ok: true };
    throw new Error(tr(resolveLang(settings.language), 'ai.emptyModels'));
  } catch (error) {
    const root = base.replace(/\/v1$/, '');
    try {
      const response = await fetch(`${root}/api/tags`, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { models?: { name: string }[] };
      const models = (data.models ?? []).map((item) => item.name).filter(Boolean);
      return { models, ok: true };
    } catch {
      return { models: [], ok: false, error: error instanceof Error ? error.message : tr(resolveLang(settings.language), 'ai.noLink') };
    }
  }
}

type StreamResult = { text: string; error?: string; cancelled?: boolean };

const IDLE_TIMEOUT = 60_000;

export async function streamChat(options: {
  settings: Settings;
  messages: ChatMessage[];
  signal: AbortSignal;
  onDelta: (delta: string) => void;
}): Promise<StreamResult> {
  const { settings, messages, signal, onDelta } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

  const controller = new AbortController();
  const relay = () => controller.abort();
  if (signal.aborted) relay();
  signal.addEventListener('abort', relay);

  let timer: NodeJS.Timeout | null = null;
  const touch = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), IDLE_TIMEOUT);
  };

  const stop = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    signal.removeEventListener('abort', relay);
  };

  let response: Response;
  touch();
  try {
    response = await fetch(`${openAiBase(settings.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream: true,
        temperature: settings.temperature
      })
    });
  } catch (error) {
    stop();
    if (signal.aborted) return { text: '', cancelled: true };
    return { text: '', error: error instanceof Error ? error.message : tr(resolveLang(settings.language), 'ai.noConnection') };
  }

  if (!response.ok || !response.body) {
    stop();
    const detail = response.body ? await response.text().catch(() => '') : '';
    return { text: '', error: `HTTP ${response.status} ${trim(detail, 200)}` };
  }

  const contentType = response.headers.get('content-type') ?? '';

  // some OpenAI-compatible servers ignore stream:true and answer with plain JSON
  if (!contentType.includes('event-stream')) {
    try {
      const raw = await response.text();
      stop();
      if (raw.trim().startsWith('{')) {
        const data = JSON.parse(raw) as {
          choices?: { message?: { content?: string } }[];
          response?: string;
        };
        const text = data.choices?.[0]?.message?.content ?? data.response ?? '';
        if (text) onDelta(text);
        return text ? { text } : { text: '', error: 'empty answer' };
      }
      if (raw.trim()) {
        onDelta(raw);
        return { text: raw };
      }
      return { text: '', error: 'empty answer' };
    } catch (error) {
      stop();
      return { text: '', error: error instanceof Error ? error.message : 'bad answer' };
    }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  const handlePayload = (payload: string) => {
    if (!payload || payload === '[DONE]') return;
    try {
      const chunk = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
        message?: { content?: string };
        response?: string;
        error?: { message?: string };
      };
      if (chunk.error?.message) return;
      const delta = chunk.choices?.[0]?.delta?.content ?? chunk.message?.content ?? chunk.response ?? '';
      if (delta) {
        text += delta;
        onDelta(delta);
      }
    } catch {
      /* не JSON — пропускаем строку */
    }
  };

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('data:')) handlePayload(trimmed.slice(5).trim());
  };

  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (signal.aborted) return { text, cancelled: true };
        return { text, error: error instanceof Error ? error.message : 'stream broke' };
      }
      if (chunk.done) break;
      touch();
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) handleLine(line);
    }
    buffer += decoder.decode();
    // последний фрагмент может прийти без перевода строки
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      for (const line of lines) handleLine(line);
    }
  } finally {
    stop();
    reader.releaseLock?.();
  }

  if (signal.aborted) return { text, cancelled: true };
  return { text };
}

export function describeArticle(article: Article) {
  return `${article.code}, ${article.number} "${article.title}"`;
}
