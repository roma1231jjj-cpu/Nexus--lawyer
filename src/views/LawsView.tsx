import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Article, type Country } from '../api';
import { IconArrow, IconDownload, IconSearch, IconSpark, IconTrash } from '../components/Icons';
import { countryLabel, countryMeta, useLang, useT, regionLabel } from '../i18n';

type Props = {
  countries: Country[];
  counts: Record<string, { name: string; flag: string; count: number }>;
  total: { articles: number; countries: number };
  country: string;
  onCountry: (code: string) => void;
  onAsk: (question: string, country: string) => void;
  onImported?: () => void | Promise<void>;
};

type Hit = { article: Article; score: number };

export default function LawsView({ countries, counts, total, country, onCountry, onAsk, onImported }: Props) {
  const t = useT();
  const lang = useLang();
  const [articles, setArticles] = useState<Article[]>([]);
  const [codes, setCodes] = useState<{ code: string; short: string; count: number }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState('ALL');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ hits: Hit[]; total: number; truncated: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [packs, setPacks] = useState<{ file: string; articles: number; errors: string[]; dir: 'bundled' | 'user' }[]>([]);
  const [packsOpen, setPacksOpen] = useState(false);

  const loadPacks = useCallback(async () => {
    const list = await api.lawsPacks().catch(() => []);
    setPacks(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setOpenId(null);
    setActiveCode('ALL');
    api
      .lawsCountry(country)
      .then((data) => {
        if (cancelled) return;
        setArticles(data.articles);
        setCodes(data.codes);
      })
      .catch(() => {
        if (cancelled) return;
        setArticles([]);
        setCodes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults(null);
      return;
    }
    // короткие номера статей («18», «77») — валидный запрос
    let active = true;
    const timer = setTimeout(() => {
      api
        .lawsSearch({ query: value, country: 'ALL' })
        .then((data) => {
          if (active) setResults(data ?? { hits: [], total: 0, truncated: false });
        })
        .catch(() => {
          if (active) setResults({ hits: [], total: 0, truncated: false });
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const current = countries.find((item) => item.code === country);
  const meta = country === 'ALL'
    ? { system: t('laws.allSystems'), note: '' }
    : countryMeta(country, lang, current?.system, current?.note);
  const list = useMemo(() => {
    if (results) return results.hits.map((hit) => hit.article);
    return activeCode === 'ALL' ? articles : articles.filter((article) => article.code === activeCode);
  }, [results, activeCode, articles]);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 6000);
  };

  const importPack = async () => {
    try {
      const result = await api.lawsImport();
      if (result.canceled) return;
      const parts: string[] = [];
      if (result.imported > 0) parts.push(t('laws.imported', { n: result.imported }));
      if (result.skipped > 0) parts.push(t('laws.skipped', { n: result.skipped }));
      if (result.failed > 0) parts.push(t('laws.importFailed', { n: result.failed }));
      const broken = result.files.find((file) => file.errors.length);
      if (broken) parts.push(`${broken.name}: ${broken.errors[0]}`);
      flash(parts.length ? parts.join(' · ') : t('laws.importEmpty'));
      if (result.imported > 0) {
        const data = await api.lawsCountry(country);
        setArticles(data.articles);
        setCodes(data.codes);
        await loadPacks();
        await onImported?.();
      }
    } catch (error) {
      flash(t('laws.importError', { error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const removePack = async (file: string) => {
    const result = await api.lawsPackRemove(file).catch(() => ({ ok: false }));
    if (!result.ok) {
      flash(t('laws.packRemoveFailed'));
      return;
    }
    await loadPacks();
    await onImported?.();
    const data = await api.lawsCountry(country);
    setArticles(data.articles);
    setCodes(data.codes);
    flash(t('laws.packRemoved'));
  };

  const userPacks = packs.filter((pack) => pack.dir === 'user');

  return (
    <div className="split">
      <div className="side-panel">
        <div className="side-panel-head">
          <div className="search">
            <IconSearch size={14} />
            <input className="input" placeholder={t('laws.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="row tiny dim" style={{ justifyContent: 'space-between' }}>
            <span>{t('laws.countries', { n: total.countries })}</span>
            <span className="num">{t('laws.articles', { n: total.articles })}</span>
          </div>
        </div>
        <div className="side-panel-body">
          <button
            className={`country-item ${country === 'ALL' && !results ? 'active' : ''}`}
            onClick={() => {
              setQuery('');
              onCountry('ALL');
            }}
          >
            <span className="country-flag">{t('laws.allBadge')}</span>
            <span>
              <span className="country-name">{t('laws.allCountries')}</span>
              <span className="country-region">{t('laws.allSystems')}</span>
            </span>
            <span className="country-count num">{total.articles}</span>
          </button>
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
                  <span className="country-name">{countryLabel(item.code, item.name, lang)}</span>
                  <span className="country-region">{regionLabel(item.region, lang)}</span>
                </span>
                <span className="country-count num">{stat?.count ?? 0}</span>
              </button>
            );
          })}
          <div style={{ padding: '10px 6px 4px', display: 'grid', gap: 6 }}>
            <button className="btn ghost sm" style={{ width: '100%' }} onClick={importPack}>
              <IconDownload size={13} /> {t('laws.import')}
            </button>
            <button className="btn ghost sm" style={{ width: '100%' }} onClick={() => setPacksOpen((prev) => !prev)}>
              {t('laws.packs')} · {packs.length}
            </button>
            {packsOpen && (
              <div style={{ display: 'grid', gap: 4 }}>
                {packs.length === 0 && <div className="hint-line">{t('laws.packsEmpty')}</div>}
                {packs.map((pack) => (
                  <div
                    key={pack.dir + pack.file}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '2px 2px' }}
                    title={pack.errors.length ? pack.errors.join('; ') : `${pack.articles}`}
                  >
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pack.file}
                    </span>
                    <span className="num dim">{pack.articles}</span>
                    {pack.dir === 'user' && (
                      <button className="mini-btn" onClick={() => void removePack(pack.file)} title={t('laws.packRemove')}>
                        <IconTrash size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {notice && <div className="hint-line">{notice}</div>}
          </div>
        </div>
      </div>

      <div className="law-pane">
        <div className="law-head">
          <div className="law-title">
            <span className="flag-code">{results ? t('laws.allBadge') : current?.code ?? t('laws.allBadge')}</span>
            <div>
              <h2>
                {results
                  ? t('laws.searchResults')
                  : country === 'ALL'
                    ? t('laws.allCountries')
                    : countryLabel(country, current?.name, lang) || t('laws.laws')}
              </h2>
              <div className="sys">
                {results
                  ? `${t('laws.query', { q: query })}${results.truncated ? ` · ${t('laws.truncated', { n: results.total })}` : ''}`
                  : meta.system}
              </div>
            </div>
            <span className="badge" style={{ marginLeft: 'auto' }}>{t('laws.articles', { n: list.length })}</span>
          </div>
          {!results && (
            <div className="code-tabs">
              <button className={`tab ${activeCode === 'ALL' ? 'active' : ''}`} onClick={() => setActiveCode('ALL')}>
                {t('laws.all', { n: articles.length })}
              </button>
              {codes.map((code) => (
                <button key={code.code} className={`tab ${activeCode === code.code ? 'active' : ''}`} onClick={() => setActiveCode(code.code)}>
                  {code.short} · {code.count}
                </button>
              ))}
            </div>
          )}
          {!results && meta.note && <div className="hint-line">{meta.note}</div>}
          {country !== 'ALL' && !results && <div className="hint-line">{t('laws.currencyHint')}</div>}
        </div>

        <div className="article-list">
          {list.length === 0 && (
            <div className="empty">{results ? t('laws.notFound') : t('laws.emptyCountry')}</div>
          )}
          {list.map((article) => {
            const open = openId === article.id;
            return (
              <div key={article.id} className={`article ${open ? 'open' : ''}`}>
                <button className="article-head" onClick={() => setOpenId(open ? null : article.id)} aria-expanded={open}>
                  <span className="article-num">{article.number}</span>
                  <span className="article-main">
                    <span className="article-title">{article.title}</span>
                    <span className="article-code">
                      {results || country === 'ALL' ? `${countryLabel(article.country, undefined, lang)} · ` : ''}
                      {article.code}
                    </span>
                  </span>
                  <IconArrow size={14} className={open ? '' : 'dim'} />
                </button>
                {open && (
                  <div className="article-body">
                    {article.text}
                    {article.status && article.status !== 'active' && (
                      <div className="hint-line" style={{ marginTop: 8 }}>{t('laws.unverified')}</div>
                    )}
                    <div className="tags">
                      {(article.tags ?? []).map((tag) => (
                        <span className="tag" key={tag}>#{tag}</span>
                      ))}
                      {article.revisedAt && <span className="tag">ред. {article.revisedAt}</span>}
                    </div>
                    <div className="actions">
                      <button
                        className="btn sm"
                        onClick={() =>
                          onAsk(t('laws.askPrompt', { code: article.code, number: article.number, title: article.title }), article.country)
                        }
                      >
                        <IconSpark size={13} /> {t('laws.askAi')}
                      </button>
                      <button
                        className="btn ghost sm"
                        onClick={() => navigator.clipboard?.writeText(`${article.code}, ${article.number}. ${article.title}\n\n${article.text}`)}
                      >
                        {t('laws.copy')}
                      </button>
                      {article.sourceUrl && (
                        <button className="btn ghost sm" onClick={() => void api.open(article.sourceUrl!)}>
                          {t('laws.source')}
                        </button>
                      )}
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
