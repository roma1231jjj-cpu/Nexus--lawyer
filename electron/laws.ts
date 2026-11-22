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

const STOP = new Set([
  'что', 'как', 'для', 'или', 'если', 'мне', 'меня', 'они', 'она', 'оно', 'это', 'при', 'без', 'так', 'все', 'его', 'ему',
  'был', 'была', 'быть', 'может', 'можно', 'нужно', 'надо', 'где', 'когда', 'почему', 'какой', 'какая', 'какие', 'есть',
  'еще', 'уже', 'тоже', 'также', 'через', 'после', 'перед', 'между', 'чтобы', 'который', 'которая', 'которые', 'свой',
  'свои', 'them', 'the', 'and', 'for', 'with', 'that', 'this', 'have'
]);

// грубое усечение словоформ, чтобы «телефона/телефоном/телефоны» совпадали
const stem = (word: string) => {
  const value = word.replace(/ё/g, 'е');
  if (value.length <= 5) return value;
  return value.slice(0, value.length > 8 ? 6 : 5);
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^a-zа-я0-9]+/i)
    .filter((token) => token.length > 2 && !STOP.has(token))
    .map(stem);

const normalize = (value: string) => value.toLowerCase().replace(/ё/g, 'е');

const EXPAND: Record<string, string[]> = {
  телеф: ['товар', 'потреби', 'смартф', 'недост'],
  смарт: ['телеф', 'товар', 'потреби'],
  товар: ['потреби', 'покупк', 'продав'],
  магаз: ['продав', 'потреби', 'возвра'],
  брак: ['недост', 'качест', 'товар'],
  кража: ['хищен', 'тайн'],
  недоst: ['качест', 'товар'],
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
  брак2: ['супруг'],
  алиме: ['дет', 'содерж', 'супруг'],
  наслед: ['завещ', 'нотар', 'очеред'],
  долг: ['заём', 'распис', 'взыск'],
  займ: ['заём', 'долг', 'распис'],
  дтп: ['водител', 'трансп', 'вред'],
  штраф: ['коап', 'ответст', 'админист'],
  налог: ['ндфл', 'вычет', 'фнс'],
  увольн: ['уволь', 'труд']
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
  [/аренд|квартир|жиль|наём|наем|депозит|сосед|жкх|коммунал| дом/, ['ГК РФ ч. 2', 'ЖК РФ']],
  [/алимент|брак|развод|супруг|дет|родител|наслед/, ['СК РФ', 'ГК РФ ч. 1']],
  [/налог|ндфл|вычет|фнс|декларац/, ['НК РФ']],
  [/давност|сделк|договор|долг|заём|займ|убыт|неустойк|обогащ/, ['ГК РФ ч. 1', 'ГК РФ ч. 2']],
  [/краж|мошеннич|грабёж|грабеж|уголов|убийств|взятк|хулиган|побои|клевет/, ['УК РФ', 'КоАП РФ']],
  [/штраф|коап|гибдд|дтп|права|регистрац/, ['КоАП РФ', 'УК РФ']],
  [/суд|иск|апелляц|приказ|процесс/, ['ГПК РФ', 'АПК РФ']]
];

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

  const absorb = (pack: Partial<LawPack>) => {
    for (const country of pack.countries ?? []) countries.set(country.code, country);
    for (const article of pack.articles ?? []) {
      if (!article?.id || articles.some((a) => a.id === article.id)) continue;
      articles.push(article);
      const entry = makeEntry(article);
      index.push(entry);
      for (const token of allTokens(entry)) df.set(token, (df.get(token) ?? 0) + 1);
      if (!countries.has(article.country)) {
        countries.set(article.country, {
          code: article.country,
          name: article.country,
          flag: '',
          region: 'Другое',
          system: 'Не указана',
          languages: '—',
          note: 'Добавлено пользователем'
        });
      }
    }
  };

  const loadDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      try {
        absorb(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
      } catch {
        /* повреждённый пакет пропускаем */
      }
    }
  };

  loadDir(bundledDir);
  loadDir(userFile);

  const idf = (token: string) => {
    const total = Math.max(index.length, 1);
    const frequency = df.get(token) ?? 0;
    return Math.min(3, Math.max(0.35, Math.log(1 + total / (1 + frequency))));
  };

  const countryList = () =>
    [...countries.values()].sort((a, b) => {
      const order = (c: Country) => (c.code === 'RU' ? 0 : c.code === 'KZ' || c.code === 'BY' ? 1 : 2);
      return order(a) - order(b) || a.name.localeCompare(b.name, 'ru');
    });

  const totalByCountry = () => {
    const map: Record<string, { name: string; flag: string; count: number }> = {};
    for (const country of countryList()) map[country.code] = { name: country.name, flag: country.flag, count: 0 };
    for (const article of articles) if (map[article.country]) map[article.country].count++;
    return map;
  };

  const search = (query: string, country?: string, limit = 12) => {
    const q = normalize(query).trim();
    if (!q) return [];
    const base = tokenize(q);
    const tokens = expand(base);

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
        const preferred = PRIOR.find(([pattern]) => pattern.test(q));
        if (preferred && preferred[1].some((code) => item.article.code.startsWith(code))) score *= 1.5;
        if (item.full.includes(q)) score += 8;
        if (base.length > 1) score += matched * 1.5;
        return { article: item.article, score };
      })
      .filter((hit): hit is { article: Article; score: number } => Boolean(hit))
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return [];
    const threshold = Math.max(6, scored[0].score * 0.35);
    return scored.filter((hit) => hit.score >= threshold).slice(0, limit);
  };

  const byCountry = (country: string) =>
    articles
      .filter((article) => article.country === country)
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code, 'ru') || a.number.localeCompare(b.number, 'ru'));

  const codesByCountry = (country: string) => {
    const map = new Map<string, { code: string; short: string; count: number }>();
    for (const article of byCountry(country)) {
      const entry = map.get(article.code) ?? { code: article.code, short: article.codeShort, count: 0 };
      entry.count++;
      map.set(article.code, entry);
    }
    return [...map.values()];
  };

  return {
    listCountries: () => countryList(),
    totalByCountry,
    counts: () => ({ articles: articles.length, countries: countries.size }),
    search,
    byCountry,
    codesByCountry,
    addArticle(article: Article) {
      absorb({ articles: [article] });
    },
    reload() {
      articles.length = 0;
      index = [];
      df = new Map();
      countries.clear();
      loadDir(bundledDir);
      loadDir(userFile);
    }
  };
}

export type Laws = ReturnType<typeof createLaws>;
