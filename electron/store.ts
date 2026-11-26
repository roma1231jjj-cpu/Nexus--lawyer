import fs from 'node:fs';
import path from 'node:path';
import { app, safeStorage } from 'electron';

export type Settings = {
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  theme: 'midnight' | 'ivory' | 'aurum';
  channel: 'stable' | 'beta';
  language: string;
  answerLanguage: string;
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
  answerLanguage: 'ru',
  feedUrl: '',
  autoUpdate: true,
  country: 'ALL'
};

const LANGS = new Set(['ru', 'en', 'de']);

type StoredSettings = Partial<Settings> & { apiKeyEnc?: string };

function canEncrypt() {
  try {
    return app.isReady() && safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/** Ключ API храним через DPAPI (Windows) / Keychain, а не открытым текстом. */
function decodeSettings(raw: StoredSettings): Partial<Settings> {
  const next = { ...raw };
  const encoded = typeof raw.apiKeyEnc === 'string' ? raw.apiKeyEnc : '';
  delete next.apiKeyEnc;
  if (encoded) {
    try {
      next.apiKey = safeStorage.decryptString(Buffer.from(encoded, 'base64'));
    } catch {
      next.apiKey = '';
    }
  }
  return next;
}

export function createStore(dir: string) {
  const file = (name: string) => path.join(dir, name);
  const read = <T,>(name: string, fallback: T): T => {
    const target = file(name);
    try {
      return JSON.parse(fs.readFileSync(target, 'utf8')) as T;
    } catch (error) {
      // повреждённый файл не затираем молча: сохраняем копию для восстановления
      if (fs.existsSync(target)) {
        try {
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          fs.copyFileSync(target, `${target}.corrupt-${stamp}`);
        } catch {
          /* копия не удалась — хотя бы не падаем */
        }
      }
      return fallback;
    }
  };
  const write = (name: string, data: unknown) => {
    fs.mkdirSync(dir, { recursive: true });
    const target = file(name);
    fs.writeFileSync(target + '.tmp', JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(target + '.tmp', target);
  };

  const raw = read<StoredSettings>('settings.json', {});
  const saved = decodeSettings(raw);
  let keyEncrypted = !!raw.apiKeyEnc;
  let settings: Settings = { ...defaultSettings, ...saved };
  // раньше один язык отвечал и за интерфейс, и за ответы — разводим их
  if (!saved.answerLanguage) settings.answerLanguage = LANGS.has(settings.language) ? settings.language : 'ru';
  if (!LANGS.has(settings.language)) settings.language = 'ru';
  if (!LANGS.has(settings.answerLanguage)) settings.answerLanguage = 'ru';

  return {
    getSettings: () => settings,
    saveSettings(patch: Partial<Settings>) {
      settings = { ...settings, ...patch };
      if (!LANGS.has(settings.language)) settings.language = 'ru';
      if (!LANGS.has(settings.answerLanguage)) settings.answerLanguage = settings.language;
      const stored: StoredSettings = { ...settings };
      if (settings.apiKey && canEncrypt()) {
        try {
          stored.apiKeyEnc = safeStorage.encryptString(settings.apiKey).toString('base64');
          delete stored.apiKey;
          keyEncrypted = true;
        } catch {
          /* останется открытым — приложение работает, предупреждение в настройках */
        }
      } else {
        delete stored.apiKeyEnc;
        keyEncrypted = false;
      }
      write('settings.json', stored);
      return settings;
    },
    /** Одноразовая миграция ключа из старого settings.json после app.ready. */
    secureKey() {
      if (!settings.apiKey || keyEncrypted || !canEncrypt()) return;
      try {
        const stored: StoredSettings = { ...settings, apiKeyEnc: safeStorage.encryptString(settings.apiKey).toString('base64') };
        delete stored.apiKey;
        write('settings.json', stored);
        keyEncrypted = true;
      } catch {
        /* не critical: ключ останется в открытом виде */
      }
    },
    read,
    write,
    file
  };
}

export type Store = ReturnType<typeof createStore>;
