import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registry } from '@ns/components/definitions';
import { loadSite } from '@ns/core';
import { describe, expect, it } from 'vitest';
import { agenceCreative } from './agence-creative.ts';
import { cabinetConseil } from './cabinet-conseil.ts';
import { buildTemplate, translateArchive, translateSpec } from './kit.ts';

const dir = import.meta.dirname;
const dictionary = (id: string) =>
  JSON.parse(readFileSync(join(dir, 'translations', `${id}.en.json`), 'utf8')) as Record<string, string>;
const committed = (id: string) => JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')) as unknown;

describe('site templates written in code (CS-02, ADR-0024)', () => {
  for (const spec of [agenceCreative, cabinetConseil]) {
    it(`${spec.id}: the English version is complete and its JSON is up to date (npm run templates:build)`, () => {
      const english = translateSpec(spec, 'en', dictionary(spec.id));
      expect(english.lang).toBe('en');
      expect(buildTemplate(english).archive).toEqual(committed(`${spec.id}-en`));
    });
  }

  it('atelier-nord: the English version is complete, valid and up to date', () => {
    const english = translateArchive(
      committed('atelier-nord') as Parameters<typeof translateArchive>[0],
      'en',
      dictionary('atelier-nord'),
    );
    expect(english).toEqual(committed('atelier-nord-en'));
    expect(loadSite(english.site, registry).ok).toBe(true);
  });

  it('refuses a partial translation', () => {
    expect(() => translateSpec(agenceCreative, 'en', {})).toThrow(/untranslated texts/);
  });
});
