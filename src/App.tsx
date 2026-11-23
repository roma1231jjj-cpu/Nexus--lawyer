import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, uid, type ChatMessage, type Country, type LegalCase, type Settings, type Theme, type UpdateStatus } from './api';
import { IconChat, IconDoc, IconFolder, IconRefresh, IconScales, IconSettings, Logo } from './components/Icons';
import ChatView from './views/ChatView';
import LawsView from './views/LawsView';
import DocsView from './views/DocsView';
import CasesView from './views/CasesView';
import UpdatesView from './views/UpdatesView';
import SettingsView from './views/SettingsView';
import { countryLabel, formatDate, setLang, useDemo, useLang, useT } from './i18n';
import type { Lang } from './i18n';

export type ViewId = 'chat' | 'laws' | 'documents' | 'cases' | 'updates' | 'settings';

const viewMeta: Record<ViewId, { title: Parameters<ReturnType<typeof useT>>[0]; sub: Parameters<ReturnType<typeof useT>>[0]; icon: typeof IconChat }> = {
  chat: { title: 'nav.chat', sub: 'nav.chatSub', icon: IconChat },
  laws: { title: 'nav.laws', sub: 'nav.lawsSub', icon: IconScales },
  documents: { title: 'nav.documents', sub: 'nav.documentsSub', icon: IconDoc },
  cases: { title: 'nav.cases', sub: 'nav.casesSub', icon: IconFolder },
  updates: { title: 'nav.updates', sub: 'nav.updatesSub', icon: IconRefresh },
  settings: { title: 'nav.settings', sub: 'nav.settingsSub', icon: IconSettings }
};

const emptySettings: Settings = {
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

export default function App() {
  const t = useT();
  const lang = useLang();
  const demo = useDemo();
  const [view, setView] = useState<ViewId>('chat');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [counts, setCounts] = useState<Record<string, { name: string; flag: string; count: number }>>({});
  const [total, setTotal] = useState({ articles: 0, countries: 0 });
  const [country, setCountry] = useState('RU');
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [update, setUpdate] = useState<UpdateStatus>({ stage: 'idle' });
  const [info, setInfo] = useState<{ version: string; packaged: boolean; userData: string; electron: string } | null>(null);
  const requestRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  messagesRef.current = messages;

  const demoConversation = useMemo<ChatMessage[]>(
    () => [
      { id: 'demo-user', role: 'user', text: demo.question },
      {
        id: 'demo-ai',
        role: 'assistant',
        mode: 'ai',
        text: demo.answer,
        sources: demo.sources.map((source) => ({ ...source, country: 'RU', text: '' }))
      }
    ],
    [demo]
  );

  const applyTheme = useCallback((theme: Theme, persist = false) => {
    document.documentElement.dataset.theme = theme;
    setSettings((prev) => (prev ? { ...prev, theme } : prev));
    if (persist) api.saveSettings({ theme });
  }, []);

  const changeLanguage = useCallback(
    (next: Lang) => {
      setLang(next);
      setSettings((prev) => (prev ? { ...prev, language: next } : prev));
      api.saveSettings({ language: next }).catch(() => undefined);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, overview, appInfo, list, status] = await Promise.all([
        api.getSettings().catch(() => null),
        api.lawsOverview().catch(() => ({ countries: [], counts: {}, total: { articles: 0, countries: 0 } })),
        api.info().catch(() => null),
        api.cases().catch(() => []),
        api.updateStatus().catch(() => ({ stage: 'idle' as const }))
      ]);
      if (cancelled) return;
      const safe = loaded ?? emptySettings;
      setSettings(safe);
      document.documentElement.dataset.theme = safe.theme;
      if (safe.language === 'en' || safe.language === 'ru') setLang(safe.language);
      setCountries(overview.countries);
      setCounts(overview.counts);
      setTotal(overview.total);
      setCountry(safe.country || 'RU');
      setCases(list);
      setInfo(appInfo);
      setUpdate(status);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const offChunk = api.onChunk(({ requestId, delta }) => {
      if (requestRef.current !== requestId) return;
      setMessages((prev) => prev.map((msg) => (msg.id === requestId ? { ...msg, text: msg.text + delta } : msg)));
    });
    const offUpdate = api.onUpdate((status) => setUpdate(status));
    return () => {
      offChunk();
      offUpdate();
    };
  }, []);

  useEffect(() => {
    setMessages((prev) => (prev.some((msg) => msg.id.startsWith('demo')) ? demoConversation : prev));
  }, [demoConversation]);

  useEffect(() => {
    window.__nexusShots = {
      set: (theme, nextView, nextLang) => {
        applyTheme(theme, false);
        if (nextLang) changeLanguage(nextLang);
        setView(nextView as ViewId);
        if (nextView === 'chat') setMessages((prev) => (prev.length ? prev : demoConversation));
      }
    };
  }, [applyTheme, changeLanguage, demoConversation]);

  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = await api.saveSettings(patch);
    setSettings(next);
    if (patch.theme) document.documentElement.dataset.theme = next.theme;
    if (patch.country) setCountry(next.country);
    return next;
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      const requestId = uid();
      requestRef.current = requestId;
      const history = messagesRef.current
        .filter((msg) => !msg.pending && msg.text.trim())
        .slice(-8)
        .map((msg) => ({ role: msg.role, content: msg.text }));

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'user', text },
        { id: requestId, role: 'assistant', text: '', pending: true }
      ]);
      setBusy(true);
      setView('chat');

      const result = await api.chat({ requestId, messages: history, query: text, country });
      requestRef.current = null;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === requestId
            ? {
                ...msg,
                text: result.text || t('chat.emptyAnswer'),
                sources: result.sources,
                mode: result.mode,
                error: result.error,
                pending: false
              }
            : msg
        )
      );
      setBusy(false);
    },
    [busy, country, t]
  );

  const stop = useCallback(async () => {
    if (requestRef.current) {
      await api.stop(requestRef.current);
      setMessages((prev) => prev.map((msg) => (msg.id === requestRef.current ? { ...msg, pending: false } : msg)));
      requestRef.current = null;
    }
    setBusy(false);
  }, []);

  const saveToCase = useCallback(
    async (message: ChatMessage) => {
      let target = cases[0];
      if (!target) {
        target = {
          id: uid(),
          title: t('app.caseTitle', { date: formatDate(new Date(), lang) }),
          client: '',
          status: 'open',
          country,
          summary: message.text.slice(0, 160),
          notes: [],
          files: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      const saved = await api.saveCase({
        ...target,
        notes: [...target.notes, { id: uid(), text: message.text, createdAt: new Date().toISOString() }]
      });
      setCases((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
    },
    [cases, country, lang, t]
  );

  const refreshCases = useCallback(async () => {
    setCases(await api.cases());
  }, []);

  const meta = viewMeta[view];
  const activeCount = view === 'laws' ? total.articles : view === 'cases' ? cases.length : 0;
  const countryName = countryLabel(country, countries.find((item) => item.code === country)?.name, lang);

  if (!settings) {
    return (
      <div className="app">
        <div />
        <div className="main">
          <div className="titlebar"><span className="tb-dot" /><span className="tb-title">{t('app.name')}</span></div>
          <div className="page">
            <div className="empty">{t('app.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" key={lang}>
      <aside className="sidebar">
        <div className="brand">
          <Logo size={38} />
          <div className="brand-text">
            <div className="brand-name">{t('app.name')}</div>
            <div className="brand-sub">{t('app.brand')}</div>
          </div>
        </div>

        <nav className="nav">
          {(Object.keys(viewMeta) as ViewId[]).map((id) => {
            const ItemIcon = viewMeta[id].icon;
            const count = id === 'laws' ? total.articles : id === 'cases' ? cases.length : 0;
            return (
              <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)} title={t(viewMeta[id].sub)}>
                <span className="nav-icon"><ItemIcon size={17} /></span>
                {t(viewMeta[id].title)}
                {count > 0 && <span className="nav-count num">{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="side-note">
            <strong>{t('app.footerTitle')}</strong> {t('app.footerNote')}
          </div>
          <div className="side-meta">
            <span>v{info?.version ?? '1.0.0'}</span>
            <span>{info?.packaged ? 'portable / installer' : 'dev'}</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="titlebar">
          <span className="tb-dot" />
          <span className="tb-title">{settings.model || t('app.noModel')}</span>
          <div className="tb-right">
            <div className="theme-switch">
              {(['midnight', 'ivory', 'aurum'] as Theme[]).map((theme) => (
                <button
                  key={theme}
                  className={`theme-dot ${settings.theme === theme ? 'active' : ''}`}
                  data-theme-opt={theme}
                  onClick={() => applyTheme(theme, true)}
                  title={t(theme === 'midnight' ? 'theme.midnight' : theme === 'ivory' ? 'theme.ivory' : 'theme.aurum')}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="topbar">
          <div>
            <h1>{t(meta.title)}</h1>
            <div className="sub">{t(meta.sub)}</div>
          </div>
          <div className="topbar-actions">
            {view === 'chat' && (
              <select
                className="input"
                style={{ width: 190, height: 34, padding: '0 10px' }}
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  saveSettings({ country: event.target.value });
                }}
              >
                {countries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {countryLabel(item.code, item.name, lang)} ({item.code})
                  </option>
                ))}
              </select>
            )}
            {activeCount > 0 && <span className="badge">{t('app.inBase', { n: activeCount })}</span>}
            <button className="btn ghost sm" onClick={() => setView('updates')}>
              <IconRefresh size={14} /> v{info?.version ?? '1.0.0'}
            </button>
          </div>
        </div>

        <div className="page no-pad">
          {view === 'chat' && (
            <ChatView
              messages={messages}
              busy={busy}
              onSend={send}
              onStop={stop}
              onClear={() => setMessages([])}
              onSaveToCase={saveToCase}
              onOpenSettings={() => setView('settings')}
              countryName={countryName}
              model={settings.model}
            />
          )}
          {view === 'laws' && (
            <LawsView
              countries={countries}
              counts={counts}
              total={total}
              country={country}
              onCountry={(code) => {
                setCountry(code);
                saveSettings({ country: code });
              }}
              onAsk={(question) => {
                setView('chat');
                send(question);
              }}
            />
          )}
          {view === 'documents' && <DocsView />}
          {view === 'cases' && <CasesView cases={cases} country={country} onChange={refreshCases} />}
          {view === 'updates' && <UpdatesView info={info} settings={settings} update={update} setUpdate={setUpdate} />}
          {view === 'settings' && (
            <SettingsView
              settings={settings}
              onSave={saveSettings}
              info={info}
              onTheme={(theme) => applyTheme(theme, true)}
              onLanguage={changeLanguage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
