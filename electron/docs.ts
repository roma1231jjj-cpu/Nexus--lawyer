export type DocField = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  value?: string;
};

export type DocTemplate = {
  id: string;
  name: string;
  group: string;
  summary: string;
  fields: DocField[];
  body: string;
  law: string;
};

export type DocLang = 'ru' | 'en';

type DocFieldText = { label: string; placeholder?: string };

type DocText = {
  name: string;
  group: string;
  summary: string;
  law: string;
  fields: Record<string, DocFieldText>;
};

type DocTexts = Record<string, DocText>;

export const docsRu: DocTexts = {
  claim: {
    name: 'Досудебная претензия',
    group: 'Споры',
    summary: 'Требование к контрагенту до обращения в суд: долг, срок, реквизиты.',
    law: 'ГК РФ ст. 309, 310; АПК РФ ст. 4 (претензионный порядок)',
    fields: {
      from: { label: 'От кого (ФИО/организация, адрес)', placeholder: 'Иванов Иван Иванович, г. Москва, ул. …' },
      to: { label: 'Кому', placeholder: 'ООО «Ромашка», ИНН …' },
      contract: { label: 'Договор / основание', placeholder: 'Договор поставки № 14 от 12.03.2026' },
      amount: { label: 'Сумма требования, ₽', placeholder: '120000' },
      essence: { label: 'Суть нарушения', placeholder: 'Оплата не поступила в срок…' },
      deadline: { label: 'Срок ответа', placeholder: '10 календарных дней' }
    }
  },
  'court-order': {
    name: 'Заявление о выдаче судебного приказа',
    group: 'Суд',
    summary: 'Взыскание бесспорной задолженности до 500 000 ₽.',
    law: 'ГПК РФ ст. 121–124, 126',
    fields: {
      court: { label: 'Суд', placeholder: 'Судебный участок № 3 … района г. Москвы' },
      claimant: { label: 'Взыскатель', placeholder: 'ФИО, адрес, ИНН' },
      debtor: { label: 'Должник', placeholder: 'ФИО, адрес' },
      debt: { label: 'Сумма долга, ₽', placeholder: '85000' },
      penalty: { label: 'Неустойка / проценты, ₽', placeholder: '4200' },
      basis: { label: 'Основание требования', placeholder: 'Договор займа от …' }
    }
  },
  labor: {
    name: 'Заявление о выдаче трудовой книжки и расчёта',
    group: 'Труд',
    summary: 'Требование к работодателю при увольнении и задержке выплат.',
    law: 'ТК РФ ст. 84.1, 140, 236',
    fields: {
      employee: { label: 'Работник', placeholder: 'Петров Пётр Петрович' },
      employer: { label: 'Работодатель', placeholder: 'ООО «Вектор», директору …' },
      position: { label: 'Должность', placeholder: 'менеджер' },
      period: { label: 'Период работы', placeholder: '01.02.2025 — 10.11.2026' },
      sum: { label: 'Задолженность, ₽', placeholder: '48000' }
    }
  },
  consumer: {
    name: 'Претензия по закону о защите прав потребителей',
    group: 'Потребитель',
    summary: 'Возврат товара, отказ от услуги, неустойка 1% в день.',
    law: 'Закон РФ «О защите прав потребителей» ст. 18, 22, 23, 29',
    fields: {
      consumer: { label: 'Потребитель', placeholder: 'Сидорова Анна, адрес, телефон' },
      seller: { label: 'Продавец / исполнитель', placeholder: 'ИП …' },
      goods: { label: 'Товар или услуга', placeholder: 'Смартфон … , чек № … от …' },
      defect: { label: 'Недостаток', placeholder: 'Не включается, диагностика…' },
      price: { label: 'Стоимость, ₽', placeholder: '54990' },
      demand: { label: 'Требование', placeholder: 'возврат уплаченной суммы' }
    }
  },
  lease: {
    name: 'Договор аренды квартиры',
    group: 'Договоры',
    summary: 'Краткий договор найма с депозитом, сроками и порядком расторжения.',
    law: 'ГК РФ гл. 34, 35; ЖК РФ ст. 30–31',
    fields: {
      landlord: { label: 'Арендодатель', placeholder: 'ФИО, паспорт, адрес' },
      tenant: { label: 'Арендатор', placeholder: 'ФИО, паспорт' },
      object: { label: 'Объект', placeholder: 'квартира, 55 м², адрес, кадастровый №' },
      term: { label: 'Срок', placeholder: '11 месяцев' },
      rent: { label: 'Арендная плата, ₽/мес', placeholder: '45000' },
      deposit: { label: 'Депозит, ₽', placeholder: '45000' }
    }
  },
  power: {
    name: 'Доверенность на представление интересов',
    group: 'Договоры',
    summary: 'Полномочия в суде, госорганах и на подписание документов.',
    law: 'ГК РФ ст. 185–189; ГПК РФ ст. 53',
    fields: {
      principal: { label: 'Доверитель', placeholder: 'ФИО, паспорт, адрес' },
      agent: { label: 'Представитель', placeholder: 'ФИО, паспорт' },
      scope: { label: 'Полномочия', placeholder: 'представлять интересы в судах, подавать иски…' },
      term: { label: 'Срок действия', placeholder: 'один год' }
    }
  }
};

export const docsEn: DocTexts = {
  claim: {
    name: 'Pre-trial claim (demand letter)',
    group: 'Disputes',
    summary: 'A demand to the counterparty before going to court: debt, deadline, bank details.',
    law: 'Civil Code of Russia art. 309, 310; Commercial Procedure Code art. 4 (mandatory claim procedure)',
    fields: {
      from: { label: 'From (name/company, address)', placeholder: 'Ivan Ivanov, Moscow, …' },
      to: { label: 'To', placeholder: 'Romashka LLC, TIN …' },
      contract: { label: 'Contract / basis', placeholder: 'Supply contract No. 14 of 12.03.2026' },
      amount: { label: 'Amount claimed, RUB', placeholder: '120000' },
      essence: { label: 'What was breached', placeholder: 'Payment did not arrive on time…' },
      deadline: { label: 'Response deadline', placeholder: '10 calendar days' }
    }
  },
  'court-order': {
    name: 'Application for a court order',
    group: 'Court',
    summary: 'Recovery of an undisputed debt up to 500,000 RUB.',
    law: 'Civil Procedure Code of Russia art. 121–124, 126',
    fields: {
      court: { label: 'Court', placeholder: 'Court district No. 3 of …' },
      claimant: { label: 'Claimant', placeholder: 'Name, address, TIN' },
      debtor: { label: 'Debtor', placeholder: 'Name, address' },
      debt: { label: 'Principal debt, RUB', placeholder: '85000' },
      penalty: { label: 'Penalty / interest, RUB', placeholder: '4200' },
      basis: { label: 'Basis of the claim', placeholder: 'Loan agreement of …' }
    }
  },
  labor: {
    name: 'Application for the employment record and final settlement',
    group: 'Employment',
    summary: 'A demand to the employer on dismissal and delayed payments.',
    law: 'Labour Code of Russia art. 84.1, 140, 236',
    fields: {
      employee: { label: 'Employee', placeholder: 'Petr Petrov' },
      employer: { label: 'Employer', placeholder: 'Vektor LLC, to the director …' },
      position: { label: 'Position', placeholder: 'manager' },
      period: { label: 'Employment period', placeholder: '01.02.2025 — 10.11.2026' },
      sum: { label: 'Amount owed, RUB', placeholder: '48000' }
    }
  },
  consumer: {
    name: 'Consumer protection claim',
    group: 'Consumer',
    summary: 'Return of goods, refusal of a service, a 1% per day penalty.',
    law: 'Consumer Protection Act of Russia art. 18, 22, 23, 29',
    fields: {
      consumer: { label: 'Consumer', placeholder: 'Anna Sidorova, address, phone' },
      seller: { label: 'Seller / contractor', placeholder: 'Sole trader …' },
      goods: { label: 'Goods or service', placeholder: 'Smartphone …, receipt No. … of …' },
      defect: { label: 'Defect', placeholder: 'Will not power on, diagnostics…' },
      price: { label: 'Price, RUB', placeholder: '54990' },
      demand: { label: 'Demand', placeholder: 'refund of the amount paid' }
    }
  },
  lease: {
    name: 'Apartment lease agreement',
    group: 'Contracts',
    summary: 'A short lease with a deposit, terms and termination procedure.',
    law: 'Civil Code of Russia ch. 34, 35; Housing Code art. 30–31',
    fields: {
      landlord: { label: 'Landlord', placeholder: 'Name, passport, address' },
      tenant: { label: 'Tenant', placeholder: 'Name, passport' },
      object: { label: 'Property', placeholder: 'flat, 55 m², address, cadastral No.' },
      term: { label: 'Term', placeholder: '11 months' },
      rent: { label: 'Rent, RUB/month', placeholder: '45000' },
      deposit: { label: 'Deposit, RUB', placeholder: '45000' }
    }
  },
  power: {
    name: 'Power of attorney',
    group: 'Contracts',
    summary: 'Authority in court, before state bodies and to sign documents.',
    law: 'Civil Code of Russia art. 185–189; Civil Procedure Code art. 53',
    fields: {
      principal: { label: 'Principal', placeholder: 'Name, passport, address' },
      agent: { label: 'Representative', placeholder: 'Name, passport' },
      scope: { label: 'Authority', placeholder: 'represent interests in courts, file claims…' },
      term: { label: 'Valid for', placeholder: 'one year' }
    }
  }
};

const docsBodies: Record<string, { body: string; keys: string[]; multiline?: string[] }> = {
  claim: {
    keys: ['from', 'to', 'contract', 'amount', 'essence', 'deadline'],
    multiline: ['essence'],
    body: `ПРЕТЕНЗИЯ

От: {{from}}
Кому: {{to}}

Основание: {{contract}}.

{{essence}}

На основании статей 309, 310 ГК РФ обязательства должны исполняться надлежащим образом, односторонний отказ не допускается. Требую в срок {{deadline}} с момента получения настоящей претензии перечислить {{amount}} ₽, а также проценты по статье 395 ГК РФ.

Реквизиты для оплаты: {{requisites}}

При неисполнении требований обращусь в арбитражный суд с отнесением на Вашу сторону судебных расходов и государственной пошлины.

Приложения: копия договора, расчёт задолженности, акт сверки.

Дата: {{date}}
Подпись: __________________ / {{fromShort}}/`
  },
  'court-order': {
    keys: ['court', 'claimant', 'debtor', 'debt', 'penalty', 'basis'],
    multiline: ['basis'],
    body: `В {{court}}

Взыскатель: {{claimant}}
Должник: {{debtor}}

ЗАЯВЛЕНИЕ о выдаче судебного приказа

{{basis}}

Требование: взыскать с должника {{debt}} ₽ основного долга и {{penalty}} ₽ неустойки, всего {{total}} ₽, а также государственную пошлину.

Требование основано на письменной сделке и не оспаривается должником, что соответствует статье 122 ГПК РФ.

Приложения: копия договора, расчёт, документы об уведомлении должника, квитанция об уплате пошлины.

Дата: {{date}}
Подпись: __________________`
  },
  labor: {
    keys: ['employee', 'employer', 'position', 'period', 'sum'],
    body: `Руководителю {{employer}}

От: {{employee}}, должность {{position}}, период работы {{period}}

ЗАЯВЛЕНИЕ

При увольнении расчёт в порядке статьи 140 ТК РФ не произведён, трудовая книжка и (или) сведения о трудовой деятельности не выданы. Задолженность по выплатам составляет {{sum}} ₽.

Требую в течение трёх рабочих дней выдать документы, связанные с работой, и выплатить {{sum}} ₽ с денежной компенсацией по статье 236 ТК РФ за каждый день задержки.

При неисполнении обращусь в государственную инспекцию труда и суд с требованием компенсации морального вреда.

Дата: {{date}}
Подпись: __________________ / {{employee}} /`
  },
  consumer: {
    keys: ['consumer', 'seller', 'goods', 'defect', 'price', 'demand'],
    multiline: ['defect'],
    body: `{{seller}}

От: {{consumer}}

ПРЕТЕНЗИЯ

{{goods}}. В течение гарантийного срока выявлен недостаток: {{defect}}. Стоимость — {{price}} ₽.

На основании статей 18 и 22 Закона РФ «О защите прав потребителей» требую {{demand}} в течение 10 дней с момента получения претензии. За нарушение срока начисляется неустойка 1% цены товара за каждый день (ст. 23).

При отказе обращусь в Роспотребнадзор и суд: дополнительно взыскиваются штраф 50%, компенсация морального вреда и расходы на экспертизу.

Приложения: копия чека, гарантийный талон, фото недостатка.

Дата: {{date}}
Подпись: __________________`
  },
  lease: {
    keys: ['landlord', 'tenant', 'object', 'term', 'rent', 'deposit'],
    body: `ДОГОВОР АРЕНДЫ

Арендодатель: {{landlord}}
Арендатор: {{tenant}}

1. Объект: {{object}}. Передаётся по акту в состоянии, пригодном для проживания.
2. Срок: {{term}} с даты подписания, с последующей пролонгацией по соглашению сторон.
3. Плата: {{rent}} ₽ ежемесячно до 5-го числа, коммунальные платежи — по счётчикам.
4. Депозит: {{deposit}} ₽, возвращается в течение 10 дней после возврата объекта за вычетом подтверждённого ущерба.
5. Арендатор вправе расторгнуть договор, уведомив за 30 дней. Арендодатель — только при нарушении условий, с уведомлением за 30 дней.
6. Споры разрешаются в суде по месту нахождения объекта.

Дата: {{date}}
Арендодатель: ______________  Арендатор: ______________`
  },
  power: {
    keys: ['principal', 'agent', 'scope', 'term'],
    multiline: ['scope'],
    body: `ДОВЕРЕННОСТЬ

Город {{city}}, {{date}}

Я, {{principal}}, настоящей доверенностью уполномочиваю {{agent}} {{scope}}.

Полномочия включают: подписание и подачу процессуальных документов, заявление ходатайств, получение и предъявление исполнительного листа, заключение мирового соглашения, получение денежных средств и документов.

Доверенность выдана сроком {{term}} без права передоверия.

Подпись доверителя: __________________
Подпись представителя (образец): __________________`
  }
};

export const docOrder = ['claim', 'court-order', 'labor', 'consumer', 'lease', 'power'];

export function getTemplates(lang: DocLang = 'ru'): DocTemplate[] {
  const texts = lang === 'en' ? docsEn : docsRu;
  return docOrder.map((id) => {
    const base = docsBodies[id];
    const text = texts[id] ?? docsRu[id];
    return {
      id,
      name: text.name,
      group: text.group,
      summary: text.summary,
      law: text.law,
      body: base.body,
      fields: base.keys.map((key) => ({
        key,
        label: text.fields[key]?.label ?? key,
        placeholder: text.fields[key]?.placeholder,
        multiline: (base.multiline ?? []).includes(key)
      }))
    };
  });
}

export const templates: DocTemplate[] = getTemplates('ru');

const ruDate = () => {
  const now = new Date();
  return now.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
};

export function fillTemplate(template: DocTemplate, values: Record<string, string>) {
  const map: Record<string, string> = { ...values, date: values.date || ruDate(), city: values.city || 'Москва' };
  const total = (Number(values.debt || 0) + Number(values.penalty || 0)).toString();
  map.total = values.total || total;
  map.requisites = values.requisites || 'р/с 00000000000000000000, банк …';
  map.fromShort = (values.from || '').split(' ').slice(0, 2).join(' ');
  return template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => (map[key] ?? '').trim() || `[${key}]`);
}
