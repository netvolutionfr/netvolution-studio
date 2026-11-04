import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkSite,
  createEditorStore,
  loadSite,
  localizeContent,
  pageRoots,
  type Site,
  tm,
  toCss,
} from '@ns/core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DocumentView } from './DocumentView.tsx';
import { definitions, registry } from './definitions.ts';
import { sections } from './sections.ts';
import { views } from './views.ts';

const root = join(import.meta.dirname, '../../..');
const fixtures = readdirSync(join(root, 'fixtures')).filter((f) => f.endsWith('.json'));
const load = (file: string) => {
  const r = loadSite(JSON.parse(readFileSync(join(root, 'fixtures', file), 'utf8')), registry);
  if (!r.ok) throw new Error(`${file}: ${JSON.stringify(r.diagnostics, null, 2)}`);
  return r.doc;
};

describe('built-in components', () => {
  it('have a view, a view file and valid defaults', () => {
    for (const def of Object.values(definitions)) {
      expect(views).toHaveProperty(def.type);
      expect(readdirSync(join(import.meta.dirname, def.type))).toContain('view.tsx');
      // Defaults are inserted translated into the site language (`content.*` keys, ADR-0024).
      for (const lang of ['en', 'fr'])
        expect(def.props.safeParse(localizeContent(def.defaults.props, lang)).success, def.type).toBe(true);
    }
  });

  it('views are self-contained and pure (copied verbatim into exports)', () => {
    for (const def of Object.values(definitions)) {
      const src = readFileSync(join(import.meta.dirname, def.type, 'view.tsx'), 'utf8');
      const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
      expect(
        imports.every((i) => i === 'react'),
        `${def.type}: ${imports}`,
      ).toBe(true);
      expect(src).not.toMatch(
        /\buse[A-Z]\w*\(|dangerouslySetInnerHTML|window\.|document\.|Math\.random|Date\./,
      );
      expect(src).toMatch(new RegExp(`export default function ${def.viewName}\\(`));
    }
  });

  it('islands exist exactly for interactive components, import nothing and never inject markup', () => {
    for (const def of Object.values(definitions)) {
      const files = readdirSync(join(import.meta.dirname, def.type));
      expect(files.includes('island.ts'), def.type).toBe(def.island === true);
      if (!def.island) continue;
      const src = readFileSync(join(import.meta.dirname, def.type, 'island.ts'), 'utf8');
      expect(src, def.type).not.toMatch(
        /^\s*import\b|\bfrom\s+'|innerHTML|outerHTML|insertAdjacentHTML|eval\(|new Function/m,
      );
      expect(src).toMatch(/export function init\(root: ParentNode = document[,)]/);
    }
  });

  it('the animation island imports nothing and never injects markup', () => {
    const src = readFileSync(join(import.meta.dirname, 'animations/island.ts'), 'utf8');
    expect(src).not.toMatch(
      /^\s*import\b|\bfrom\s+'|innerHTML|outerHTML|insertAdjacentHTML|eval\(|new Function/m,
    );
  });

  it('declare fields only for existing props', () => {
    for (const def of Object.values(definitions)) {
      for (const f of def.fields)
        expect(Object.keys(def.defaults.props), `${def.type}.${f.prop}`).toContain(f.prop);
    }
  });

  it.each(sections.map((p) => [p.id, p] as const))('section %s inserts a valid subtree', (_id, preset) => {
    const store = createEditorStore(load('typography.json'), registry);
    const r = store.dispatch('insertTree', { parentId: 'nroot00001', index: 0, tree: preset.tree });
    expect(r.ok ? 'ok' : tm(r.error.message)).toBe('ok');
  });

  it('inserts its texts and layer names in the site language (ADR-0024)', () => {
    const texts = (lang: string) => {
      const site = load('typography.json');
      site.settings.lang = lang;
      const store = createEditorStore(site, registry);
      const tree = sections.find((x) => x.id === 'tabs')?.tree ?? { type: 'tabs' };
      const r = store.dispatch('insertTree', { parentId: 'nroot00001', index: 0, tree });
      const ids = r.ok ? (r.created ?? []) : [];
      store.dispatch('insertNode', { parentId: 'nroot00001', index: 0, type: 'button' });
      const doc = store.getState().doc;
      return JSON.stringify([...ids, ...Object.keys(doc.nodes)].map((id) => doc.nodes[id]?.props));
    };
    expect(texts('fr')).toContain('Contenu de l’onglet 2.');
    expect(texts('fr')).toContain('En savoir plus');
    expect(texts('en')).toContain('Content of tab 2.');
    expect(texts('en')).toContain('Learn more');
    expect(texts('en')).not.toContain('content.');
  });

  it('core does not depend on React', () => {
    const scan = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? scan(join(dir, e.name)) : [readFileSync(join(dir, e.name), 'utf8')],
      );
    for (const src of scan(join(root, 'packages/core/src'))) expect(src).not.toMatch(/from 'react/);
  });
});

describe('fixtures', () => {
  it.each(fixtures)('%s is a valid document', (file) => {
    expect(load(file).schemaVersion).toBe(2);
  });

  it('render escaped text and validated links only', () => {
    const html = renderToStaticMarkup(
      createElement(DocumentView, { site: load('typography.json'), pageId: 'home' }),
    );
    expect(html).toContain('Typographie &amp; &lt;rythme&gt; {vertical}');
    expect(html).toContain('<a href="https://example.com/?a=1&amp;b=2">lien</a>');
    expect(html).toMatch(/^<main class="ns-nroot00001">/);
  });

  it('render lists as ul or ol, keep their semantics without markers, and validate items', () => {
    const html = renderToStaticMarkup(
      createElement(DocumentView, { site: load('elements.json'), pageId: 'home' }),
    );
    expect(html).toContain(
      '<ul class="ns-nlst00001 ns-list ns-list-disc"><li>Sites <strong>rapides</strong> et sûrs</li><li><em>Hébergement </em><a href="https://example.com/hebergement">au choix</a></li>',
    );
    expect(html).toContain('<ol class="ns-nlst00002 ns-list ns-list-decimal"><li>Atelier de cadrage</li>');
    expect(html).toContain('<ul class="ns-nlst00003 ns-list ns-list-none" role="list">');
    const doc = structuredClone(load('elements.json')) as Site;
    const list = doc.nodes.nlst00001;
    if (!list) throw new Error('fixture');
    for (const items of [[], [[]], [[{ text: 'x', link: { kind: 'url', href: 'javascript:alert(1)' } }]]]) {
      list.props = { marker: 'disc', items };
      expect(loadSite(doc, registry).ok).toBe(false);
    }
  });

  it('make list items a parameter of shared components', () => {
    const store = createEditorStore(load('elements.json'), registry);
    expect(
      store.dispatch('createSymbol', {
        nodeId: 'nlst00001',
        name: 'Atouts',
        category: 'elements',
        description: '',
      }).ok,
    ).toBe(true);
    expect(store.getState().doc.symbols?.[0]?.params.map((p) => p.label)).toContain('List — Items');
  });

  it('render line breaks as <br> in texts, list items and headings', () => {
    const doc = structuredClone(load('typography.json')) as Site;
    const [text, heading] = [doc.nodes.ntxt00001, doc.nodes.nh1000001];
    if (!text || !heading) throw new Error('fixture');
    text.props = { content: [{ text: 'Toujours\nà l’écoute', bold: true }] };
    heading.props = { ...heading.props, text: 'Central,\nDigital.' };
    const r = loadSite(doc, registry);
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    const html = renderToStaticMarkup(createElement(DocumentView, { site: r.doc, pageId: 'home' }));
    expect(html).toContain('<strong>Toujours<br/>à l’écoute</strong>');
    expect(html).toContain('>Central,<br/>Digital.</h1>');
  });

  it('render paragraphs, colored runs and rich headings, keeping the original formats valid (ADR-0020)', () => {
    const doc = structuredClone(load('typography.json')) as Site;
    const [text, heading, plain] = [doc.nodes.ntxt00001, doc.nodes.nh1000001, doc.nodes.ntxt00002];
    if (!text || !heading || !plain) throw new Error('fixture');
    text.props = {
      content: [
        [{ text: 'Premier paragraphe, ' }, { text: 'en couleur', color: '#e11d48' }],
        [{ text: 'Second paragraphe.', italic: true }],
      ],
    };
    heading.props = {
      level: 1,
      text: [{ text: 'Central, ' }, { text: 'Digital.', bold: true, color: '#1e3a8a' }],
    };
    const r = loadSite(doc, registry);
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    const html = renderToStaticMarkup(createElement(DocumentView, { site: r.doc, pageId: 'home' }));
    expect(html).toContain(
      '<div class="ns-ntxt00001 ns-text"><p>Premier paragraphe, <span style="color:#e11d48">en couleur</span></p><p><em>Second paragraphe.</em></p></div>',
    );
    expect(html).toContain('>Central, <span style="color:#1e3a8a"><strong>Digital.</strong></span></h1>');
    // One paragraph in the original format: still a single <p>.
    expect(html).toMatch(/<p class="ns-ntxt00002">Texte justifié/);
    for (const color of ['red', '#e11d48;background:url(x)', 'expression(alert(1))']) {
      text.props = { content: [[{ text: 'x', color }]] };
      expect(loadSite(doc, registry).ok).toBe(false);
    }
  });

  it('refuse javascript: links', () => {
    const doc = structuredClone(load('typography.json')) as Site;
    const node = doc.nodes.ntxt00001;
    if (!node) throw new Error('fixture');
    node.props = { content: [{ text: 'x', link: { kind: 'url', href: 'javascript:alert(1)' } }] };
    const r = loadSite(doc, registry);
    expect(r.ok ? [] : r.diagnostics.map((d) => d.code)).toEqual(['invalid-props']);
  });
});

describe('navigation (SB-03)', () => {
  it('renders the menu with the current page, sub-entries and a no-JS folded menu below the breakpoint', () => {
    const site = structuredClone(load('typography.json')) as Site;
    site.pages.push({
      id: 'contact',
      title: 'Contact',
      slug: 'contact',
      rootId: 'nrootcontact',
      publish: true,
    });
    site.nodes.nrootcontact = {
      id: 'nrootcontact',
      type: 'container',
      props: { tag: 'main' },
      style: {},
      children: [],
    };
    site.menus = [
      {
        id: 'main',
        name: 'Principal',
        items: [
          { id: 'e1', label: 'Accueil', link: { kind: 'page', pageId: 'home' } },
          {
            id: 'e2',
            label: 'Agence',
            link: { kind: 'url', href: '#' },
            children: [{ id: 'e3', label: 'Contact', link: { kind: 'page', pageId: 'contact' } }],
          },
        ],
      },
    ];
    site.nodes.nnav000001 = {
      id: 'nnav000001',
      type: 'nav',
      props: { menuId: 'main', label: 'Navigation principale', toggle: 'Menu', collapse: 'tablet' },
      style: {},
      children: [],
    };
    site.nodes.nheader001 = {
      id: 'nheader001',
      type: 'container',
      props: { tag: 'header' },
      style: {},
      children: ['nnav000001'],
    };
    site.layouts = [{ id: 'header', name: 'Header', role: 'header', rootId: 'nheader001' }];
    site.settings.defaultLayouts = { header: 'header' };
    const r = loadSite(site, registry);
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    const html = renderToStaticMarkup(createElement(DocumentView, { site: r.doc, pageId: 'contact' }));
    expect(html).toMatch(
      /^<header class="ns-nheader001"><nav class="ns-nav ns-nnav000001" aria-label="Navigation principale">/,
    );
    expect(html).toContain(
      '<li class="ns-nav-active"><a href="#">Agence</a><ul class="ns-nav-list"><li class="ns-nav-active"><a href="/contact/" aria-current="page">Contact</a>',
    );
    expect(html).toContain('<details class="ns-nav-menu"><summary>Menu</summary>');
    expect(toCss(r.doc, registry, pageRoots(r.doc, 'contact'))).toContain(
      '@media (max-width:1023px){.ns-nnav000001 .ns-nav-bar{display:none}.ns-nnav000001 .ns-nav-menu{display:block}}',
    );
    delete site.menus;
    const missing = loadSite(site, registry);
    expect(missing.ok ? [] : missing.diagnostics.map((d) => d.code)).toEqual(['missing-menu']);
  });
});

describe('media library (SB-06)', () => {
  const withMedia = () => {
    const site = structuredClone(load('elements.json')) as Site;
    site.assets.asvglogo01 = {
      id: 'asvglogo01',
      kind: 'svg',
      file: 'asvglogo01.svg',
      mime: 'image/svg+xml',
      width: 120,
      height: 40,
      alt: 'Logo',
    };
    site.assets.apdftarif1 = {
      id: 'apdftarif1',
      kind: 'file',
      file: 'apdftarif1.pdf',
      mime: 'application/pdf',
      size: 1200,
      name: 'Tarifs',
    };
    return site;
  };

  it('images accept raster and SVG media, links reach downloadable files', () => {
    const site = withMedia();
    const image = Object.values(site.nodes).find((n) => n.type === 'image');
    const button = Object.values(site.nodes).find((n) => n.type === 'button');
    if (!image || !button) throw new Error('fixture');
    image.props = { ...image.props, assetId: 'asvglogo01' };
    button.props = { ...button.props, link: { kind: 'asset', assetId: 'apdftarif1' } };
    const r = loadSite(site, registry);
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    const html = renderToStaticMarkup(createElement(DocumentView, { site: r.doc, pageId: 'home' }));
    expect(html).toContain('src="/media/asvglogo01.svg"');
    expect(html).toContain('href="/media/apdftarif1.pdf"');
    image.props = { ...image.props, assetId: 'apdftarif1' };
    const refused = loadSite(site, registry);
    expect(refused.ok ? '' : refused.diagnostics.map((d) => tm(d.message)).join()).toMatch(
      /Media type not accepted/,
    );
  });

  it('metadata edits; removal refused while the media is used', () => {
    const store = createEditorStore(withMedia(), registry);
    expect(
      store.dispatch('updateAsset', { id: 'apdftarif1', name: 'Grille tarifaire', tags: ['offre', 'pdf'] })
        .ok,
    ).toBe(true);
    expect(store.getState().doc.assets.apdftarif1).toMatchObject({
      name: 'Grille tarifaire',
      tags: ['offre', 'pdf'],
    });
    expect(store.dispatch('updateAsset', { id: 'apdftarif1', alt: 'x' }).ok).toBe(false);
    expect(store.dispatch('updateAsset', { id: 'apdftarif1', tags: ['ok', ''] }).ok).toBe(false);
    const used = store.dispatch('removeAsset', { id: 'afixture001' });
    expect(used.ok ? '' : tm(used.error.message)).toMatch(/used by 2/);
    expect(store.dispatch('removeAsset', { id: 'apdftarif1' }).ok).toBe(true);
  });
});

describe('pre-export checks (SB-11)', () => {
  it('separates blocking errors from warnings', () => {
    const site = structuredClone(load('layouts.json')) as Site;
    site.settings.siteUrl = 'https://atelier.example';
    const services = site.pages.find((p) => p.id === 'services');
    if (!services) throw new Error('fixture');
    services.publish = false; // linked from the main menu
    const { checks } = checkSite(site, registry, new Set());
    const codes = (severity: string) => checks.filter((c) => c.severity === severity).map((c) => c.code);
    expect(codes('error')).toEqual(['broken-link']);
    expect(codes('warning')).toContain('no-description');
    expect(codes('warning')).not.toContain('no-site-url');
    const bad = structuredClone(load('elements.json')) as Site;
    const r = checkSite(bad, registry, new Set());
    expect(r.checks.find((c) => c.code === 'missing-file')?.severity).toBe('error');
    expect(checkSite({ nope: true }, registry).checks[0]?.severity).toBe('error');
  });
});

describe('gradients and background images (ADR-0017)', () => {
  it('layers the gradient over the image, keeping the inherited layer on each breakpoint', () => {
    const site = load('composition.json');
    const css = toCss(site, registry, pageRoots(site, 'home'), '/media/p1/');
    expect(css).toMatch(
      /\.ns-nstkhero01\{[^}]*background-image:linear-gradient\(180deg,#00000000 0%,#00000099 100%\),url\("\/media\/p1\/afixture001\.png"\);background-size:cover;background-position:center;background-repeat:no-repeat/,
    );
    // Mobile changes the gradient only: the image is still drawn under it.
    expect(css).toMatch(
      /@media \(max-width:767px\)\{[^@]*\.ns-nstkhero01\{background-image:radial-gradient\(circle,#fde68acc 0%,#0f766ecc 100%\),url\("\/media\/p1\/afixture001\.png"\)\}/,
    );
  });

  it('refuses unknown or non-image backgrounds, warns about heavy ones and blocks removing a used one', () => {
    const site = structuredClone(load('composition.json')) as Site;
    const hero = site.nodes.nstkhero01;
    if (!hero?.style.base) throw new Error('fixture');
    expect(
      checkSite(site, registry, new Map([['afixture001.png', 800_000]])).checks.map((c) => c.code),
    ).toContain('heavy-background');
    expect(
      checkSite(site, registry, new Map([['afixture001.png', 30_000]])).checks.map((c) => c.code),
    ).not.toContain('heavy-background');
    const store = createEditorStore(site, registry);
    expect(store.dispatch('removeAsset', { id: 'afixture001' }).ok).toBe(false);
    hero.style.base.backgroundImage = { asset: 'aunknown001', size: 'cover', position: 'center' };
    expect(loadSite(site, registry).ok).toBe(false);
  });
});

describe('gallery (ADR-0021)', () => {
  const withGallery = (images: { assetId: string; alt: string; caption?: string }[], extra = {}) => {
    const site = structuredClone(load('composition.json')) as Site;
    const root = site.nodes[site.pages[0]?.rootId as string];
    if (!root) throw new Error('fixture');
    site.nodes.ngallerytst = {
      id: 'ngallerytst',
      type: 'gallery',
      props: { images, layout: 'masonry', ratio: '4/3', lightbox: true, ...extra },
      style: { base: { columns: 3, gap: { value: 20, unit: 'px' } }, mobile: { columns: 1 } },
      children: [],
    };
    root.children.push('ngallerytst');
    return site;
  };

  it('renders a mosaic with full-size links and captions, and tiles cropped to one ratio', () => {
    const r = loadSite(
      withGallery([
        { assetId: 'afixture001', alt: 'Projet', caption: 'Légende' },
        { assetId: 'afixture001', alt: '' },
      ]),
      registry,
    );
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    const html = renderToStaticMarkup(createElement(DocumentView, { site: r.doc, pageId: 'home' }));
    expect(html).toContain(
      '<div class="ns-gallery ns-gallery-masonry ns-gallery-r-4-3 ns-ngallerytst" data-ns-gallery="" data-dialog="Image agrandie" data-close="Fermer"',
    );
    expect(html).toContain(
      '<figure class="ns-gallery-item"><a class="ns-gallery-link" href="/media/afixture001.png"><img src="/media/afixture001.png" alt="Projet" width="640" height="400" loading="lazy" decoding="async"/></a><figcaption>Légende</figcaption></figure>',
    );
    const css = toCss(r.doc, registry, pageRoots(r.doc, 'home'));
    expect(css).toContain('.ns-ngallerytst{column-gap:20px;--ns-gap:20px;column-count:3}');
    expect(css).toMatch(/@media \(max-width:767px\)\{[^@]*\.ns-ngallerytst\{column-count:1\}/);
    const tiles = loadSite(
      withGallery([{ assetId: 'afixture001', alt: 'x' }], { layout: 'tiles', ratio: '1/1', lightbox: false }),
      registry,
    );
    if (!tiles.ok) throw new Error('tiles');
    const tilesHtml = renderToStaticMarkup(createElement(DocumentView, { site: tiles.doc, pageId: 'home' }));
    expect(tilesHtml).toContain('class="ns-gallery ns-gallery-tiles ns-gallery-r-1-1 ns-ngallerytst">');
    expect(tilesHtml.split('ns-ngallerytst')[1]).not.toContain('ns-gallery-link');
  });

  it('refuses missing or non-image media and blocks removing an image in use', () => {
    expect(loadSite(withGallery([{ assetId: 'aunknown01', alt: '' }]), registry).ok).toBe(false);
    const site = withGallery([{ assetId: 'afixture001', alt: 'x' }]);
    site.assets.afile00001 = {
      id: 'afile00001',
      kind: 'file',
      file: 'afile00001.pdf',
      mime: 'application/pdf',
      size: 10,
    };
    const gallery = site.nodes.ngallerytst;
    if (!gallery) throw new Error('fixture');
    (gallery.props.images as unknown[]).push({
      assetId: 'afile00001',
      alt: '',
    });
    expect(loadSite(site, registry).ok).toBe(false);
    const ok = withGallery([{ assetId: 'afixture001', alt: 'x' }]);
    const image = ok.nodes[Object.keys(ok.nodes).find((id) => ok.nodes[id]?.type === 'image') as string];
    if (image) image.props.assetId = null;
    // The only remaining uses are media lists (the hero background uses it too in this fixture).
    delete ok.nodes.nstkhero01?.style.base?.backgroundImage;
    delete ok.nodes.ncarous001;
    for (const n of Object.values(ok.nodes)) n.children = n.children.filter((c) => c !== 'ncarous001');
    expect(
      Object.values(ok.nodes)
        .filter((n) => JSON.stringify(n).includes('afixture001'))
        .every((n) => n.type === 'gallery'),
    ).toBe(true);
    const store = createEditorStore(ok, registry);
    expect(store.dispatch('removeAsset', { id: 'afixture001' }).ok).toBe(false);
  });
});

describe('marquee and carousel (ADR-0022)', () => {
  const page = (lang?: string) => {
    const site = load('composition.json');
    if (lang) site.settings.lang = lang;
    const r = loadSite(site, registry);
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    return {
      html: renderToStaticMarkup(createElement(DocumentView, { site: r.doc, pageId: 'home' })),
      css: toCss(r.doc, registry, pageRoots(r.doc, 'home')),
    };
  };

  it('renders the marquee twice, the copy hidden, with a pause button and a still reduced-motion version', () => {
    const { html, css } = page();
    const marquee = html.split('ns-nmarquee01')[1] ?? '';
    expect(marquee).toContain('data-ns-marquee=""');
    expect(marquee).toContain(
      '<button type="button" class="ns-marquee-toggle" aria-pressed="false" data-pause="Mettre en pause" data-resume="Reprendre le défilement" hidden="">',
    );
    expect(marquee.match(/class="ns-marquee-group"/g)).toHaveLength(2);
    expect(marquee).toContain('<ul class="ns-marquee-group" aria-hidden="true">');
    expect(marquee).toContain('<strong>Sites </strong>');
    expect(css).toContain('@keyframes ns-marquee');
    expect(css).toMatch(/prefers-reduced-motion:reduce\)\{[^}]*\.ns-marquee-track\{[^}]*animation:none/);
  });

  it('renders an accessible carousel whose slides per view follow the breakpoints', () => {
    const { html, css } = page();
    const carousel = html.split('ns-ncarous001')[1] ?? '';
    expect(html).toContain('aria-roledescription="carrousel" aria-label="Réalisations" data-ns-carousel=""');
    expect(carousel).toContain('<div class="ns-carousel-track" tabindex="0">');
    expect(carousel).toContain('aria-roledescription="diapositive" aria-label="1 sur 4"');
    expect(carousel).toContain('<figcaption>Première</figcaption>');
    expect(carousel).toContain('<div class="ns-carousel-controls" hidden="">');
    expect(carousel).not.toContain('ns-carousel-pause');
    expect(css).toContain('.ns-ncarous001{--ns-per-view:3}');
    expect(css).toMatch(/@media \(max-width:767px\)\{[^@]*\.ns-ncarous001\{--ns-per-view:1\}/);
  });

  it('writes its generated texts in the site language (ADR-0024)', () => {
    const { html } = page('en-GB');
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-roledescription="slide" aria-label="1 of 4"');
    expect(html).toContain('data-pause="Pause" data-resume="Resume scrolling"');
    // Without a catalog for the site language, English.
    expect(page('de').html).toContain('aria-label="Previous image"');
  });

  it('refuses unknown media and out-of-range settings', () => {
    const site = load('composition.json');
    const node = site.nodes.ncarous001;
    if (!node) throw new Error('fixture');
    node.props.perView = 9;
    expect(loadSite(site, registry).ok).toBe(false);
    node.props.perView = 3;
    (node.props.images as unknown[]).push({ assetId: 'aunknown01', alt: '' });
    expect(loadSite(site, registry).ok).toBe(false);
  });
});

describe('advanced composition (CS-04)', () => {
  it('emits position, overlay, overflow and individual transforms, responsive', () => {
    const site = load('composition.json');
    const css = toCss(site, registry, pageRoots(site, 'home'));
    expect(css).toMatch(/\.ns-nstkhero01\{[^}]*position:relative;overflow:hidden/);
    expect(css).toMatch(/\.ns-ntxtbadge1\{[^}]*position:absolute;top:16px;right:16px;z-index:2;rotate:-4deg/);
    expect(css).toContain('translate:0px -24px;scale:1.02');
    expect(css).toContain('aspect-ratio:16 / 9');
    expect(css).toMatch(/@media \(max-width:767px\)\{[^@]*\.ns-ntxtbadge1\{[^}]*position:static/);
    const unanchored = structuredClone(site) as Site;
    const hero = unanchored.nodes.nstkhero01;
    if (hero) hero.style.base = { ...hero.style.base, position: 'static' };
    expect(checkSite(unanchored, registry).checks.map((c) => c.code)).toContain('absolute-unanchored');
  });
});

describe('contact form (ADR-0026)', () => {
  /** A published page holding a form with `fields`, built by commands like the editor does. */
  const withForm = (form: Record<string, unknown>, fields: Record<string, unknown>[]) => {
    const s = createEditorStore(load('blank.json'), registry);
    const rootId = s.getState().rootId;
    s.dispatch('insertTree', {
      parentId: rootId,
      index: 0,
      tree: { type: 'form', props: form, children: fields.map((props) => ({ type: 'form-field', props })) },
    });
    return s.getState().doc;
  };
  const field = (props: Record<string, unknown>) => ({
    label: 'Nom',
    name: 'nom',
    type: 'text',
    required: true,
    placeholder: '',
    options: [],
    ...props,
  });
  const codes = (site: Site) =>
    checkSite(site, registry, new Set()).checks.map((c) => `${c.severity}:${c.code}`);

  it('renders a native form: post, action, hidden fields, labels tied to controls, autofill', () => {
    const site = withForm(
      {
        action: 'https://formspree.io/f/abc',
        submitLabel: 'Envoyer',
        hidden: [{ name: 'access_key', value: 'k' }],
      },
      [
        field({}),
        field({ label: 'E-mail', name: 'email', type: 'email' }),
        field({
          label: 'Sujet',
          name: 'sujet',
          type: 'select',
          required: false,
          options: ['Devis', 'Autre'],
        }),
        field({ label: 'J’accepte', name: 'consentement', type: 'checkbox' }),
      ],
    );
    const html = renderToStaticMarkup(
      createElement(DocumentView, { site, pageId: site.pages[0]?.id as string }),
    );
    // One element per tag, its attributes in any order.
    const tag = (open: RegExp) => html.match(open)?.[0] ?? '';
    const form = tag(/<form [^>]*>/);
    expect(form).toContain('method="post"');
    expect(form).toContain('action="https://formspree.io/f/abc"');
    expect(html).toContain('<input type="hidden" name="access_key" value="k"/>');
    const id = /<label for="(ns-n[a-z0-9]+-input)">Nom<span aria-hidden="true"> \*<\/span><\/label>/.exec(
      html,
    )?.[1];
    const nom = tag(/<input id="[^"]+"[^>]*name="nom"[^>]*>/);
    expect(nom).toContain(`id="${id}"`);
    expect(nom).toContain('required=""');
    expect(nom.toLowerCase()).toContain('autocomplete="name"');
    expect(tag(/<input [^>]*name="email"[^>]*>/)).toContain('type="email"');
    expect(html).toMatch(
      /name="sujet"><option value="" selected="">Choisir…<\/option><option value="Devis">Devis<\/option>/,
    );
    expect(html).toContain('<button type="submit" class="ns-form-submit">Envoyer</button>');
    expect(html).not.toMatch(/<script/);
  });

  it('refuses an address other than https', () => {
    for (const action of ['http://exemple.fr', 'javascript:alert(1)', '/contact', 'https://a b'])
      expect(
        registry.get('form')?.props.safeParse({ action, submitLabel: 'Envoyer', hidden: [] }).success,
        action,
      ).toBe(false);
    expect(registry.get('form-field')?.props.safeParse(field({ name: '1 nom' })).success).toBe(false);
  });

  it('checks before export: address, fields, names, nesting, field outside a form, consent', () => {
    const ok = withForm({ action: 'https://exemple.fr/envoi', submitLabel: 'Envoyer', hidden: [] }, [
      field({ type: 'email', name: 'email' }),
      field({ type: 'checkbox', name: 'consentement' }),
    ]);
    expect(codes(ok).filter((c) => c.includes(':form-'))).toEqual([]);
    const bad = withForm({ action: '', submitLabel: 'Envoyer', hidden: [{ name: 'email', value: 'x' }] }, [
      field({ type: 'email', name: 'email' }),
      field({ type: 'select', name: 'choix' }),
    ]);
    expect(
      codes(bad)
        .filter((c) => c.includes(':form-'))
        .sort(),
    ).toEqual([
      'error:form-duplicate-name',
      'error:form-no-action',
      'error:form-select-empty',
      'warning:form-no-consent',
    ]);
    const empty = withForm({ action: 'https://exemple.fr', submitLabel: 'Envoyer', hidden: [] }, []);
    expect(codes(empty)).toContain('error:form-no-field');
    // A field moved out of its form, and a form put inside another one.
    const s = createEditorStore(ok, registry);
    const rootId = s.getState().rootId;
    const formId = s.getState().doc.nodes[rootId]?.children[0] as string;
    const fieldId = s.getState().doc.nodes[formId]?.children[0] as string;
    s.dispatch('moveNode', { id: fieldId, parentId: rootId, index: 1 });
    expect(codes(s.getState().doc)).toContain('error:form-field-outside');
    s.dispatch('insertTree', {
      parentId: formId,
      index: 0,
      tree: { type: 'stack', children: [{ type: 'form' }] },
    });
    expect(codes(s.getState().doc)).toContain('error:form-nested');
  });
});
