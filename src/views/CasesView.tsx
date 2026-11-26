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

const DRAFT_KEY = 'nl-case-draft';

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

const readDraft = (): LegalCase | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegalCase;
    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
};

export default function CasesView({ cases, country, onChange }: Props) {
  const t = useT();
  const lang = useLang();
  const restored = useRef(readDraft());
  const [selected, setSelected] = useState<string>(restored.current?.id ?? cases[0]?.id ?? '');
  const [draft, setDraft] = useState<LegalCase>(restored.current ?? cases[0] ?? blank(country));
  const [dirty, setDirty] = useState(Boolean(restored.current));
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState<string | null>(restored.current ? t('cases.draftRestored') : null);
  const dirtyRef = useRef(dirty);

  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirtyRef.current) return;
    const found = cases.find((item) => item.id === selected);
    if (!found) return;
    setDraft((prev) => (prev === found ? prev : found));
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

  // несохранённая карточка не теряется при переходе по разделам и закрытии окна
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);

  const persistDraft = (value: LegalCase) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    } catch {
      /* приватный режим */
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* приватный режим */
    }
  };

  const update = (patch: Partial<LegalCase>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setDirty(true);
    persistDraft(next);
  };

  const discard = () => {
    clearDraft();
    setDirty(false);
  };

  const pick = (item: LegalCase) => {
    if (dirtyRef.current && item.id !== draft.id && !window.confirm(t('cases.discardConfirm'))) return;
    clearDraft();
    setSelected(item.id);
    setDraft(item);
    setDirty(false);
    setNote('');
  };

  const startNew = () => {
    if (dirtyRef.current && !window.confirm(t('cases.discardConfirm'))) return;
    const fresh = blank(country);
    setDraft(fresh);
    setSelected(fresh.id);
    setDirty(true);
    setNote('');
    persistDraft(fresh);
  };

  const save = async (): Promise<LegalCase | null> => {
    if (!draft.title.trim()) {
      setFlash(t('cases.nameRequired'));
      return null;
    }
    try {
      const result = await api.saveCase(draft);
      if (!result.ok || !result.item) {
        setFlash(result.error === 'stale' ? t('cases.stale') : t('cases.saveFailed'));
        if (result.error === 'stale') await onChange();
        return null;
      }
      clearDraft();
      setDraft(result.item);
      setSelected(result.item.id);
      setDirty(false);
      await onChange();
      return result.item;
    } catch {
      setFlash(t('cases.saveFailed'));
      return null;
    }
  };

  const remove = async () => {
    const saved = cases.some((item) => item.id === draft.id);
    if (!saved) {
      clearDraft();
      setSelected('');
      setDraft(blank(country));
      setDirty(false);
      return;
    }
    if (!window.confirm(t('cases.deleteConfirm'))) return;
    try {
      const result = await api.deleteCase(draft.id);
      if (!result.ok) {
        setFlash(t('cases.saveFailed'));
        return;
      }
      clearDraft();
      setSelected('');
      setDraft(blank(country));
      setDirty(false);
      await onChange();
    } catch {
      setFlash(t('cases.saveFailed'));
    }
  };

  const attach = async () => {
    let id = draft.id;
    if (dirtyRef.current || !cases.some((item) => item.id === draft.id)) {
      // сначала фиксируем правки карточки, иначе прикрепление их молча теряет
      const result = await save();
      if (!result) {
        setFlash(t('cases.attachNeedSave'));
        return;
      }
      id = result.id;
    }
    try {
      const result = await api.attach(id);
      if (result.canceled) return;
      if (!result.ok) {
        setFlash(result.error ?? t('cases.attachNeedSave'));
        return;
      }
      setDraft((prev) => ({ ...prev, files: result.files }));
      setDirty(false);
      clearDraft();
      await onChange();
    } catch {
      setFlash(t('cases.attachNeedSave'));
    }
  };

  const removeFile = async (path: string) => {
    if (!window.confirm(t('cases.removeFileConfirm'))) return;
    const result = await api.removeCaseFile(draft.id, path).catch(() => null);
    if (!result?.ok || !result.item) {
      setFlash(t('cases.saveFailed'));
      return;
    }
    setDraft(result.item);
    await onChange();
  };

  const openFile = async (path: string) => {
    const result = await api.openFile(path).catch(() => null);
    if (!result?.ok) setFlash(t('cases.openFailed'));
  };

  const addNote = async () => {
    if (!note.trim()) return;
    if (dirtyRef.current && cases.some((item) => item.id === draft.id)) {
      // сохраняем поля карточки, но заметку добавляем отдельно, чтобы не потерять правки
      const saved = await save();
      if (!saved) return;
    }
    if (!cases.some((item) => item.id === draft.id)) {
      const next = { ...draft, notes: [...draft.notes, { id: uid(), text: note.trim(), createdAt: new Date().toISOString() }] };
      setDraft(next);
      setNote('');
      setDirty(true);
      persistDraft(next);
      return;
    }
    try {
      const result = await api.caseNote(draft.id, note.trim());
      if (!result.ok || !result.item) {
        setFlash(result.error === 'stale' ? t('cases.stale') : t('cases.saveFailed'));
        return;
      }
      setDraft(result.item);
      setNote('');
      setDirty(false);
      clearDraft();
      await onChange();
    } catch {
      setFlash(t('cases.saveFailed'));
    }
  };

  const removeNote = (id: string) => {
    const next = { ...draft, notes: draft.notes.filter((item) => item.id !== id) };
    setDraft(next);
    setDirty(true);
    persistDraft(next);
  };

  const saved = cases.some((item) => item.id === draft.id);
  const isDirtyMarker = dirty && saved;

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
            <div className="hint row" style={{ gap: 6, alignItems: 'center' }}>
              {isDirtyMarker && <span className="badge warn">{t('cases.unsaved')}</span>}
              <button className="btn sm" onClick={save}>{t('cases.save')}</button>
              {isDirtyMarker && (
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    const found = cases.find((item) => item.id === draft.id);
                    if (found) {
                      discard();
                      setDraft(found);
                    }
                  }}
                >
                  {t('cases.revert')}
                </button>
              )}
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
              <input className="input" value={draft.country} onChange={(event) => update({ country: event.target.value.toUpperCase() })} />
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
            <button className="btn ghost sm hint" onClick={() => api.revealCase(draft.id)} disabled={!saved}>
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
                <div className="row tiny dim" style={{ justifyContent: 'space-between' }}>
                  <span>{formatDateTime(item.createdAt, lang)}</span>
                  <button className="mini-btn" onClick={() => removeNote(item.id)} title={t('cases.delete')} aria-label={t('cases.delete')}>
                    <IconTrash size={12} />
                  </button>
                </div>
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
                <button onClick={() => void openFile(file.path)} aria-label={`${t('cases.open')}: ${file.name}`}>{t('cases.open')}</button>
                <button onClick={() => void removeFile(file.path)} aria-label={`${t('cases.delete')}: ${file.name}`}>{t('cases.delete')}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
