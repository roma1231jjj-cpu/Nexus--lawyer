import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import {
  isChecked,
  normalizeCountry,
  renderDoc,
  todayIsoDate,
  validateDoc,
  type DocField,
  type DocLang,
  type DocTemplate,
  type DocValidation
} from '../../electron/docs';
import { IconDownload, IconDoc, IconSpark } from '../components/Icons';
import { countryLabel, useLang, useT } from '../i18n';

type Props = { country?: string; demo?: boolean };

type ExportFormat = 'rtf' | 'txt' | 'md';

type ExportPayload = { name: string; text: string; format: ExportFormat };

type ExportResult = { saved: boolean; path?: string };

type TemplatesLoader = () => Promise<DocTemplate[]>;

type ExportDoc = (payload: ExportPayload) => Promise<ExportResult>;

const loadTemplates = api.templates as unknown as TemplatesLoader;
const exportDoc = api.exportDoc as unknown as ExportDoc;

const demoDrafts: Record<string, Record<string, string>> = {
  claim: {
    date: todayIsoDate(),
    from: 'Иванов Иван Иванович, г. Анжеро-Судженск, ул. Лесная, 12, кв. 4',
    to: 'ООО «Ромашка», г. Кемерово, ул. Складская, 3',
    inn: '420512345678',
    contract: 'Договор поставки № 14 от 12.03.2026',
    essence: 'Товар поставлен 18.03.2026 и принят без замечаний. Оплата до 01.04.2026 не поступила, акт сверки подписан обеими сторонами.',
    amount: '85 000',
    deadline: '10 календарных дней',
    forum: 'arbitration',
    att_contract: '1',
    att_reconciliation: '1'
  },
  consumer: {
    date: todayIsoDate(),
    kind: 'goods',
    consumer: 'Сидорова Анна Петровна, г. Анжеро-Судженск, тел. +7 900 000-00-00',
    seller: 'ИП Петров Алексей Сергеевич',
    goods: 'Смартфон, чек № 42 от 04.10.2026',
    defect: 'не включается, при подключении к зарядному устройству реакции нет',
    price: '54 990',
    demand: 'возврат уплаченной суммы',
    guarantee: 'yes',
    att_receipt: '1'
  },
  power: {
    date: todayIsoDate(),
    city: 'Анжеро-Судженск',
    principal: 'Иванов Иван Иванович, паспорт 32 00 № 123456, выдан 12.05.2016',
    agent: 'Петров Пётр Петрович, паспорт 32 01 № 654321',
    scope: 'представлять интересы в судах, государственных органах и организациях',
    term: 'один год',
    settle: '1',
    writ: '1'
  }
};

export default function DocsView({ country, demo }: Props) {
  const t = useT();
  const lang = useLang() as DocLang;
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [rfConfirmed, setRfConfirmed] = useState(false);
  const seeded = useRef<Set<string>>(new Set());
  const demoOn = Boolean(demo);

  const active = templates.find((item) => item.id === activeId);
  const values = drafts[activeId] ?? {};
  const userCountry = normalizeCountry(country);
  const countryKnown = userCountry !== 'ALL';
  const foreign = countryKnown && userCountry !== 'RU';
  const blocked = foreign && !rfConfirmed;
  const ru = lang !== 'en';

  useEffect(() => {
    let cancelled = false;
    loadTemplates()
      .then((list) => {
        if (cancelled) return;
        setTemplates(list);
        setActiveId((prev) => (list.some((item) => item.id === prev) ? prev : list[0]?.id ?? ''));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    if (!demoOn) return;
    setDrafts((prev) => {
      const next: Record<string, Record<string, string>> = { ...prev };
      for (const [id, sample] of Object.entries(demoDrafts)) {
        if (!next[id]) next[id] = { ...sample };
      }
      return next;
    });
  }, [demoOn]);

  useEffect(() => {
    if (!activeId || seeded.current.has(activeId)) return;
    seeded.current.add(activeId);
    setDrafts((prev) => {
      if ((prev[activeId]?.date ?? '').trim()) return prev;
      return { ...prev, [activeId]: { ...(prev[activeId] ?? {}), date: todayIsoDate() } };
    });
  }, [activeId]);

  const setValue = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [activeId]: { ...(prev[activeId] ?? {}), [key]: value } }));
  };

  const toggleCheck = (key: string) => {
    setDrafts((prev) => {
      const current = prev[activeId] ?? {};
      return { ...prev, [activeId]: { ...current, [key]: isChecked(current[key]) ? '' : '1' } };
    });
  };

  const text = useMemo(() => (active ? renderDoc(active, values) : ''), [active, values]);

  const problems = useMemo<DocValidation>(() => {
    if (!active) return { missing: [], errors: [], warnings: [] };
    return validateDoc(active, values, lang);
  }, [active, values, lang]);

  const blockers = useMemo(() => {
    const items = [...problems.errors];
    for (const item of problems.missing) items.push(`${ru ? 'заполните' : 'fill in'}: ${item.label}`);
    return items;
  }, [problems, ru]);

  const exportAs = async (format: ExportFormat) => {
    if (!active) return;
    if (blockers.length) {
      setStatus(blockers.slice(0, 6).join(' · '));
      return;
    }
    if (blocked) {
      setStatus(ru ? 'Подтвердите, что это документ РФ.' : 'Confirm that this is a Russia-only document.');
      return;
    }
    const body = format === 'md' ? `# ${active.name}\n\n${text}` : text;
    try {
      const result = await exportDoc({ name: active.name, text: body, format });
      if (result.saved) {
        setStatus(t('docs.saved', { path: result.path ?? '' }));
        setTimeout(() => setStatus(null), 5000);
      }
    } catch {
      setStatus(t('docs.saveFailed'));
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const renderField = (field: DocField) => {
    const value = values[field.key] ?? '';
    const onChange = (next: string) => setValue(field.key, next);
    if (field.kind === 'select') {
      return (
        <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    if (field.kind === 'date') {
      return <input className="input" type="date" value={value} onChange={(event) => onChange(event.target.value)} />;
    }
    if (field.kind === 'money') {
      return (
        <input
          className="input"
          inputMode="decimal"
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
    if (field.multiline) {
      return (
        <textarea
          className="input"
          rows={3}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
    return (
      <input className="input" placeholder={field.placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    );
  };

  const checkRow = (key: string, label: string) => (
    <div className="row" key={key} style={{ gap: 10, alignItems: 'flex-start' }}>
      <button
        className={`switch ${isChecked(values[key]) ? 'on' : ''}`}
        onClick={() => toggleCheck(key)}
        aria-pressed={isChecked(values[key])}
        aria-label={label}
      />
      <span className="tiny" style={{ lineHeight: 1.45, paddingTop: 2 }}>
        {label}
      </span>
    </div>
  );

  const formFields = active ? active.fields.filter((field) => field.key !== 'attachmentOther') : [];
  const otherField = active ? active.fields.find((field) => field.key === 'attachmentOther') : undefined;

  return (
    <div className="docs">
      <div className="template-list">
        {templates.map((item) => (
          <button
            key={item.id}
            className={`template-card ${item.id === activeId ? 'active' : ''}`}
            onClick={() => {
              setActiveId(item.id);
              setStatus(null);
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
            {active && <span className="badge">{ru ? 'Шаблон РФ' : 'Russia template'}</span>}
            <span className="hint">{active?.group}</span>
          </div>
          {active && (
            <>
              {!countryKnown && (
                <div className="hint-line" style={{ marginBottom: 12 }}>
                  {ru
                    ? 'Страна не выбрана в настройках: шаблоны есть только для РФ.'
                    : 'No country selected in settings: templates exist for Russia only.'}
                </div>
              )}
              {foreign && (
                <div className="note" style={{ marginBottom: 12 }}>
                  {ru
                    ? `Пока есть шаблоны только для РФ. Ваша страна: ${countryLabel(userCountry, userCountry, lang)} — для другой юрисдикции это не документ, спросите в чате.`
                    : `Templates exist for Russia only. Your country: ${countryLabel(userCountry, userCountry, lang)} — for another jurisdiction this is not a valid document, ask in chat.`}
                  <div className="row" style={{ marginTop: 10, gap: 10, alignItems: 'flex-start' }}>
                    <button
                      className={`switch ${rfConfirmed ? 'on' : ''}`}
                      onClick={() => setRfConfirmed((value) => !value)}
                      aria-pressed={rfConfirmed}
                      aria-label={ru ? 'Это документ РФ' : 'This is a Russia-only document'}
                    />
                    <span className="tiny" style={{ lineHeight: 1.45, paddingTop: 2 }}>
                      {ru ? 'Это документ РФ, другой юрисдикции он не подходит' : 'This is a Russia-only document and does not fit another jurisdiction'}
                    </span>
                  </div>
                </div>
              )}
              <div className="hint-line" style={{ marginBottom: 12 }}>
                {t('docs.basis', { law: active.law })}
              </div>
              {lang === 'en' && (
                <div className="hint-line" style={{ marginBottom: 12 }}>
                  {t('docs.legalNotice')}
                </div>
              )}
              <div className="form-grid">
                {formFields.map((field) => (
                  <div className={`field ${field.multiline ? 'wide' : ''}`} key={field.key}>
                    <label>{field.label}</label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
              {active.checks.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div className="hint-line" style={{ marginBottom: 8 }}>
                    {ru ? 'Отметьте только то, что подтверждаете: остальное в документ не попадёт.' : 'Tick only what you confirm: nothing else goes into the document.'}
                    {active.id === 'power' ? (ru ? ' Полномочия проверьте у юриста.' : ' Check the powers with a lawyer.') : ''}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {active.checks.map((check) => checkRow(check.key, check.label))}
                  </div>
                </div>
              )}
              {active.attachments.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="hint-line" style={{ marginBottom: 8 }}>
                    {ru ? 'Приложения — только отмеченное попадёт в документ.' : 'Attachments — only ticked items appear in the document.'}
                  </div>
                  <div className="form-grid" style={{ gap: 10 }}>
                    {active.attachments.map((item) => (
                      <div key={item.key}>{checkRow(item.key, item.label)}</div>
                    ))}
                  </div>
                  {otherField && isChecked(values.att_other) && (
                    <div className="field wide" style={{ marginTop: 10, marginBottom: 0 }}>
                      <label>{otherField.label}</label>
                      {renderField(otherField)}
                    </div>
                  )}
                </div>
              )}
              <div className="row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
                <button className="btn primary sm" onClick={() => exportAs('rtf')} disabled={blocked}>
                  <IconDownload size={13} /> {ru ? 'Скачать .rtf' : 'Download .rtf'}
                </button>
                <button className="btn sm" onClick={() => exportAs('md')} disabled={blocked} aria-label={t('docs.exportMd')}>
                  .md
                </button>
                <button className="btn sm" onClick={() => exportAs('txt')} disabled={blocked} aria-label={t('docs.exportTxt')}>
                  .txt
                </button>
                <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(text)}>
                  {t('docs.copyText')}
                </button>
              </div>
              {blockers.length > 0 && (
                <div className="hint-line" style={{ marginTop: 8 }}>
                  {ru ? 'Экспорт заблокирован: ' : 'Export is blocked: '}
                  {blockers.slice(0, 4).join(' · ')}
                  {blockers.length > 4 ? (ru ? ` · и ещё ${blockers.length - 4}` : ` · and ${blockers.length - 4} more`) : ''}
                </div>
              )}
              {problems.warnings.map((warning) => (
                <div className="hint-line" key={warning}>
                  {warning}
                </div>
              ))}
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
