import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(import.meta.dirname, '../../docs/guide');
const chapters = readdirSync(dir).filter((f) => f.endsWith('.md'));
const config = readFileSync(join(import.meta.dirname, 'astro.config.mjs'), 'utf8');

describe('user guide (Starlight)', () => {
  it('has a title per chapter and lists every chapter in the sidebar', () => {
    for (const file of chapters) {
      expect(readFileSync(join(dir, file), 'utf8'), file).toMatch(/^---\ntitle: .+\n---\n/);
      if (file !== 'index.md') expect(config, file).toContain(`'${file.slice(0, -3)}'`);
    }
  });

  it('has no broken link to a chapter or an image', () => {
    for (const file of chapters) {
      const md = readFileSync(join(dir, file), 'utf8');
      for (const [, target] of md.matchAll(/\]\(([^)\s#:]+)(?:#[^)]*)?\)/g))
        if (!target?.startsWith('/'))
          expect(existsSync(join(dir, target ?? '')), `${file} → ${target}`).toBe(true);
    }
  });
});
