import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createStore } from './store';
import { createLaws } from './laws';
import { buildSources, buildSystemPrompt, listModels, offlineAnswer, streamChat, type ChatMessage } from './ai';
import { getTemplates } from './docs';
import { createCases } from './cases';
import { createUpdater, REPO, type UpdateStatus } from './updater';
import { resolveLang, tr } from './i18n';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const shotsArg = process.argv.find((arg) => arg.startsWith('--shots'));

let win: BrowserWindow | null = null;
let store = createStore(app.getPath('userData'));
let laws = createLaws(
  path.join(app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources'), 'laws'),
  path.join(app.getPath('userData'), 'laws-user')
);
let cases = createCases(app.getPath('userData'), store);
let updater = createUpdater(
  (status) => win?.webContents.send('update:status', status),
  () => store.getSettings().feedUrl,
  () => store.getSettings().channel,
  () => resolveLang(store.getSettings().language)
);

const trNow = (key: Parameters<typeof tr>[1], vars?: Record<string, string | number>) => tr(resolveLang(store.getSettings().language), key, vars);

const send = (channel: string, payload: unknown) => win?.webContents.send(channel, payload);

const overlayColors: Record<string, { color: string; symbolColor: string }> = {
  midnight: { color: '#08070f', symbolColor: '#efeaff' },
  ivory: { color: '#eef2fb', symbolColor: '#152048' },
  aurum: { color: '#0b0a08', symbolColor: '#f6ecd8' }
};

const isWebUrl = (value: string) => /^https?:\/\//i.test(value) || /^mailto:/i.test(value);

async function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1060,
    minHeight: 700,
    show: false,
    backgroundColor: '#08070f',
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...overlayColors[store.getSettings().theme], height: 44 },
    icon: path.join(app.getAppPath(), 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  win.once('ready-to-show', () => win?.show());

  if (isDev) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    await win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  if (store.getSettings().autoUpdate) {
    // решение об автопроверке принимаем в момент запуска таймера, а не до него
    setTimeout(() => {
      if (store.getSettings().autoUpdate) updater.checkSilent();
    }, 6000);
  }

  if (shotsArg) {
    await runScreenshots();
  }
}

async function runScreenshots() {
  const dir = isDev ? path.join(process.cwd(), 'screenshots') : path.join(app.getPath('userData'), 'screenshots');
  fs.mkdirSync(dir, { recursive: true });

  const shots: { theme: string; view: string; lang: string; file: string }[] = [
    { theme: 'midnight', view: 'chat', lang: 'en', file: 'en-midnight.png' },
    { theme: 'ivory', view: 'laws', lang: 'en', file: 'en-ivory.png' },
    { theme: 'aurum', view: 'documents', lang: 'en', file: 'en-aurum.png' },
    { theme: 'ivory', view: 'chat', lang: 'en', file: 'en-chat.png' },
    { theme: 'midnight', view: 'settings', lang: 'en', file: 'en-settings.png' },
    { theme: 'midnight', view: 'documents', lang: 'en', file: 'en-docs.png' },
    { theme: 'midnight', view: 'chat', lang: 'ru', file: 'ru-chat.png' },
    { theme: 'ivory', view: 'documents', lang: 'ru', file: 'ru-docs.png' },
    { theme: 'aurum', view: 'settings', lang: 'ru', file: 'ru-settings.png' }
  ];

  await new Promise((resolve) => setTimeout(resolve, 1500));

  for (const shot of shots) {
    await win?.webContents.executeJavaScript(
      `window.__nexusShots && window.__nexusShots.set('${shot.theme}','${shot.view}','${shot.lang}')`
    );
    await new Promise((resolve) => setTimeout(resolve, 1700));
    const image = await win!.webContents.capturePage();
    fs.writeFileSync(path.join(dir, shot.file), image.toPNG());
  }

  await win?.webContents.executeJavaScript(`window.__nexusShots && window.__nexusShots.set('midnight','chat')`);
  app.quit();
}

const ALLOWED_ANSWER = new Set(['ru', 'en', 'de']);

type StoredChat = {
  role: 'user' | 'assistant';
  text: string;
  sources?: { id: string; code: string; number: string; title: string; country: string; text: string }[];
  mode?: 'ai' | 'offline';
  error?: string;
  cancelled?: boolean;
  country?: string;
};

function sanitizeChat(list: unknown): StoredChat[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.text === 'string')
    .slice(-60)
    .map((item) => {
      const sources = Array.isArray(item.sources)
        ? item.sources.slice(0, 12).map((source: Record<string, unknown>) => ({
            id: String(source.id ?? '').slice(0, 80),
            code: String(source.code ?? '').slice(0, 80),
            number: String(source.number ?? '').slice(0, 40),
            title: String(source.title ?? '').slice(0, 300),
            country: String(source.country ?? '').slice(0, 8),
            text: String(source.text ?? '').slice(0, 1200),
          }))
        : undefined;
      return {
        role: item.role as 'user' | 'assistant',
        text: String(item.text).slice(0, 8000),
        ...(sources && sources.length ? { sources } : {}),
        ...(item.mode === 'ai' || item.mode === 'offline' ? { mode: item.mode } : {}),
        ...(typeof item.error === 'string' && item.error ? { error: item.error.slice(0, 500) } : {}),
        ...(item.cancelled === true ? { cancelled: true } : {}),
        ...(typeof item.country === 'string' && item.country ? { country: item.country.slice(0, 8) } : {}),
      };
    });
}

function registerIpc() {
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    userData: app.getPath('userData'),
    packaged: app.isPackaged,
    build: !app.isPackaged
      ? 'dev'
      : process.env.PORTABLE_EXECUTABLE_FILE
        ? 'portable'
        : process.execPath.includes('win-unpacked')
          ? 'unpacked'
          : 'installer',
    shots: Boolean(shotsArg),
    electron: process.versions.electron,
    repo: REPO
  }));

  ipcMain.handle('settings:get', () => store.getSettings());
  ipcMain.handle('settings:save', (_event, patch) => {
    const safe: Record<string, unknown> = { ...patch };
    if (typeof safe.country === 'string') {
      const known = laws.listCountries().some((item) => item.code === safe.country);
      if (!known && safe.country !== 'ALL') delete safe.country;
    }
    if (typeof safe.language === 'string' && !ALLOWED_ANSWER.has(safe.language)) delete safe.language;
    if (typeof safe.answerLanguage === 'string' && !ALLOWED_ANSWER.has(safe.answerLanguage)) delete safe.answerLanguage;
    if (typeof safe.temperature === 'number') safe.temperature = Math.min(1.5, Math.max(0, safe.temperature));
    const next = store.saveSettings(safe);
    if (patch.theme && overlayColors[patch.theme]) {
      win?.setTitleBarOverlay?.({ ...overlayColors[patch.theme], height: 44 });
      win?.setBackgroundColor(patch.theme === 'ivory' ? '#eef2fb' : patch.theme === 'aurum' ? '#0b0a08' : '#08070f');
    }
    return next;
  });

  ipcMain.handle('ai:models', (_event, settings) => listModels(settings ?? store.getSettings()));

  ipcMain.handle(
    'ai:chat',
    async (_event, payload: { requestId: string; messages: ChatMessage[]; query: string; country: string; sources: boolean }) => {
      const settings = store.getSettings();
      const country = payload.country || settings.country || 'ALL';
      const countryName =
        country === 'ALL' ? undefined : laws.listCountries().find((item) => item.code === country)?.name;
      const query = String(payload.query ?? '').trim();
      const sources = payload.sources === false ? [] : buildSources(query, country, laws, 5);
      const system = buildSystemPrompt(sources, country, countryName, settings.answerLanguage || settings.language);
      const history = (Array.isArray(payload.messages) ? payload.messages : []).filter(
        (item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string' && item.content.trim()
      );
      // вопрос пользователя обязательно должен попасть в запрос — раньше он терялся
      const messages: ChatMessage[] = [{ role: 'system', content: system }, ...history, { role: 'user', content: query }];

      const controller = new AbortController();
      streams.set(payload.requestId, controller);
      const result = await streamChat({
        settings,
        messages,
        signal: controller.signal,
        onDelta: (delta) => send('ai:chunk', { requestId: payload.requestId, delta })
      });
      streams.delete(payload.requestId);

      if (result.cancelled) {
        return { text: result.text, sources, mode: 'ai', cancelled: true };
      }
      if (result.error || !result.text.trim()) {
        return {
          text: result.text || offlineAnswer(query, sources, countryName, settings.answerLanguage || settings.language),
          sources,
          error: result.error,
          mode: result.text ? 'ai' : 'offline'
        };
      }
      return { text: result.text, sources, mode: 'ai' };
    }
  );

  ipcMain.handle('ai:stop', (_event, requestId: string) => {
    streams.get(requestId)?.abort();
    streams.delete(requestId);
    return true;
  });

  ipcMain.handle('chat:load', () => store.read<StoredChat[]>('chat.json', []));
  ipcMain.handle('chat:save', (_event, list: unknown) => {
    store.write('chat.json', sanitizeChat(list));
    return true;
  });
  ipcMain.handle('chat:clear', () => {
    store.write('chat.json', []);
    return true;
  });

  ipcMain.handle('laws:overview', () => ({
    countries: laws.listCountries(),
    counts: laws.totalByCountry(),
    total: laws.counts()
  }));
  ipcMain.handle('laws:search', (_event, payload: { query: string; country?: string }) =>
    laws.search(payload.query, payload.country, 40)
  );
  ipcMain.handle('laws:country', (_event, country: string) => ({
    articles: laws.byCountry(country),
    codes: laws.codesByCountry(country)
  }));
  ipcMain.handle('laws:packs', () => laws.packs());
  ipcMain.handle('laws:pack-remove', (_event, name: string) => {
    const safe = path.basename(String(name ?? ''));
    const target = path.join(app.getPath('userData'), 'laws-user', safe);
    if (!safe.endsWith('.json') || !fs.existsSync(target)) return { ok: false };
    try {
      fs.rmSync(target, { force: true });
      laws.reload();
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
  ipcMain.handle('laws:import', async () => {
    const result = await dialog.showOpenDialog(win!, {
      title: trNow('dialog.importTitle'),
      filters: [{ name: trNow('dialog.importFilter'), extensions: ['json'] }],
      properties: ['openFile', 'multiSelections']
    });
    if (result.canceled) return { imported: 0, skipped: 0, failed: 0, canceled: true, files: [] };
    const dir = path.join(app.getPath('userData'), 'laws-user');
    fs.mkdirSync(dir, { recursive: true });
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const files: { name: string; added: number; skipped: number; errors: string[] }[] = [];
    for (const file of result.filePaths) {
      const base = path.basename(file);
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const pack = JSON.parse(raw);
        const outcome = laws.importPack(pack, true);
        if (!outcome.added && outcome.skipped === 0) {
          failed += 1;
          files.push({ name: base, added: 0, skipped: 0, errors: outcome.errors.length ? outcome.errors : ['нет статей'] });
          continue;
        }
        // имя пакета уникально: содержимое + время, два файла с одним basename не перетираются
        const stamp = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 10);
        const target = path.join(dir, `${stamp}-${Date.now().toString(36)}-${base}`);
        fs.writeFileSync(target, JSON.stringify(pack, null, 2), 'utf8');
        imported += outcome.added;
        skipped += outcome.skipped;
        files.push({ name: base, added: outcome.added, skipped: outcome.skipped, errors: outcome.errors });
      } catch (error) {
        failed += 1;
        files.push({ name: base, added: 0, skipped: 0, errors: [error instanceof Error ? error.message : 'bad json'] });
      }
    }
    laws.reload();
    return { imported, skipped, failed, canceled: false, files };
  });

  ipcMain.handle('cases:list', () => cases.list());
  ipcMain.handle('cases:save', (_event, item) => cases.save(item));
  ipcMain.handle('cases:delete', (_event, id: string) => cases.remove(id));
  ipcMain.handle('cases:note', (_event, payload: { id: string; text: string }) =>
    cases.appendNote(payload?.id, String(payload?.text ?? ''))
  );
  ipcMain.handle('cases:attach', async (_event, id: string) => {
    const item = cases.list().find((entry) => entry.id === id);
    if (!item) return { ok: false, error: 'not found', files: [] };
    const result = await dialog.showOpenDialog(win!, { title: trNow('dialog.attachTitle'), properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return { ok: true, files: item.files, canceled: true };
    return cases.attach(id, result.filePaths);
  });
  ipcMain.handle('cases:removeFile', (_event, payload: { id: string; path: string }) => cases.removeFile(payload?.id, String(payload?.path ?? '')));
  ipcMain.handle('cases:openFile', async (_event, target: string) => {
    const known = cases.list().some((item) => item.files.some((file) => file.path === target));
    if (!known) return { ok: false, error: 'not attachment' };
    if (!cases.inside(target)) return { ok: false, error: 'outside' };
    if (!fs.existsSync(target)) return { ok: false, error: 'missing' };
    const error = await shell.openPath(target);
    return { ok: !error, error: error || undefined };
  });
  ipcMain.handle('cases:reveal', async (_event, id: string) => {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(id ?? ''))) return { ok: false, error: 'bad id' };
    const dir = cases.folder(id);
    fs.mkdirSync(dir, { recursive: true });
    const error = await shell.openPath(dir);
    return { ok: !error, error: error || undefined };
  });
  ipcMain.handle('cases:openFolder', () => shell.openPath(app.getPath('userData')));

  ipcMain.handle('docs:templates', () => {
    const answer = store.getSettings().answerLanguage || store.getSettings().language;
    // шаблоны документов бывают только русские и английские: немецкий ответ не должен ронять экран
    const lang = answer === 'en' ? 'en' : 'ru';
    return getTemplates(lang, store.getSettings().country);
  });
  ipcMain.handle('docs:export', async (_event, payload: { name: string; text: string; format: 'txt' | 'md' | 'rtf' }) => {
    const format = payload.format === 'rtf' || payload.format === 'md' ? payload.format : 'txt';
    const result = await dialog.showSaveDialog(win!, {
      title: trNow('dialog.saveDocTitle'),
      defaultPath: `${payload.name}.${format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });
    if (result.canceled || !result.filePath) return { saved: false };
    let content = payload.text;
    if (format === 'rtf') {
      const body = payload.text
        .replace(/\\/g, '\\\\')
        .replace(/[{}]/g, (match) => `\\${match}`)
        .split('\n')
        .map((line) =>
          [...line]
            .map((char) => {
              const code = char.codePointAt(0) ?? 0;
              if (code <= 127) return char;
              // RTF \u expects a signed 16-bit UTF-16 unit; non-BMP chars need a surrogate pair.
              const unit = (value: number) => `\\u${value > 0x7fff ? value - 0x10000 : value}?`;
              if (code <= 0xffff) return unit(code);
              const rest = code - 0x10000;
              return unit(0xd800 + (rest >> 10)) + unit(0xdc00 + (rest & 0x3ff));
            })
            .join('')
        )
        .join('\\par\n');
      content = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Georgia;}}{\\f0\\fs28 ${body}}}`;
    }
    fs.writeFileSync(result.filePath, content, 'utf8');
    return { saved: true, path: result.filePath };
  });

  ipcMain.handle('versions:local', () => updater.localVersions());
  ipcMain.handle('versions:remote', () => updater.remoteVersions());
  ipcMain.handle('update:check', () => updater.check());
  ipcMain.handle('update:download', () => updater.download());
  ipcMain.handle('update:install', () => updater.install());
  ipcMain.handle('update:status', () => updater.status());

  ipcMain.handle('shell:open', (_event, url: string) => {
    if (!isWebUrl(String(url ?? ''))) return { ok: false, error: 'blocked' };
    void shell.openExternal(url);
    return { ok: true };
  });
  ipcMain.handle('window:minimize', () => win?.minimize());
  ipcMain.handle('window:maximize', () => (win?.isMaximized() ? win.unmaximize() : win?.maximize()));
  ipcMain.handle('window:close', () => win?.close());
}

const streams = new Map<string, AbortController>();

app.whenReady().then(async () => {
  if (process.platform === 'win32') app.setAppUserModelId('ru.autsquad.nexuslawyer');
  store.secureKey();
  registerIpc();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
