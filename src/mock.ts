import { getTemplates } from '../electron/docs';
import type { Api, Article, Country, LegalCase, Settings } from './api';

const SETTINGS_KEY = 'nl-settings';
const CASES_KEY = 'nl-cases';

const defaults: Settings = {
  baseUrl: 'http://127.0.0.1:11434/v1',
  model: 'llama3.1',
  apiKey: '',
  temperature: 0.25,
  theme: 'midnight',
  channel: 'stable',
  language: 'ru',
  feedUrl: '',
  autoUpdate: true,
  answerLanguage: 'ru',
  country: 'ALL'
};

const packs = async () => {
  const files = ['/resources/laws/ru-civil.json', '/resources/laws/ru-legal.json', '/resources/laws/world.json'];
  const articles: Article[] = [];
  const countries: Country[] = [];
  for (const file of files) {
    try {
      const response = await fetch(file);
      if (!response.ok) continue;
      const pack = (await response.json()) as { articles?: Article[]; countries?: Country[] };
      for (const country of pack.countries ?? []) countries.push(country);
      for (const article of pack.articles ?? []) articles.push(article);
    } catch {
      /* pack unavailable */
    }
  }
  return { articles, countries };
};

let cache: Awaited<ReturnType<typeof packs>> | null = null;
const data = async () => (cache ??= await packs());

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

export function createMockApi(): Api {
  let settings: Settings = { ...defaults, ...readJson<Partial<Settings>>(SETTINGS_KEY, {}) };
  let cases: LegalCase[] = readJson<LegalCase[]>(CASES_KEY, []);

  return {
    info: async () => ({ version: '1.0.0', platform: 'web', userData: 'browser preview', packaged: false, shots: false, electron: 'web', repo: { owner: 'roma1231jjj-cpu', repo: 'nexus-lawyer' } }),
    getSettings: async () => settings,
    saveSettings: async (patch) => {
      settings = { ...settings, ...patch };
      writeJson(SETTINGS_KEY, settings);
      return settings;
    },
    models: async () => ({ models: [], ok: false, error: 'browser preview' }),
    chat: async () => ({ text: '', sources: [], mode: 'offline' }),
    stop: async () => true,
    onChunk: () => () => undefined,
    lawsOverview: async () => {
      const { articles, countries } = await data();
      const counts: Record<string, { name: string; flag: string; count: number }> = {};
      for (const country of countries) counts[country.code] = { name: country.name, flag: country.flag, count: 0 };
      for (const article of articles) if (counts[article.country]) counts[article.country].count++;
      return { countries, counts, total: { articles: articles.length, countries: countries.length } };
    },
    lawsSearch: async ({ query, country }) => {
      const { articles } = await data();
      const needle = query.trim().toLowerCase();
      if (needle.length < 3) return { hits: [], total: 0, truncated: false };
      const matched = articles
        .filter((article) => (country && country !== 'ALL' ? article.country === country : true))
        .filter((article) => `${article.code} ${article.number} ${article.title}`.toLowerCase().includes(needle));
      return {
        hits: matched.slice(0, 40).map((article, index) => ({ article, score: 1 - index / 100 })),
        total: matched.length,
        truncated: matched.length > 40
      };
    },
    lawsPacks: async () => [],
    lawsPackRemove: async () => ({ ok: false }),
    lawsCountry: async (country) => {
      const { articles } = await data();
      const list = country === 'ALL' ? articles : articles.filter((article) => article.country === country);
      const codes = new Map<string, { code: string; short: string; count: number }>();
      for (const article of list) {
        const entry = codes.get(article.code) ?? { code: article.code, short: article.codeShort, count: 0 };
        entry.count++;
        codes.set(article.code, entry);
      }
      return { articles: list, codes: [...codes.values()] };
    },
    lawsImport: async () => ({ imported: 0, skipped: 0, failed: 0, canceled: false, files: [] }),
    chatHistory: async () => [],
    saveChat: async () => true,
    clearChat: async () => true,
    caseNote: async (id, text) => {
      const found = cases.find((entry) => entry.id === id);
      if (!found) return { ok: false, error: 'not found' };
      const next = { ...found, notes: [...found.notes, { id: String(Date.now()), text, createdAt: new Date().toISOString() }] };
      cases = cases.map((entry) => (entry.id === id ? next : entry));
      writeJson(CASES_KEY, cases);
      return { ok: true, item: next };
    },
    cases: async () => cases,
    saveCase: async (item) => {
      const next = { ...item, updatedAt: new Date().toISOString() };
      const index = cases.findIndex((entry) => entry.id === item.id);
      cases = index >= 0 ? cases.map((entry) => (entry.id === item.id ? next : entry)) : [next, ...cases];
      writeJson(CASES_KEY, cases);
      return { ok: true, item: next };
    },
    deleteCase: async (id) => {
      cases = cases.filter((entry) => entry.id !== id);
      writeJson(CASES_KEY, cases);
      return { ok: true };
    },
    attach: async (id) => {
      const found = cases.find((entry) => entry.id === id);
      return { ok: Boolean(found), files: found?.files ?? [], canceled: false };
    },
    removeCaseFile: async (id, target) => {
      const found = cases.find((entry) => entry.id === id);
      if (!found) return { ok: false, error: 'not found' };
      const next = { ...found, files: found.files.filter((file) => file.path !== target) };
      cases = cases.map((entry) => (entry.id === id ? next : entry));
      writeJson(CASES_KEY, cases);
      return { ok: true, item: next };
    },
    openFile: async () => ({ ok: false, error: 'browser preview' }),
    revealCase: async () => ({ ok: false, error: 'browser preview' }),
    openDataFolder: async () => true,
    templates: async () => getTemplates(document.documentElement.lang === 'en' ? 'en' : 'ru'),
    exportDoc: async () => ({ saved: false }),
    localVersions: async () => [],
    remoteVersions: async () => ({ ok: false, items: [], error: 'browser preview' }),
    checkUpdate: async () => ({ stage: 'dev', message: 'browser preview' }),
    downloadUpdate: async () => ({ stage: 'dev', message: 'browser preview' }),
    installUpdate: async () => ({ ok: false, portable: false, message: 'browser preview' }),
    updateStatus: async () => ({ stage: 'idle' }),
    onUpdate: () => () => undefined,
    open: async (url) => {
      window.open(url, '_blank', 'noopener');
      return true;
    },
    minimize: async () => undefined,
    maximize: async () => undefined,
    close: async () => undefined
  };
}
