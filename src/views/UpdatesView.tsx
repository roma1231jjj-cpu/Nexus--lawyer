import { useEffect, useState } from 'react';
import { api, type Settings, type UpdateStatus, type VersionEntry } from '../api';
import { IconCheck, IconDownload, IconRefresh, IconSpark } from '../components/Icons';
import { formatDate, useLang, useT } from '../i18n';
import type { TKey } from '../i18n';

type Props = {
  info: { version: string; packaged: boolean; userData: string } | null;
  settings: Settings;
  update: UpdateStatus;
  setUpdate: (status: UpdateStatus) => void;
};

const stageKeys: Record<UpdateStatus['stage'], TKey> = {
  idle: 'updates.stageIdle',
  checking: 'updates.stageChecking',
  available: 'updates.stageAvailable',
  none: 'updates.stageNone',
  downloading: 'updates.stageDownloading',
  ready: 'updates.stageReady',
  error: 'updates.stageError',
  dev: 'updates.stageDev'
};

export default function UpdatesView({ info, settings, update, setUpdate }: Props) {
  const t = useT();
  const lang = useLang();
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [remote, setRemote] = useState<{ ok: boolean; items: { tag: string; name: string; publishedAt: string; prerelease: boolean; notes: string; assets: { name: string; size: number }[] }[]; error?: string }>({
    ok: false,
    items: []
  });

  useEffect(() => {
    api.localVersions().then(setVersions).catch(() => setVersions([]));
    api.remoteVersions().then(setRemote).catch(() => setRemote({ ok: false, items: [] }));
  }, []);

  const check = async () => {
    setUpdate({ stage: 'checking', message: t('updates.stageChecking') });
    try {
      const status = await api.checkUpdate();
      setUpdate(status);
      api.remoteVersions().then(setRemote).catch(() => undefined);
    } catch (error) {
      setUpdate({
        stage: 'error',
        message: t('updates.checkFailed', { error: error instanceof Error ? error.message : String(error) })
      });
    }
  };

  const download = async () => {
    try {
      const status = await api.downloadUpdate();
      setUpdate(status);
    } catch (error) {
      setUpdate({
        stage: 'error',
        message: t('updates.downloadFailed', { error: error instanceof Error ? error.message : String(error) })
      });
    }
  };

  const channelLabel = settings.channel === 'beta' ? t('updates.channelBeta') : t('updates.channelStable');

  const version = info?.version ?? '1.0.0';

  return (
    <div className="page">
      <div className="updates">
        <div>
          <div className="version-hero">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="badge"><IconSpark size={11} /> {t('app.brand')}</span>
              <span className={`badge ${update.stage === 'error' ? 'err' : update.stage === 'available' || update.stage === 'ready' ? 'ok' : ''}`}>
                {t('updates.channel', { channel: channelLabel })}
              </span>
            </div>
            <div className="ver" style={{ marginTop: 14 }}>
              {version} <span>{t('app.name')}</span>
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              {t(stageKeys[update.stage])}
              {update.version && update.stage === 'available' ? ` — ${update.version}` : ''}
              {update.message && update.stage !== 'checking' && update.stage !== 'available' ? ` — ${update.message}` : ''}
            </div>
            {update.stage === 'downloading' && (
              <div className="progress">
                <div style={{ width: `${update.percent ?? 0}%` }} />
              </div>
            )}
            <div className="hero-actions">
              <button className="btn primary" onClick={check} disabled={update.stage === 'checking' || update.stage === 'downloading'}>
                <IconRefresh size={14} /> {t('updates.check')}
              </button>
              {update.stage === 'available' && (
                <button className="btn" onClick={download}>
                  <IconDownload size={14} /> {t('updates.download', { version: update.version ?? '' })}
                </button>
              )}
              {update.stage === 'ready' && (
                <button className="btn primary" onClick={() => api.installUpdate()}>
                  <IconCheck size={14} /> {t('updates.install')}
                </button>
              )}
              <button className="btn ghost" onClick={() => api.open('https://github.com/roma1231jjj-cpu/Nexus--lawyer/releases')}>
                {t('updates.githubReleases')}
              </button>
            </div>
            <div className="hint-line">
              {t('updates.hint', {
                state: settings.autoUpdate ? t('updates.autoOn') : t('updates.autoOff'),
                channel: settings.channel === 'beta' ? t('updates.channelBeta') : t('updates.channelStable')
              })}
              {!info?.packaged && t('updates.devNote')}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>{t('updates.builds')}</h2>
              <span className="hint">{t('updates.threeFormats')}</span>
            </div>
            <div className="artifacts">
              <div className="artifact">
                <div className="k">{t('updates.artifactExe')}</div>
                <div className="n">nexus-lawyer-{version}-portable.exe</div>
                <div className="s">{t('updates.portableExe')}</div>
              </div>
              <div className="artifact">
                <div className="k">{t('updates.artifactZip')}</div>
                <div className="n">nexus-lawyer-{version}-portable.zip</div>
                <div className="s">{t('updates.portableZip')}</div>
              </div>
              <div className="artifact">
                <div className="k">{t('updates.installer')}</div>
                <div className="n">nexus-lawyer-setup-{version}.exe</div>
                <div className="s">{t('updates.installerHint')}</div>
              </div>
            </div>
            <div className="hint-line">{t('updates.artifactsHint')}</div>
          </div>

          {remote.items.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2>{t('updates.repo')}</h2>
                <span className="hint">{t('updates.repoCount', { n: remote.items.length })}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {remote.items.slice(0, 6).map((release) => (
                  <div className="release" key={release.tag}>
                    <div>
                      <div className="tag">{release.tag}</div>
                      <div className="date">{formatDate(release.publishedAt, lang)}</div>
                    </div>
                    <div>
                      <div className="row" style={{ gap: 8 }}>
                        <b style={{ fontSize: 13, fontWeight: 550 }}>{release.name}</b>
                        {release.prerelease && <span className="badge warn">{t('updates.beta')}</span>}
                      </div>
                      <div className="tiny dim" style={{ marginTop: 4 }}>{release.assets.map((asset) => asset.name).join(' · ') || t('updates.noAssets')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!remote.ok && remote.error && (
            <div className="card">
              <div className="card-head"><h2>{t('updates.repo')}</h2></div>
              <div className="hint-line">{t('updates.repoError', { error: remote.error })}</div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>{t('updates.log')}</h2>
            <span className="hint">{t('updates.logCount', { n: versions.length })}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {versions.length === 0 && <div className="dim tiny">{t('updates.noManifest')}</div>}
            {versions.map((entry) => (
              <div className="release" key={entry.version}>
                <div>
                  <div className="tag">{entry.version}</div>
                  <div className="date">{formatDate(entry.date, lang)}</div>
                </div>
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <b style={{ fontSize: 13, fontWeight: 550 }}>{entry.channel === 'beta' ? t('updates.beta') : t('updates.stable')}</b>
                    {entry.version === version && <span className="badge ok">{t('updates.current')}</span>}
                  </div>
                  <ul>
                    {entry.changes.map((change, index) => (
                      <li key={index}>{change}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
