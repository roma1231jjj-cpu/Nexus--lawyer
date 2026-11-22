import type { Article, Laws } from './laws';
import type { Settings } from './store';

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
  const context = sources
    .map((source, i) => `[${i + 1}] ${source.code}, ${source.number}. ${source.title}\n${trim(source.text, 1400)}`)
    .join('\n\n');

  return [
    'Ты Nexus-Юрист — правовой помощник экосистемы Nexus × АутSquad.',
    `Отвечай на языке: ${language === 'en' ? 'английский' : language === 'de' ? 'немецкий' : 'русский'}.`,
    countryName ? `Правовая система по умолчанию: ${countryName} (${country}).` : '',
    'Структура ответа: короткий вывод, затем правовое обоснование со ссылками на нормы, затем практические шаги и риски.',
    'Ссылайся на выдержки из базы как [1], [2]. Не выдумывай номера статей: если нормы нет в выдержках, прямо скажи, что нужно проверить актуальную редакцию.',
    'В конце добавь строку: «Это справочная информация, а не юридическая помощь».',
    context ? `Выдержки из базы законов:\n${context}` : 'Выдержек из базы по запросу нет — отвечай общими принципами и предупреди о необходимости проверки нормы.',
    'Пиши плотно, без воды, до 350 слов. Форматирование: markdown, короткие абзацы, списки где уместно.'
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function offlineAnswer(query: string, sources: Source[], countryName: string | undefined) {
  const head = `**Справочный режим** (модель не подключена). Запрос: «${trim(query, 160)}».`;
  if (!sources.length) {
    return `${head}\n\nВ локальной базе нет норм под этот запрос. Подключите модель в «Настройках» (Ollama, llama.cpp или любой OpenAI-совместимый сервер) либо импортируйте свой пакет законов в «Законах».\n\nЭто справочная информация, а не юридическая помощь.`;
  }
  const body = sources
    .map((source, i) => `- **[${i + 1}] ${source.code}, ${source.number}. ${source.title}** — ${trim(source.text.replace(/\s+/g, ' '), 320)}`)
    .join('\n');
  return `${head}\n\n${countryName ? `Правовая система: ${countryName}.\n\n` : ''}Найденные нормы:\n${body}\n\n**Что делать:** уточните фактический состав (кто, когда, какие документы), затем сверьте редакцию нормы на официальном портале. Для расчёта сроков и сумм используйте раздел «Документы».\n\nЭто справочная информация, а не юридическая помощь.`;
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
    throw new Error('Пустой список моделей');
  } catch (error) {
    const root = base.replace(/\/v1$/, '');
    try {
      const response = await fetch(`${root}/api/tags`, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { models?: { name: string }[] };
      const models = (data.models ?? []).map((item) => item.name).filter(Boolean);
      return { models, ok: true };
    } catch {
      return { models: [], ok: false, error: error instanceof Error ? error.message : 'Нет связи с моделью' };
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
    return { text: '', error: error instanceof Error ? error.message : 'Нет соединения с моделью' };
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
        /* неполный чанк — пропускаем */
      }
    }
  }

  return { text };
}

export function describeArticle(article: Article) {
  return `${article.code}, ${article.number} «${article.title}»`;
}
