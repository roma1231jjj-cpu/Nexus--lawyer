import { createMockApi } from './mock';

export type Theme = 'midnight' | 'ivory' | 'aurum';

export type Settings = {
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  theme: Theme;
  channel: 'stable' | 'beta';
  language: string;
  feedUrl: string;
  autoUpdate: boolean;
  country: string;
};

export type Article = {
  id: string;
  country: string;
  code: string;
  codeShort: string;
  number: string;
  title: string;
  text: string;
  tags?: string[];
};

export type Country = {
  code: string;
  name: string;
  flag: string;
  region: string;
  system: string;
  languages: string;
  note: string;
};

export type Source = Pick<Article, 'id' | 'code' | 'number' | 'title' | 'country' | 'text'>;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: Source[];
  mode?: 'ai' | 'offline';
  error?: string;
  pending?: boolean;
};

export type CaseFile = { name: string; path: string; size: number; addedAt: string };
export type CaseNote = { id: string; text: string; createdAt: string };
export type LegalCase = {
  id: string;
  title: string;
  client: string;
  status: 'open' | 'work' | 'closed';
  country: string;
  summary: string;
  notes: CaseNote[];
  files: CaseFile[];
  createdAt: string;
  updatedAt: string;
};

export type DocField = { key: string; label: string; placeholder?: string; multiline?: boolean };
export type DocTemplate = { id: string; name: string; group: string; summary: string; fields: DocField[]; body: string; law: string };

export type VersionEntry = {
  version: string;
  date: string;
  channel: 'stable' | 'beta';
  changes: string[];
};

export type UpdateStatus = {
  stage: 'idle' | 'checking' | 'available' | 'none' | 'downloading' | 'ready' | 'error' | 'dev';
  version?: string;
  notes?: string;
  percent?: number;
  message?: string;
  releaseDate?: string;
};

export type Api = {
  info(): Promise<{ version: string; platform: string; userData: string; packaged: boolean; electron: string; repo: { owner: string; repo: string } }>;
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
  models(settings?: Settings): Promise<{ models: string[]; ok: boolean; error?: string }>;
  chat(payload: { requestId: string; messages: { role: string; content: string }[]; query: string; country: string; sources?: boolean }): Promise<{ text: string; sources: Source[]; error?: string; mode: 'ai' | 'offline' }>;
  stop(requestId: string): Promise<boolean>;
  onChunk(handler: (payload: { requestId: string; delta: string }) => void): () => void;
  lawsOverview(): Promise<{ countries: Country[]; counts: Record<string, { name: string; flag: string; count: number }>; total: { articles: number; countries: number } }>;
  lawsSearch(payload: { query: string; country?: string }): Promise<{ article: Article; score: number }[]>;
  lawsCountry(country: string): Promise<{ articles: Article[]; codes: { code: string; short: string; count: number }[] }>;
  lawsImport(): Promise<{ imported: number; failed?: number; canceled?: boolean }>;
  cases(): Promise<LegalCase[]>;
  saveCase(item: LegalCase): Promise<LegalCase>;
  deleteCase(id: string): Promise<boolean>;
  attach(id: string): Promise<{ files: CaseFile[]; saved?: boolean; canceled?: boolean }>;
  openFile(target: string): Promise<boolean>;
  revealCase(id: string): Promise<boolean>;
  openDataFolder(): Promise<boolean>;
  templates(): Promise<DocTemplate[]>;
  exportDoc(payload: { name: string; text: string; format: 'txt' | 'md' | 'doc' }): Promise<{ saved: boolean; path?: string }>;
  localVersions(): Promise<VersionEntry[]>;
  remoteVersions(): Promise<{ ok: boolean; items: { tag: string; name: string; publishedAt: string; prerelease: boolean; notes: string; assets: { name: string; size: number; url: string }[] }[]; error?: string }>;
  checkUpdate(): Promise<UpdateStatus>;
  downloadUpdate(): Promise<UpdateStatus>;
  installUpdate(): void;
  updateStatus(): Promise<UpdateStatus>;
  onUpdate(handler: (status: UpdateStatus) => void): () => void;
  open(url: string): Promise<boolean>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
};

declare global {
  interface Window {
    nexus?: Api;
    __nexusShots?: { set: (theme: Theme, view: string, lang?: 'ru' | 'en') => void };
  }
}

export const api: Api = window.nexus ?? createMockApi();

export const uid = () => Math.random().toString(36).slice(2, 10);
