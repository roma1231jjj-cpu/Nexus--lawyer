import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createStore } from './store';
import { createLaws, type Article } from './laws';
import { buildSources, buildSystemPrompt, listModels, offlineAnswer, streamChat, type ChatMessage } from './ai';
import { templates, fillTemplate } from './docs';
import { createUpdater, REPO, type UpdateStatus } from './updater';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const shotsArg = process.argv.find((arg) => arg.startsWith('--shots'));

let win: BrowserWindow | null = null;
let store = createStore(app.getPath('userData'));
let laws = createLaws(
  path.join(app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources'), 'laws'),
  path.join(app.getPath('userData'), 'laws-user')
);
let updater = createUpdater(
  (status) => win?.webContents.send('update:status', status),
  () => store.getSettings().feedUrl,
  () => store.getSettings().channel
);

const send = (channel: string, payload: unknown) => win?.webContents.send(channel, payload);

const overlayColors: Record<string, { color: string; symbolColor: string }> = {
  midnight: { color: '#08070f', symbolColor: '#efeaff' },
  ivory: { color: '#eef2fb', symbolColor: '#152048' },
  aurum: { color: '#0b0a08', symbolColor: '#f6ecd8' }
};

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
    setTimeout(() => updater.checkSilent(), 6000);
  }

  if (shotsArg) {
    await runScreenshots();
  }
}

async function runScreenshots() {
  const dir = isDev ? path.join(process.cwd(), 'screenshots') : path.join(app.getPath('userData'), 'screenshots');
  fs.mkdirSync(dir, { recursive: true });

  const shots: { theme: string; view: string; file: string }[] = [
    { theme: 'midnight', view: 'chat', file: '01-chat-midnight.png' },
    { theme: 'ivory', view: 'laws', file: '02-laws-ivory.png' },
    { theme: 'aurum', view: 'documents', file: '03-documents-aurum.png' },
    { theme: 'midnight', view: 'cases', file: '04-cases-midnight.png' },
    { theme: 'ivory', view: 'updates', file: '05-versions-ivory.png' }
  ];

  await new Promise((resolve) => setTimeout(resolve, 1500));

  for (const shot of shots) {
    await win?.webContents.executeJavaScript(`window.__nexusShots && window.__nexusShots.set('${shot.theme}','${shot.view}')`);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    const image = await win!.webContents.capturePage();
    fs.writeFileSync(path.join(dir, shot.file), image.toPNG());
  }

  await win?.webContents.executeJavaScript(`window.__nexusShots && window.__nexusShots.set('midnight','chat')`);
  app.quit();
}

const casesFile = () => store.file('cases.json');

function readCases() {
  return store.read<any[]>('cases.json', []);
}

function writeCases(items: unknown[]) {
  store.write('cases.json', items);
}

function registerIpc() {
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    userData: app.getPath('userData'),
    packaged: app.isPackaged,
    electron: process.versions.electron,
    repo: REPO
  }));

  ipcMain.handle('settings:get', () => store.getSettings());
  ipcMain.handle('settings:save', (_event, patch) => {
    const next = store.saveSettings(patch);
    if (patch.theme && overlayColors[patch.theme]) {
      win?.setTitleBarOverlay?.({ ...overlayColors[patch.theme], height: 44 });
      win?.setBackgroundColor(patch.theme === 'ivory' ? '#eef2fb' : patch.theme === 'aurum' ? '#0b0a08' : '#08070f');
    }
    return next;
  });

  ipcMain.handle('ai:models', (_event, settings) => listModels(settings ?? store.getSettings()));

  ipcMain.handle('ai:chat', async (_event, payload: { requestId: string; messages: ChatMessage[]; query: string; country: string; sources: boolean }) => {
    const settings = store.getSettings();
    const country = payload.country || settings.country;
    const countryName = laws.listCountries().find((item) => item.code === country)?.name;
    const sources = payload.sources === false ? [] : buildSources(payload.query, country, laws, 5);
    const system = buildSystemPrompt(sources, country, countryName, settings.language);
    const messages: ChatMessage[] = [{ role: 'system', content: system }, ...payload.messages];

    const controller = new AbortController();
    streams.set(payload.requestId, controller);
    const result = await streamChat({
      settings,
      messages,
      signal: controller.signal,
      onDelta: (delta) => send('ai:chunk', { requestId: payload.requestId, delta })
    });
    streams.delete(payload.requestId);

    if (result.error || !result.text.trim()) {
      return { text: offlineAnswer(payload.query, sources, countryName), sources, error: result.error, mode: 'offline' };
    }
    return { text: result.text, sources, mode: 'ai' };
  });

  ipcMain.handle('ai:stop', (_event, requestId: string) => {
    streams.get(requestId)?.abort();
    streams.delete(requestId);
    return true;
  });

  ipcMain.handle('laws:overview', () => ({
    countries: laws.listCountries(),
    counts: laws.totalByCountry(),
    total: laws.counts()
  }));
  ipcMain.handle('laws:search', (_event, payload: { query: string; country?: string }) => laws.search(payload.query, payload.country, 40));
  ipcMain.handle('laws:country', (_event, country: string) => ({
    articles: laws.byCountry(country),
    codes: laws.codesByCountry(country)
  }));
  ipcMain.handle('laws:import', async () => {
    const result = await dialog.showOpenDialog(win!, {
      title: 'Импорт пакета законов',
      filters: [{ name: 'Пакет законов', extensions: ['json'] }],
      properties: ['openFile', 'multiSelections']
    });
    if (result.canceled) return { imported: 0 };
    const dir = path.join(app.getPath('userData'), 'laws-user');
    fs.mkdirSync(dir, { recursive: true });
    let imported = 0;
    for (const file of result.filePaths) {
      try {
        const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
        const name = path.basename(file);
        fs.writeFileSync(path.join(dir, `${Date.now()}-${name}`), JSON.stringify(pack, null, 2));
        imported += (pack.articles ?? []).length;
      } catch {
        /* игнорируем битый файл */
      }
    }
    laws.reload();
    return { imported };
  });

  ipcMain.handle('cases:list', () => readCases());
  ipcMain.handle('cases:save', (_event, item) => {
    const items = readCases();
    const index = items.findIndex((entry) => entry.id === item.id);
    const next = { ...item, updatedAt: new Date().toISOString() };
    if (index >= 0) items[index] = next;
    else items.unshift(next);
    writeCases(items);
    return next;
  });
  ipcMain.handle('cases:delete', (_event, id: string) => {
    writeCases(readCases().filter((entry) => entry.id !== id));
    return true;
  });
  ipcMain.handle('cases:attach', async (_event, id: string) => {
    const result = await dialog.showOpenDialog(win!, { title: 'Добавить файл в дело', properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return { files: readCases().find((entry) => entry.id === id)?.files ?? [] };
    const dir = path.join(app.getPath('userData'), 'cases', id);
    fs.mkdirSync(dir, { recursive: true });
    const items = readCases();
    const item = items.find((entry) => entry.id === id);
    if (!item) return { files: [] };
    for (const source of result.filePaths) {
      const target = path.join(dir, path.basename(source));
      fs.copyFileSync(source, target);
      const size = fs.statSync(target).size;
      item.files = [...(item.files ?? []), { name: path.basename(source), path: target, size, addedAt: new Date().toISOString() }];
    }
    writeCases(items);
    return { files: item.files };
  });
  ipcMain.handle('cases:openFile', (_event, target: string) => {
    if (fs.existsSync(target)) shell.openPath(target);
    return true;
  });
  ipcMain.handle('cases:reveal', (_event, id: string) => shell.openPath(path.join(app.getPath('userData'), 'cases', id)));
  ipcMain.handle('cases:openFolder', () => shell.openPath(app.getPath('userData')));

  ipcMain.handle('docs:templates', () => templates);
  ipcMain.handle('docs:export', async (_event, payload: { name: string; text: string; format: 'txt' | 'md' | 'doc' }) => {
    const ext = payload.format;
    const result = await dialog.showSaveDialog(win!, {
      title: 'Сохранить документ',
      defaultPath: `${payload.name}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    });
    if (result.canceled || !result.filePath) return { saved: false };
    let content = payload.text;
    if (ext === 'doc') {
      content = `<html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;font-size:14pt;line-height:1.5;max-width:720px;margin:40px auto;white-space:pre-wrap}</style></head><body>${payload.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</body></html>`;
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

  ipcMain.handle('shell:open', (_event, url: string) => shell.openExternal(url));
  ipcMain.handle('window:minimize', () => win?.minimize());
  ipcMain.handle('window:maximize', () => (win?.isMaximized() ? win.unmaximize() : win?.maximize()));
  ipcMain.handle('window:close', () => win?.close());
}

const streams = new Map<string, AbortController>();

app.whenReady().then(async () => {
  if (process.platform === 'win32') app.setAppUserModelId('ru.autsquad.nexuslawyer');
  registerIpc();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
