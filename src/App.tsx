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
  answerLanguage: 'ru',
  feedUrl: '',
  autoUpdate: true,
  country: 'ALL'
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
  const [country, setCountry] = useState('ALL');
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [update, setUpdate] = useState<UpdateStatus>({ stage: 'idle' });
  const [info, setInfo] = useState<{ version: string; packaged: boolean; userData: string; electron: string; shots?: boolean } | null>(null);
  const [pendingSave, setPendingSave] = useState<ChatMessage | null>(null);
  const [saveTarget, setSaveTarget] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const requestRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const queuedRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const countryRef = useRef('ALL');
  const demoOn = Boolean(info?.shots);

  messagesRef.current = messages;
  countryRef.current = country;

  const demoConversation = useMemo<ChatMessage[]>(
    () => [
      { id: 'demo-user', role: 'user', text: demo.question },
      {
        id: 'demo-ai',
        role: 'assistant',
        mode: 'ai',
        text: demo.answer,
        sources: demo.sources.map((source) => ({ ...source, text: '', country: 'RU' }))
      }
    ],
    [demo]
  );

  const applyTheme = useCallback((theme: Theme, persist = false) => {
    document.documentElement.dataset.theme = theme;
    setSettings((prev) => (prev ? { ...prev, theme } : prev));
    if (persist) api.saveSettings({ theme }).catch(() => undefined);
  }, []);

  const changeUiLanguage = useCallback((next: Lang) => {
    setLang(next);
    setSettings((prev) => (prev ? { ...prev, language: next } : prev));
    api.saveSettings({ language: next }).catch(() => setToast(t('settings.saveFailed')));
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, overview, appInfo, list, status, history] = await Promise.all([
        api.getSettings().catch(() => null),
        api.lawsOverview().catch(() => ({ countries: [], counts: {}, total: { articles: 0, countries: 0 } })),
        api.info().catch(() => null),
        api.cases().catch(() => []),
        api.updateStatus().catch(() => ({ stage: 'idle' as const })),
        api.chatHistory?.().catch(() => []) ?? Promise.resolve([])
      ]);
      if (cancelled) return;
      const safe = loaded ?? emptySettings;
      setSettings(safe);
      document.documentElement.dataset.theme = safe.theme;
      if (safe.language === 'en' || safe.language === 'ru') setLang(safe.language);
      setCountries(overview.countries);
      setCounts(overview.counts);
      setTotal(overview.total);
      setCountry(safe.country || 'ALL');
      setCases(list);
      setInfo(appInfo);
      setUpdate(status);
      if (Array.isArray(history) && history.length) {
        // история на диске хранится без id — восстанавливаем ключи, иначе ломаются React и сохранение
        setMessages(
          history.map((item) => ({
            id: uid(),
            role: item.role === 'assistant' ? 'assistant' : 'user',
            text: String(item.text ?? '')
          }))
        );
      }
      setHistoryLoaded(true);
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

  // демо-диалог живёт только в режиме скриншотов, иначе образец попадал в реальные данные
  useEffect(() => {
    if (!demoOn) return;
    setMessages((prev) => (prev.length ? prev : demoConversation));
  }, [demoOn, demoConversation]);

  useEffect(() => {
    if (!demoOn) return;
    window.__nexusShots = {
      set: (theme, nextView, nextLang) => {
        applyTheme(theme, false);
        if (nextLang) changeUiLanguage(nextLang);
        setView(nextView as ViewId);
        if (nextView === 'chat') setMessages((prev) => (prev.length ? prev : demoConversation));
      }
    };
  }, [applyTheme, changeUiLanguage, demoConversation, demoOn]);

  // история чата переживает перезапуск
  useEffect(() => {
    if (!historyLoaded || !messages.length) return;
    const timer = setTimeout(() => {
      api.saveChat?.(messages.filter((msg) => !msg.pending && !msg.id.startsWith('demo'))).catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
  }, [historyLoaded, messages]);

  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = await api.saveSettings(patch);
    setSettings(next);
    if (patch.theme) document.documentElement.dataset.theme = next.theme;
    if (patch.country) setCountry(next.country);
    return next;
  }, []);

  const runChat = useCallback(
    async (text: string, targetCountry: string) => {
      const requestId = uid();
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      requestRef.current = requestId;
      const history = messagesRef.current
        .filter((msg) => !msg.pending && !msg.id.startsWith('demo') && msg.text.trim())
        .slice(-8)
        .map((msg) => ({ role: msg.role, content: msg.text }));

      setMessages((prev) => [...prev, { id: uid(), role: 'user', text }, { id: requestId, role: 'assistant', text: '', pending: true }]);
      setBusy(true);
      setView('chat');

      try {
        const result = await api.chat({ requestId, messages: history, query: text, country: targetCountry });
        if (generationRef.current !== generation) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === requestId
              ? {
                  ...msg,
                  text: result.text || (result.cancelled ? t('chat.cancelled') : t('chat.emptyAnswer')),
                  sources: result.sources,
                  mode: result.mode,
                  error: result.error,
                  cancelled: result.cancelled,
                  pending: false,
                  country: targetCountry
                }
              : msg
          )
        );
      } catch (error) {
        if (generationRef.current !== generation) return;
        const detail = error instanceof Error ? error.message : String(error);
        setMessages((prev) =>
          prev.map((msg) => (msg.id === requestId ? { ...msg, text: '', mode: 'offline', error: detail, pending: false } : msg))
        );
      } finally {
        if (generationRef.current === generation) {
          requestRef.current = null;
          setBusy(false);
          const queued = queuedRef.current;
          queuedRef.current = null;
          if (queued) void runChat(queued, countryRef.current);
        }
      }
    },
    [t]
  );

  const send = useCallback(
    (raw: string): boolean => {
      const text = raw.trim();
      if (!text) return false;
      if (busy) {
        queuedRef.current = text;
        setToast(t('chat.queued'));
        return true;
      }
      setDraft('');
      void runChat(text, countryRef.current);
      return false;
    },
    [busy, runChat, t]
  );

  const stop = useCallback(async () => {
    const current = requestRef.current;
    generationRef.current += 1;
    if (current) {
      await api.stop(current).catch(() => undefined);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === current ? { ...msg, pending: false, cancelled: true, text: msg.text || t('chat.cancelled') } : msg
        )
      );
      requestRef.current = null;
    }
    queuedRef.current = null;
    setBusy(false);
  }, [t]);

  const clearChat = useCallback(async () => {
    if (requestRef.current) {
      await stop();
    }
    setMessages([]);
    await api.clearChat?.().catch(() => undefined);
  }, [stop]);

  const changeCountry = useCallback(
    async (code: string) => {
      if (code === country) return;
      const hadContext = messages.some((msg) => !msg.id.startsWith('demo') && !msg.pending);
      setCountry(code);
      countryRef.current = code;
      await saveSettings({ country: code }).catch(() => setToast(t('settings.saveFailed')));
      if (hadContext) {
        // не смешиваем правовые системы: контекст прошлой страны стираем
        if (requestRef.current) await stop();
        setMessages([]);
        await api.clearChat?.().catch(() => undefined);
        setToast(t('chat.contextCleared'));
      }
    },
    [country, messages, saveSettings, stop, t]
  );

  const openSaveToCase = useCallback(
    (message: ChatMessage) => {
      if (message.pending) {
        setToast(t('chat.waitAnswer'));
        return;
      }
      setSaveTarget(cases[0]?.id ?? '__new');
      setPendingSave(message);
    },
    [cases, t]
  );

  const confirmSaveToCase = useCallback(async () => {
    const message = pendingSave;
    if (!message) return;
    const question = (() => {
      const index = messages.findIndex((item) => item.id === message.id);
      const before = index > 0 ? messages[index - 1] : null;
      return before && before.role === 'user' ? before.text : '';
    })();
    const lines = [
      question ? `${t('chat.question')}: ${question}` : '',
      `${t('chat.answer')}:`,
      message.text,
      message.sources?.length
        ? `\n${t('chat.sources')}:\n${message.sources
            .map((source, i) => `[${i + 1}] (${source.country}) ${source.code}, ${source.number}. ${source.title}`)
            .join('\n')}`
        : '',
      `\n${t('chat.mode')}: ${message.mode === 'offline' ? t('chat.modeOffline') : t('chat.modeAi')}${
        message.error ? ` (${message.error})` : ''
      }`,
      `${t('settings.defaultCountry')}: ${message.country ?? country}`
    ].filter(Boolean);

    const existing = cases.find((item) => item.id === saveTarget);
    const target: LegalCase = existing ?? {
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
    try {
      const saved = await api.saveCase({
        ...target,
        notes: [...target.notes, { id: uid(), text: lines.join('\n'), createdAt: new Date().toISOString() }]
      });
      if (!saved.ok || !saved.item) {
        setPendingSave(null);
        setToast(saved.error === 'stale' ? t('cases.stale') : t('cases.saveFailed'));
        return;
      }
      setCases((prev) => [saved.item!, ...prev.filter((item) => item.id !== saved.item!.id)]);
      setPendingSave(null);
      setToast(t('cases.savedTo', { title: saved.item.title || t('cases.untitled') }));
    } catch {
      setPendingSave(null);
      setToast(t('cases.saveFailed'));
    }
  }, [cases, country, lang, messages, pendingSave, saveTarget, t]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

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
    <div className="app">
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
              <button
                key={id}
                className={`nav-item ${view === id ? 'active' : ''}`}
                onClick={() => setView(id)}
                title={t(viewMeta[id].sub)}
              >
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
            <span>{info?.packaged ? t('app.buildPortable') : t('app.buildDev')}</span>
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
                  aria-label={t(theme === 'midnight' ? 'theme.midnight' : theme === 'ivory' ? 'theme.ivory' : 'theme.aurum')}
                  aria-pressed={settings.theme === theme}
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
            {(view === 'chat' || view === 'laws') && (
              <select
                className="input"
                style={{ width: 210, height: 34, padding: '0 10px' }}
                value={country}
                aria-label={t('settings.defaultCountry')}
                onChange={(event) => void changeCountry(event.target.value)}
              >
                <option value="ALL">{t('laws.allCountries')}</option>
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
              draft={draft}
              onDraft={setDraft}
              onSend={send}
              onStop={stop}
              onClear={clearChat}
              onSaveToCase={openSaveToCase}
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
              onCountry={(code) => void changeCountry(code)}
              onAsk={(question, articleCountry) => {
                if (articleCountry && articleCountry !== country) {
                  setToast(t('laws.askOther'));
                }
                setView('chat');
                void (async () => {
                  if (articleCountry && articleCountry !== countryRef.current) {
                    setCountry(articleCountry);
                    countryRef.current = articleCountry;
                    await saveSettings({ country: articleCountry }).catch(() => undefined);
                  }
                  send(question);
                })();
              }}
              onImported={async () => {
                const overview = await api.lawsOverview().catch(() => null);
                if (overview) {
                  setCountries(overview.countries);
                  setCounts(overview.counts);
                  setTotal(overview.total);
                }
              }}
            />
          )}
          {view === 'documents' && <DocsView country={country} demo={demoOn} />}
          {view === 'cases' && <CasesView cases={cases} country={country} onChange={refreshCases} />}
          {view === 'updates' && <UpdatesView info={info} settings={settings} update={update} setUpdate={setUpdate} />}
          {view === 'settings' && (
            <SettingsView
              settings={settings}
              countries={countries}
              onSave={saveSettings}
              info={info}
              onTheme={(theme) => applyTheme(theme, true)}
              onLanguage={changeUiLanguage}
            />
          )}
        </div>
      </div>

      {pendingSave && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t('cases.saveToCaseTitle')} onClick={() => setPendingSave(null)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="card-head">
              <IconFolder size={16} />
              <h2>{t('cases.saveToCaseTitle')}</h2>
            </div>
            <div className="field">
              <label>{t('cases.card')}</label>
              <select className="input" value={saveTarget} onChange={(event) => setSaveTarget(event.target.value)}>
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || t('cases.untitled')}
                  </option>
                ))}
                <option value="__new">{t('cases.saveToNew')}</option>
              </select>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost sm" onClick={() => setPendingSave(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn primary sm" onClick={confirmSaveToCase}>
                {t('cases.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
