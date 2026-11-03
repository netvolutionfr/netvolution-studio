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
/**
 * A message translated where it is shown: core contracts (diagnostics, checks, command errors) carry
 * it instead of a sentence. A parameter may itself be a message, or a list of them (joined by « ; »).
 */
export type Message = { key: MessageKey; params?: MessageParams };
export type MessageParams = { [name: string]: string | number | Message | Message[] };

export const msg = (key: MessageKey, params?: MessageParams): Message => (params ? { key, params } : { key });

export const LOCALE_STORAGE_KEY = 'ns.locale';

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

/** First language of the browser with a catalog (`fr-CA` → `fr`). */
export function browserLocale(
  languages: readonly string[] = globalThis.navigator?.languages ?? [],
): Locale | undefined {
  return languages.map((l) => l.toLowerCase().split('-')[0]).find(isLocale);
}

let current: Locale | undefined;
/** Active interface language: the stored choice, else the browser's language, else English. */
export const getLocale = (): Locale => (current ??= stored() ?? browserLocale() ?? 'en');

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

/** Whether `text` is a key of the English catalog (e.g. a custom zod message). */
export const isMessageKey = (text: string): text is MessageKey =>
  lookup(LOCALES.en.messages, text) !== undefined ||
  lookup(LOCALES.en.messages, `${text}_other`) !== undefined;

/** A validation issue: the custom messages of our schemas are keys; zod's own, in English, stay text. */
export const issueMessage = (text: string): Message =>
  isMessageKey(text) ? msg(text) : msg('text', { text });
export const issuesMessage = (issues: readonly { message: string }[]): Message =>
  msg('text', { text: issues.map((i) => issueMessage(i.message)) });

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
    ? text.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, name: string) => {
        const value = params[name];
        if (value === undefined) return all;
        if (Array.isArray(value)) return value.map((m) => tm(m, locale)).join('; ');
        return typeof value === 'object' ? tm(value, locale) : String(value);
      })
    : text;
}

/** Translates a message of the core. */
export const tm = (m: Message, locale: Locale = getLocale()): string => t(m.key, m.params, locale);

/** Language of the content generated for a site: its `settings.lang` when a catalog exists, else English. */
export const contentLocale = (lang: string): Locale => {
  const base = lang.toLowerCase().split('-')[0];
  return isLocale(base) ? base : 'en';
};
/** Translates `content.*` keys into a site's language (texts the Studio writes into the site). */
export const contentText =
  (lang: string) =>
  (key: MessageKey, params?: MessageParams): string =>
    t(key, params, contentLocale(lang));

/** A content text with parameters, translated on insertion like a `content.*` key. */
export type ContentRef = { $content: MessageKey; params: MessageParams };
export const contentRef = (key: MessageKey, params: MessageParams): ContentRef => ({ $content: key, params });

/**
 * Content generated by the Studio (default texts, sections, layer names) written as `content.*` keys or
 * `contentRef`s: translated into the site language when inserted (ADR-0024).
 */
export function localizeContent<T>(value: T, lang: string): T {
  const locale = contentLocale(lang);
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string')
      return v.startsWith('content.') && isMessageKey(v) ? t(v, undefined, locale) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const ref = v as Partial<ContentRef>;
      if (typeof ref.$content === 'string') return t(ref.$content, ref.params, locale);
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return walk(value) as T;
}

/** Date and time in the active language. */
export const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(getLocale(), options).format(new Date(date));
