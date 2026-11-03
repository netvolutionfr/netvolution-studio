// Interface messages (ADR-0024): JSON catalogs in the i18next v4 format, English as the reference
// and fallback. No dependency: interpolation of {{name}}, CLDR plurals via Intl.PluralRules.
import { type Catalog, LOCALES } from './locales/index.ts';

export { LOCALES };

export type Locale = keyof typeof LOCALES;
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
type Base<K> = K extends `${infer B}_${'zero' | 'one' | 'two' | 'few' | 'many' | 'other'}` ? B : K;
/** Every key of the English catalog; plural variants are addressed by their base key. */
export type MessageKey = Base<Leaves<Catalog>>;
export type MessageParams = Record<string, string | number>;

export const LOCALE_STORAGE_KEY = 'ns.locale';
// ponytail: French stays the default until the interface switches to English (ADR-0024, lot 4).
const DEFAULT_LOCALE: Locale = 'fr';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && Object.hasOwn(LOCALES, value);

function stored(): Locale | undefined {
  try {
    const value = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : undefined;
  } catch {
    return undefined; // blocked storage: default language
  }
}

let current: Locale | undefined;
/** Active interface language: the stored choice, else the default. */
export const getLocale = (): Locale => (current ??= stored() ?? DEFAULT_LOCALE);

/** Changes the interface language and remembers it in this browser. */
export function setLocale(locale: Locale): void {
  current = locale;
  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // not remembered
  }
}

const lookup = (messages: unknown, key: string): string | undefined => {
  let node = messages;
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
  return typeof node === 'string' ? node : undefined;
};

/** Message in `locale`, or its plural form for `params.count`, or undefined. */
function message(locale: Locale, key: string, params?: MessageParams): string | undefined {
  const messages = LOCALES[locale].messages;
  if (typeof params?.count === 'number') {
    const category = new Intl.PluralRules(locale).select(params.count);
    const plural = lookup(messages, `${key}_${category}`) ?? lookup(messages, `${key}_other`);
    if (plural !== undefined) return plural;
  }
  return lookup(messages, key);
}

/** Translates `key` into the active language, falling back to English, then to the key itself. */
export function t(key: MessageKey, params?: MessageParams, locale: Locale = getLocale()): string {
  const text = message(locale, key, params) ?? message('en', key, params) ?? key;
  return params
    ? text.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, name: string) => String(params[name] ?? all))
    : text;
}

/** Date and time in the active language. */
export const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(getLocale(), options).format(new Date(date));
