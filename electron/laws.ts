import fs from 'node:fs';
import path from 'node:path';

export type Article = {
  id: string;
  country: string;
  code: string;
  codeShort: string;
  number: string;
  title: string;
  text: string;
  tags?: string[];
  sourceUrl?: string;
  revisedAt?: string;
  checkedAt?: string;
  status?: 'active' | 'unknown';
};

export type Country = {
  code: string;
  name: string;
  flag: string;
  region: string;
  system: string;
  languages: string;
  note: string;
};

export type LawPack = {
  countries: Country[];
  articles: Article[];
};

export type SearchHit = { article: Article; score: number };
export type SearchResult = { hits: SearchHit[]; total: number; truncated: boolean };

const STOP = new Set([
  'что', 'как', 'для', 'или', 'если', 'мне', 'меня', 'они', 'она', 'оно', 'это', 'при', 'без', 'так', 'все', 'его', 'ему',
  'был', 'была', 'быть', 'может', 'можно', 'нужно', 'надо', 'где', 'когда', 'почему', 'какой', 'какая', 'какие', 'есть',
  'еще', 'уже', 'тоже', 'также', 'через', 'после', 'перед', 'между', 'чтобы', 'который', 'которая', 'которые', 'свой',
  'свои', 'them', 'the', 'and', 'for', 'with', 'that', 'this', 'have', 'was', 'sind', 'und', 'les', 'des', 'und'
]);

const ALPHABET = /[^\p{L}\p{N}]+/u;
const MARKS = /\p{M}+/gu;

// грубое усечение словоформ, чтобы «телефона/телефоном/телефоны» совпадали
const stem = (word: string) => {
  if (/^\d+$/.test(word)) return word;
  const value = word.replace(/ё/g, 'е');
  if (value.length <= 5) return value;
  return value.slice(0, value.length > 8 ? 6 : 5);
};

export const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(MARKS, '')
    .replace(/ё/g, 'е')
    .split(ALPHABET)
    .filter((token) => {
      if (!token) return false;
      if (/^\d+$/.test(token)) return true; // номера статей 2–3 цифры искать нужно
      return token.length > 2 && !STOP.has(token);
    })
    .map(stem);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(MARKS, '')
    .replace(/ё/g, 'е');

const EXPAND: Record<string, string[]> = {
  телеф: ['товар', 'потреби', 'смартф', 'недост'],
  смарт: ['телеф', 'товар', 'потреби'],
  товар: ['потреби', 'покупк', 'продав'],
  магаз: ['продав', 'потреби', 'возвра'],
  брак: ['недост', 'качест', 'товар'],
  кража: ['хищен', 'тайн'],
  деньг: ['сумм', 'возвра', 'оплат'],
  верну: ['возвра', 'растор'],
  возвр: ['растор', 'деньг'],
  зарпл: ['труд', 'работ', 'оплат', 'заработ', 'выплат'],
  зараб: ['зарпла', 'выплат', 'оплат'],
  задер: ['просроч', 'задерж', 'выплат'],
  задерж: ['просроч', 'выплат'],
  оспор: ['обжал', 'апелляц', 'жалоб'],
  гибдд: ['дтп', 'водител', 'трансп', 'штраф'],
  претенз: ['досудеб', 'требован'],
  работ: ['труд', 'работод'],
  уволь: ['работ', 'труд', 'растор'],
  аренд: ['наём', 'жильё', 'кварти'],
  кварт: ['жильё', 'аренд', 'наём'],
  депоз: ['аренд', 'задат', 'возвра'],
  залив: ['вред', 'имущест', 'ущерб'],
  сосед: ['жильё', 'ущерб', 'вред'],
  разво: ['брак', 'супруг', 'алиме'],
  алиме: ['дет', 'содерж', 'супруг'],
  наслед: ['завещ', 'нотар', 'очеред'],
  долг: ['заём', 'распис', 'взыск'],
  займ: ['заём', 'долг', 'распис'],
  дтп: ['водител', 'трансп', 'вред'],
  штраф: ['коап', 'ответст', 'админист'],
  налог: ['ндфл', 'вычет', 'фнс'],
  увольн: ['уволь', 'труд'],
  // другие языки: короткие подсказки, чтобы поиск не зависел только от русского
  rent: ['lease', 'tenant', 'landlord'],
  contract: ['agreement', 'breach'],
  employee: ['employment', 'dismissal'],
  refund: ['return', 'consumer']
};

const lookup = (token: string) => {
  if (EXPAND[token]) return EXPAND[token];
  for (const key of Object.keys(EXPAND)) {
    if (token.startsWith(key) || key.startsWith(token)) return EXPAND[key];
  }
  return [];
};

const expand = (tokens: string[]) => {
  const weights = new Map<string, number>();
  for (const token of tokens) weights.set(token, 1);
  for (const token of tokens) {
    for (const extra of lookup(token)) {
      const key = stem(extra);
      if (!weights.has(key)) weights.set(key, 0.45);
    }
  }
  return weights;
};

const PRIOR: [RegExp, string[]][] = [
  [/зарпла|заработ|трудоустр|уволь|отпуск|сверхуроч|работодат|трудов|сотрудник|прогул/, ['ТК РФ']],
  [/потребит|товар|магазин|телефон|смартфон|возврат|брак|недостат|гарант|чек|покупк/, ['Закон о защите прав потребителей', 'ГК РФ ч. 2']],
  [/аренд|квартир|жиль|наём|наем|депозит|сосед|жкх|коммунал/, ['ГК РФ ч. 2', 'ЖК РФ']],
  [/алимент|брак|развод|супруг|дет|родител|наслед/, ['СК РФ', 'ГК РФ ч. 1']],
  [/налог|ндфл|вычет|фнс|декларац/, ['НК РФ']],
  [/давност|сделк|договор|долг|заём|займ|убыт|неустойк|обогащ/, ['ГК РФ ч. 1', 'ГК РФ ч. 2']],
  [/краж|мошеннич|грабёж|грабеж|уголов|убийств|взятк|хулиган|побои|клевет/, ['УК РФ', 'КоАП РФ']],
  [/штраф|коап|гибдд|дтп|права|регистрац/, ['КоАП РФ', 'УК РФ']],
  [/суд|иск|апелляц|приказ|процесс/, ['ГПК РФ', 'АПК РФ']]
];

const numberValue = (value: string) => {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
};

// «ст. 12.8» должно идти раньше «ст. 12.24»: сравниваем части номера, а не первое число
const numberParts = (value: string) =>
  String(value)
    .toLowerCase()
    .replace(/^ст\.?\s*/, '')
    .split(/[.\-–\s]+/)
    .filter(Boolean);

const compareNumbers = (a: string, b: string) => {
  const left = numberParts(a);
  const right = numberParts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const l = left[i];
    const r = right[i];
    if (l === undefined) return -1;
    if (r === undefined) return 1;
    const ln = Number(l.replace(/[^0-9]/g, ''));
    const rn = Number(r.replace(/[^0-9]/g, ''));
    if (Number.isFinite(ln) && Number.isFinite(rn) && ln !== rn) return ln - rn;
    if (l !== r) return l.localeCompare(r, 'ru');
  }
  return 0;
};

export function validatePack(pack: unknown): { articles: Article[]; countries: Country[]; errors: string[] } {
  const errors: string[] = [];
  const articles: Article[] = [];
  const countries: Country[] = [];
  if (!pack || typeof pack !== 'object') return { articles, countries, errors: ['not an object'] };
  const source = pack as Partial<LawPack>;
  if (Array.isArray(source.countries)) {
    for (const item of source.countries) {
      if (!item || typeof item.code !== 'string' || typeof item.name !== 'string') {
        errors.push('country without code/name');
        continue;
      }
      countries.push({
        code: item.code.slice(0, 8),
        name: item.name.slice(0, 80),
        flag: String(item.flag ?? '').slice(0, 8),
        region: String(item.region ?? '').slice(0, 40),
        system: String(item.system ?? '').slice(0, 60),
        languages: String(item.languages ?? '').slice(0, 60),
        note: String(item.note ?? '').slice(0, 200)
      });
    }
  }
  if (!Array.isArray(source.articles)) return { articles, countries, errors: [...errors, 'articles[] required'] };
  for (const raw of source.articles) {
    if (!raw || typeof raw !== 'object') {
      errors.push('article is not an object');
      continue;
    }
    const item = raw as Partial<Article>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) {
      errors.push('article without id');
      continue;
    }
    if (typeof item.country !== 'string' || item.country.length < 2) {
      errors.push(`${id}: no country`);
      continue;
    }
    if (typeof item.text !== 'string' || !item.text.trim()) {
      errors.push(`${id}: no text`);
      continue;
    }
    const tags = Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.slice(0, 40)) : [];
    articles.push({
      id: id.slice(0, 80),
      country: item.country.slice(0, 8),
      code: String(item.code ?? '').slice(0, 120),
      codeShort: String(item.codeShort ?? item.code ?? '').slice(0, 40),
      number: String(item.number ?? '').slice(0, 40),
      title: String(item.title ?? '').slice(0, 300),
      text: item.text,
      tags,
      sourceUrl: typeof item.sourceUrl === 'string' ? item.sourceUrl.slice(0, 400) : undefined,
      revisedAt: typeof item.revisedAt === 'string' ? item.revisedAt.slice(0, 40) : undefined,
      checkedAt: typeof item.checkedAt === 'string' ? item.checkedAt.slice(0, 40) : undefined,
      status: item.status === 'active' ? 'active' : undefined
    });
  }
  return { articles, countries, errors };
}

export function createLaws(bundledDir: string, userFile: string) {
  const articles: Article[] = [];
  const countries = new Map<string, Country>();
  let df = new Map<string, number>();
  let index: {
    article: Article;
    full: string;
    number: string;
    titleTokens: Set<string>;
    tagTokens: Set<string>;
    bodyTokens: Set<string>;
  }[] = [];

  const makeEntry = (article: Article) => ({
    article,
    full: normalize(`${article.code} ${article.number} ${article.title} ${article.text} ${(article.tags ?? []).join(' ')}`),
    number: normalize(article.number),
    titleTokens: new Set(tokenize(`${article.code} ${article.title}`)),
    tagTokens: new Set(tokenize((article.tags ?? []).join(' '))),
    bodyTokens: new Set(tokenize(article.text))
  });

  const allTokens = (entry: ReturnType<typeof makeEntry>) =>
    new Set([...entry.titleTokens, ...entry.tagTokens, ...entry.bodyTokens]);

  const indexCountry = (country: Country) => {
    if (!countries.has(country.code)) countries.set(country.code, country);
  };

  const absorb = (pack: Partial<LawPack>, replace = false) => {
    let added = 0;
    for (const country of pack.countries ?? []) indexCountry(country);
    for (const raw of pack.articles ?? []) {
      const parsed = validatePack({ articles: [raw] });
      const article = parsed.articles[0];
      if (!article) continue;
      const existing = index.findIndex((entry) => entry.article.id === article.id);
      if (existing >= 0) {
        if (!replace) continue;
        for (const token of allTokens(index[existing])) df.set(token, Math.max(0, (df.get(token) ?? 1) - 1));
        for (const token of allTokens(makeEntry(article))) df.set(token, (df.get(token) ?? 0) + 1);
        index[existing] = makeEntry(article);
        const target = articles.findIndex((item) => item.id === article.id);
        if (target >= 0) articles[target] = article;
        added += 1;
        continue;
      }
      articles.push(article);
      const entry = makeEntry(article);
      index.push(entry);
      for (const token of allTokens(entry)) df.set(token, (df.get(token) ?? 0) + 1);
      if (!countries.has(article.country)) {
        countries.set(article.country, {
          code: article.country,
          name: article.country,
          flag: '',
          region: '—',
          system: '—',
          languages: '—',
          note: 'Добавлено пользователем / user imported'
        });
      }
      added += 1;
    }
    return added;
  };

  const loadDir = (dir: string, replace = false) => {
    if (!fs.existsSync(dir)) return;
    const names = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
    // Пользовательские пакеты применяются в порядке импорта (mtime), а не
    // по имени: имя начинается с хэша, поэтому старый пакет мог перебить новый.
    if (replace) {
      names.sort((a, b) => {
        const time = (name: string) => {
          try {
            return fs.statSync(path.join(dir, name)).mtimeMs;
          } catch {
            return 0;
          }
        };
        return time(a) - time(b) || a.localeCompare(b);
      });
    }
    for (const name of names) {
      try {
        absorb(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')), replace);
      } catch {
        /* повреждённый пакет пропускаем */
      }
    }
  };

  loadDir(bundledDir);
  loadDir(userFile, true);

  const idf = (token: string) => {
    const total = Math.max(index.length, 1);
    const frequency = df.get(token) ?? 0;
    return Math.min(3, Math.max(0.35, Math.log(1 + total / (1 + frequency))));
  };

  const countryList = () =>
    [...countries.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  const totalByCountry = () => {
    const map: Record<string, { name: string; flag: string; count: number }> = {};
    for (const country of countryList()) map[country.code] = { name: country.name, flag: country.flag, count: 0 };
    for (const article of articles) if (map[article.country]) map[article.country].count++;
    return map;
  };

  const search = (query: string, country?: string, limit = 12): SearchResult => {
    const q = normalize(query).trim();
    if (!q) return { hits: [], total: 0, truncated: false };
    const base = tokenize(q);
    if (!base.length) return { hits: [], total: 0, truncated: false };
    const tokens = expand(base);
    // «статья 18» раньше не получала бонус точного номера: он срабатывал
    // только на запрос целиком из цифр. Достаём номер из составного запроса.
    const exactNumber = (q.match(/(?:^|\s)(\d+(?:[.\-]\d+)*[a-zа-я]?)(?=\s|$)/i) ?? [])[1]?.toLowerCase() ?? '';

    const scored = index
      .filter((item) => !country || country === 'ALL' || item.article.country === country)
      .map((item) => {
        let score = 0;
        let matched = 0;
        for (const [token, weight] of tokens) {
          const rarity = idf(token);
          let hit = 0;
          if (item.number.includes(token)) hit += 16;
          if (item.titleTokens.has(token)) hit += 12;
          if (item.tagTokens.has(token)) hit += 8;
          if (!hit && item.bodyTokens.has(token)) hit += 2.5;
          if (hit) matched++;
          score += hit * rarity * weight;
        }
        if (!matched) return null;
        // точный номер статьи всегда выше «похожих» номеров (18 против 180/181)
        if (exactNumber) {
          const bare = item.article.number.toLowerCase().replace(/^ст\.?\s*/, '').replace(/\s+/g, '');
          const wanted = exactNumber.replace(/\s+/g, '');
          if (bare === wanted) score += 70;
          else if (bare.startsWith(wanted)) score += 8;
        }
        const preferred = PRIOR.find(([pattern]) => pattern.test(q));
        if (preferred && preferred[1].some((code) => item.article.code.startsWith(code))) score *= 1.5;
        if (item.full.includes(q)) score += 8;
        if (base.length > 1) score += matched * 1.5;
        return { article: item.article, score };
      })
      .filter((hit): hit is SearchHit => Boolean(hit))
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return { hits: [], total: 0, truncated: false };
    const threshold = Math.max(6, scored[0].score * 0.35);
    const filtered = scored.filter((hit) => hit.score >= threshold);
    return {
      hits: filtered.slice(0, limit),
      total: filtered.length,
      truncated: filtered.length > limit
    };
  };

  const byCountry = (country: string) =>
    (country === 'ALL' ? articles.slice() : articles.filter((article) => article.country === country))
      .sort(
        (a, b) =>
          a.country.localeCompare(b.country) ||
          a.code.localeCompare(b.code, 'ru') ||
          compareNumbers(a.number, b.number)
      );

  // для «всех стран» вкладки собираем по стране, иначе — по кодексу
  const codesByCountry = (country: string) => {
    const map = new Map<string, { code: string; short: string; count: number }>();
    for (const article of byCountry(country)) {
      const key = country === 'ALL' ? article.country : article.code;
      const short = country === 'ALL' ? article.country : article.codeShort;
      const entry = map.get(key) ?? { code: key, short, count: 0 };
      entry.count++;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  };

  const packs = () => {
    const list: { file: string; articles: number; errors: string[]; dir: 'bundled' | 'user' }[] = [];
    for (const [dir, flag] of [
      [bundledDir, 'bundled'],
      [userFile, 'user']
    ] as const) {
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith('.json')) continue;
        try {
          const parsed = validatePack(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
          list.push({ file: name, articles: parsed.articles.length, errors: parsed.errors, dir: flag });
        } catch (error) {
          list.push({ file: name, articles: 0, errors: [error instanceof Error ? error.message : 'bad json'], dir: flag });
        }
      }
    }
    return list;
  };

  return {
    listCountries: () => countryList(),
    totalByCountry,
    counts: () => ({ articles: articles.length, countries: countries.size }),
    search,
    byCountry,
    codesByCountry,
    packs,
    addArticle(article: Article, replace = false) {
      return absorb({ articles: [article] }, replace);
    },
    importPack(pack: unknown, replace = false) {
      const parsed = validatePack(pack);
      const added = absorb({ countries: parsed.countries, articles: parsed.articles }, replace);
      return { added, skipped: parsed.articles.length - added, errors: parsed.errors };
    },
    reload() {
      articles.length = 0;
      index = [];
      df = new Map();
      countries.clear();
      loadDir(bundledDir);
      loadDir(userFile, true);
    }
  };
}

export type Laws = ReturnType<typeof createLaws>;
