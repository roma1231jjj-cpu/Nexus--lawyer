import fs from 'node:fs';
import path from 'node:path';

export type CaseFile = { name: string; path: string; size: number; addedAt: string };
export type CaseNote = { id: string; text: string; createdAt: string };
export type LegalCase = {
  id: string;
  title: string;
  client: string;
  status: 'open' | 'work' | 'closed';
  country: string;
  summary: string;
  notes: CaseNote[];
  files: CaseFile[];
  createdAt: string;
  updatedAt: string;
  version?: number;
};

const now = () => new Date().toISOString();

const clean = (value: unknown, max: number) => String(value ?? '').slice(0, max);
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const safeId = (value: unknown) => clean(value, 64).replace(/[^A-Za-z0-9_-]/g, '');

const normalize = (item: Partial<LegalCase>): LegalCase => ({
  // id попадает в path.join: `..` и слэши не должны выводить за папку дел
  id: safeId(item.id),
  title: clean(item.title, 200),
  client: clean(item.client, 200),
  status: item.status === 'work' || item.status === 'closed' ? item.status : 'open',
  country: clean(item.country, 8),
  summary: clean(item.summary, 4000),
  notes: Array.isArray(item.notes)
    ? item.notes
        .filter((note) => note && typeof note.text === 'string')
        .slice(-200)
        .map((note) => ({
          id: clean(note.id, 64),
          text: String(note.text).slice(0, 20000),
          createdAt: clean(note.createdAt, 40) || now()
        }))
    : [],
  files: Array.isArray(item.files)
    ? item.files
        .filter((file) => file && typeof file.path === 'string')
        .slice(0, 200)
        .map((file) => ({
          name: clean(file.name, 200),
          path: String(file.path),
          size: Number(file.size) || 0,
          addedAt: clean(file.addedAt, 40) || now()
        }))
    : [],
  createdAt: clean(item.createdAt, 40) || now(),
  updatedAt: clean(item.updatedAt, 40) || now(),
  version: Number(item.version) || 1
});

export function createCases(dir: string, store: { read: <T>(name: string, fallback: T) => T; write: (name: string, data: unknown) => void }) {
  const file = () => path.join(dir, 'cases.json');
  const folder = (id: string) => {
    if (!ID_RE.test(id)) throw new Error('bad case id');
    return path.join(dir, 'cases', id);
  };

  const list = () => store.read<LegalCase[]>('cases.json', []).map(normalize);

  const save = (raw: Partial<LegalCase>) => {
    const items = list();
    const next = normalize({ ...raw, updatedAt: now() });
    if (!next.id) next.id = `case-${Date.now().toString(36)}`;
    const index = items.findIndex((entry) => entry.id === next.id);
    if (index >= 0) {
      const current = items[index];
      const expected = Number(raw.version);
      if (Number.isFinite(expected) && expected > 0 && current.version && expected < current.version) {
        return { ok: false as const, error: 'stale', current };
      }
      next.version = (current.version ?? 1) + 1;
      next.createdAt = current.createdAt;
      items[index] = next;
    } else {
      next.version = 1;
      items.unshift(next);
    }
    store.write('cases.json', items);
    return { ok: true as const, item: next };
  };

  const remove = (id: string) => {
    if (!ID_RE.test(id)) return { ok: false as const, error: 'bad id' };
    const items = list();
    const next = items.filter((entry) => entry.id !== id);
    if (next.length === items.length) return { ok: false as const, error: 'not found' };
    // Папку сначала переименовываем в корзину рядом: если запись базы
    // упадёт, дело можно вернуть, а не потерять вместе с файлами.
    const trash = `${folder(id)}.deleting-${Date.now().toString(36)}`;
    let parked = false;
    try {
      if (fs.existsSync(folder(id))) {
        fs.renameSync(folder(id), trash);
        parked = true;
      }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'files not removed' };
    }
    try {
      store.write('cases.json', next);
    } catch (error) {
      if (parked) {
        try {
          fs.renameSync(trash, folder(id));
        } catch {
          /* файлы остались в корзине рядом с делом */
        }
      }
      return { ok: false as const, error: error instanceof Error ? error.message : 'cases not saved' };
    }
    if (parked) {
      try {
        fs.rmSync(trash, { recursive: true, force: true });
      } catch {
        /* удалим при следующей уборке, запись уже консистентна */
      }
    }
    return { ok: true as const };
  };

  const appendNote = (id: string, text: string) => {
    if (!ID_RE.test(id)) return { ok: false as const, error: 'bad id' };
    const items = list();
    const item = items.find((entry) => entry.id === id);
    if (!item) return { ok: false as const, error: 'not found' };
    item.notes = [...item.notes, { id: `note-${Date.now().toString(36)}`, text: String(text).slice(0, 20000), createdAt: now() }];
    item.updatedAt = now();
    item.version = (item.version ?? 1) + 1;
    store.write('cases.json', items);
    return { ok: true as const, item };
  };

  const attach = (id: string, sources: string[]) => {
    if (!ID_RE.test(id)) return { ok: false as const, error: 'bad id', files: [] as CaseFile[] };
    const items = list();
    const item = items.find((entry) => entry.id === id);
    if (!item) return { ok: false as const, error: 'not found', files: [] as CaseFile[] };
    const target = folder(id);
    fs.mkdirSync(target, { recursive: true });
    const created: string[] = [];
    const added: CaseFile[] = [];
    const unique = (name: string) => {
      const ext = path.extname(name);
      const base = name.slice(0, name.length - ext.length) || 'file';
      let candidate = name;
      let index = 1;
      while (fs.existsSync(path.join(target, candidate))) candidate = `${base}-${index++}${ext}`;
      return candidate;
    };
    try {
      for (const source of sources) {
        // одинаковые имена не перезаписывают предыдущее вложение
        const name = unique(path.basename(source));
        const copy = path.join(target, name);
        fs.copyFileSync(source, copy);
        created.push(copy);
        added.push({ name, path: copy, size: fs.statSync(copy).size, addedAt: now() });
      }
    } catch (error) {
      // откатываем частичное копирование, чтобы не оставлять бесхозные файлы
      for (const copy of created) {
        try {
          fs.rmSync(copy, { force: true });
        } catch {
          /* ignore */
        }
      }
      return { ok: false as const, error: error instanceof Error ? error.message : 'copy failed', files: item.files };
    }
    item.files = [...item.files, ...added];
    item.updatedAt = now();
    item.version = (item.version ?? 1) + 1;
    try {
      store.write('cases.json', items);
    } catch (error) {
      // копии уже на диске: убираем их, чтобы не оставлять файлы без записи
      for (const copy of created) {
        try {
          fs.rmSync(copy, { force: true });
        } catch {
          /* ignore */
        }
      }
      return { ok: false as const, error: error instanceof Error ? error.message : 'cases not saved', files: item.files };
    }
    return { ok: true as const, item, files: item.files };
  };

  const removeFile = (id: string, target: string) => {
    if (!ID_RE.test(id)) return { ok: false as const, error: 'bad id' };
    const items = list();
    const item = items.find((entry) => entry.id === id);
    if (!item) return { ok: false as const, error: 'not found' };
    const file = item.files.find((entry) => entry.path === target);
    if (!file) return { ok: false as const, error: 'file not found' };
    const caseRoot = path.resolve(folder(id));
    const full = path.resolve(target);
    if (!full.startsWith(caseRoot + path.sep)) return { ok: false as const, error: 'outside' };
    // Файл откладываем рядом: если база не запишется, вернём его на место.
    const trash = `${full}.deleting-${Date.now().toString(36)}`;
    let parked = false;
    try {
      if (fs.existsSync(full)) {
        fs.renameSync(full, trash);
        parked = true;
      }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'file not removed' };
    }
    item.files = item.files.filter((entry) => entry.path !== target);
    item.updatedAt = now();
    item.version = (item.version ?? 1) + 1;
    try {
      store.write('cases.json', items);
    } catch (error) {
      if (parked) {
        try {
          fs.renameSync(trash, full);
        } catch {
          /* отложенный файл остаётся рядом, данные не потеряны */
        }
      }
      return { ok: false as const, error: error instanceof Error ? error.message : 'cases not saved' };
    }
    if (parked) {
      try {
        fs.rmSync(trash, { force: true });
      } catch {
        /* удалим при следующей уборке */
      }
    }
    return { ok: true as const, item };
  };

  const inside = (target: string) => {
    // открывать/удалять можно только вложения, а не любой файл внутри userData
    const root = path.resolve(dir, 'cases');
    const full = path.resolve(target);
    return full.startsWith(root + path.sep);
  };

  return { list, save, remove, appendNote, attach, removeFile, inside, folder, file };
}

export type Cases = ReturnType<typeof createCases>;
