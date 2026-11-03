import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { browserLocale, getLocale, LOCALES, t } from './index.ts';

type Tree = { [key: string]: string | Tree };
const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tree).flatMap(([k, v]) =>
      typeof v === 'string' ? [[`${prefix}${k}`, v]] : Object.entries(flatten(v, `${prefix}${k}.`)),
    ),
  );
const params = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();
const PLURAL = /_(zero|one|two|few|many|other)$/;

const en = flatten(LOCALES.en.messages as Tree);

describe('catalogs (ADR-0024)', () => {
  // French is maintained with English; other languages may be partial (missing keys fall back to English).
  for (const [code, { messages }] of Object.entries(LOCALES)) {
    const catalog = flatten(messages as Tree);
    const base = (k: string) => k.replace(PLURAL, '');
    const enBases = new Set(Object.keys(en).map(base));

    it(`${code}: no key unknown to English`, () => {
      expect(Object.keys(catalog).filter((k) => !enBases.has(base(k)))).toEqual([]);
    });

    it(`${code}: same {{parameters}} as English`, () => {
      const differ = Object.entries(catalog).filter(([k, text]) => {
        const ref = en[k] ?? en[`${base(k)}_other`];
        return ref !== undefined && params(text).join() !== params(ref).join();
      });
      expect(differ.map(([k]) => k)).toEqual([]);
    });

    if (code === 'fr')
      it('fr: complete', () => {
        const bases = new Set(Object.keys(catalog).map(base));
        expect([...enBases].filter((k) => !bases.has(k))).toEqual([]);
      });
  }

  it('every English key is used by the code', () => {
    const repo = resolve(import.meta.dirname, '../../../..');
    const sources = ['apps/studio/src', 'apps/studio/dev-server', 'packages']
      .flatMap((dir) =>
        readdirSync(join(repo, dir), { recursive: true, encoding: 'utf8' })
          .filter((f) => /\.tsx?$/.test(f) && !f.includes('node_modules') && !f.includes('.test.'))
          .map((f) => readFileSync(join(repo, dir, f), 'utf8')),
      )
      .join('\n');
    // Any string literal equal to a key (`t('a.b')`, `msg('a.b')`, a zod message, a table of keys).
    const literal = new Set([...sources.matchAll(/'([a-z][\w-]*(?:\.[\w-]+)*)'/gi)].map((m) => m[1]));
    // `t(\`a.b.${x}\`)`, `msg(\`a.b.${x}\`)`: every key under the prefix is considered used.
    const prefixes = [...sources.matchAll(/\b(?:t|msg)\(\s*`([\w.-]+)\$\{/g)].map((m) => m[1] as string);
    const unused = Object.keys(en)
      .map((k) => k.replace(PLURAL, ''))
      .filter((k) => !literal.has(k) && !prefixes.some((p) => k.startsWith(p)));
    expect([...new Set(unused)]).toEqual([]);
  });
});

describe('t', () => {
  it('translates, interpolates and falls back to English', () => {
    expect(t('documentBar.save', undefined, 'fr')).toBe('Enregistrer');
    expect(t('documentBar.save', undefined, 'en')).toBe('Save');
    expect(t('projects.duplicate', { name: 'Atelier' }, 'en')).toBe('Duplicate Atelier');
  });

  it('chooses the plural form of the language', () => {
    expect(t('projects.pageCount', { count: 0 }, 'fr')).toBe('0 page');
    expect(t('projects.pageCount', { count: 0 }, 'en')).toBe('0 pages');
    expect(t('projects.pageCount', { count: 1 }, 'en')).toBe('1 page');
    expect(t('projects.pageCount', { count: 5 }, 'fr')).toBe('5 pages');
  });

  it('defaults to the first browser language with a catalog, else English', () => {
    expect(browserLocale(['fr-CA', 'en'])).toBe('fr');
    expect(browserLocale(['de-DE', 'en-GB'])).toBe('en');
    expect(browserLocale(['de-DE'])).toBeUndefined();
    // Outside a browser (Node: navigator.languages is the system's), the same rule; here, no stored choice.
    expect(getLocale()).toBe(browserLocale() ?? 'en');
  });

  it('only accepts keys of the English catalog', () => {
    // @ts-expect-error unknown key
    expect(t('nope.missing')).toBe('nope.missing');
  });
});
