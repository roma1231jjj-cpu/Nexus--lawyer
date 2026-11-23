import { ru, type MainKey } from './ru';
import { en } from './en';

export type Lang = 'ru' | 'en';

const dictionaries: Record<Lang, Record<MainKey, string>> = { ru, en };

export function resolveLang(value: unknown): Lang {
  return value === 'en' ? 'en' : 'ru';
}

export function tr(lang: Lang, key: MainKey, vars?: Record<string, string | number>) {
  const template = dictionaries[lang]?.[key] ?? ru[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
