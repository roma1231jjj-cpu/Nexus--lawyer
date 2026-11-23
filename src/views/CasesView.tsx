import { useEffect, useRef, useState } from 'react';
import { api, uid, type LegalCase } from '../api';
import { IconFolder, IconPaperclip, IconPlus, IconTrash } from '../components/Icons';
import { formatDate, formatDateTime, useLang, useT } from '../i18n';
import type { TKey } from '../i18n';

type Props = {
  cases: LegalCase[];
  country: string;
  onChange: () => Promise<void>;
};

const statusKeys: Record<LegalCase['status'], TKey> = {
  open: 'cases.statusOpen',
  work: 'cases.statusWork',
  closed: 'cases.statusClosed'
};

const blank = (country: string): LegalCase => ({
  id: uid(),
  title: '',
  client: '',
  status: 'open',
  country,
  summary: '',
  notes: [],
  files: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export default function CasesView({ cases, country, onChange }: Props) {
  const t = useT();
  const lang = useLang();
  const [selected, setSelected] = useState<string>(cases[0]?.id ?? '');
  const [draft, setDraft] = useState<LegalCase>(cases[0] ?? blank(country));
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirtyRef.current) return;
    const found = cases.find((item) => item.id === selected);
    if (!found || found === draft) return;
    setDraft(found);
  }, [cases, selected]);

  useEffect(() => {
    if (dirtyRef.current) return;
    if (selected && cases.some((item) => item.id === selected)) return;
    if (!cases.length) return;
    setSelected(cases[0].id);
    setDraft(cases[0]);
  }, [cases, selected]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(timer);
  }, [flash]);

  const update = (patch: Partial<LegalCase>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const pick = (item: LegalCase) => {
    setSelected(item.id);
    setDraft(item);
    setDirty(false);
  };

  const startNew = () => {
    const fresh = blank(country);
    setDraft(fresh);
    setSelected(fresh.id);
    setDirty(true);
  };

  const save = async (): Promise<LegalCase | null> => {
    if (!draft.title.trim()) {
      setFlash(t('cases.nameRequired'));
      return null;
    }
    try {
      const saved = await api.saveCase(draft);
      setDraft(saved);
      setDirty(false);
      await onChange();
      return saved;
    } catch {
      setFlash(t('cases.saveFailed'));
      return null;
    }
  };

  const remove = async () => {
    const saved = cases.some((item) => item.id === draft.id);
    if (!saved) {
      setSelected('');
      setDraft(cases[0] ?? blank(country));
      setDirty(false);
      return;
    }
    if (!window.confirm(t('cases.deleteConfirm'))) return;
    try {
      await api.deleteCase(draft.id);
      setSelected('');
      setDirty(false);
      await onChange();
    } catch {
      setFlash(t('cases.saveFailed'));
    }
  };

  const attach = async () => {
    if (!cases.some((item) => item.id === draft.id)) {
      const saved = await save();
      if (!saved) return;
    }
    try {
      const result = await api.attach(draft.id);
      if (result.saved === false) {
        setFlash(t('cases.attachNeedSave'));
        return;
      }
      if (result.canceled) return;
      setDraft((prev) => ({ ...prev, files: result.files }));
      setDirty(false);
      await onChange();
    } catch {
      setFlash(t('cases.attachNeedSave'));
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const next = { ...draft, notes: [...draft.notes, { id: uid(), text: note.trim(), createdAt: new Date().toISOString() }] };
    setDraft(next);
    setNote('');
    setDirty(true);
    if (!cases.some((item) => item.id === next.id)) return;
    try {
      const saved = await api.saveCase(next);
      setDraft((prev) => (prev.id === saved.id ? saved : prev));
      setDirty(false);
      await onChange();
    } catch {
      setFlash(t('cases.saveFailed'));
    }
  };

  return (
    <div className="cases">
      <div className="side-panel">
        <div className="side-panel-head">
          <button className="btn primary sm" onClick={startNew}>
            <IconPlus size={13} /> {t('cases.newCase')}
          </button>
          <div className="row tiny dim" style={{ justifyContent: 'space-between' }}>
            <span>{t('cases.total')}</span>
            <span className="num">{cases.length}</span>
          </div>
        </div>
        <div className="side-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {cases.length === 0 && <div className="empty" style={{ margin: 6 }}>{t('cases.empty')}</div>}
          {cases.map((item) => (
            <button key={item.id} className={`case-item ${item.id === draft.id ? 'active' : ''}`} onClick={() => pick(item)}>
              <b>{item.title || t('cases.untitled')}</b>
              <div className="row">
                <span>{t(statusKeys[item.status])}</span>
                <span>·</span>
                <span>{formatDate(item.updatedAt, lang)}</span>
              </div>
              {item.client && <div className="row">{item.client}</div>}
            </button>
          ))}
        </div>
      </div>

      <div className="case-detail">
        <div className="card">
          <div className="card-head">
            <IconFolder size={16} />
            <h2>{t('cases.card')}</h2>
            <div className="hint row" style={{ gap: 6 }}>
              <button className="btn sm" onClick={save}>{t('cases.save')}</button>
              <button className="btn ghost sm" onClick={remove} title={t('cases.delete')} aria-label={t('cases.delete')}>
                <IconTrash size={13} />
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>{t('cases.name')}</label>
              <input className="input" value={draft.title} placeholder={t('cases.namePlaceholder')} onChange={(event) => update({ title: event.target.value })} />
            </div>
            <div className="field">
              <label>{t('cases.client')}</label>
              <input className="input" value={draft.client} placeholder={t('cases.clientPlaceholder')} onChange={(event) => update({ client: event.target.value })} />
            </div>
            <div className="field">
              <label>{t('cases.status')}</label>
              <select className="input" value={draft.status} onChange={(event) => update({ status: event.target.value as LegalCase['status'] })}>
                <option value="open">{t('cases.statusOpen')}</option>
                <option value="work">{t('cases.statusWork')}</option>
                <option value="closed">{t('cases.statusClosed')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('cases.country')}</label>
              <input className="input" value={draft.country} onChange={(event) => update({ country: event.target.value })} />
            </div>
            <div className="field wide">
              <label>{t('cases.summary')}</label>
              <textarea className="input" rows={2} value={draft.summary} placeholder={t('cases.summaryPlaceholder')} onChange={(event) => update({ summary: event.target.value })} />
            </div>
          </div>

          <div className="meta-grid" style={{ marginTop: 4 }}>
            <div className="meta-box">
              <div className="k">{t('cases.notes')}</div>
              <div className="v">{draft.notes.length}</div>
            </div>
            <div className="meta-box">
              <div className="k">{t('cases.files')}</div>
              <div className="v">{draft.files.length}</div>
            </div>
            <div className="meta-box">
              <div className="k">{t('cases.updated')}</div>
              <div className="v" style={{ fontSize: 13 }}>{formatDate(draft.updatedAt, lang)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>{t('cases.notesTitle')}</h2>
            <button
              className="btn ghost sm hint"
              onClick={() => api.revealCase(draft.id)}
              disabled={!cases.some((item) => item.id === draft.id)}
            >
              {t('cases.openFolder')}
            </button>
          </div>
          <textarea className="input" rows={2} placeholder={t('cases.notePlaceholder')} value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="row" style={{ marginTop: 9, justifyContent: 'flex-end' }}>
            <button className="btn primary sm" onClick={addNote}>{t('cases.addNote')}</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {draft.notes.length === 0 && <div className="dim tiny">{t('cases.emptyNotes')}</div>}
            {draft.notes.map((item) => (
              <div className="note" key={item.id}>
                <div className="tiny dim">{formatDateTime(item.createdAt, lang)}</div>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <IconPaperclip size={15} />
            <h2>{t('cases.filesTitle')}</h2>
            <button className="btn sm hint" onClick={attach}>{t('cases.addFile')}</button>
          </div>
          {flash && <div className="hint-line">{flash}</div>}
          {draft.files.length === 0 && <div className="dim tiny">{t('cases.filesHint')}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {draft.files.map((file) => (
              <div className="file-row" key={file.path}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span className="num dim tiny" style={{ marginLeft: 'auto' }}>{t('cases.kb', { n: Math.max(1, Math.round(file.size / 1024)) })}</span>
                <button onClick={() => api.openFile(file.path)} aria-label={`${t('cases.open')}: ${file.name}`}>{t('cases.open')}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
