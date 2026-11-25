import { useState } from 'react';
import { api, type Country, type Settings, type Theme } from '../api';
import { IconFolder, IconRefresh, IconSpark } from '../components/Icons';
import { countryLabel, useLang, useT } from '../i18n';
import type { Lang } from '../i18n';

type Props = {
  settings: Settings;
  countries: Country[];
  onSave: (patch: Partial<Settings>) => Promise<Settings>;
  onTheme: (theme: Theme) => void;
  onLanguage: (lang: Lang) => void;
  info: { version: string; userData: string; electron: string; packaged: boolean } | null;
};

const presets = [
  { label: 'Ollama', url: 'http://127.0.0.1:11434/v1', model: 'llama3.1' },
  { label: 'llama.cpp', url: 'http://127.0.0.1:8080/v1', model: 'local' },
  { label: 'Ada 4B', url: 'http://127.0.0.1:8090/v1', model: 'ada' },
  { label: 'Nexus-Harness', url: 'http://127.0.0.1:8848/v1', model: 'nexus' },
  { label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
];

const isLocal = (url: string) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/i.test(url.trim());

export default function SettingsView({ settings, countries, onSave, onTheme, onLanguage, info }: Props) {
  const t = useT();
  const lang = useLang();
  const [models, setModels] = useState<string[]>([]);
  const [probe, setProbe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(settings);

  const persist = async (patch: Partial<Settings>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    try {
      const next = await onSave(patch);
      setDraft(next);
      setError(null);
    } catch {
      setError(t('settings.saveFailed'));
    }
  };

  const persistFeed = () => {
    const value = draft.feedUrl.trim();
    if (value && !/^https?:\/\/.+/i.test(value)) {
      setError(t('settings.feedInvalid'));
      return;
    }
    void persist({ feedUrl: value });
  };

  const probeModels = async () => {
    setProbe(t('settings.probing'));
    try {
      const result = await api.models(draft);
      if (result.ok) {
        setModels(result.models);
        setProbe(t('settings.found', { n: result.models.length }));
      } else {
        setModels([]);
        setProbe(t('settings.noServer', { error: result.error ?? t('settings.noLink') }));
      }
    } catch (err) {
      setModels([]);
      setProbe(t('settings.probeFailed', { error: err instanceof Error ? err.message : String(err) }));
    }
  };

  const remoteWithKey = draft.apiKey.length > 0 && !isLocal(draft.baseUrl);

  return (
    <div className="page">
      <div className="settings">
        <div className="card">
          <div className="card-head">
            <IconSpark size={16} />
            <h2>{t('settings.model')}</h2>
            <span className="hint">{t('settings.apiCompat')}</span>
          </div>

          <div className="row" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
            {presets.map((preset) => (
              <button key={preset.label} className="chip" onClick={() => void persist({ baseUrl: preset.url, model: preset.model })}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="field">
            <label>{t('settings.baseUrl')}</label>
            <input
              className="input"
              value={draft.baseUrl}
              onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
              onBlur={() => void persist({ baseUrl: draft.baseUrl.trim() })}
            />
          </div>
          <div className="field">
            <label>{t('settings.modelName')}</label>
            <div className="row">
              <input
                className="input"
                value={draft.model}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
                onBlur={() => void persist({ model: draft.model.trim() })}
              />
              <button className="btn sm" onClick={probeModels}>
                <IconRefresh size={13} /> {t('settings.find')}
              </button>
            </div>
            {models.length > 0 && (
              <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                {models.slice(0, 12).map((model) => (
                  <button key={model} className={`chip ${draft.model === model ? 'active' : ''}`} onClick={() => void persist({ model })}>
                    {model}
                  </button>
                ))}
              </div>
            )}
            {probe && <div className="hint-line">{probe}</div>}
          </div>
          <div className="field">
            <label>{t('settings.apiKey')}</label>
            <input
              className="input"
              type="password"
              autoComplete="off"
              value={draft.apiKey}
              placeholder={t('settings.apiKeyPlaceholder')}
              onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
              onBlur={() => void persist({ apiKey: draft.apiKey.trim() })}
            />
            <div className="hint-line">{remoteWithKey ? t('settings.keyRemoteWarning') : t('settings.keyLocalHint')}</div>
          </div>
          <div className="field">
            <label>{t('settings.temperature', { value: draft.temperature.toFixed(2) })}</label>
            <input
              className="range"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.temperature}
              onChange={(event) => setDraft({ ...draft, temperature: Number(event.target.value) })}
              onPointerUp={() => void persist({ temperature: draft.temperature })}
              onKeyUp={() => void persist({ temperature: draft.temperature })}
              onBlur={() => void persist({ temperature: draft.temperature })}
            />
            <div className="hint-line">{t('settings.temperatureHint')}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>{t('settings.interface')}</h2>
          </div>
          <div className="field">
            <label>{t('settings.language')}</label>
            <div className="row">
              {(['ru', 'en'] as Lang[]).map((option) => (
                <button
                  key={option}
                  className={`chip ${lang === option ? 'active' : ''}`}
                  data-lang-opt={option}
                  onClick={() => onLanguage(option)}
                >
                  {option === 'ru' ? 'RU' : 'EN'}
                  <span style={{ marginLeft: 6, opacity: 0.72 }}>{option === 'ru' ? t('settings.ru') : t('settings.en')}</span>
                </button>
              ))}
            </div>
            <div className="hint-line">{t('settings.languageHint')}</div>
          </div>
          <div className="field">
            <label>{t('settings.theme')}</label>
            <div className="row">
              {(['midnight', 'ivory', 'aurum'] as Theme[]).map((theme) => (
                <button
                  key={theme}
                  className={`chip ${settings.theme === theme ? 'active' : ''}`}
                  onClick={() => onTheme(theme)}
                  aria-pressed={settings.theme === theme}
                  aria-label={t(theme === 'midnight' ? 'theme.midnight' : theme === 'ivory' ? 'theme.ivory' : 'theme.aurum')}
                >
                  <span className={`theme-dot ${settings.theme === theme ? 'active' : ''}`} data-theme-opt={theme} style={{ width: 12, height: 12 }} aria-hidden="true" />
                  {t(theme === 'midnight' ? 'theme.midnight' : theme === 'ivory' ? 'theme.ivory' : 'theme.aurum')}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>{t('settings.answerLanguage')}</label>
            <select className="input" value={draft.answerLanguage} onChange={(event) => void persist({ answerLanguage: event.target.value })}>
              <option value="ru">{t('settings.ru')}</option>
              <option value="en">{t('settings.en')}</option>
              <option value="de">{t('settings.de')}</option>
            </select>
            <div className="hint-line">{t('settings.answerLanguageHint')}</div>
          </div>
          <div className="field">
            <label>{t('settings.defaultCountry')}</label>
            <select className="input" value={draft.country} onChange={(event) => void persist({ country: event.target.value })}>
              <option value="ALL">{t('laws.allCountries')}</option>
              {countries.map((item) => (
                <option key={item.code} value={item.code}>
                  {countryLabel(item.code, item.name, lang)} ({item.code})
                </option>
              ))}
            </select>
            <div className="hint-line">{t('settings.defaultCountryHint')}</div>
          </div>
          <div className="field">
            <label>{t('settings.channel')}</label>
            <div className="row">
              <button className={`chip ${draft.channel === 'stable' ? 'active' : ''}`} onClick={() => void persist({ channel: 'stable' })} aria-pressed={draft.channel === 'stable'}>
                {t('updates.channelStable')}
              </button>
              <button className={`chip ${draft.channel === 'beta' ? 'active' : ''}`} onClick={() => void persist({ channel: 'beta' })} aria-pressed={draft.channel === 'beta'}>
                {t('updates.channelBeta')}
              </button>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('settings.customFeed')}</label>
            <input
              className="input"
              value={draft.feedUrl}
              placeholder={t('settings.customFeedPlaceholder')}
              onChange={(event) => setDraft({ ...draft, feedUrl: event.target.value })}
              onBlur={persistFeed}
            />
            <div className="hint-line">{t('settings.customFeedHint')}</div>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className={`switch ${settings.autoUpdate ? 'on' : ''}`} onClick={() => void persist({ autoUpdate: !settings.autoUpdate })} />
            <span className="tiny muted">{t('settings.autoUpdate')}</span>
          </div>
          {error && <div className="hint-line" style={{ color: 'var(--err, #d9534f)' }}>{error}</div>}
        </div>

        <div className="card wide">
          <div className="card-head">
            <IconFolder size={16} />
            <h2>{t('settings.data')}</h2>
            <button className="btn ghost sm hint" onClick={() => api.openDataFolder()}>{t('settings.openFolder')}</button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
            <div className="tiny dim">{t('settings.dataPath')} <b className="path">{info?.userData || '—'}</b></div>
            <div className="tiny dim">{t('settings.version')} <b>{info?.version}</b> · Electron <b>{info?.electron}</b> · {info?.packaged ? t('settings.packaged') : t('app.buildDev')}</div>
          </div>
          <div className="divider" />
          <div className="link-row">
            <a onClick={() => api.open('https://github.com/roma1231jjj-cpu/nexus-lawyer')}>{t('settings.repo')}</a>
            <a onClick={() => api.open('https://pravo.gov.ru')}>{t('settings.official')}</a>
            <a onClick={() => api.open('https://github.com/roma1231jjj-cpu/nexus-lawyer/releases')}>{t('settings.releases')}</a>
          </div>
          <div className="hint-line">{t('settings.privacy')}</div>
        </div>
      </div>
    </div>
  );
}
