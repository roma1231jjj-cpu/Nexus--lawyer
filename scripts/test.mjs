import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'nl-tests-'));
const require = createRequire(import.meta.url);

async function load(entry, name) {
  const outfile = path.join(outdir, `${name}.cjs`);
  await build({
    entryPoints: [path.join(root, entry)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['electron', 'electron-updater'],
    logLevel: 'silent'
  });
  return require(outfile);
}

const lawsModule = await load('electron/laws.ts', 'laws');
const aiModule = await load('electron/ai.ts', 'ai');

const bundled = path.join(root, 'resources', 'laws');
const makeLaws = (extraDir) => lawsModule.createLaws(bundled, extraDir);

const settings = {
  baseUrl: 'http://127.0.0.1:11434/v1',
  model: 'test',
  apiKey: '',
  temperature: 0.2,
  theme: 'midnight',
  channel: 'stable',
  language: 'ru',
  answerLanguage: 'ru',
  feedUrl: '',
  autoUpdate: false,
  country: 'RU'
};

test('встроенные пакеты читаются и дают все страны', () => {
  const laws = makeLaws(path.join(outdir, 'user-empty'));
  const total = laws.counts();
  assert.ok(total.articles > 150, `норм мало: ${total.articles}`);
  assert.ok(total.countries >= 10, `стран мало: ${total.countries}`);
  assert.equal(laws.search('', 'ALL', 5).total, 0, 'пустой запрос не должен ничего находить');
});

test('поиск по номеру статьи находит эту статью в топе', () => {
  const laws = makeLaws(path.join(outdir, 'user-num'));
  const result = laws.search('18', 'RU', 10);
  assert.ok(result.hits.length > 0, 'номер статьи не находится');
  const bare = (value) => value.toLowerCase().replace(/^ст\.?\s*/, '');
  assert.ok(
    result.hits.slice(0, 5).some((hit) => bare(hit.article.number) === '18'),
    `в топе нет статьи 18: ${result.hits.map((hit) => hit.article.number).join(', ')}`
  );
});

test('точный номер в составном запросе «статья 18» идёт первым', () => {
  const laws = makeLaws(path.join(outdir, 'user-exact'));
  const result = laws.search('статья 18', 'RU', 10);
  assert.ok(result.hits.length > 0, 'составной запрос ничего не нашёл');
  const bare = result.hits[0].article.number.toLowerCase().replace(/^ст\.?\s*/, '');
  assert.equal(bare, '18', `первым должен быть номер 18, а не ${result.hits[0].article.number}`);
});

test('пользовательские пакеты применяются в порядке импорта, а не по имени', () => {
  const userDir = path.join(outdir, 'user-order');
  fs.mkdirSync(userDir, { recursive: true });
  const article = (title) => ({
    id: 'same-1',
    country: 'KZ',
    code: 'ТК РК',
    codeShort: 'ТК РК',
    number: '1',
    title,
    text: 'Проверочная норма для порядка импорта.'
  });
  const oldFile = path.join(userDir, 'aaa-old.json');
  const newFile = path.join(userDir, 'zzz-new.json');
  fs.writeFileSync(oldFile, JSON.stringify({ articles: [article('Старая редакция')] }), 'utf8');
  fs.writeFileSync(newFile, JSON.stringify({ articles: [article('Новая редакция')] }), 'utf8');
  const stamp = Date.now() / 1000;
  fs.utimesSync(oldFile, stamp - 100, stamp - 100);
  fs.utimesSync(newFile, stamp, stamp);
  const laws = makeLaws(userDir);
  const found = laws.byCountry('KZ').find((item) => item.id === 'same-1');
  assert.equal(found?.title, 'Новая редакция');
});
test('поиск без страны идёт по всем пакетам', () => {
  const laws = makeLaws(path.join(outdir, 'user-all'));
  const all = laws.search('договор', 'ALL', 20);
  const ru = laws.search('договор', 'RU', 20);
  assert.ok(all.total >= ru.total, 'глобальный поиск не должен быть уже странового');
  assert.ok(all.hits.length > 0);
});

test('сортировка по номеру статьи идёт по частям номера', () => {
  const laws = makeLaws(path.join(outdir, 'user-sort'));
  const parts = (value) => value.toLowerCase().replace(/^ст\.?\s*/, '').split(/[.\-\s]+/).filter(Boolean);
  const cmp = (a, b) => {
    const left = parts(a);
    const right = parts(b);
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      if (left[i] === undefined) return -1;
      if (right[i] === undefined) return 1;
      const ln = Number(left[i].replace(/[^0-9]/g, ''));
      const rn = Number(right[i].replace(/[^0-9]/g, ''));
      if (Number.isFinite(ln) && Number.isFinite(rn) && ln !== rn) return ln - rn;
      if (left[i] !== right[i]) return left[i].localeCompare(right[i], 'ru');
    }
    return 0;
  };
  const groups = new Map();
  for (const article of laws.byCountry('RU')) {
    const list = groups.get(article.code) ?? [];
    list.push(article.number);
    groups.set(article.code, list);
  }
  let checked = 0;
  for (const [code, numbers] of groups) {
    if (numbers.length < 4) continue;
    for (let i = 1; i < numbers.length; i++) {
      assert.ok(cmp(numbers[i - 1], numbers[i]) <= 0, `нормы ${code}: ${numbers[i - 1]} стоит перед ${numbers[i]}`);
    }
    checked++;
  }
  assert.ok(checked > 0, 'не нашлось ни одного кодекса для проверки порядка');
});

test('byCountry("ALL") отдаёт нормы всех стран', () => {
  const laws = makeLaws(path.join(outdir, 'user-allcountry'));
  const all = laws.byCountry('ALL');
  const countries = new Set(all.map((article) => article.country));
  assert.ok(countries.size > 1, 'в режиме всех стран вернулась одна страна');
  assert.ok(laws.codesByCountry('ALL').length > 1);
});

test('битый пакет не ломает базу и возвращает ошибки', () => {
  const userDir = path.join(outdir, 'user-bad');
  const laws = makeLaws(userDir);
  const before = laws.counts().articles;
  const outcome = laws.importPack({ articles: [{ title: '', text: '' }, { number: '1' }] }, false);
  assert.equal(outcome.added, 0);
  assert.ok(outcome.errors.length > 0, 'ошибки валидации не вернулись');
  laws.reload();
  assert.equal(laws.counts().articles, before, 'количество норм изменилось после битого импорта');
});

test('валидный пакет импортируется и виден в поиске', () => {
  const userDir = path.join(outdir, 'user-good');
  const laws = makeLaws(userDir);
  const outcome = laws.importPack(
    {
      articles: [
        {
          id: 'test-1',
          country: 'KZ',
          code: 'ГК РК',
          codeShort: 'ГК РК',
          number: '999',
          title: 'Проверочная норма',
          text: 'Проверочный текст нормы для теста поиска.'
        }
      ]
    },
    true
  );
  assert.equal(outcome.added, 1, JSON.stringify(outcome.errors));
  const hit = laws.search('проверочная норма', 'KZ', 5);
  assert.equal(hit.hits[0]?.article.id, 'test-1');
});

test('системный промпт содержит страну, язык и нормы', () => {
  const laws = makeLaws(path.join(outdir, 'user-prompt'));
  const sources = aiModule.buildSources('неустойка', 'RU', laws, 3);
  const prompt = aiModule.buildSystemPrompt(sources, 'RU', 'Россия', 'ru');
  assert.match(prompt, /Россия/);
  assert.match(prompt, /неустойк/i);
  assert.ok(prompt.length > 200);
});

test('офлайн-ответ опирается на найденные нормы', () => {
  const laws = makeLaws(path.join(outdir, 'user-offline'));
  const sources = aiModule.buildSources('неустойка', 'RU', laws, 3);
  const answer = aiModule.offlineAnswer('неустойка', sources, 'Россия', 'ru');
  assert.ok(answer.includes(sources[0].code) || answer.includes(sources[0].number), 'офлайн-ответ не ссылается на нормы');
});

test('streamChat собирает SSE-поток', async () => {
  const restore = globalThis.fetch;
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Привет"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":", мир"}}]}\n\n',
    'data: [DONE]\n\n'
  ];
  globalThis.fetch = async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      }
    });
    return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
  };
  const deltas = [];
  const result = await aiModule.streamChat({
    settings,
    messages: [{ role: 'user', content: 'привет' }],
    signal: new AbortController().signal,
    onDelta: (delta) => deltas.push(delta)
  });
  globalThis.fetch = restore;
  assert.equal(result.text, 'Привет, мир');
  assert.deepEqual(deltas, ['Привет', ', мир']);
  assert.equal(result.cancelled, undefined);
});

test('streamChat понимает сервер без SSE', async () => {
  const restore = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: 'обычный json' } }] }), {
      headers: { 'content-type': 'application/json' }
    });
  const result = await aiModule.streamChat({
    settings,
    messages: [{ role: 'user', content: 'привет' }],
    signal: new AbortController().signal,
    onDelta: () => undefined
  });
  globalThis.fetch = restore;
  assert.equal(result.text, 'обычный json');
});

test('streamChat отдаёт ошибку вместо пустоты при HTTP 500', async () => {
  const restore = globalThis.fetch;
  globalThis.fetch = async () => new Response('boom', { status: 500, headers: { 'content-type': 'text/plain' } });
  const result = await aiModule.streamChat({
    settings,
    messages: [{ role: 'user', content: 'привет' }],
    signal: new AbortController().signal,
    onDelta: () => undefined
  });
  globalThis.fetch = restore;
  assert.match(result.error ?? '', /500/);
});

test('остановка помечает ответ как cancelled', async () => {
  const restore = globalThis.fetch;
  const controller = new AbortController();
  globalThis.fetch = async (_url, init) => {
    const stream = new ReadableStream({
      start(streamController) {
        const encoder = new TextEncoder();
        streamController.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"нач"}}]}\n\n'));
        init.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          streamController.error(error);
        });
      }
    });
    return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
  };
  const result = await aiModule.streamChat({
    settings,
    messages: [{ role: 'user', content: 'привет' }],
    signal: controller.signal,
    onDelta: () => controller.abort()
  });
  globalThis.fetch = restore;
  assert.equal(result.cancelled, true);
  assert.equal(result.text, 'нач');
});


const casesModule = await load('electron/cases.ts', 'cases');

test('вложения с одинаковым именем не перезаписывают друг друга', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nl-cases-'));
  const dataDir = path.join(root, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const first = path.join(root, 'a', 'same.txt');
  const second = path.join(root, 'b', 'same.txt');
  fs.mkdirSync(path.dirname(first), { recursive: true });
  fs.mkdirSync(path.dirname(second), { recursive: true });
  fs.writeFileSync(first, 'first', 'utf8');
  fs.writeFileSync(second, 'second', 'utf8');
  let data = [];
  const store = { read: () => data, write: (_name, value) => { data = value; } };
  const cases = casesModule.createCases(dataDir, store);
  cases.save({ id: 'case-1', title: 'T', client: 'C', country: 'RU' });
  const result = cases.attach('case-1', [first, second]);
  assert.equal(result.ok, true);
  assert.equal(result.files.length, 2);
  assert.notEqual(result.files[0].path, result.files[1].path);
  assert.equal(fs.readFileSync(result.files[0].path, 'utf8'), 'first');
  assert.equal(fs.readFileSync(result.files[1].path, 'utf8'), 'second');
  fs.rmSync(root, { recursive: true, force: true });
});

test('id дела и путь вложения не выводят за папку дел', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nl-cases-'));
  const dataDir = path.join(root, 'data');
  fs.writeFileSync(path.join(root, 'secret.txt'), 'secret', 'utf8');
  let data = [{
    id: 'case-1', title: 'T', client: 'C', status: 'open', country: 'RU', summary: '',
    notes: [], files: [{ name: 'x', path: path.join(root, 'secret.txt'), size: 1, addedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1
  }];
  const store = { read: () => data, write: (_name, value) => { data = value; } };
  const cases = casesModule.createCases(dataDir, store);
  assert.equal(cases.attach('../evil', []).ok, false);
  assert.equal(cases.inside(path.join(dataDir, 'cases', 'case-1', 'x.txt')), true);
  assert.equal(cases.inside(path.join(dataDir, 'token.txt')), false);
  assert.equal(cases.removeFile('case-1', path.join(root, 'secret.txt')).ok, false);
  assert.equal(fs.existsSync(path.join(root, 'secret.txt')), true);
  fs.rmSync(root, { recursive: true, force: true });
});
