import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registry } from '@ns/components/definitions';
import { loadSite, type Site } from '@ns/core';
import { describe, expect, it } from 'vitest';
import { generatePageFiles, readme, siteFiles, withNotFound } from './generate.ts';
import { exportProject, mediaFiles, readViews, writeFiles } from './write.ts';

const fixture = async (name: string) => {
  const r = loadSite(
    JSON.parse(await readFile(join(import.meta.dirname, '../../../fixtures', name), 'utf8')),
    registry,
  );
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.doc;
};

describe('generatePageFiles', () => {
  it('copies only the components used, verbatim', async () => {
    const doc = await fixture('typography.json');
    const files = generatePageFiles(doc, registry, await readViews(doc));
    expect(
      Object.keys(files)
        .filter((f) => f.startsWith('src/components/'))
        .sort(),
    ).toEqual([
      'src/components/Button.tsx', // used by the generated 404 page
      'src/components/Container.tsx',
      'src/components/Heading.tsx',
      'src/components/Text.tsx',
    ]);
    expect(files['src/components/Heading.tsx']).toBe(
      await readFile(join(import.meta.dirname, '../../components/src/heading/view.tsx'), 'utf8'),
    );
  });

  it('emits hostile text as data, never as code or markup', async () => {
    const doc = structuredClone(await fixture('typography.json')) as Site;
    (doc.pages[0] as { title: string }).title = '"; process.exit(1); //\n</title><script>alert(1)</script>';
    const h1 = doc.nodes.nh1000001;
    if (!h1) throw new Error('fixture');
    // biome-ignore lint/suspicious/noTemplateCurlyInString: hostile input on purpose.
    h1.props = { level: 1, text: '{alert(1)} </Heading> `${x}` */' };
    const files = generatePageFiles(doc, registry, await readViews(doc));
    // The view receives the resolved props (ADR-0020): the hostile text stays a JSON string.
    expect(files['src/page/index.tsx']).toContain(
      `props={${JSON.stringify({ level: 1, runs: [{ text: h1.props.text }] })}}`,
    );
    expect(files['src/pages/index.astro']).toContain(`const title = ${JSON.stringify(doc.pages[0]?.title)};`);
    expect(String(files['src/page/index.tsx']).split('\n')[0]).toMatch(/^\/\/ .*"typography"/);
  });
});

describe('multipage export', () => {
  it('emits one route per published page, resolves page links, skips unpublished pages', async () => {
    const site = structuredClone(await fixture('elements.json'));
    const button = Object.values(site.nodes).find((n) => n.type === 'button');
    const root = site.nodes[site.pages[0]?.rootId as string];
    if (!button || !root) throw new Error('fixture');
    const page = (id: string, slug: string, publish: boolean) => {
      const rootId = `nroot${id}0`;
      site.nodes[rootId] = { ...root, id: rootId, children: [] };
      site.pages.push({ id, title: id, slug, rootId, publish });
    };
    page('team', 'agence/equipe', true);
    page('draft', 'brouillon', false);
    button.props = { ...button.props, link: { kind: 'page', pageId: 'team' } };
    const r = loadSite(site, registry);
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    const files = generatePageFiles(r.doc, registry, await readViews(r.doc));
    expect(
      Object.keys(files)
        .filter((f) => /^src\/(pages|page|styles)\//.test(f))
        .sort(),
    ).toEqual([
      'src/page/404.tsx',
      'src/page/agence/equipe.tsx',
      'src/page/index.tsx',
      'src/pages/404.astro',
      'src/pages/agence/equipe.astro',
      'src/pages/index.astro',
      'src/styles/404.css',
      'src/styles/agence/equipe.css',
      'src/styles/index.css',
    ]);
    expect(files['src/pages/agence/equipe.astro']).toContain(
      "import Page from '../../page/agence/equipe.tsx';",
    );
    expect(files['src/page/agence/equipe.tsx']).toContain("from '../../components/Container.tsx'");
    expect(files['src/page/index.tsx']).toContain('"href":"/agence/equipe/"');
    expect(files['src/pages/index.astro']).toContain('<html lang="fr">');
  });
});

describe('SEO, sitemap, robots, 404 and redirects (SB-08)', () => {
  it('emits escaped metadata, a 404 page, a sitemap of indexable pages and host redirect configurations', async () => {
    const site = structuredClone(await fixture('layouts.json')) as Site;
    site.settings.siteUrl = 'https://atelier.example';
    const contact = site.pages.find((p) => p.id === 'contact');
    if (!contact) throw new Error('fixture');
    contact.seo = { title: 'Contact "Atelier"', description: '</title><script>x</script>', image: undefined };
    const mentions = site.pages.find((p) => p.id === 'mentions');
    if (mentions) mentions.seo = { index: false };
    site.redirects = [
      { from: '/ancien-contact/', to: { kind: 'page', pageId: 'contact' }, permanent: true },
      { from: '/blog', to: { kind: 'url', href: 'https://blog.example/' }, permanent: false },
      {
        from: '/private',
        to: { kind: 'url', href: 'https://example.invalid/$http_cookie' },
        permanent: true,
      },
    ];
    const r = loadSite(site, registry);
    if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
    const files = generatePageFiles(r.doc, registry, await readViews(r.doc));
    const astro = String(files['src/pages/contact.astro']);
    expect(astro).toContain(`const title = ${JSON.stringify('Contact "Atelier"')};`);
    expect(astro).toContain(
      `<meta name="description" content={${JSON.stringify('</title><script>x</script>')}} />`,
    );
    expect(astro).toContain('<link rel="canonical" href={"https://atelier.example/contact/"} />');
    expect(String(files['src/pages/mentions-legales.astro'])).toContain('content="noindex"');
    expect(String(files['src/pages/404.astro'])).toContain('content="noindex"');
    expect(String(files['src/page/404.tsx'])).toContain('Page introuvable');
    // The 404 page follows the site language (ADR-0024).
    const english = withNotFound({ ...r.doc, settings: { ...r.doc.settings, lang: 'en' } });
    expect(JSON.stringify(english.nodes.nnotfoundh1?.props)).toContain('Page not found');
    const site_ = siteFiles(r.doc);
    expect(site_['public/sitemap.xml']).toContain('<loc>https://atelier.example/contact/</loc>');
    expect(site_['public/sitemap.xml']).not.toContain('mentions-legales');
    expect(site_['public/robots.txt']).toContain('Sitemap: https://atelier.example/sitemap.xml');
    expect(site_['redirects/_redirects']).toBe(
      '/ancien-contact/ /contact/ 301\n/blog https://blog.example/ 302\n' +
        '/private https://example.invalid/$http_cookie 301\n',
    );
    expect(site_['astro.config.mjs']).toContain('"/ancien-contact/": {');
    expect(site_['astro.config.mjs']).not.toContain('blog.example'); // external: host configurations only
    expect(site_['astro.config.mjs']).toContain('integrations: [react()],');
    expect(site_['redirects/nginx.conf']).toContain(
      'location = /private { return 301 "https://example.invalid/%24http_cookie"; }',
    );
    expect(site_['redirects/nginx.conf']).not.toContain('$http_cookie');
  });
});

describe('responsive images (ADR-0010)', () => {
  it('raster images are optimized at build through astro:assets; their view receives srcSet', async () => {
    const site = await fixture('elements.json');
    const files = generatePageFiles(site, registry, await readViews(site));
    expect(files['src/pages/index.astro']).toContain("import image0 from '../media/afixture001.png';");
    expect(files['src/pages/index.astro']).toContain('"afixture001": await responsive(image0),');
    expect(files['src/pages/index.astro']).toContain('<Page media={media} />');
    expect(files['src/page/index.tsx']).toContain('...media["afixture001"] }}');
    expect(files['src/lib/media.ts']).toContain("format: 'webp'");
    const media = await mediaFiles(site, registry, [join(import.meta.dirname, '../../../fixtures/media')]);
    expect(Object.keys(media)).toEqual(['src/media/afixture001.png']);
  });
});

describe('animations export (ADR-0012)', () => {
  it('ships the animation data and island only on animated pages, data escaped as JSON', async () => {
    const site = await fixture('animations.json');
    const files = generatePageFiles(site, registry, await readViews(site));
    const astro = String(files['src/pages/index.astro']);
    expect(astro).toContain(
      '<script type="application/json" id="ns-animations" is:inline set:html={animations}></script>',
    );
    expect(astro).toContain("import { init } from '../scripts/animate.ts';");
    expect(astro).toMatch(/const animations = ".*\\"nh1anim001\\":\[\{\\"trigger\\":\\"load\\"/);
    expect(String(files['src/scripts/animate.ts'])).toContain('export function init(');
    expect(String(files['src/pages/404.astro'])).not.toContain('animate.ts');
    const plain = await fixture('flex.json');
    expect(Object.keys(generatePageFiles(plain, registry, await readViews(plain)))).not.toContain(
      'src/scripts/animate.ts',
    );
  });
});

describe('design tokens export', () => {
  it('documents the contact forms in the README: address, fields, public hidden fields (ADR-0026)', async () => {
    const text = readme(await fixture('elements.json'));
    expect(text).toContain('## Forms');
    expect(text).toContain(
      '| https://exemple.fr/contact | `nom`, `email`, `message`, `sujet`, `consentement` | `sujet_mail` |',
    );
    expect(text).toContain('**public**');
    expect(readme(await fixture('flex.json'))).not.toContain('## Forms');
  });

  it('declares tokens as CSS variables and documents them in the README', async () => {
    const site = await fixture('tokens.json');
    const css = String(generatePageFiles(site, registry, await readViews(site))['src/styles/index.css']);
    expect(css).toContain('--ns-color-primary:#1d4ed8');
    expect(css).toMatch(/@media \(max-width:767px\)\{:root\{[^}]*--ns-text-h1-font-size:34px/);
    expect(readme(site)).toContain('| `--ns-color-primary` | Primaire |');
  });
});

describe('custom CSS export (ADR-0023)', () => {
  it('publishes the parsed project stylesheet in its layer, imports it on every page and copies its media', async () => {
    const site = await fixture('composition.json');
    const files = generatePageFiles(site, registry, await readViews(site));
    const css = String(files['src/styles/custom.css']);
    expect(css.startsWith('@layer ns-custom{')).toBe(true);
    expect(css).toContain('url("/media/afixture001.png")');
    expect(css).not.toContain('/*');
    expect(String(files['src/styles/index.css']).startsWith('@layer ns,ns-custom;@layer ns{')).toBe(true);
    expect(files['src/pages/index.astro']).toContain("import '../styles/custom.css';");
    expect(files['src/page/index.tsx']).toContain('className="ns-nstkcard01 carte-relief"');
    const media = await mediaFiles(site, registry, [join(import.meta.dirname, '../../../fixtures/media')]);
    expect(Object.keys(media)).toContain('public/media/afixture001.png');
    const plain = await fixture('flex.json');
    expect(Object.keys(generatePageFiles(plain, registry, await readViews(plain)))).not.toContain(
      'src/styles/custom.css',
    );
  });
});

describe('writeFiles / exportProject', () => {
  it('refuses paths outside the export and non-empty directories', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ns-export-'));
    try {
      await expect(writeFiles(dir, { '../evil.txt': 'x' })).rejects.toThrow(/outside/);
      await writeFiles(dir, { 'a.txt': 'x' });
      await expect(exportProject(await fixture('flex.json'), registry, dir)).rejects.toThrow(/not empty/);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('produces a complete project with lockfile and README', async () => {
    const dir = join(await mkdtemp(join(tmpdir(), 'ns-export-')), 'site');
    try {
      const files = await exportProject(await fixture('flex.json'), registry, dir);
      for (const f of ['package.json', 'package-lock.json', 'astro.config.mjs', '.gitignore', 'README.md']) {
        expect(files).toContain(f);
      }
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
