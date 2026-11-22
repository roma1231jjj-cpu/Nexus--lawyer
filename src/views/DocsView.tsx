import { useEffect, useMemo, useState } from 'react';
import { api, type DocTemplate } from '../api';
import { IconDownload, IconDoc, IconSpark } from '../components/Icons';

type Props = Record<string, never>;

function fill(template: DocTemplate, values: Record<string, string>) {
  const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const map: Record<string, string> = {
    ...values,
    date,
    city: values.city || 'Москва',
    total: String(Number(values.debt || 0) + Number(values.penalty || 0)),
    requisites: values.requisites || 'р/с 00000000000000000000, банк …',
    fromShort: (values.from || '').split(' ').slice(0, 2).join(' ')
  };
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => (map[key] ?? '').trim() || `[${key}]`);
}

export default function DocsView(_props: Props) {
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    api.templates().then((list) => {
      setTemplates(list);
      setActiveId(list[0]?.id ?? '');
      if (window.__nexusShots && list[0]) {
        setValues({
          from: 'Иванов Иван Иванович, г. Москва, ул. Лесная, 12, кв. 4',
          to: 'ООО «Ромашка», ИНН 7701234567, г. Москва, ул. Складская, 3',
          contract: 'Договор поставки № 14 от 12.03.2026',
          amount: '120 000',
          essence: 'Товар поставлен 18.03.2026 и принят без замечаний. Оплата до 01.04.2026 не поступила, акт сверки подписан.',
          deadline: '10 календарных дней',
          requisites: 'р/с 40702810000000012345, ПАО «Сбербанк», БИК 044525225'
        });
      }
    });
  }, []);

  const active = templates.find((item) => item.id === activeId);
  const text = useMemo(() => (active ? fill(active, values) : ''), [active, values]);

  const exportAs = async (format: 'txt' | 'md' | 'doc') => {
    if (!active) return;
    const result = await api.exportDoc({ name: active.name, text, format });
    if (result.saved) {
      setStatus(`Сохранено: ${result.path}`);
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
          Шаблон — каркас, а не готовый документ. Проверяйте факты, реквизиты и приложения перед отправкой.
        </div>
      </div>

      <div className="doc-work">
        <div className="card" style={{ overflow: 'auto', minHeight: 0 }}>
          <div className="card-head">
            <IconDoc size={16} />
            <h2>{active?.name ?? 'Документ'}</h2>
            <span className="hint">{active?.group}</span>
          </div>
          {active && (
            <>
              <div className="hint-line" style={{ marginBottom: 14 }}>
                Основание: {active.law}
              </div>
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
                  <IconDownload size={13} /> Скачать .doc
                </button>
                <button className="btn sm" onClick={() => exportAs('md')}>.md</button>
                <button className="btn sm" onClick={() => exportAs('txt')}>.txt</button>
                <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(text)}>
                  копировать текст
                </button>
              </div>
              {status && <div className="hint-line">{status}</div>}
            </>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="card-head">
            <IconSpark size={16} />
            <h2>Предпросмотр</h2>
            <span className="hint">обновляется по мере ввода</span>
          </div>
          <div className="preview">{text}</div>
        </div>
      </div>
    </div>
  );
}
