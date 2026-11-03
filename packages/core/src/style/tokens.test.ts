import { describe, expect, it } from 'vitest';
import { loadSite } from '../document/load.ts';
import type { Site } from '../document/schema.ts';
import { createEditorStore } from '../editor/store.ts';
import { tm } from '../i18n/index.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { BASE_CSS, toCss } from './css.ts';
import { CSS_LAYERS } from './custom.ts';

const px = (value: number) => ({ value, unit: 'px' as const });
const withTokens = (): Site => {
  const d = sampleDoc();
  d.tokens = {
    colors: { primary: { label: 'Primaire', value: '#1d4ed8' } },
    sizes: { gutter: { label: 'Gouttière', group: 'spacing', value: { base: px(32), mobile: px(12) } } },
    fonts: { brand: { label: 'Marque', stack: ['Inter', 'Helvetica Neue', 'sans-serif'] } },
    textStyles: {
      h1: {
        label: 'Titre 1',
        style: { base: { fontFamily: { token: 'brand' }, fontSize: px(48) }, mobile: { fontSize: px(32) } },
      },
    },
  };
  const label = d.nodes.nlabel001;
  if (!label) throw new Error('fixture');
  label.style = { base: { textStyle: { token: 'h1' }, fontSize: px(20), color: { token: 'primary' } } };
  return d;
};

describe('design tokens', () => {
  it('emit CSS variables, responsive overrides and references (ADR-0009)', () => {
    const d = withTokens();
    const root = d.nodes.nroot0001;
    if (!root) throw new Error('fixture');
    root.style.base = { ...root.style.base, gap: { token: 'gutter' } };
    expect(loadSite(d, testRegistry).ok).toBe(true);
    const css = toCss(d, testRegistry, ['nroot0001']);
    expect(css.startsWith(`${CSS_LAYERS}@layer ns{${BASE_CSS}`)).toBe(true);
    expect(css).toContain(
      ':root{--ns-color-primary:#1d4ed8;--ns-font-brand:"Inter","Helvetica Neue",sans-serif;--ns-size-gutter:32px;' +
        '--ns-text-h1-font-family:var(--ns-font-brand);--ns-text-h1-font-size:48px}',
    );
    // Default style of the h1 element, then the node: text style first, local values after (they win).
    expect(css).toContain(
      'h1{font-family:var(--ns-text-h1-font-family);font-size:var(--ns-text-h1-font-size)}',
    );
    expect(css).toContain(
      '.ns-nlabel001{font-family:var(--ns-text-h1-font-family);font-size:var(--ns-text-h1-font-size);font-size:20px;color:var(--ns-color-primary)}',
    );
    expect(css).toContain('gap:var(--ns-size-gutter)');
    expect(css).toContain(
      '@media (max-width:767px){:root{--ns-size-gutter:12px;--ns-text-h1-font-size:32px}',
    );
  });

  it('refuse references to missing tokens and unsafe font names', () => {
    const d = withTokens();
    const label = d.nodes.nlabel001;
    if (!label) throw new Error('fixture');
    label.style = { base: { color: { token: 'nope' } } };
    const r = loadSite(d, testRegistry);
    expect(r.ok ? [] : r.diagnostics.map((x) => x.code)).toEqual(['missing-token']);
    const bad = withTokens();
    if (bad.tokens) bad.tokens.fonts.brand = { label: 'x', stack: ['a;}body{display:none'] };
    expect(loadSite(bad, testRegistry).ok).toBe(false);
  });

  it('setToken updates every reference at once; removal of a used token is refused', () => {
    const s = createEditorStore(withTokens(), testRegistry);
    expect(
      s.dispatch('setToken', {
        kind: 'colors',
        id: 'primary',
        value: { label: 'Primaire', value: '#ff0000' },
      }).ok,
    ).toBe(true);
    expect(toCss(s.getState().doc, testRegistry, ['nroot0001'])).toContain('--ns-color-primary:#ff0000');
    expect(
      s.dispatch('setToken', { kind: 'colors', id: 'primary', value: { label: 'x', value: 'red' } }).ok,
    ).toBe(false);
    const removed = s.dispatch('removeToken', { kind: 'colors', id: 'primary' });
    expect(removed.ok ? '' : tm(removed.error.message)).toMatch(/used by 1/);
    expect(s.dispatch('removeToken', { kind: 'fonts', id: 'brand' }).ok).toBe(false); // used by the h1 text style
    s.dispatch('updateNodeStyle', { id: 'nlabel001', breakpoint: 'base', unset: ['color'] });
    expect(s.dispatch('removeToken', { kind: 'colors', id: 'primary' }).ok).toBe(true);
  });
});
