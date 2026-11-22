import { useEffect, useState } from 'react';
import { api, type Settings, type UpdateStatus, type VersionEntry } from '../api';
import { IconCheck, IconDownload, IconRefresh, IconSpark } from '../components/Icons';

type Props = {
  info: { version: string; packaged: boolean; userData: string } | null;
  settings: Settings;
  update: UpdateStatus;
  setUpdate: (status: UpdateStatus) => void;
};

const stageLabel: Record<UpdateStatus['stage'], string> = {
  idle: 'Готов к проверке',
  checking: 'Проверяю релизы…',
  available: 'Есть новая версия',
  none: 'Установлена актуальная версия',
  downloading: 'Загружаю обновление',
  ready: 'Обновление готово к установке',
  error: 'Ошибка обновления',
  dev: 'Режим разработки'
};

export default function UpdatesView({ info, settings, update, setUpdate }: Props) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [remote, setRemote] = useState<{ ok: boolean; items: { tag: string; name: string; publishedAt: string; prerelease: boolean; notes: string; assets: { name: string; size: number }[] }[]; error?: string }>({
    ok: false,
    items: []
  });

  useEffect(() => {
    api.localVersions().then(setVersions);
    api.remoteVersions().then(setRemote);
  }, []);

  const check = async () => {
    setUpdate({ stage: 'checking', message: 'Проверяю релизы…' });
    const status = await api.checkUpdate();
    setUpdate(status);
    api.remoteVersions().then(setRemote);
  };

  const download = async () => {
    const status = await api.downloadUpdate();
    setUpdate(status);
  };

  const version = info?.version ?? '1.0.0';

  return (
    <div className="page">
      <div className="updates">
        <div>
          <div className="version-hero">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="badge"><IconSpark size={11} /> Nexus × АутSquad</span>
              <span className={`badge ${update.stage === 'error' ? 'err' : update.stage === 'available' || update.stage === 'ready' ? 'ok' : ''}`}>
                канал {settings.channel}
              </span>
            </div>
            <div className="ver" style={{ marginTop: 14 }}>
              {version} <span>Nexus-Юрист</span>
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              {stageLabel[update.stage]}
              {update.version && update.stage === 'available' ? ` — ${update.version}` : ''}
              {update.message && (update.stage === 'dev' || update.stage === 'idle') ? ` — ${update.message}` : ''}
            </div>
            {update.stage === 'downloading' && (
              <div className="progress">
                <div style={{ width: `${update.percent ?? 0}%` }} />
              </div>
            )}
            <div className="hero-actions">
              <button className="btn primary" onClick={check} disabled={update.stage === 'checking' || update.stage === 'downloading'}>
                <IconRefresh size={14} /> Проверить обновления
              </button>
              {update.stage === 'available' && (
                <button className="btn" onClick={download}>
                  <IconDownload size={14} /> Скачать {update.version}
                </button>
              )}
              {update.stage === 'ready' && (
                <button className="btn primary" onClick={() => api.installUpdate()}>
                  <IconCheck size={14} /> Установить и перезапустить
                </button>
              )}
              <button className="btn ghost" onClick={() => api.open('https://github.com/roma1231jjj-cpu/Nexus--lawyer/releases')}>
                релизы на GitHub
              </button>
            </div>
            <div className="hint-line">
              Автообновление {settings.autoUpdate ? 'включено' : 'выключено'} · проверка при запуске через 6 секунд · канал {settings.channel === 'beta' ? 'бета (prerelease)' : 'стабильный'}.
              {!info?.packaged && ' В dev-режиме проверка отключена — она работает в собранном .exe.'}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Сборки этой версии</h2>
              <span className="hint">три формата</span>
            </div>
            <div className="artifacts">
              <div className="artifact">
                <div className="k">portable exe</div>
                <div className="n">nexus-lawyer-{version}-portable.exe</div>
                <div className="s">один файл, без установки</div>
              </div>
              <div className="artifact">
                <div className="k">portable zip</div>
                <div className="n">nexus-lawyer-{version}-portable.zip</div>
                <div className="s">распаковать и запустить</div>
              </div>
              <div className="artifact">
                <div className="k">установщик</div>
                <div className="n">nexus-lawyer-setup-{version}.exe</div>
                <div className="s">ярлык, автозапуск обновлений</div>
              </div>
            </div>
            <div className="hint-line">
              В репозитории проекта артефакты лежат в папках <b>release-portable-exe</b>, <b>release-portable-zip</b>, <b>release-installer</b>,
              версии и журнал изменений — в <b>versions/</b>.
            </div>
          </div>

          {remote.items.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2>Репозиторий версий</h2>
                <span className="hint">{remote.items.length} релизов</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {remote.items.slice(0, 6).map((release) => (
                  <div className="release" key={release.tag}>
                    <div>
                      <div className="tag">{release.tag}</div>
                      <div className="date">{new Date(release.publishedAt).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div>
                      <div className="row" style={{ gap: 8 }}>
                        <b style={{ fontSize: 13, fontWeight: 550 }}>{release.name}</b>
                        {release.prerelease && <span className="badge warn">beta</span>}
                      </div>
                      <div className="tiny dim" style={{ marginTop: 4 }}>{release.assets.map((asset) => asset.name).join(' · ') || 'без файлов'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!remote.ok && remote.error && (
            <div className="card">
              <div className="card-head"><h2>Репозиторий версий</h2></div>
              <div className="hint-line">GitHub недоступен: {remote.error}. Журнал ниже собран из локального манифеста сборки.</div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Журнал версий</h2>
            <span className="hint">{versions.length} записей</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {versions.length === 0 && <div className="dim tiny">Манифест версий не найден.</div>}
            {versions.map((entry) => (
              <div className="release" key={entry.version}>
                <div>
                  <div className="tag">{entry.version}</div>
                  <div className="date">{entry.date}</div>
                </div>
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <b style={{ fontSize: 13, fontWeight: 550 }}>{entry.channel === 'beta' ? 'Бета' : 'Стабильная'}</b>
                    {entry.version === version && <span className="badge ok">текущая</span>}
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
