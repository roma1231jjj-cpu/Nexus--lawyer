import { useSyncExternalStore } from 'react';
import { ru, demoRu } from './ru';
import { en, demoEn, countryNamesEn, regionNamesEn, countryMetaEn } from './en';

export type Lang = 'ru' | 'en';
export type TKey = keyof typeof ru;
export type TVars = Record<string, string | number>;

const STORAGE_KEY = 'nl-lang';
const dictionaries: Record<Lang, Record<TKey, string>> = { ru, en };
const demos = { ru: demoRu, en: demoEn };

const listeners = new Set<() => void>();

function isLang(value: unknown): value is Lang {
  return value === 'ru' || value === 'en';
}

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return 'ru';
}

let current: Lang = readLang();

function applyDocumentLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.title = dictionaries[lang]['app.title'];
}

applyDocumentLang(current);

function emit() {
  for (const listener of listeners) listener();
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  if (!isLang(lang) || lang === current) return;
  current = lang;
  applyDocumentLang(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  emit();
}

export function subscribeLang(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function interpolate(template: string, vars?: TVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export function translate(lang: Lang, key: TKey, vars?: TVars) {
  const dictionary = dictionaries[lang] ?? ru;
  return interpolate(dictionary[key] ?? ru[key] ?? key, vars);
}

export function t(key: TKey, vars?: TVars) {
  return translate(current, key, vars);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, getLang);
}

export function useT() {
  const lang = useLang();
  return (key: TKey, vars?: TVars) => translate(lang, key, vars);
}

export function useDictionary() {
  const lang = useLang();
  return dictionaries[lang];
}

export function useDemo() {
  return demos[useLang()];
}

export function uiLocale(lang: Lang) {
  return lang === 'en' ? 'en-GB' : 'ru-RU';
}

export function formatDate(value: string | number | Date, lang: Lang, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(uiLocale(lang), options);
}

export function formatDateTime(value: string | number | Date, lang: Lang, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(uiLocale(lang), options);
}

export function regionLabel(region: string | undefined, lang: Lang) {
  if (!region) return '';
  if (lang === 'en') return regionNamesEn[region] ?? region;
  return region;
}

export function countryMeta(code: string, lang: Lang, system?: string, note?: string) {
  if (lang === 'en') {
    const tr = countryMetaEn[code];
    if (tr) return tr;
  }
  return { system: system ?? '', note: note ?? '' };
}

export function countryLabel(code: string, fallback: string | undefined, lang: Lang) {
  if (lang === 'en') return countryNamesEn[code] ?? code;
  return fallback ?? code;
}

export type { Demo } from './ru';
