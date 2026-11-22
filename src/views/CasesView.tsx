import { useEffect, useState } from 'react';
import { api, uid, type LegalCase } from '../api';
import { IconFolder, IconPaperclip, IconPlus, IconTrash } from '../components/Icons';

type Props = {
  cases: LegalCase[];
  country: string;
  onChange: () => Promise<void>;
};

const statusLabel: Record<LegalCase['status'], string> = { open: 'Открыто', work: 'В работе', closed: 'Закрыто' };

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
  const [selected, setSelected] = useState<string>(cases[0]?.id ?? '');
  const [draft, setDraft] = useState<LegalCase>(cases[0] ?? blank(country));
  const [note, setNote] = useState('');

  useEffect(() => {
    const found = cases.find((item) => item.id === selected) ?? cases[0];
    if (found) {
      setDraft(found);
      setSelected(found.id);
    }
  }, [cases, selected]);

  const startNew = () => {
    const fresh = blank(country);
    setDraft(fresh);
    setSelected(fresh.id);
  };

  const save = async () => {
    if (!draft.title.trim()) return;
    await api.saveCase(draft);
    await onChange();
  };

  const remove = async () => {
    if (!cases.some((item) => item.id === draft.id)) {
      setSelected(cases[0]?.id ?? '');
      return;
    }
    await api.deleteCase(draft.id);
    setSelected('');
    await onChange();
  };

  const attach = async () => {
    if (!draft.title.trim()) await save();
    const result = await api.attach(draft.id);
    setDraft((prev) => ({ ...prev, files: result.files }));
    await onChange();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const next = { ...draft, notes: [...draft.notes, { id: uid(), text: note.trim(), createdAt: new Date().toISOString() }] };
    setDraft(next);
    setNote('');
    if (next.title.trim()) {
      await api.saveCase(next);
      await onChange();
    }
  };

  return (
    <div className="cases">
      <div className="side-panel">
        <div className="side-panel-head">
          <button className="btn primary sm" onClick={startNew}>
            <IconPlus size={13} /> Новое дело
          </button>
          <div className="row tiny dim" style={{ justifyContent: 'space-between' }}>
            <span>Всего дел</span>
            <span className="num">{cases.length}</span>
          </div>
        </div>
        <div className="side-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {cases.length === 0 && <div className="empty" style={{ margin: 6 }}>Дел пока нет. Создайте первое или сохраните ответ из чата.</div>}
          {cases.map((item) => (
            <button key={item.id} className={`case-item ${item.id === draft.id ? 'active' : ''}`} onClick={() => setDraft(item)}>
              <b>{item.title || 'Без названия'}</b>
              <div className="row">
                <span>{statusLabel[item.status]}</span>
                <span>·</span>
                <span>{new Date(item.updatedAt).toLocaleDateString('ru-RU')}</span>
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
            <h2>Карточка дела</h2>
            <div className="hint row" style={{ gap: 6 }}>
              <button className="btn sm" onClick={save}>Сохранить</button>
              <button className="btn ghost sm" onClick={remove} title="Удалить">
                <IconTrash size={13} />
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Название</label>
              <input className="input" value={draft.title} placeholder="Спор с магазином о возврате телефона" onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </div>
            <div className="field">
              <label>Клиент</label>
              <input className="input" value={draft.client} placeholder="ФИО / организация" onChange={(event) => setDraft({ ...draft, client: event.target.value })} />
            </div>
            <div className="field">
              <label>Статус</label>
              <select className="input" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as LegalCase['status'] })}>
                <option value="open">Открыто</option>
                <option value="work">В работе</option>
                <option value="closed">Закрыто</option>
              </select>
            </div>
            <div className="field">
              <label>Право страны</label>
              <input className="input" value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })} />
            </div>
            <div className="field wide">
              <label>Суть</label>
              <textarea className="input" rows={2} value={draft.summary} placeholder="Коротко: факты, требования, сроки" onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
            </div>
          </div>

          <div className="meta-grid" style={{ marginTop: 4 }}>
            <div className="meta-box">
              <div className="k">Заметки</div>
              <div className="v">{draft.notes.length}</div>
            </div>
            <div className="meta-box">
              <div className="k">Файлы</div>
              <div className="v">{draft.files.length}</div>
            </div>
            <div className="meta-box">
              <div className="k">Обновлено</div>
              <div className="v" style={{ fontSize: 13 }}>{new Date(draft.updatedAt).toLocaleDateString('ru-RU')}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Заметки и ход дела</h2>
            <button className="btn ghost sm hint" onClick={() => api.revealCase(draft.id)}>открыть папку</button>
          </div>
          <textarea className="input" rows={2} placeholder="Что сделано, что дальше, сроки" value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="row" style={{ marginTop: 9, justifyContent: 'flex-end' }}>
            <button className="btn primary sm" onClick={addNote}>Добавить заметку</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {draft.notes.length === 0 && <div className="dim tiny">Пока пусто.</div>}
            {draft.notes.map((item) => (
              <div className="note" key={item.id}>
                <div className="tiny dim">{new Date(item.createdAt).toLocaleString('ru-RU')}</div>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <IconPaperclip size={15} />
            <h2>Файлы дела</h2>
            <button className="btn sm hint" onClick={attach}>Добавить файл</button>
          </div>
          {draft.files.length === 0 && <div className="dim tiny">Договоры, чеки, переписка — копии хранятся в папке дела.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {draft.files.map((file) => (
              <div className="file-row" key={file.path}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span className="num dim tiny" style={{ marginLeft: 'auto' }}>{Math.max(1, Math.round(file.size / 1024))} КБ</span>
                <button onClick={() => api.openFile(file.path)}>открыть</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
