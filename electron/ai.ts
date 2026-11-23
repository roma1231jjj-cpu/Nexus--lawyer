import type { Article, Laws } from './laws';
import type { Settings } from './store';
import { resolveLang, tr, type Lang } from './i18n';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type Source = { id: string; code: string; number: string; title: string; country: string; text: string };

const trim = (value: string, max: number) => (value.length > max ? value.slice(0, max) + '…' : value);

export function buildSources(query: string, country: string, laws: Laws, limit = 5): Source[] {
  const hits = laws.search(query, country, limit + 3);
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
    .map((source, i) => `[${i + 1}] ${source.code}, ${source.number}. ${source.title}\n${trim(source.text, 1400)}`)
    .join('\n\n');

  return [
    tr(lang, 'prompt.role'),
    tr(lang, language === 'en' ? 'prompt.answerEn' : language === 'de' ? 'prompt.answerDe' : 'prompt.answerRu'),
    countryName ? tr(lang, 'prompt.country', { country: countryName, code: country ?? '' }) : '',
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
    .map((source, i) => `- **[${i + 1}] ${source.code}, ${source.number}. ${source.title}** — ${trim(source.text.replace(/\s+/g, ' '), 320)}`)
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

export async function streamChat(options: {
  settings: Settings;
  messages: ChatMessage[];
  signal: AbortSignal;
  onDelta: (delta: string) => void;
}): Promise<{ text: string; error?: string }> {
  const { settings, messages, signal, onDelta } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

  let response: Response;
  try {
    response = await fetch(`${openAiBase(settings.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream: true,
        temperature: settings.temperature
      })
    });
  } catch (error) {
    return { text: '', error: error instanceof Error ? error.message : tr(resolveLang(settings.language), 'ai.noConnection') };
  }

  if (!response.ok || !response.body) {
    const detail = response.body ? await response.text().catch(() => '') : '';
    return { text: '', error: `HTTP ${response.status} ${trim(detail, 200)}` };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
          message?: { content?: string };
          response?: string;
        };
        const delta = chunk.choices?.[0]?.delta?.content ?? chunk.message?.content ?? chunk.response ?? '';
        if (delta) {
          text += delta;
          onDelta(delta);
        }
      } catch {
        continue;
      }
    }
  }

  return { text };
}

export function describeArticle(article: Article) {
  return `${article.code}, ${article.number} "${article.title}"`;
}
