import { useState } from 'react';
import { api, type Settings, type Theme } from '../api';
import { IconFolder, IconRefresh, IconSpark } from '../components/Icons';

type Props = {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => Promise<Settings>;
  onTheme: (theme: Theme) => void;
  info: { version: string; userData: string; electron: string; packaged: boolean } | null;
};

const presets = [
  { label: 'Ollama', url: 'http://127.0.0.1:11434/v1', model: 'llama3.1' },
  { label: 'llama.cpp', url: 'http://127.0.0.1:8080/v1', model: 'local' },
  { label: 'Ada 4B', url: 'http://127.0.0.1:8090/v1', model: 'ada' },
  { label: 'Nexus-Harness', url: 'http://127.0.0.1:8848/v1', model: 'nexus' },
  { label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
];

export default function SettingsView({ settings, onSave, onTheme, info }: Props) {
  const [models, setModels] = useState<string[]>([]);
  const [probe, setProbe] = useState<string | null>(null);
  const [draft, setDraft] = useState(settings);

  const persist = async (patch: Partial<Settings>) => {
    setDraft({ ...draft, ...patch });
    await onSave(patch);
  };

  const probeModels = async () => {
    setProbe('Опрашиваю сервер…');
    const result = await api.models(draft);
    if (result.ok) {
      setModels(result.models);
      setProbe(`Найдено моделей: ${result.models.length}`);
    } else {
      setModels([]);
      setProbe(`Сервер не отвечает (${result.error ?? 'нет связи'})`);
    }
  };

  return (
    <div className="page">
      <div className="settings">
        <div className="card">
          <div className="card-head">
            <IconSpark size={16} />
            <h2>Модель</h2>
            <span className="hint">OpenAI-совместимый API</span>
          </div>

          <div className="row" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
            {presets.map((preset) => (
              <button key={preset.label} className="chip" onClick={() => persist({ baseUrl: preset.url, model: preset.model })}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="field">
            <label>Адрес сервера</label>
            <input className="input" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} onBlur={() => persist({ baseUrl: draft.baseUrl })} />
          </div>
          <div className="field">
            <label>Модель</label>
            <div className="row">
              <input className="input" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} onBlur={() => persist({ model: draft.model })} />
              <button className="btn sm" onClick={probeModels}>
                <IconRefresh size={13} /> найти
              </button>
            </div>
            {models.length > 0 && (
              <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                {models.slice(0, 12).map((model) => (
                  <button key={model} className={`chip ${draft.model === model ? 'active' : ''}`} onClick={() => persist({ model })}>
                    {model}
                  </button>
                ))}
              </div>
            )}
            {probe && <div className="hint-line">{probe}</div>}
          </div>
          <div className="field">
            <label>API-ключ (если нужен)</label>
            <input className="input" type="password" value={draft.apiKey} placeholder="не требуется для локальных моделей" onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} onBlur={() => persist({ apiKey: draft.apiKey })} />
          </div>
          <div className="field">
            <label>Температура: {draft.temperature.toFixed(2)}</label>
            <input
              className="range"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.temperature}
              onChange={(event) => setDraft({ ...draft, temperature: Number(event.target.value) })}
              onMouseUp={() => persist({ temperature: draft.temperature })}
            />
            <div className="hint-line">0,1–0,3 — точные нормы и ссылки; выше — свободнее формулировки.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Интерфейс</h2>
          </div>
          <div className="field">
            <label>Тема</label>
            <div className="row">
              {(['midnight', 'ivory', 'aurum'] as Theme[]).map((theme) => (
                <button key={theme} className={`chip ${settings.theme === theme ? 'active' : ''}`} onClick={() => onTheme(theme)}>
                  <span className={`theme-dot ${settings.theme === theme ? 'active' : ''}`} data-theme-opt={theme} style={{ width: 12, height: 12 }} />
                  {theme === 'midnight' ? 'Midnight' : theme === 'ivory' ? 'Ivory' : 'Aurum'}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Язык ответов</label>
            <select className="input" value={draft.language} onChange={(event) => persist({ language: event.target.value })}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="field">
            <label>Право страны по умолчанию</label>
            <input className="input" value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value.toUpperCase() })} onBlur={() => persist({ country: draft.country })} />
          </div>
          <div className="field">
            <label>Канал обновлений</label>
            <div className="row">
              <button className={`chip ${draft.channel === 'stable' ? 'active' : ''}`} onClick={() => persist({ channel: 'stable' })}>stable</button>
              <button className={`chip ${draft.channel === 'beta' ? 'active' : ''}`} onClick={() => persist({ channel: 'beta' })}>beta</button>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Свой сервер обновлений (generic)</label>
            <input className="input" value={draft.feedUrl} placeholder="пусто = GitHub Releases" onChange={(event) => setDraft({ ...draft, feedUrl: event.target.value })} onBlur={() => persist({ feedUrl: draft.feedUrl })} />
            <div className="hint-line">Папка со latest.yml и .exe подойдёт: внутренний сервер, S3, любой https-хостинг.</div>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className={`switch ${settings.autoUpdate ? 'on' : ''}`} onClick={() => persist({ autoUpdate: !settings.autoUpdate })} />
            <span className="tiny muted">Проверять обновления при запуске</span>
          </div>
        </div>

        <div className="card wide">
          <div className="card-head">
            <IconFolder size={16} />
            <h2>Данные</h2>
            <button className="btn ghost sm hint" onClick={() => api.openDataFolder()}>открыть папку</button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
            <div className="tiny dim">Настройки, дела и импортированные законы: <b>{info?.userData || '—'}</b></div>
            <div className="tiny dim">Версия: <b>{info?.version}</b> · Electron <b>{info?.electron}</b> · {info?.packaged ? 'собранная сборка' : 'dev'}</div>
          </div>
          <div className="divider" />
          <div className="link-row">
            <a onClick={() => api.open('https://github.com/roma1231jjj-cpu/Nexus--lawyer')}>репозиторий</a>
            <a onClick={() => api.open('https://pravo.gov.ru')}>pravo.gov.ru — официальные публикации</a>
            <a onClick={() => api.open('https://github.com/roma1231jjj-cpu/Nexus--lawyer/releases')}>релизы и обновления</a>
          </div>
          <div className="hint-line">
            Nexsus-Юрист хранит всё локально: ни запросы, ни дела не уходят на сторонние серверы, кроме выбранной вами модели.
          </div>
        </div>
      </div>
    </div>
  );
}
