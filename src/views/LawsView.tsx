import { useEffect, useMemo, useState } from 'react';
import { api, type Article, type Country } from '../api';
import { IconArrow, IconDownload, IconSearch, IconSpark } from '../components/Icons';

type Props = {
  countries: Country[];
  counts: Record<string, { name: string; flag: string; count: number }>;
  total: { articles: number; countries: number };
  country: string;
  onCountry: (code: string) => void;
  onAsk: (question: string) => void;
};

export default function LawsView({ countries, counts, total, country, onCountry, onAsk }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [codes, setCodes] = useState<{ code: string; short: string; count: number }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState('ALL');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ article: Article; score: number }[] | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOpenId(null);
    setActiveCode('ALL');
    api.lawsCountry(country).then((data) => {
      if (cancelled) return;
      setArticles(data.articles);
      setCodes(data.codes);
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 3) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      api.lawsSearch({ query: value, country: 'ALL' }).then(setResults);
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const current = countries.find((item) => item.code === country);
  const list = useMemo(() => {
    if (results) return results.map((hit) => hit.article);
    return activeCode === 'ALL' ? articles : articles.filter((article) => article.code === activeCode);
  }, [results, activeCode, articles]);

  const importPack = async () => {
    const result = await api.lawsImport();
    if (result.imported > 0) {
      setImported(`Добавлено норм: ${result.imported}`);
      const data = await api.lawsCountry(country);
      setArticles(data.articles);
      setCodes(data.codes);
      setTimeout(() => setImported(null), 4000);
    }
  };

  return (
    <div className="split">
      <div className="side-panel">
        <div className="side-panel-head">
          <div className="search">
            <IconSearch size={14} />
            <input className="input" placeholder="Поиск по всем нормам" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="row tiny dim" style={{ justifyContent: 'space-between' }}>
            <span>{total.countries} стран</span>
            <span className="num">{total.articles} норм</span>
          </div>
        </div>
        <div className="side-panel-body">
          {countries.map((item) => {
            const stat = counts[item.code];
            return (
              <button
                key={item.code}
                className={`country-item ${item.code === country && !results ? 'active' : ''}`}
                onClick={() => {
                  setQuery('');
                  onCountry(item.code);
                }}
              >
                <span className="country-flag">{item.code}</span>
                <span>
                  <span className="country-name">{item.name}</span>
                  <span className="country-region">{item.region}</span>
                </span>
                <span className="country-count num">{stat?.count ?? 0}</span>
              </button>
            );
          })}
          <div style={{ padding: '10px 6px 4px' }}>
            <button className="btn ghost sm" style={{ width: '100%' }} onClick={importPack}>
              <IconDownload size={13} /> Импорт пакета
            </button>
            {imported && <div className="hint-line">{imported}</div>}
          </div>
        </div>
      </div>

      <div className="law-pane">
        <div className="law-head">
          <div className="law-title">
            <span className="flag-code">{results ? 'ALL' : current?.code ?? '—'}</span>
            <div>
              <h2>{results ? 'Результаты поиска' : current?.name ?? 'Законы'}</h2>
              <div className="sys">{results ? `по запросу «${query}»` : current?.system}</div>
            </div>
            <span className="badge" style={{ marginLeft: 'auto' }}>{list.length} норм</span>
          </div>
          {!results && (
            <div className="code-tabs">
              <button className={`tab ${activeCode === 'ALL' ? 'active' : ''}`} onClick={() => setActiveCode('ALL')}>
                Все ({articles.length})
              </button>
              {codes.map((code) => (
                <button key={code.code} className={`tab ${activeCode === code.code ? 'active' : ''}`} onClick={() => setActiveCode(code.code)}>
                  {code.short} · {code.count}
                </button>
              ))}
            </div>
          )}
          {!results && current?.note && <div className="hint-line">{current.note}</div>}
        </div>

        <div className="article-list">
          {list.length === 0 && (
            <div className="empty">
              {results ? 'Ничего не найдено. Попробуйте другой запрос или номер статьи.' : 'В этом разделе пока нет норм — импортируйте свой пакет.'}
            </div>
          )}
          {list.map((article) => {
            const open = openId === article.id;
            const flag = article.country;
            return (
              <div key={article.id} className={`article ${open ? 'open' : ''}`}>
                <button className="article-head" onClick={() => setOpenId(open ? null : article.id)}>
                  <span className="article-num">{article.number}</span>
                  <span className="article-main">
                    <span className="article-title">{article.title}</span>
                    <span className="article-code">
                      {results ? `${flag} · ` : ''}
                      {article.code}
                    </span>
                  </span>
                  <IconArrow size={14} className={open ? '' : 'dim'} />
                </button>
                {open && (
                  <div className="article-body">
                    {article.text}
                    <div className="tags">
                      {(article.tags ?? []).map((tag) => (
                        <span className="tag" key={tag}>#{tag}</span>
                      ))}
                    </div>
                    <div className="actions">
                      <button
                        className="btn sm"
                        onClick={() => onAsk(`Объясни простыми словами ${article.code}, ${article.number} «${article.title}» и как это применить на практике.`)}
                      >
                        <IconSpark size={13} /> Спросить ИИ по статье
                      </button>
                      <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(`${article.code}, ${article.number}. ${article.title}\n\n${article.text}`)}>
                        копировать норму
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
