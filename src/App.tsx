import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, uid, type ChatMessage, type Country, type LegalCase, type Settings, type Theme, type UpdateStatus } from './api';
import { IconChat, IconDoc, IconFolder, IconRefresh, IconScales, IconSettings, Logo } from './components/Icons';
import ChatView from './views/ChatView';
import LawsView from './views/LawsView';
import DocsView from './views/DocsView';
import CasesView from './views/CasesView';
import UpdatesView from './views/UpdatesView';
import SettingsView from './views/SettingsView';

const demoConversation: ChatMessage[] = [
  {
    id: 'demo-user',
    role: 'user',
    text: 'Купил телефон за 54 990 ₽, через 3 недели перестал заряжаться. Магазин говорит, что это технически сложный товар и возврат невозможен. Что делать?'
  },
  {
    id: 'demo-ai',
    role: 'assistant',
    mode: 'ai',
    text: '**Короткий вывод:** отказ незаконен, если недостаток существенный или нарушены сроки ремонта. Сначала письменная претензия, 10 дней на возврат денег, затем неустойка 1% в день.\n\n**Обоснование**\n- Смартфон входит в перечень технически сложных товаров, поэтому после 15 дней возврат возможен только при существенном недостатке либо нарушении сроков устранения [1].\n- Недостаток обнаружен в течение гарантийного срока — продавец отвечает за него, если не докажет, что причина возникла после передачи товара [2].\n- Требование о возврате уплаченной суммы удовлетворяется в течение 10 дней [3], за просрочку начисляется неустойка 1% цены товара за каждый день [4].\n\n**Что делать**\n1. Подайте претензию в двух экземплярах, на своём — отметка о приёме; отказ принимать — заказное письмо с описью.\n2. Потребуйте проверку качества; при споре — независимая экспертиза, расходы взыскиваются с продавца.\n3. Через 10 дней — иск в суд по месту жительства: неустойка, штраф 50%, моральный вред.\n\nЭто справочная информация, а не юридическая помощь.',
    sources: [
      { id: 'ru-zpp-18', code: 'Закон о защите прав потребителей', number: 'ст. 18', title: 'Права при недостатках товара', country: 'RU', text: '' },
      { id: 'ru-gk2-475', code: 'ГК РФ ч. 2', number: 'ст. 475', title: 'Последствия передачи товара ненадлежащего качества', country: 'RU', text: '' },
      { id: 'ru-zpp-22', code: 'Закон о защите прав потребителей', number: 'ст. 22', title: 'Срок возврата денег', country: 'RU', text: '' },
      { id: 'ru-zpp-23', code: 'Закон о защите прав потребителей', number: 'ст. 23', title: 'Неустойка за просрочку', country: 'RU', text: '' }
    ]
  }
];

export type ViewId = 'chat' | 'laws' | 'documents' | 'cases' | 'updates' | 'settings';

const viewMeta: Record<ViewId, { title: string; sub: string; icon: typeof IconChat }> = {
  chat: { title: 'Консультация', sub: 'ИИ + нормы из локальной базы', icon: IconChat },
  laws: { title: 'Законы', sub: 'поиск по нормам всех стран', icon: IconScales },
  documents: { title: 'Документы', sub: 'Шаблоны и выгрузка в .txt / .md / .doc', icon: IconDoc },
  cases: { title: 'Дела', sub: 'Клиенты, заметки, файлы', icon: IconFolder },
  updates: { title: 'Версии', sub: 'Портативная сборка, установщик, обновления', icon: IconRefresh },
  settings: { title: 'Настройки', sub: 'Модель, тема, канал обновлений', icon: IconSettings }
};

export default function App() {
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

  const applyTheme = useCallback((theme: Theme, persist = false) => {
    document.documentElement.dataset.theme = theme;
    setSettings((prev) => (prev ? { ...prev, theme } : prev));
    if (persist) api.saveSettings({ theme });
  }, []);

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
      const safe = loaded ?? {
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama3.1',
        apiKey: '',
        temperature: 0.25,
        theme: 'midnight' as Theme,
        channel: 'stable' as const,
        language: 'ru',
        feedUrl: '',
        autoUpdate: true,
        country: 'RU'
      };
      setSettings(safe);
      document.documentElement.dataset.theme = safe.theme;
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
    window.__nexusShots = {
      set: (theme, nextView) => {
        applyTheme(theme, false);
        setView(nextView as ViewId);
        if (nextView === 'chat') setMessages((prev) => (prev.length ? prev : demoConversation));
      }
    };
  }, [applyTheme]);

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
                text: result.text || 'Модель не вернула ответ. Проверьте адрес сервера в настройках.',
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
    [busy, country]
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
          title: `Консультация ${new Date().toLocaleDateString('ru-RU')}`,
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
    [cases, country]
  );

  const refreshCases = useCallback(async () => {
    setCases(await api.cases());
  }, []);

  const meta = viewMeta[view];
  const activeCount = view === 'laws' ? total.articles : view === 'cases' ? cases.length : 0;

  if (!settings) {
    return (
      <div className="app">
        <div />
        <div className="main">
          <div className="titlebar"><span className="tb-dot" /><span className="tb-title">Nexus-Юрист</span></div>
          <div className="page">
            <div className="empty">Загрузка правовой базы…</div>
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
            <div className="brand-name">Nexus-Юрист</div>
            <div className="brand-sub">Nexus × АутSquad</div>
          </div>
        </div>

        <nav className="nav">
          {(Object.keys(viewMeta) as ViewId[]).map((id) => {
            const ItemIcon = viewMeta[id].icon;
            const count = id === 'laws' ? total.articles : id === 'cases' ? cases.length : 0;
            return (
              <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>
                <span className="nav-icon"><ItemIcon size={17} /></span>
                {viewMeta[id].title}
                {count > 0 && <span className="nav-count num">{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="side-note">
            <strong>Справочная выдержка.</strong> Нормы проверяйте в актуальной редакции. Приложение не заменяет адвоката.
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
          <span className="tb-title">{settings.model || 'модель не выбрана'}</span>
          <div className="tb-right">
            <div className="theme-switch">
              {(['midnight', 'ivory', 'aurum'] as Theme[]).map((theme) => (
                <button
                  key={theme}
                  className={`theme-dot ${settings.theme === theme ? 'active' : ''}`}
                  data-theme-opt={theme}
                  onClick={() => applyTheme(theme, true)}
                  title={theme === 'midnight' ? 'Тёмная фиолетовая' : theme === 'ivory' ? 'Светлая синяя' : 'Золотая'}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="topbar">
          <div>
            <h1>{meta.title}</h1>
            <div className="sub">{meta.sub}</div>
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
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            )}
            {activeCount > 0 && <span className="badge">{activeCount} в базе</span>}
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
              countryName={countries.find((item) => item.code === country)?.name ?? 'Россия'}
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
            <SettingsView settings={settings} onSave={saveSettings} info={info} onTheme={(theme) => applyTheme(theme, true)} />
          )}
        </div>
      </div>
    </div>
  );
}
