import { describe, expect, it } from 'vitest';
import { patched, sampleDoc, testRegistry } from '../test-registry.ts';
import { loadSite, serializeSite } from './load.ts';
import type { Site } from './schema.ts';

const codes = (input: unknown) => {
  const r = loadSite(input, testRegistry);
  return r.ok ? [] : r.diagnostics.map((d) => d.code);
};
const label = sampleDoc().nodes.nlabel001;
const root = sampleDoc().nodes.nroot0001;

describe('loadSite', () => {
  it('accepts a valid document and round-trips it without loss', () => {
    const r = loadSite(sampleDoc(), testRegistry);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(loadSite(JSON.parse(serializeSite(r.doc)), testRegistry)).toEqual({
      ok: true,
      doc: sampleDoc(),
    });
  });

  it('refuses unsupported versions explicitly', () => {
    expect(codes(patched('schemaVersion', 3))).toEqual(['unsupported-version']);
    expect(codes(patched('schemaVersion', 0))).toEqual(['unsupported-version']);
    expect(codes(patched('schemaVersion', 1.5))).toEqual(['unsupported-version']);
    expect(codes(null)).toEqual(['invalid-document']);
    expect(codes('{}')).toEqual(['invalid-document']);
  });

  it('refuses unknown keys instead of dropping them silently', () => {
    expect(codes(patched('extra', true))).toEqual(['schema']);
  });

  it('reports unknown component types', () => {
    expect(codes(patched('nodes.nlabel001.type', 'video'))).toEqual(['unknown-component']);
  });

  it('reports structural errors', () => {
    expect(codes(patched('nodes.nroot0001.children', ['nlabel001', 'nmissing01']))).toEqual(['missing-node']);
    expect(codes(patched('nodes.nroot0001.children', []))).toEqual(['orphan-node']);
    expect(codes(patched('nodes.nother001', label))).toContain('node-id-mismatch');
    expect(codes(patched('pages.0.rootId', 'nnothere1'))).toContain('missing-root');
  });

  it('detects cycles and multiple parents', () => {
    const cycle = { ...root, id: 'nlabel001', children: ['nroot0001'] };
    expect(codes(patched('nodes.nlabel001', cycle))).toContain('cycle');
    expect(codes(patched('nodes.nroot0001.children', ['nlabel001', 'nlabel001']))).toEqual([
      'multiple-parents',
    ]);
  });

  it('validates props, nesting and style against the registry', () => {
    expect(codes(patched('nodes.nlabel001.props', { text: '' }))).toEqual(['invalid-props']);
    expect(codes(patched('nodes.nlabel001.children', ['nroot0001']))).toContain('child-not-allowed');
    expect(codes(patched('nodes.nlabel001.style', { base: { gap: { value: 1, unit: 'px' } } }))).toEqual([
      'style-not-allowed',
    ]);
    expect(codes(patched('nodes.nlabel001.style', { wide: {} }))).toEqual(['unknown-breakpoint']);
  });

  it('rejects raw or invalid style values (no CSS injection)', () => {
    for (const fontSize of [
      '12px;}body{x:y',
      { value: 12, unit: 'px;}' },
      { value: Number.NaN, unit: 'px' },
    ]) {
      expect(codes(patched('nodes.nlabel001.style', { base: { fontSize } }))).toEqual(['schema']);
    }
    expect(codes(patched('nodes.nlabel001.style', { base: { color: 'red;background:url(x)' } }))).toEqual([
      'schema',
    ]);
  });

  it('refuses duplicate breakpoints', () => {
    const bps = [...sampleDoc().breakpoints, { id: 'mobile', label: 'Bis', maxWidth: 500 }];
    expect(codes(patched('breakpoints', bps))).toEqual(['duplicate-breakpoint']);
  });
});

const v1 = () => {
  const { schemaVersion, kind, name, settings, pages, ...rest } = sampleDoc();
  return { ...rest, schemaVersion: 1, kind: 'ns.page', title: 'Ancien', rootId: 'nroot0001' };
};
const withPages = (edit: (s: Site) => void) => {
  const site = sampleDoc();
  site.nodes.nroot0002 = { id: 'nroot0002', type: 'box', props: {}, style: {}, children: [] };
  site.pages.push({ id: 'about', title: 'À propos', slug: 'a-propos', rootId: 'nroot0002', publish: true });
  edit(site);
  return site;
};

describe('migration v1 → v2', () => {
  it('turns a page into the home page of a one-page site', () => {
    const r = loadSite(v1(), testRegistry);
    expect(r.ok && r.doc).toEqual({
      ...sampleDoc(),
      name: 'Ancien',
      pages: [{ id: 'home', title: 'Ancien', slug: '', rootId: 'nroot0001', publish: true }],
    });
  });

  it('still validates the migrated content', () => {
    expect(codes({ ...v1(), rootId: 'nnothere1' })).toEqual(['missing-root', 'orphan-node', 'orphan-node']);
    expect(codes({ ...v1(), kind: 'other' })).toEqual(['schema']);
  });
});

describe('pages', () => {
  it('accepts several pages sharing the node table', () => {
    expect(codes(withPages(() => {}))).toEqual([]);
  });

  it('checks slugs: unique, empty for the home page only, not reserved', () => {
    const slug = (value: string, i = 1) =>
      codes(withPages((s) => ((s.pages[i] as { slug: string }).slug = value)));
    expect(slug('')).toEqual(['duplicate-slug', 'invalid-slug']);
    expect(slug('x', 0)).toEqual(['invalid-slug']);
    expect(slug('media')).toEqual(['invalid-slug']);
    expect(slug('services/index')).toEqual(['invalid-slug']);
    expect(slug('Services')).toEqual(['schema']);
    expect(slug('services//x')).toEqual(['schema']);
    expect(slug('services/web-design')).toEqual([]);
  });

  it('refuses duplicate pages, shared roots and a missing home page', () => {
    expect(codes(withPages((s) => ((s.pages[1] as { id: string }).id = 'home')))).toContain('duplicate-page');
    expect(codes(withPages((s) => ((s.pages[1] as { rootId: string }).rootId = 'nroot0001')))).toEqual([
      'multiple-parents',
      'orphan-node',
    ]);
    expect(codes(withPages((s) => (s.settings.homePageId = 'nope')))).toContain('missing-page');
  });

  it('checks page links anywhere in props', () => {
    const link = (pageId: string) =>
      codes(
        withPages((s) => {
          (s.nodes.nlabel001 as { props: unknown }).props = { text: 'x', more: [{ kind: 'page', pageId }] };
        }),
      );
    // `label` props are strict: an extra key is invalid, but the broken link is reported too.
    expect(link('ghost')).toEqual(['invalid-props', 'missing-page']);
    expect(link('about')).toEqual(['invalid-props']);
  });
});
