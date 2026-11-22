import fs from 'node:fs';
import path from 'node:path';

export type Settings = {
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  theme: 'midnight' | 'ivory' | 'aurum';
  channel: 'stable' | 'beta';
  language: string;
  feedUrl: string;
  autoUpdate: boolean;
  country: string;
};

export const defaultSettings: Settings = {
  baseUrl: 'http://127.0.0.1:11434/v1',
  model: 'llama3.1',
  apiKey: '',
  temperature: 0.25,
  theme: 'midnight',
  channel: 'stable',
  language: 'ru',
  feedUrl: '',
  autoUpdate: true,
  country: 'RU'
};

export function createStore(dir: string) {
  const file = (name: string) => path.join(dir, name);
  const read = <T,>(name: string, fallback: T): T => {
    try {
      return JSON.parse(fs.readFileSync(file(name), 'utf8')) as T;
    } catch {
      return fallback;
    }
  };
  const write = (name: string, data: unknown) => {
    fs.mkdirSync(dir, { recursive: true });
    const target = file(name);
    fs.writeFileSync(target + '.tmp', JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(target + '.tmp', target);
  };

  let settings: Settings = { ...defaultSettings, ...read<Partial<Settings>>('settings.json', {}) };

  return {
    getSettings: () => settings,
    saveSettings(patch: Partial<Settings>) {
      settings = { ...settings, ...patch };
      write('settings.json', settings);
      return settings;
    },
    read,
    write,
    file
  };
}

export type Store = ReturnType<typeof createStore>;
