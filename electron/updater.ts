import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { tr, type Lang } from './i18n';
import fs from 'node:fs';
import path from 'node:path';

export type UpdateStatus = {
  stage: 'idle' | 'checking' | 'available' | 'none' | 'downloading' | 'ready' | 'error' | 'dev';
  version?: string;
  notes?: string;
  percent?: number;
  message?: string;
  releaseDate?: string;
};

export const REPO = { owner: 'roma1231jjj-cpu', repo: 'Nexus--lawyer' };

export function createUpdater(send: (status: UpdateStatus) => void, feedUrl: () => string, channel: () => 'stable' | 'beta', lang: () => Lang) {
  let status: UpdateStatus = { stage: 'idle' };
  let silent = false;

  const localize = (key: Parameters<typeof tr>[1], vars?: Record<string, string | number>) => tr(lang(), key, vars);

  const push = (next: Partial<UpdateStatus>) => {
    status = { ...status, ...next };
    send(status);
  };

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = channel() === 'beta';
  autoUpdater.logger = null;

  const configure = () => {
    const custom = feedUrl();
    autoUpdater.setFeedURL(
      custom
        ? { provider: 'generic', url: custom, channel: channel() === 'beta' ? 'beta' : 'latest' }
        : { provider: 'github', owner: REPO.owner, repo: REPO.repo }
    );
    autoUpdater.allowPrerelease = channel() === 'beta';
  };

  autoUpdater.on('checking-for-update', () => push({ stage: 'checking', message: localize('idle.checking') }));
  autoUpdater.on('update-available', (info) =>
    push({ stage: 'available', version: info.version, notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '', releaseDate: info.releaseDate })
  );
  autoUpdater.on('update-not-available', (info) => push({ stage: 'none', version: info.version, message: localize('idle.actual') }));
  autoUpdater.on('download-progress', (progress) => push({ stage: 'downloading', percent: Math.round(progress.percent) }));
  autoUpdater.on('update-downloaded', (info) => push({ stage: 'ready', version: info.version, message: localize('idle.downloaded') }));
  autoUpdater.on('error', (error) => {
    const message = /No published versions|404/i.test(error.message) ? localize('idle.noReleasesShort') : error.message;
    if (/No published versions|404/i.test(error.message)) {
      push({ stage: 'none', message: localize('idle.noReleases') });
      return;
    }
    if (silent) {
      push({ stage: 'idle', message: localize('idle.silentFailed', { error: message }) });
      return;
    }
    push({ stage: 'error', message });
  });

  return {
    status: () => status,
    async check() {
      silent = false;
      if (!app.isPackaged) {
        push({ stage: 'dev', message: localize('idle.dev', { version: app.getVersion() }) });
        return status;
      }
      try {
        configure();
        await autoUpdater.checkForUpdates();
      } catch (error) {
        push({ stage: 'error', message: error instanceof Error ? error.message : localize('idle.checkError') });
      }
      return status;
    },
    async checkSilent() {
      if (!app.isPackaged) return status;
      silent = true;
      try {
        configure();
        await autoUpdater.checkForUpdates();
      } catch (error) {
        const raw = error instanceof Error ? error.message : localize('idle.noNetwork');
        push({
          stage: 'idle',
          message: /No published versions|404/i.test(raw) ? localize('idle.noReleasesShort2') : localize('idle.silentFailed', { error: raw })
        });
      } finally {
        silent = false;
      }
      return status;
    },
    async download() {
      try {
        await autoUpdater.downloadUpdate();
      } catch (error) {
        push({ stage: 'error', message: error instanceof Error ? error.message : localize('idle.downloadError') });
      }
      return status;
    },
    install() {
      autoUpdater.quitAndInstall(false, true);
    },
    localVersions() {
      const candidates = [
        path.join(process.resourcesPath ?? '', 'versions.json'),
        path.join(app.getAppPath(), 'resources', 'versions.json'),
        path.join(app.getAppPath(), 'versions.json')
      ];
      for (const candidate of candidates) {
        try {
          return JSON.parse(fs.readFileSync(candidate, 'utf8'));
        } catch {
          continue;
        }
      }
      return [];
    },
    async remoteVersions() {
      try {
        const response = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/releases`, {
          headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Nexus-Lawyer' },
          signal: AbortSignal.timeout(9000)
        });
        if (!response.ok) return { ok: false, items: [], error: `GitHub HTTP ${response.status}` };
        const data = (await response.json()) as {
          tag_name: string;
          name: string;
          published_at: string;
          prerelease: boolean;
          body: string;
          assets: { name: string; size: number; browser_download_url: string }[];
        }[];
        return {
          ok: true,
          items: data.map((release) => ({
            tag: release.tag_name,
            name: release.name || release.tag_name,
            publishedAt: release.published_at,
            prerelease: release.prerelease,
            notes: release.body ?? '',
            assets: release.assets.map((asset) => ({ name: asset.name, size: asset.size, url: asset.browser_download_url }))
          }))
        };
      } catch (error) {
        return { ok: false, items: [], error: error instanceof Error ? error.message : localize('idle.networkError') };
      }
    }
  };
}

export type Updater = ReturnType<typeof createUpdater>;
