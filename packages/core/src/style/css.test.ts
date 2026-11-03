import { describe, expect, it } from 'vitest';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { activeBreakpoint, BASE_CSS, declsToCss, fontFaces, resolveStyle, toCss } from './css.ts';
import { CSS_LAYERS } from './custom.ts';
import { styleDeclsSchema } from './schema.ts';

const doc = sampleDoc;

describe('toCss', () => {
  it('emits base rules then max-width media queries from widest to narrowest, in the ns layer', () => {
    expect(toCss(doc(), testRegistry, ['nroot0001'])).toBe(
      `${CSS_LAYERS}@layer ns{` +
        BASE_CSS +
        '.ns-box{display:flex}' +
        '.ns-nroot0001{flex-direction:row;gap:32px}.ns-nlabel001{font-size:20px}' +
        '@media (max-width:1023px){.ns-nroot0001{gap:16px}}' +
        '@media (max-width:767px){.ns-nroot0001{flex-direction:column}}}',
    );
  });

  it('is deterministic regardless of key order', () => {
    const d = doc();
    const root = d.nodes.nroot0001;
    if (!root) throw new Error('fixture');
    root.style = {
      mobile: root.style.mobile ?? {},
      base: { direction: 'row', gap: { value: 32, unit: 'px' } },
      tablet: root.style.tablet ?? {},
    };
    d.breakpoints.reverse();
    expect(toCss(d, testRegistry, ['nroot0001'])).toBe(toCss(doc(), testRegistry, ['nroot0001']));
  });

  it('restores the component display when hidden is overridden with false', () => {
    const d = doc();
    const root = d.nodes.nroot0001;
    if (!root) throw new Error('fixture');
    root.style = { base: { hidden: true }, mobile: { hidden: false } };
    expect(toCss(d, testRegistry, ['nroot0001'])).toContain('.ns-nroot0001{display:none}');
    expect(toCss(d, testRegistry, ['nroot0001'])).toContain(
      '@media (max-width:767px){.ns-nroot0001{display:flex}}',
    );
  });
});

describe('resolveStyle (desktop-first inheritance)', () => {
  it('inherits from the nearest wider breakpoint, then base', () => {
    const d = doc();
    expect(resolveStyle(d, 'nroot0001', 'base')).toEqual({
      direction: 'row',
      gap: { value: 32, unit: 'px' },
    });
    expect(resolveStyle(d, 'nroot0001', 'tablet')).toEqual({
      direction: 'row',
      gap: { value: 16, unit: 'px' },
    });
    expect(resolveStyle(d, 'nroot0001', 'mobile')).toEqual({
      direction: 'column',
      gap: { value: 16, unit: 'px' },
    });
  });

  it('handles an added breakpoint between existing ones', () => {
    const d = doc();
    d.breakpoints.push({ id: 'phablet', label: 'Phablet', maxWidth: 900 });
    const root = d.nodes.nroot0001;
    if (!root) throw new Error('fixture');
    root.style.phablet = { direction: 'row-reverse' };
    expect(resolveStyle(d, 'nroot0001', 'phablet')).toEqual({
      direction: 'row-reverse',
      gap: { value: 16, unit: 'px' },
    });
    expect(resolveStyle(d, 'nroot0001', 'mobile')).toEqual({
      direction: 'column',
      gap: { value: 16, unit: 'px' },
    });
    const css = toCss(d, testRegistry, ['nroot0001']);
    expect(css.indexOf('max-width:1023px')).toBeLessThan(css.indexOf('max-width:900px'));
    expect(css.indexOf('max-width:900px')).toBeLessThan(css.indexOf('max-width:767px'));
  });
});

describe('activeBreakpoint', () => {
  it('matches the media query cascade (max-width inclusive)', () => {
    const d = doc();
    expect([1280, 1024, 1023, 768, 767, 320].map((w) => activeBreakpoint(d, w))).toEqual([
      'base',
      'base',
      'tablet',
      'tablet',
      'mobile',
      'mobile',
    ]);
  });
});

describe('borders and shadows (ADR-0017)', () => {
  const px = (value: number) => ({ value, unit: 'px' as const });
  it('emits border sides and one structured box shadow', () => {
    expect(
      declsToCss(
        {
          borderWidth: px(2),
          borderStyle: 'dashed',
          borderColor: { token: 'primaire' },
          shadow: { x: px(0), y: px(4), blur: px(12), spread: px(-2), color: '#00000026', inset: true },
        },
        'block',
      ),
    ).toBe(
      'border-width:2px;border-style:dashed;border-color:var(--ns-color-primaire);' +
        'box-shadow:inset 0px 4px 12px -2px #00000026',
    );
    expect(declsToCss({ shadow: 'none' }, 'block')).toBe('box-shadow:none');
  });

  it('rejects CSS smuggled into a shadow', () => {
    const shadow = { x: px(0), y: px(0), blur: px(0), spread: px(0), color: 'red;background:url(x)' };
    expect(styleDeclsSchema.safeParse({ shadow }).success).toBe(false);
    expect(styleDeclsSchema.safeParse({ borderStyle: 'solid;color:red' }).success).toBe(false);
  });
});

describe('imported fonts (ADR-0018)', () => {
  it('declares each font file under the media base, and none for thumbnails', () => {
    const d = doc();
    d.assets.afont00001 = {
      id: 'afont00001',
      file: 'afont00001.woff2',
      kind: 'font',
      mime: 'font/woff2',
      size: 1000,
      family: 'Inter',
      weight: { min: 100, max: 900 },
      style: 'italic',
    };
    expect(fontFaces(d, '/media/p1/')).toBe(
      '@font-face{font-family:"Inter";src:url("/media/p1/afont00001.woff2") format("woff2");' +
        'font-weight:100 900;font-style:italic;font-display:swap}',
    );
    expect(toCss(d, testRegistry, ['nroot0001'])).toContain('url("/media/afont00001.woff2")');
    expect(toCss(d, testRegistry, ['nroot0001'], null)).not.toContain('@font-face');
  });
});

describe('fine typography and sticky elements', () => {
  const px = (value: number) => ({ value, unit: 'px' as const });
  it('emits tracking, case, italics and a sticky position', () => {
    expect(
      declsToCss(
        {
          letterSpacing: px(-1),
          textTransform: 'uppercase',
          fontStyle: 'italic',
          position: 'sticky',
          top: px(0),
        },
        'block',
      ),
    ).toBe('letter-spacing:-1px;text-transform:uppercase;font-style:italic;position:sticky;top:0px');
  });

  it('carries them in text styles, as responsive variables', () => {
    const d = doc();
    d.tokens = {
      colors: {},
      sizes: {},
      fonts: {},
      textStyles: {
        h1: {
          label: 'Titre 1',
          style: {
            base: { letterSpacing: px(3), textTransform: 'uppercase' },
            mobile: { letterSpacing: px(1) },
          },
        },
      },
    };
    const css = toCss(d, testRegistry, ['nroot0001']);
    expect(css).toContain(
      'h1{letter-spacing:var(--ns-text-h1-letter-spacing);text-transform:var(--ns-text-h1-text-transform)}',
    );
    expect(css).toContain('--ns-text-h1-letter-spacing:3px;--ns-text-h1-text-transform:uppercase');
    expect(css).toContain('@media (max-width:767px){:root{--ns-text-h1-letter-spacing:1px}');
  });
});

describe('gradient text (ADR-0020)', () => {
  it('fills the glyphs with the gradient; none restores the color', () => {
    const gradient = {
      kind: 'linear' as const,
      angle: 90,
      stops: [
        { color: '#2e2e2e', at: 0 },
        { color: '#fefefe', at: 97 },
      ],
    };
    expect(declsToCss({ textGradient: gradient }, 'block')).toBe(
      'background-image:linear-gradient(90deg,#2e2e2e 0%,#fefefe 97%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent',
    );
    expect(declsToCss({ textGradient: 'none' }, 'block')).toBe(
      'background-image:none;-webkit-text-fill-color:currentcolor',
    );
  });
});
