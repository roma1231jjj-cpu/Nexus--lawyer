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

/**
 * Ключ API храним через DPAPI (Windows) / Keychain, а не открытым текстом.
 * Расшифровка возможна только после app.ready, поэтому createStore()
 * оставляет зашифрованный блок как есть и не подменяет ключ пустой строкой.
 */
function decodeSettings(raw: StoredSettings): Partial<Settings> {
  const next = { ...raw };
  delete next.apiKeyEnc;
  return next;
}

export function createStore(dir: string) {
  const file = (name: string) => path.join(dir, name);
  const blockedWrites = new Set<string>();
  const read = <T,>(name: string, fallback: T): T => {
    const target = file(name);
    try {
      return JSON.parse(fs.readFileSync(target, 'utf8')) as T;
    } catch (error) {
      if (!fs.existsSync(target)) return fallback;
      // Повреждённый файл уводим в .corrupt-* и только потом отдаём fallback.
      // Раньше копия создавалась, но битый оригинал оставался на месте, и
      // следующее сохранение молча затирало его.
      try {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.renameSync(target, target + '.corrupt-' + stamp);
        blockedWrites.delete(name);
      } catch {
        blockedWrites.add(name);
      }
      return fallback;
    }
  };
  const write = (name: string, data: unknown) => {
    if (blockedWrites.has(name)) {
      throw new Error(name + ' повреждён: не удалось сохранить копию .corrupt, запись остановлена');
    }
    fs.mkdirSync(dir, { recursive: true });
    const target = file(name);
    fs.writeFileSync(target + '.tmp', JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(target + '.tmp', target);
  };

  const raw = read<StoredSettings>('settings.json', {});
  const saved = decodeSettings(raw);
  let keyEncrypted = !!raw.apiKeyEnc;
  // зашифрованный ключ держим до app.ready и расшифровываем лениво
  let pendingEnc = typeof raw.apiKeyEnc === 'string' ? raw.apiKeyEnc : '';
  let decodeTried = !pendingEnc;
  let settings: Settings = { ...defaultSettings, ...saved };

  /** До ready safeStorage недоступен: пробуем позже, блок не теряем. */
  const unlock = () => {
    if (decodeTried || !pendingEnc || !canEncrypt()) return;
    decodeTried = true;
    try {
      settings.apiKey = safeStorage.decryptString(Buffer.from(pendingEnc, 'base64'));
    } catch {
      // другой пользователь/профиль: ключ не расшифрован, но apiKeyEnc цел
      settings.apiKey = '';
    }
  };
  // раньше один язык отвечал и за интерфейс, и за ответы — разводим их
  if (!saved.answerLanguage) settings.answerLanguage = LANGS.has(settings.language) ? settings.language : 'ru';
  if (!LANGS.has(settings.language)) settings.language = 'ru';
  if (!LANGS.has(settings.answerLanguage)) settings.answerLanguage = 'ru';

  return {
    getSettings: () => {
      unlock();
      return settings;
    },
    saveSettings(patch: Partial<Settings>) {
      unlock();
      settings = { ...settings, ...patch };
      if (!LANGS.has(settings.language)) settings.language = 'ru';
      if (!LANGS.has(settings.answerLanguage)) settings.answerLanguage = settings.language;
      const stored: StoredSettings = { ...settings };
      if ('apiKey' in patch) {
        // ключ меняют явно: пустое значение означает «стереть»
        if (patch.apiKey && canEncrypt()) {
          try {
            pendingEnc = safeStorage.encryptString(settings.apiKey).toString('base64');
            stored.apiKeyEnc = pendingEnc;
            delete stored.apiKey;
            keyEncrypted = true;
            decodeTried = true;
          } catch {
            /* останется открытым — приложение работает, предупреждение в настройках */
          }
        } else if (!patch.apiKey) {
          delete stored.apiKeyEnc;
          pendingEnc = '';
          keyEncrypted = false;
          decodeTried = true;
        }
      } else if (settings.apiKey && canEncrypt()) {
        try {
          pendingEnc = safeStorage.encryptString(settings.apiKey).toString('base64');
          stored.apiKeyEnc = pendingEnc;
          delete stored.apiKey;
          keyEncrypted = true;
          decodeTried = true;
        } catch {
          /* останется открытым — приложение работает, предупреждение в настройках */
        }
      } else if (pendingEnc) {
        // ключ ещё не расшифрован (до ready) — сохраняем исходный блок
        stored.apiKeyEnc = pendingEnc;
        delete stored.apiKey;
        keyEncrypted = true;
      } else {
        delete stored.apiKeyEnc;
        keyEncrypted = false;
      }
      write('settings.json', stored);
      return settings;
    },
    /** Одноразовая миграция ключа из старого settings.json после app.ready. */
    secureKey() {
      unlock();
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
