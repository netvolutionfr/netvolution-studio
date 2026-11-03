import { describe, expect, it } from 'vitest';
import { loadSite } from '../document/load.ts';
import { nodeClassName, type Site } from '../document/schema.ts';
import { createEditorStore } from '../editor/store.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { checkCustomCss, customCss } from './custom.ts';

const errors = (css: string) => {
  const r = checkCustomCss(css);
  return r.ok ? [] : r.errors.map((e) => `${e.line}: ${e.message}`);
};
const warnings = (css: string) => checkCustomCss(css).warnings.map((w) => w.message);

describe('custom CSS (ADR-0023)', () => {
  it('accepts ordinary rules and publishes the parser output, comments dropped', () => {
    const r = checkCustomCss(
      '/* titre */\n.fold3d:hover { transform: rotateX(8deg); color: var(--ns-color-primary) }\n' +
        '@media (max-width: 767px) { .fold3d { transform: none } }\n' +
        '@supports (display: grid) { .grille { display: grid } }\n' +
        '@keyframes flotte { to { translate: 0 -4px } }\n.etiquette::before { content: "→ " }',
    );
    expect(r.ok && r.css).toBe(
      '.fold3d:hover{transform:rotateX(8deg);color:var(--ns-color-primary)}' +
        '@media (max-width:767px){.fold3d{transform:none}}' +
        '@supports (display:grid){.grille{display:grid}}' +
        '@keyframes flotte{to{translate:0-4px}}.etiquette::before{content:"→ "}',
    );
  });

  it.each([
    ['@import url("https://x.test/a.css");', /@import interdit/],
    ['@font-face { font-family: X; src: url("ns-asset:afont00001") }', /@font-face interdit/],
    ['@layer x { .a { color: red } }', /@layer interdit/],
    ['.a { background: url("https://x.test/a.png") }', /url\(\) admis seulement/],
    ['.a { background: url(//x.test/a.png) }', /url\(\) admis seulement/],
    ['.a { background: \\75rl(https://x.test/a.png) }', /./],
    ['.a { b\\61 ckground: red }', /Échappement interdit/],
    ['.a { background-image: image-set("https://x.test/a.png" 1x) }', /image-set\(\) interdit/],
    ['.a { width: expression(alert(1)) }', /expression\(\) interdit/],
    ['.a { -moz-binding: none }', /-moz-binding interdit/],
    ['.a::after { content: "</style><script>alert(1)</script>" }', /« < » interdit/],
    ['.a { --x: url(https://x.test/a.png) }', /url\(\) admis seulement/],
  ])('refuses %s', (css, message) => {
    expect(errors(css).join('\n')).toMatch(message);
  });

  it('reports errors at their line', () => {
    expect(errors('.a { color: red }\n\n.b { background: url(x.png) }')[0]).toMatch(/^3: /);
  });

  it('warns about quality pitfalls without refusing', () => {
    expect(warnings('.a:focus { outline: none }')).toEqual([
      'outline supprimé sans règle :focus-visible : le focus clavier devient invisible',
    ]);
    expect(warnings('.a:focus { outline: none } .a:focus-visible { outline: 2px solid }')).toEqual([]);
    expect(warnings('.a { display: none }')[0]).toMatch(/masque le contenu/);
    expect(warnings('@media (max-width: 767px) { .a { display: none } }')).toEqual([]);
    expect(warnings('.a { animation: flotte 2s infinite }')[0]).toMatch(/prefers-reduced-motion/);
    expect(
      warnings(
        '.a { animation: flotte 2s } @media (prefers-reduced-motion: reduce) { .a { animation: none } }',
      ),
    ).toEqual([]);
    expect(warnings('.ns-nroot0001 { color: red !important }')).toEqual([
      '.ns-nroot0001 est une classe interne du Studio, susceptible de changer',
      '!important : à éviter',
    ]);
    expect(checkCustomCss('.a { color: red !important }').ok).toBe(true);
  });

  it('resolves media references in the ns-custom layer', () => {
    const site = {
      customCss: '.a { background: url("ns-asset:afixture001") }',
      assets: {},
    } as unknown as Site;
    site.assets.afixture001 = { id: 'afixture001', kind: 'image', file: 'afixture001.png' } as never;
    expect(customCss(site, '/media/')).toBe('@layer ns-custom{.a{background:url("/media/afixture001.png")}}');
  });

  it('is set by undoable commands, validated on load and counted as a media use', () => {
    const doc: Site = sampleDoc();
    doc.assets.aimage0001 = {
      id: 'aimage0001',
      kind: 'image',
      file: 'aimage0001.png',
      mime: 'image/png',
      width: 10,
      height: 10,
    } as never;
    const store = createEditorStore(doc, testRegistry);
    expect(store.dispatch('setProjectCss', { css: '@import "x.css";' }).ok).toBe(false);
    const set = store.dispatch('setProjectCss', { css: '.a { background: url(ns-asset:aimage0001) }' });
    expect(set.ok ? 'ok' : JSON.stringify(set)).toBe('ok');
    expect(store.getState().doc.customCss).toContain('ns-asset:aimage0001');
    expect(store.dispatch('removeAsset', { id: 'aimage0001' }).ok).toBe(false);
    store.undo();
    expect(store.getState().doc.customCss).toBeUndefined();

    expect(
      store.dispatch('setNodeClasses', { id: 'nlabel001', classes: ['fold3d', 'fold3d', 'carte'] }).ok,
    ).toBe(true);
    const label = store.getState().doc.nodes.nlabel001;
    expect(label && nodeClassName(label)).toBe('ns-nlabel001 fold3d carte');
    expect(store.dispatch('setNodeClasses', { id: 'nlabel001', classes: ['ns-x'] }).ok).toBe(false);
    expect(store.dispatch('setNodeClasses', { id: 'nlabel001', classes: [] }).ok).toBe(true);
    expect(store.getState().doc.nodes.nlabel001?.classes).toBeUndefined();

    const hostile = { ...sampleDoc(), customCss: '.a { background: url(https://x.test/a.png) }' };
    const r = loadSite(hostile, testRegistry);
    expect(r.ok ? '' : r.diagnostics[0]?.code).toBe('invalid-css');
    const missing = { ...sampleDoc(), customCss: '.a { background: url(ns-asset:aunknown01) }' };
    expect(loadSite(missing, testRegistry).ok).toBe(false);
  });
});
