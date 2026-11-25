export type DocLang = 'ru' | 'en';

export type DocCountryCode = 'RU';

export type DocFieldKind = 'text' | 'money' | 'date' | 'select';

export type DocFieldFormat = 'inn' | 'ogrnip' | 'account' | 'bik';

export type DocOption = { value: string; doc: string; label: string };

export type DocField = {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  required?: boolean;
  requiredIf?: string;
  kind?: DocFieldKind;
  format?: DocFieldFormat;
  options?: DocOption[];
};

export type DocCheck = { key: string; label: string; doc?: string; hint?: string };

export type DocTemplate = {
  id: string;
  name: string;
  group: string;
  summary: string;
  law: string;
  country: DocCountryCode;
  matchesCountry: boolean;
  body: string;
  fields: DocField[];
  checks: DocCheck[];
  attachments: DocCheck[];
  requireAnyCheck?: string[];
};

export type DocValidation = {
  missing: { key: string; label: string }[];
  errors: string[];
  warnings: string[];
};

type DocFieldText = { label: string; placeholder?: string; hint?: string; options?: Record<string, string> };

type DocText = {
  name: string;
  group: string;
  summary: string;
  law: string;
  fields: Record<string, DocFieldText>;
  checks?: Record<string, string>;
  attachments?: Record<string, string>;
};

type DocTexts = Record<string, DocText>;

export const docsRu: DocTexts = {
  claim: {
    name: 'Досудебная претензия',
    group: 'Споры',
    summary: 'Требование к контрагенту до обращения в суд: долг, срок ответа, реквизиты.',
    law: 'ГК РФ ст. 309, 310, 395; АПК РФ ст. 4 (претензионный порядок)',
    fields: {
      date: { label: 'Дата документа' },
      from: { label: 'От кого (ФИО/организация, адрес)', placeholder: 'Иванов Иван Иванович, г. Москва, ул. …' },
      to: { label: 'Кому', placeholder: 'ООО «Ромашка», адрес' },
      inn: { label: 'ИНН (если есть)', placeholder: 'ИНН 10 или 12 цифр' },
      ogrnip: { label: 'ОГРНИП (если есть)', placeholder: '15 цифр' },
      contract: { label: 'Договор / основание', placeholder: 'Договор поставки № 14 от 12.03.2026' },
      essence: { label: 'Суть нарушения', placeholder: 'Оплата не поступила в срок…' },
      amount: { label: 'Сумма требования, ₽', placeholder: '85 000 или 85,50' },
      deadline: { label: 'Срок ответа', placeholder: '10 календарных дней' },
      forum: { label: 'Куда обращусь при неисполнении', options: { '': 'не указывать', arbitration: 'арбитражный суд', general: 'суд общей юрисдикции' } },
      bank: { label: 'Банк получателя', placeholder: 'ПАО «Сбербанк»' },
      account: { label: 'Расчётный счёт', placeholder: '20 цифр' },
      bik: { label: 'БИК', placeholder: '9 цифр' }
    },
    checks: {
      requisites: 'Указать реквизиты для перечисления',
      interest395: 'Требовать проценты по ст. 395 ГК РФ'
    }
  },
  'court-order': {
    name: 'Заявление о выдаче судебного приказа',
    group: 'Суд',
    summary: 'Взыскание бесспорной задолженности по требованиям ст. 122 ГПК РФ.',
    law: 'ГПК РФ ст. 121–124, 126',
    fields: {
      date: { label: 'Дата документа' },
      court: { label: 'Суд', placeholder: 'Судебный участок № 3 … района г. Москвы' },
      claimant: { label: 'Взыскатель', placeholder: 'ФИО, адрес' },
      debtor: { label: 'Должник', placeholder: 'ФИО, адрес' },
      debt: { label: 'Сумма долга, ₽', placeholder: '85 000' },
      penalty: { label: 'Неустойка / проценты, ₽', placeholder: '4 200 — можно не заполнять' },
      basis: { label: 'Из чего возникла задолженность', placeholder: 'Договор займа от 12.03.2026, расписка…' },
      ground: {
        label: 'Основание по ст. 122 ГПК РФ',
        options: {
          '': 'выберите основание',
          written: 'сделка совершена в простой письменной форме (п. 2 ч. 1 ст. 122 ГПК РФ)',
          notarized: 'сделка нотариально удостоверена (п. 1 ч. 1 ст. 122 ГПК РФ)'
        }
      }
    },
    checks: {
      undisputed: 'Должник требование не оспаривает (заявляете вы)'
    }
  },
  labor: {
    name: 'Заявление о выдаче трудовой книжки и расчёта',
    group: 'Труд',
    summary: 'Требование к работодателю при увольнении и задержке выплат.',
    law: 'ТК РФ ст. 84.1, 140, 236',
    fields: {
      date: { label: 'Дата документа' },
      employee: { label: 'Работник', placeholder: 'Петров Пётр Петрович' },
      employer: { label: 'Работодатель', placeholder: 'ООО «Вектор», директору …' },
      position: { label: 'Должность', placeholder: 'менеджер' },
      period: { label: 'Период работы', placeholder: '01.02.2025 — 10.11.2026' },
      sum: { label: 'Задолженность, ₽', placeholder: '48 000' }
    },
    checks: {
      noPayment: 'Расчёт при увольнении не выплачен',
      noRecord: 'Не выдана трудовая книжка / сведения о трудовой деятельности'
    }
  },
  consumer: {
    name: 'Претензия по закону о защите прав потребителей',
    group: 'Потребитель',
    summary: 'Возврат товара или отказ от услуги: разные требования и сроки.',
    law: 'Закон РФ «О защите прав потребителей» ст. 18, 22, 23, 28, 29, 31',
    fields: {
      date: { label: 'Дата документа' },
      kind: { label: 'Что было приобретено', options: { '': 'выберите', goods: 'товар', services: 'услуга или работа' } },
      consumer: { label: 'Потребитель', placeholder: 'Сидорова Анна, адрес, телефон' },
      seller: { label: 'Продавец / исполнитель', placeholder: 'ИП …' },
      goods: { label: 'Товар или услуга', placeholder: 'Смартфон … , чек № … от …' },
      defect: { label: 'Недостаток', placeholder: 'Не включается, диагностика…' },
      price: { label: 'Стоимость, ₽', placeholder: '54 990' },
      demand: { label: 'Требование', placeholder: 'возврат уплаченной суммы' },
      guarantee: {
        label: 'Гарантийный срок',
        options: { '': 'не указывать', yes: 'установлен', no: 'не установлен', unknown: 'не знаю' }
      }
    }
  },
  lease: {
    name: 'Договор аренды квартиры',
    group: 'Договоры',
    summary: 'Краткий договор найма: объект, срок, плата, депозит.',
    law: 'ГК РФ гл. 34, 35; ЖК РФ ст. 30–31',
    fields: {
      date: { label: 'Дата документа' },
      city: { label: 'Город', placeholder: 'Анжеро-Судженск' },
      landlord: { label: 'Арендодатель', placeholder: 'ФИО, паспорт, адрес' },
      tenant: { label: 'Арендатор', placeholder: 'ФИО, паспорт' },
      object: { label: 'Объект', placeholder: 'квартира, 55 м², адрес' },
      term: { label: 'Срок', placeholder: '11 месяцев' },
      rent: { label: 'Арендная плата, ₽/мес', placeholder: '45 000' },
      deposit: { label: 'Депозит, ₽', placeholder: '45 000 — можно не заполнять' },
      utilities: { label: 'Коммунальные платежи', options: { '': 'не указывать', included: 'включены в арендную плату', separate: 'оплачиваются отдельно по счётчикам' } },
      notice: { label: 'Уведомление о расторжении', options: { '': 'не указывать', '10': '10 дней', '30': '30 дней', '60': '60 дней' } }
    }
  },
  power: {
    name: 'Доверенность на представление интересов',
    group: 'Договоры',
    summary: 'Полномочия выбираются вручную: ничего лишнего по умолчанию.',
    law: 'ГК РФ ст. 185–189; ГПК РФ ст. 53',
    fields: {
      date: { label: 'Дата документа' },
      city: { label: 'Город', placeholder: 'Анжеро-Судженск' },
      principal: { label: 'Доверитель', placeholder: 'ФИО, паспорт, адрес' },
      agent: { label: 'Представитель', placeholder: 'ФИО, паспорт' },
      scope: { label: 'Основные полномочия', placeholder: 'представлять интересы в судах, подавать иски…' },
      term: { label: 'Срок действия', placeholder: 'один год' }
    },
    checks: {
      settle: 'Заключение мирового соглашения',
      money: 'Получение денежных средств и документов',
      writ: 'Получение и предъявление исполнительного листа',
      substitution: 'Право передоверия'
    }
  }
};

export const docsEn: DocTexts = {
  claim: {
    name: 'Pre-trial claim (demand letter)',
    group: 'Disputes',
    summary: 'A demand to the counterparty before court: debt, response deadline, bank details.',
    law: 'Civil Code of Russia art. 309, 310, 395; Commercial Procedure Code art. 4',
    fields: {
      date: { label: 'Document date' },
      from: { label: 'From (name/company, address)', placeholder: 'Ivan Ivanov, Moscow, …' },
      to: { label: 'To', placeholder: 'Romashka LLC, address' },
      inn: { label: 'TIN (optional)', placeholder: '10 or 12 digits' },
      ogrnip: { label: 'OGRNIP (optional)', placeholder: '15 digits' },
      contract: { label: 'Contract / basis', placeholder: 'Supply contract No. 14 of 12.03.2026' },
      essence: { label: 'What was breached', placeholder: 'Payment did not arrive on time…' },
      amount: { label: 'Amount claimed, RUB', placeholder: '85000 or 85.50' },
      deadline: { label: 'Response deadline', placeholder: '10 calendar days' },
      forum: { label: 'Where I will apply next', options: { '': 'do not state', arbitration: 'commercial (arbitration) court', general: 'court of general jurisdiction' } },
      bank: { label: 'Bank', placeholder: 'Sberbank' },
      account: { label: 'Account number', placeholder: '20 digits' },
      bik: { label: 'BIK', placeholder: '9 digits' }
    },
    checks: {
      requisites: 'Add my bank details',
      interest395: 'Claim interest under art. 395 of the Civil Code'
    }
  },
  'court-order': {
    name: 'Application for a court order',
    group: 'Court',
    summary: 'Recovery of an undisputed debt under art. 122 of the Civil Procedure Code.',
    law: 'Civil Procedure Code of Russia art. 121–124, 126',
    fields: {
      date: { label: 'Document date' },
      court: { label: 'Court', placeholder: 'Court district No. 3 of …' },
      claimant: { label: 'Claimant', placeholder: 'Name, address' },
      debtor: { label: 'Debtor', placeholder: 'Name, address' },
      debt: { label: 'Principal debt, RUB', placeholder: '85 000' },
      penalty: { label: 'Penalty / interest, RUB', placeholder: '4 200 — optional' },
      basis: { label: 'Where the debt comes from', placeholder: 'Loan agreement of 12.03.2026…' },
      ground: {
        label: 'Ground under art. 122 CPC',
        options: {
          '': 'choose a ground',
          written: 'simple written-form transaction (art. 122(1)(2) CPC)',
          notarized: 'notarised transaction (art. 122(1)(1) CPC)'
        }
      }
    },
    checks: {
      undisputed: 'The debtor does not dispute the claim (your statement)'
    }
  },
  labor: {
    name: 'Application for the employment record and final settlement',
    group: 'Employment',
    summary: 'A demand to the employer on dismissal and delayed payments.',
    law: 'Labour Code of Russia art. 84.1, 140, 236',
    fields: {
      date: { label: 'Document date' },
      employee: { label: 'Employee', placeholder: 'Petr Petrov' },
      employer: { label: 'Employer', placeholder: 'Vektor LLC, to the director …' },
      position: { label: 'Position', placeholder: 'manager' },
      period: { label: 'Employment period', placeholder: '01.02.2025 — 10.11.2026' },
      sum: { label: 'Amount owed, RUB', placeholder: '48 000' }
    },
    checks: {
      noPayment: 'Final settlement was not paid',
      noRecord: 'Employment record / employment data was not issued'
    }
  },
  consumer: {
    name: 'Consumer protection claim',
    group: 'Consumer',
    summary: 'Return of goods or refusal of a service: different rules and deadlines.',
    law: 'Consumer Protection Act of Russia art. 18, 22, 23, 28, 29, 31',
    fields: {
      date: { label: 'Document date' },
      kind: { label: 'What was purchased', options: { '': 'choose', goods: 'goods', services: 'service or work' } },
      consumer: { label: 'Consumer', placeholder: 'Anna Sidorova, address, phone' },
      seller: { label: 'Seller / contractor', placeholder: 'Sole trader …' },
      goods: { label: 'Goods or service', placeholder: 'Smartphone …, receipt No. … of …' },
      defect: { label: 'Defect', placeholder: 'Will not power on, diagnostics…' },
      price: { label: 'Price, RUB', placeholder: '54 990' },
      demand: { label: 'Demand', placeholder: 'refund of the amount paid' },
      guarantee: {
        label: 'Warranty period',
        options: { '': 'do not state', yes: 'established', no: 'not established', unknown: 'unknown' }
      }
    }
  },
  lease: {
    name: 'Apartment lease agreement',
    group: 'Contracts',
    summary: 'A short lease: property, term, rent, deposit.',
    law: 'Civil Code of Russia ch. 34, 35; Housing Code art. 30–31',
    fields: {
      date: { label: 'Document date' },
      city: { label: 'City', placeholder: 'Anzhero-Sudzhensk' },
      landlord: { label: 'Landlord', placeholder: 'Name, passport, address' },
      tenant: { label: 'Tenant', placeholder: 'Name, passport' },
      object: { label: 'Property', placeholder: 'flat, 55 m², address' },
      term: { label: 'Term', placeholder: '11 months' },
      rent: { label: 'Rent, RUB/month', placeholder: '45 000' },
      deposit: { label: 'Deposit, RUB', placeholder: '45 000 — optional' },
      utilities: { label: 'Utilities', options: { '': 'do not state', included: 'included in the rent', separate: 'paid separately by meters' } },
      notice: { label: 'Termination notice', options: { '': 'do not state', '10': '10 days', '30': '30 days', '60': '60 days' } }
    }
  },
  power: {
    name: 'Power of attorney',
    group: 'Contracts',
    summary: 'Authority is chosen manually: nothing extra by default.',
    law: 'Civil Code of Russia art. 185–189; Civil Procedure Code art. 53',
    fields: {
      date: { label: 'Document date' },
      city: { label: 'City', placeholder: 'Anzhero-Sudzhensk' },
      principal: { label: 'Principal', placeholder: 'Name, passport, address' },
      agent: { label: 'Representative', placeholder: 'Name, passport' },
      scope: { label: 'Main authority', placeholder: 'represent interests in courts, file claims…' },
      term: { label: 'Valid for', placeholder: 'one year' }
    },
    checks: {
      settle: 'Concluding a settlement agreement',
      money: 'Receiving money and documents',
      writ: 'Receiving and submitting a writ of execution',
      substitution: 'Right of substitution'
    }
  }
};

type SelectDef = { value: string; doc: string }[];

type DocBodyDef = {
  keys: string[];
  body: string;
  multiline?: string[];
  money?: string[];
  dates?: string[];
  selects?: Record<string, SelectDef>;
  required?: string[];
  requiredIf?: Record<string, string>;
  formats?: Record<string, DocFieldFormat>;
  checks?: string[];
  requireAnyCheck?: string[];
  attachments?: boolean;
};

const attachmentDefs = [
  { key: 'att_contract', doc: 'копия договора' },
  { key: 'att_reconciliation', doc: 'копия акта сверки' },
  { key: 'att_receipt', doc: 'копия чека' },
  { key: 'att_statement', doc: 'копия выписки' },
  { key: 'att_correspondence', doc: 'копия переписки' },
  { key: 'att_other', doc: 'иное' }
];

const attachmentsRu: Record<string, string> = {
  att_contract: 'договор',
  att_reconciliation: 'акт сверки',
  att_receipt: 'чек',
  att_statement: 'выписка',
  att_correspondence: 'переписка',
  att_other: 'иное'
};

const attachmentsEn: Record<string, string> = {
  att_contract: 'contract',
  att_reconciliation: 'reconciliation act',
  att_receipt: 'receipt',
  att_statement: 'statement',
  att_correspondence: 'correspondence',
  att_other: 'other'
};

const docsBodies: Record<string, DocBodyDef> = {
  claim: {
    keys: ['date', 'from', 'to', 'inn', 'ogrnip', 'contract', 'essence', 'amount', 'deadline', 'forum', 'bank', 'account', 'bik'],
    multiline: ['essence'],
    money: ['amount'],
    dates: ['date'],
    checks: ['requisites', 'interest395'],
    required: ['date', 'from', 'to', 'contract', 'essence', 'amount', 'deadline'],
    requiredIf: { bank: 'requisites', account: 'requisites', bik: 'requisites' },
    formats: { inn: 'inn', ogrnip: 'ogrnip', account: 'account', bik: 'bik' },
    selects: {
      forum: [
        { value: '', doc: '' },
        { value: 'arbitration', doc: 'арбитражный суд' },
        { value: 'general', doc: 'суд общей юрисдикции' }
      ]
    },
    attachments: true,
    body: `ПРЕТЕНЗИЯ

От: {{from}}
Кому: {{to}}{{#inn}}
ИНН: {{inn}}{{/inn}}{{#ogrnip}}
ОГРНИП: {{ogrnip}}{{/ogrnip}}

Основание: {{contract}}.

{{essence}}

Сумма требования: {{amount}} ₽.

На основании статей 309, 310 ГК РФ обязательства должны исполняться надлежащим образом, односторонний отказ от исполнения не допускается.

Требую в срок {{deadline}} с момента получения настоящей претензии перечислить {{amount}} ₽{{#interest395}}, а также уплатить проценты за пользование чужими денежными средствами по статье 395 ГК РФ{{/interest395}}.

{{#requisites}}Реквизиты для перечисления: банк {{bank}}, расчётный счёт {{account}}, БИК {{bik}}.

{{/requisites}}{{#forum}}При неисполнении требований обращусь в {{forum}} с отнесением на Вашу сторону судебных расходов и государственной пошлины.

{{/forum}}{{#attachments}}Приложения:
{{attachments}}

{{/attachments}}Дата: {{date}}
Подпись: __________________`
  },
  'court-order': {
    keys: ['date', 'court', 'claimant', 'debtor', 'debt', 'penalty', 'basis', 'ground'],
    multiline: ['basis'],
    money: ['debt', 'penalty'],
    dates: ['date'],
    checks: ['undisputed'],
    required: ['date', 'court', 'claimant', 'debtor', 'debt', 'basis', 'ground'],
    selects: {
      ground: [
        { value: '', doc: '' },
        { value: 'written', doc: 'сделка совершена в простой письменной форме (п. 2 ч. 1 ст. 122 ГПК РФ)' },
        { value: 'notarized', doc: 'сделка нотариально удостоверена (п. 1 ч. 1 ст. 122 ГПК РФ)' }
      ]
    },
    attachments: true,
    body: `В {{court}}

Взыскатель: {{claimant}}
Должник: {{debtor}}

ЗАЯВЛЕНИЕ о выдаче судебного приказа

{{basis}}

Требование: взыскать с должника {{debt}} ₽ основного долга{{#penalty}} и {{penalty}} ₽ неустойки{{/penalty}}, всего {{total}} ₽, а также расходы по уплате государственной пошлины.

Основание требования по статье 122 ГПК РФ: {{ground}}.{{#undisputed}} Должник требование не оспаривает.{{/undisputed}}

{{#attachments}}Приложения:
{{attachments}}

{{/attachments}}Дата: {{date}}
Подпись: __________________`
  },
  labor: {
    keys: ['date', 'employee', 'employer', 'position', 'period', 'sum'],
    money: ['sum'],
    dates: ['date'],
    checks: ['noPayment', 'noRecord'],
    requireAnyCheck: ['noPayment', 'noRecord'],
    required: ['date', 'employee', 'employer', 'position', 'period'],
    requiredIf: { sum: 'noPayment' },
    attachments: true,
    body: `Руководителю {{employer}}

От: {{employee}}, должность {{position}}, период работы {{period}}

ЗАЯВЛЕНИЕ

{{#noRecord}}Трудовая книжка и (или) сведения о трудовой деятельности при увольнении не выданы.
{{/noRecord}}{{#noPayment}}Расчёт при увольнении в порядке статьи 140 ТК РФ не произведён, задолженность по выплатам составляет {{sum}} ₽.
{{/noPayment}}
Требую в течение трёх рабочих дней со дня получения заявления:
{{#noRecord}}- выдать документы, связанные с работой, и сведения о трудовой деятельности;
{{/noRecord}}{{#noPayment}}- выплатить {{sum}} ₽;
{{/noPayment}}
{{#noPayment}}За задержку выплат начисляется денежная компенсация по статье 236 ТК РФ за каждый день задержки.
{{/noPayment}}
При неисполнении требований обращусь в государственную инспекцию труда и в суд{{#noPayment}} с требованием о компенсации морального вреда{{/noPayment}}.

{{#attachments}}Приложения:
{{attachments}}

{{/attachments}}Дата: {{date}}
Подпись: __________________`
  },
  consumer: {
    keys: ['date', 'kind', 'consumer', 'seller', 'goods', 'defect', 'price', 'demand', 'guarantee'],
    multiline: ['defect'],
    money: ['price'],
    dates: ['date'],
    required: ['date', 'kind', 'consumer', 'seller', 'goods', 'defect', 'price', 'demand'],
    selects: {
      kind: [
        { value: '', doc: '' },
        { value: 'goods', doc: 'товар' },
        { value: 'services', doc: 'услуга или работа' }
      ],
      guarantee: [
        { value: '', doc: '' },
        { value: 'yes', doc: 'установлен' },
        { value: 'no', doc: 'не установлен' },
        { value: 'unknown', doc: 'неизвестен' }
      ]
    },
    attachments: true,
    body: `{{seller}}

От: {{consumer}}

ПРЕТЕНЗИЯ

{{intro}}

{{#isGoods}}На основании статей 18 и 22 Закона РФ «О защите прав потребителей» требую {{demand}} в течение 10 дней со дня получения претензии. За нарушение срока начисляется неустойка 1% цены товара за каждый день просрочки (статья 23 Закона).{{/isGoods}}{{#isServices}}На основании статей 29 и 31 Закона РФ «О защите прав потребителей» требую {{demand}} в течение 10 дней со дня получения претензии. За нарушение срока начисляется неустойка 3% цены услуги за каждый день просрочки (статья 28 Закона).{{/isServices}}

При отказе обращусь в Роспотребнадзор и в суд: дополнительно могут быть взысканы штраф 50% от суммы, присуждённой в пользу потребителя, компенсация морального вреда и судебные расходы.

{{#attachments}}Приложения:
{{attachments}}

{{/attachments}}Дата: {{date}}
Подпись: __________________`
  },
  lease: {
    keys: ['date', 'city', 'landlord', 'tenant', 'object', 'term', 'rent', 'deposit', 'utilities', 'notice'],
    money: ['rent', 'deposit'],
    dates: ['date'],
    required: ['date', 'city', 'landlord', 'tenant', 'object', 'term', 'rent'],
    selects: {
      utilities: [
        { value: '', doc: '' },
        { value: 'included', doc: 'включены в арендную плату' },
        { value: 'separate', doc: 'оплачиваются отдельно по счётчикам' }
      ],
      notice: [
        { value: '', doc: '' },
        { value: '10', doc: '10 дней' },
        { value: '30', doc: '30 дней' },
        { value: '60', doc: '60 дней' }
      ]
    },
    body: `ДОГОВОР АРЕНДЫ КВАРТИРЫ

Город {{city}}
Дата: {{date}}

Арендодатель: {{landlord}}
Арендатор: {{tenant}}

1. Объект аренды: {{object}}. Объект передаётся по акту приёма-передачи.
2. Срок аренды: {{term}} с даты подписания договора.
3. Арендная плата: {{rent}} ₽ в месяц.{{#utilities}} Коммунальные платежи {{utilities}}.{{/utilities}}{{#deposit}} Депозит {{deposit}} ₽ возвращается арендатору при возврате объекта по акту приёма-передачи, если нет подтверждённого ущерба.{{/deposit}}
4. Изменения и дополнения к договору действительны, только если совершены в письменной форме и подписаны обеими сторонами.{{#notice}} Стороны вправе расторгнуть договор, уведомив другую сторону за {{notice}}.{{/notice}}

Арендодатель: ______________  Арендатор: ______________`
  },
  power: {
    keys: ['date', 'city', 'principal', 'agent', 'scope', 'term'],
    multiline: ['scope'],
    dates: ['date'],
    checks: ['settle', 'money', 'writ', 'substitution'],
    required: ['date', 'city', 'principal', 'agent', 'scope', 'term'],
    body: `ДОВЕРЕННОСТЬ

Город {{city}}
Дата: {{date}}

Я, {{principal}}, настоящей доверенностью уполномочиваю {{agent}}: {{scope}}.

{{#extraPowers}}Дополнительно доверяю представителю:
{{extraPowers}}

{{/extraPowers}}Доверенность выдана сроком {{term}}. {{substitutionText}}

Подпись доверителя: __________________
Подпись представителя (образец): __________________`
  }
};

export const docOrder = ['claim', 'court-order', 'labor', 'consumer', 'lease', 'power'];

export function normalizeCountry(code?: string): string {
  return (code ?? 'RU').trim().toUpperCase() || 'RU';
}

const checkDoc: Record<string, string> = {
  settle: 'заключать мировое соглашение',
  money: 'получать денежные средства и документы',
  writ: 'получать и предъявлять исполнительный лист'
};

function makeField(key: string, def: DocBodyDef, text: DocText | undefined): DocField {
  const selectDef = def.selects?.[key];
  const fieldText = text?.fields[key];
  const kind: DocFieldKind = def.dates?.includes(key)
    ? 'date'
    : selectDef
      ? 'select'
      : def.money?.includes(key)
        ? 'money'
        : 'text';
  return {
    key,
    label: fieldText?.label ?? key,
    placeholder: fieldText?.placeholder,
    hint: fieldText?.hint,
    multiline: def.multiline?.includes(key) || undefined,
    required: def.required?.includes(key) || undefined,
    requiredIf: def.requiredIf?.[key],
    kind,
    format: def.formats?.[key],
    options: selectDef?.map((option) => ({
      value: option.value,
      doc: option.doc,
      label: fieldText?.options?.[option.value] ?? option.doc
    }))
  };
}

export function getTemplates(lang: DocLang = 'ru', country: string = 'RU'): DocTemplate[] {
  const texts = lang === 'en' ? docsEn : docsRu;
  const current = normalizeCountry(country);
  return docOrder.map((id) => {
    const def = docsBodies[id];
    const text = texts[id] ?? docsRu[id];
    const attachments: DocCheck[] = def.attachments
      ? attachmentDefs.map((item) => ({
          key: item.key,
          doc: item.doc,
          label: (lang === 'en' ? attachmentsEn : attachmentsRu)[item.key] ?? item.key
        }))
      : [];
    const fields = def.keys.map((key) => makeField(key, def, text));
    if (def.attachments) {
      fields.push({
        key: 'attachmentOther',
        label: lang === 'en' ? 'What exactly (other)' : 'Что именно (иное)',
        placeholder: lang === 'en' ? 'e.g. expert report' : 'например, заключение эксперта',
        requiredIf: 'att_other'
      });
    }
    return {
      id,
      name: text.name,
      group: text.group,
      summary: text.summary,
      law: text.law,
      country: 'RU' as DocCountryCode,
      matchesCountry: current === 'RU',
      body: def.body,
      fields,
      checks: (def.checks ?? []).map((key) => ({
        key,
        label: text.checks?.[key] ?? key,
        doc: checkDoc[key]
      })),
      attachments,
      requireAnyCheck: def.requireAnyCheck
    };
  });
}

export function todayIsoDate(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isChecked(value: string | undefined): boolean {
  const raw = (value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes' || raw === 'да';
}

export function parseMoney(input: string): number | null {
  let raw = (input ?? '')
    .replace(/[\s\u00a0\u2009\u202f]/g, '')
    .replace(/(₽|руб\.?|rub|rur)/gi, '')
    .trim();
  if (!raw) return null;
  if (raw.includes(',') && raw.includes('.')) {
    const decimal = raw.lastIndexOf(',') > raw.lastIndexOf('.') ? ',' : '.';
    const thousand = decimal === ',' ? '.' : ',';
    raw = raw.split(thousand).join('').replace(decimal, '.');
  } else if (raw.includes(',')) {
    const groups = raw.split(',');
    raw = groups.length > 2 || groups[groups.length - 1].length === 3 ? groups.join('') : raw.replace(',', '.');
  } else if (raw.includes('.')) {
    const groups = raw.split('.');
    raw = groups.length > 2 || groups[groups.length - 1].length === 3 ? groups.join('') : raw;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  const [whole, fraction] = text.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped},${fraction}` : grouped;
}

export function parseDocDate(input: string): Date | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const local = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(raw);
  const parts = iso
    ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
    : local
      ? { year: Number(local[3]), month: Number(local[2]), day: Number(local[1]) }
      : null;
  if (!parts) return null;
  const date = new Date(parts.year, parts.month - 1, parts.day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== parts.year || date.getMonth() !== parts.month - 1 || date.getDate() !== parts.day) return null;
  return date;
}

export function formatDocDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

const computedLabels: Record<string, string> = {
  total: 'итоговую сумму',
  intro: 'описание покупки и недостатка',
  extraPowers: 'дополнительные полномочия',
  attachments: 'приложения',
  substitutionText: 'право передоверия'
};

function labelOf(template: DocTemplate, key: string): { label: string; select: boolean } {
  const field = template.fields.find((item) => item.key === key);
  if (field) return { label: field.label, select: field.kind === 'select' };
  return { label: computedLabels[key] ?? key, select: false };
}

function attachmentsText(template: DocTemplate, values: Record<string, string>): string {
  const chosen = template.attachments.filter((item) => isChecked(values[item.key]));
  return chosen
    .map((item, index) => {
      const doc = item.key === 'att_other' ? `иное: ${(values.attachmentOther ?? '').trim() || '<укажите: что именно>'}` : item.doc ?? item.label;
      return `${index + 1}) ${doc}`;
    })
    .join('\n');
}

function buildContext(template: DocTemplate, values: Record<string, string>): Record<string, string> {
  const ctx: Record<string, string> = {};
  for (const field of template.fields) {
    const raw = (values[field.key] ?? '').trim();
    if (!raw) continue;
    if (field.kind === 'money') {
      const value = parseMoney(raw);
      ctx[field.key] = value === null ? raw : formatMoney(value);
      continue;
    }
    if (field.kind === 'date') {
      const value = parseDocDate(raw);
      ctx[field.key] = value ? formatDocDate(value) : raw;
      continue;
    }
    if (field.kind === 'select') {
      const option = field.options?.find((item) => item.value === raw);
      if (option?.doc) ctx[field.key] = option.doc;
      continue;
    }
    ctx[field.key] = raw;
  }
  for (const check of template.checks) {
    ctx[check.key] = isChecked(values[check.key]) ? '1' : '';
  }
  const attachments = attachmentsText(template, values);
  ctx.attachments = attachments;
  if (template.id === 'court-order') {
    const debt = parseMoney(values.debt ?? '');
    const penalty = parseMoney(values.penalty ?? '');
    if (debt !== null) ctx.total = formatMoney(debt + (penalty ?? 0));
  }
  if (template.id === 'consumer') {
    const kind = (values.kind ?? '').trim();
    const goods = (values.goods ?? '').trim();
    const defect = (values.defect ?? '').trim();
    const price = parseMoney(values.price ?? '');
    const priceText = price === null ? (values.price ?? '').trim() : `${formatMoney(price)} ₽`;
    const guarantee = (values.guarantee ?? '').trim();
    const parts: string[] = [];
    if (goods) parts.push(`${goods}.`);
    if (kind === 'services') {
      if (defect) parts.push(`Недостаток оказанной услуги (работы): ${defect}.`);
    } else if (kind === 'goods') {
      if (guarantee === 'yes') parts.push(`В течение гарантийного срока выявлен недостаток: ${defect}.`);
      else if (guarantee === 'no') parts.push(`Гарантийный срок на товар не установлен. Выявлен недостаток: ${defect}.`);
      else if (defect) parts.push(`Выявлен недостаток: ${defect}.`);
    } else if (defect) {
      parts.push(`Выявлен недостаток: ${defect}.`);
    }
    if (priceText) parts.push(`Стоимость — ${priceText}.`);
    ctx.intro = parts.join(' ').trim();
    ctx.isGoods = kind === 'goods' ? '1' : '';
    ctx.isServices = kind === 'services' ? '1' : '';
  }
  if (template.id === 'power') {
    const chosen = template.checks.filter((check) => check.key !== 'substitution' && isChecked(values[check.key]));
    ctx.extraPowers = chosen.map((check, index) => `${index + 1}) ${check.doc ?? check.label};`).join('\n');
    ctx.substitutionText = isChecked(values.substitution)
      ? 'Предусмотрено право передоверия.'
      : 'Право передоверия не предоставлено.';
  }
  return ctx;
}

export function renderDoc(template: DocTemplate, values: Record<string, string>): string {
  const ctx = buildContext(template, values);
  let out = template.body;
  const block = /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/;
  for (let guard = 0; guard < 25; guard += 1) {
    const match = block.exec(out);
    if (!match) break;
    const on = Boolean((ctx[match[2]] ?? '').trim());
    const keep = match[1] === '#' ? on : !on;
    out = out.replace(match[0], keep ? match[3] : '');
  }
  out = out.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = (ctx[key] ?? '').trim();
    if (value) return value;
    const { label, select } = labelOf(template, key);
    return select ? `<выберите: ${label}>` : `<укажите: ${label}>`;
  });
  return out
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const formatRules: Record<DocFieldFormat, { re: RegExp; ru: string; en: string }> = {
  inn: { re: /^(\d{10}|\d{12})$/, ru: 'нужно 10 или 12 цифр', en: 'must be 10 or 12 digits' },
  ogrnip: { re: /^\d{15}$/, ru: 'нужно 15 цифр', en: 'must be 15 digits' },
  account: { re: /^\d{20}$/, ru: 'нужно 20 цифр', en: 'must be 20 digits' },
  bik: { re: /^\d{9}$/, ru: 'нужно 9 цифр', en: 'must be 9 digits' }
};

export function validateDoc(template: DocTemplate, values: Record<string, string>, lang: DocLang = 'ru'): DocValidation {
  const ru = lang !== 'en';
  const missing: { key: string; label: string }[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const field of template.fields) {
    const raw = (values[field.key] ?? '').trim();
    const needed = Boolean(field.required) || (field.requiredIf ? isChecked(values[field.requiredIf]) : false);
    if (!raw) {
      if (needed) missing.push({ key: field.key, label: field.label });
      continue;
    }
    if (field.kind === 'money') {
      const value = parseMoney(raw);
      if (value === null) {
        errors.push(ru ? `${field.label}: не число — «${raw}»` : `${field.label}: not a number — "${raw}"`);
      } else if (value < 0) {
        errors.push(ru ? `${field.label}: сумма не может быть отрицательной` : `${field.label}: the amount cannot be negative`);
      } else if (value === 0 && needed) {
        errors.push(ru ? `${field.label}: сумма должна быть больше нуля` : `${field.label}: the amount must be greater than zero`);
      }
    } else if (field.kind === 'date') {
      if (!parseDocDate(raw)) {
        errors.push(ru ? `${field.label}: неверная дата — «${raw}»` : `${field.label}: invalid date — "${raw}"`);
      }
    } else if (field.kind === 'select' && !(field.options ?? []).some((option) => option.value === raw)) {
      errors.push(ru ? `${field.label}: выберите вариант из списка` : `${field.label}: choose an option from the list`);
    }
    if (field.format) {
      const rule = formatRules[field.format];
      const digits = raw.replace(/[\s\u00a0]/g, '');
      if (!rule.re.test(digits)) errors.push(`${field.label}: ${ru ? rule.ru : rule.en}`);
    }
  }
  const anyOf = template.requireAnyCheck ?? [];
  if (anyOf.length && !anyOf.some((key) => isChecked(values[key]))) {
    const labels = template.checks.filter((check) => anyOf.includes(check.key)).map((check) => check.label);
    errors.push(ru ? `Выберите хотя бы одно: ${labels.join(' / ')}` : `Choose at least one: ${labels.join(' / ')}`);
  }
  if (template.id === 'court-order') {
    const debt = parseMoney(values.debt ?? '');
    const penalty = parseMoney(values.penalty ?? '');
    if (debt !== null && debt + (penalty ?? 0) > 500000) {
      warnings.push(
        ru
          ? 'Сумма больше 500 000 ₽: судебный приказ по ст. 122 ГПК РФ подходит не для всех требований — проверьте у юриста.'
          : 'The amount exceeds 500,000 RUB: a court order under art. 122 CPC does not cover every claim — check with a lawyer.'
      );
    }
  }
  return { missing, errors, warnings };
}
