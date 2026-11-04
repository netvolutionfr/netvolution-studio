import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = import.meta.dirname;
const repo = join(src, '../../..');
const imports = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+'([^']+)'|import\s+'([^']+)'/g)].map((m) => m[1] ?? m[2]);

describe('Studio UI is isolated from rendered pages', () => {
  it('the canvas and site preview runtimes import no editor UI, design system, icon or Radix code', () => {
    // rich.ts: the DOM ↔ rich text conversion shared with in-place editing (ADR-0025), checked here too.
    const allowed = ['@ns/components', '@ns/core', 'react-dom', 'react-dom/client', '../rich.ts'];
    for (const file of [
      ...['canvas', 'preview'].flatMap((d) => readdirSync(join(src, d)).map((f) => join(d, f))),
      'rich.ts',
    ]) {
      const deps = imports(join(src, file));
      expect(
        deps.every((d) => allowed.includes(d ?? '')),
        `${file}: ${deps}`,
      ).toBe(true);
    }
    expect(readFileSync(join(src, '../canvas.html'), 'utf8')).not.toMatch(/\.css/);
    expect(readFileSync(join(src, '../preview.html'), 'utf8')).not.toMatch(/\.css/);
  });

  it('components (copied into exports) and the export template do not depend on the UI kit', () => {
    const template = JSON.parse(
      readFileSync(join(repo, 'packages/export-astro/template/package.json'), 'utf8'),
    );
    expect(Object.keys(template.dependencies).sort()).toEqual([
      '@astrojs/react',
      'astro',
      'react',
      'react-dom',
    ]);
    const pkg = JSON.parse(readFileSync(join(repo, 'packages/components/package.json'), 'utf8'));
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join()).not.toMatch(/lucide|radix/);
  });

  it('design tokens are only defined in the UI layer', () => {
    const shellCss = readFileSync(join(src, 'shell/shell.css'), 'utf8');
    expect(shellCss).not.toMatch(/^\s*--[a-z-]+:/m);
    // Raw colors are allowed only for the page frame and the overlay label text, which sit on the page itself.
    const raw = [...shellCss.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0].toLowerCase());
    expect(new Set(raw)).toEqual(new Set(['#ffffff']));
  });
});
