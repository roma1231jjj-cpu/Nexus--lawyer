import { useEffect, useMemo, useState } from 'react';
import { api, type DocTemplate } from '../api';
import { IconDownload, IconDoc, IconSpark } from '../components/Icons';
import { useLang, useT } from '../i18n';
import { docsRu } from '../i18n/ru';

type Props = Record<string, never>;

function fill(template: DocTemplate, values: Record<string, string>) {
  const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const map: Record<string, string> = {
    ...values,
    date,
    city: values.city || docsRu.defaultCity,
    total: String(Number(values.debt || 0) + Number(values.penalty || 0)),
    requisites: values.requisites || docsRu.defaultRequisites,
    fromShort: (values.from || '').split(' ').slice(0, 2).join(' ')
  };
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => (map[key] ?? '').trim() || `[${key}]`);
}

export default function DocsView(_props: Props) {
  const t = useT();
  const lang = useLang();
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    api.templates().then((list) => {
      setTemplates(list);
      setActiveId(list[0]?.id ?? '');
      if (window.__nexusShots && list[0]) setValues({ ...docsRu.sample });
    });
  }, []);

  const active = templates.find((item) => item.id === activeId);
  const text = useMemo(() => (active ? fill(active, values) : ''), [active, values]);

  const exportAs = async (format: 'txt' | 'md' | 'doc') => {
    if (!active) return;
    const result = await api.exportDoc({ name: active.name, text, format });
    if (result.saved) {
      setStatus(t('docs.saved', { path: result.path ?? '' }));
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <div className="docs">
      <div className="template-list">
        {templates.map((item) => (
          <button
            key={item.id}
            className={`template-card ${item.id === activeId ? 'active' : ''}`}
            onClick={() => {
              setActiveId(item.id);
              setValues({});
            }}
          >
            <div className="group">{item.group}</div>
            <b>{item.name}</b>
            <span>{item.summary}</span>
          </button>
        ))}
        <div className="side-note" style={{ marginTop: 6 }}>
          {t('docs.sideNote')}
        </div>
      </div>

      <div className="doc-work">
        <div className="card" style={{ overflow: 'auto', minHeight: 0 }}>
          <div className="card-head">
            <IconDoc size={16} />
            <h2>{active?.name ?? t('docs.document')}</h2>
            <span className="hint">{active?.group}</span>
          </div>
          {active && (
            <>
              <div className="hint-line" style={{ marginBottom: 14 }}>
                {t('docs.basis', { law: active.law })}
              </div>
              {lang === 'en' && (
                <div className="hint-line" style={{ marginBottom: 14 }}>
                  {t('docs.legalNotice')}
                </div>
              )}
              <div className="form-grid">
                {active.fields.map((field) => (
                  <div className={`field ${field.multiline ? 'wide' : ''}`} key={field.key}>
                    <label>{field.label}</label>
                    {field.multiline ? (
                      <textarea
                        className="input"
                        rows={3}
                        placeholder={field.placeholder}
                        value={values[field.key] ?? ''}
                        onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    ) : (
                      <input
                        className="input"
                        placeholder={field.placeholder}
                        value={values[field.key] ?? ''}
                        onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn primary sm" onClick={() => exportAs('doc')}>
                  <IconDownload size={13} /> {t('docs.downloadDoc')}
                </button>
                <button className="btn sm" onClick={() => exportAs('md')}>.md</button>
                <button className="btn sm" onClick={() => exportAs('txt')}>.txt</button>
                <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(text)}>
                  {t('docs.copyText')}
                </button>
              </div>
              {status && <div className="hint-line">{status}</div>}
            </>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="card-head">
            <IconSpark size={16} />
            <h2>{t('docs.preview')}</h2>
            <span className="hint">{t('docs.previewHint')}</span>
          </div>
          <div className="preview">{text}</div>
        </div>
      </div>
    </div>
  );
}
