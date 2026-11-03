// Registry of the interface languages (ADR-0024). Adding a language: a JSON file next to en.json,
// with the same keys, and one line here.
import en from './en.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };

export type Catalog = typeof en;

/** Code → catalog and native name, as offered in the language picker. */
export const LOCALES = {
  en: { name: 'English', messages: en },
  fr: { name: 'Français', messages: fr },
} satisfies Record<string, { name: string; messages: unknown }>;
