import {
  animationConfig,
  contentText,
  customCss,
  fieldAssets,
  isPicture,
  linkHref,
  MEDIA_PATH,
  nodeClassName,
  type Page,
  pagePath,
  pageRoots,
  type Registry,
  type Site,
  subtree,
  toCss,
  viewProps,
} from '@ns/core';

export type Files = Record<string, string | Uint8Array>;

const VIEW_NAME = /^[A-Z][A-Za-z0-9]{0,63}$/;
/** Values are emitted as JSON inside JSX expressions: valid JS, no template or markup escaping issues. */
const js = (value: unknown) => JSON.stringify(value);

/** Path of a page's files without extension: `index` for the home page, else its slug. */
export const pageFileBase = (slug: string) => slug || 'index';

/**
 * Sources of the published pages of a site (pure): per page, an Astro route,
 * its composition in explicit JSX and its stylesheet. `readView(type)` returns
 * the source of the component's view file, copied verbatim. Expects a site
 * validated by `loadSite`.
 */
export function generatePageFiles(
  site: Site,
  registry: Registry,
  readView: (type: string, file?: 'view.tsx' | 'island.ts') => string,
): Files {
  const files: Files = {};
  const usedTypes = new Map<string, string>();
  site = withNotFound(site);
  for (const page of site.pages.filter((p) => p.publish)) {
    const ctx = { site, pageId: page.id };
    const used = new Set<string>();
    /** Interactive components of the page: their island is loaded by this page only. */
    const islands = new Set<string>();
    /** Raster images of the page, optimized at build time by astro:assets (ADR-0010). */
    const images = new Set<string>();
    const emit = (id: string, depth: number): string => {
      const node = site.nodes[id];
      const def = node && registry.get(node.type);
      if (!node || !def) throw new Error(`Invalid site: node ${id}`);
      if (!VIEW_NAME.test(def.viewName)) throw new Error(`Invalid view name: ${def.viewName}`);
      used.add(def.viewName);
      if (def.island) islands.add(node.type);
      usedTypes.set(def.viewName, node.type);
      const pad = '  '.repeat(depth);
      const raster = def.fields
        .map((f) => (f.kind === 'asset' ? node.props[f.prop] : undefined))
        .find((id): id is string => typeof id === 'string' && site.assets[id]?.kind === 'image');
      if (raster) images.add(raster);
      // Media lists (gallery): each raster item gets its variants; the view prop has the field's
      // name and its items carry their media id as `asset`.
      const list = def.fields.find((f) => f.kind === 'assets');
      const listRasters = list
        ? fieldAssets(def, node.props)
            .map((r) => r.id)
            .filter((id) => site.assets[id]?.kind === 'image')
        : [];
      for (const id of listRasters) images.add(id);
      const props = js(viewProps(ctx, node, registry));
      const value = raster
        ? `{ ...${props}, ...media[${js(raster)}] }`
        : list && listRasters.length
          ? `((p) => ({ ...p, ${list.prop}: p.${list.prop}.map((im) => (media[im.asset] ? { ...im, ...media[im.asset], full: media[im.asset].src } : im)) }))(${props})`
          : props;
      const open = `<${def.viewName} className=${js(nodeClassName(node))} props={${value}}`;
      if (!node.children.length) return `${pad}${open} />`;
      const children = node.children.map((c) => emit(c, depth + 1)).join('\n');
      return `${pad}${open}>\n${children}\n${pad}</${def.viewName}>`;
    };
    const roots = pageRoots(site, page.id);
    const body = roots.map((r) => emit(r, roots.length > 1 ? 3 : 2)).join('\n');
    const base = pageFileBase(page.slug);
    // src/pages/a/b.astro and src/page/a/b.tsx are as deep as the slug.
    const up = '../'.repeat(page.slug ? page.slug.split('/').length : 1);
    const title = page.seo?.title || page.title || site.name;

    const imageIds = [...images].sort();
    // Entrance animations: JSON data for the animation island (`<` escaped: never closes the script).
    const animations = animationConfig(site, roots);
    const animated = Object.keys(animations).length > 0;
    const animationJson = JSON.stringify(animations).replace(/</g, '\\u003c');
    const imports = imageIds.map((id, i) => `import image${i} from '${up}media/${site.assets[id]?.file}';`);
    files[`src/pages/${base}.astro`] = [
      '---',
      `import Page from '${up}page/${base}.tsx';`,
      `import '${up}styles/${base}.css';`,
      ...(site.customCss ? [`import '${up}styles/custom.css';`] : []),
      ...(imageIds.length ? [`import { responsive } from '${up}lib/media.ts';`, ...imports] : []),
      '',
      `const title = ${js(title)};`,
      ...(animated ? [`const animations = ${js(animationJson)};`] : []),
      ...(imageIds.length
        ? [
            '// WebP variants and srcset of the raster images, generated at build time.',
            'const media = {',
            ...imageIds.map((id, i) => `  ${js(id)}: await responsive(image${i}),`),
            '};',
          ]
        : []),
      '---',
      '<!doctype html>',
      `<html lang=${js(site.settings.lang)}>`,
      '  <head>',
      '    <meta charset="utf-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
      '    <title>{title}</title>',
      ...headTags(site, page, title),
      '  </head>',
      '  <body>',
      `    <div id="ns-root"><Page${imageIds.length ? ' media={media}' : ''} /></div>`,
      ...(animated
        ? [
            '    <script type="application/json" id="ns-animations" is:inline set:html={animations}></script>',
            '    <script>',
            `      import { init } from '${up}scripts/animate.ts';`,
            '      init();',
            '    </script>',
          ]
        : []),
      ...[...islands]
        .sort()
        .flatMap((type) => [
          '    <script>',
          `      import { init } from '${up}scripts/${type}.ts';`,
          '      init();',
          '    </script>',
        ]),
      '  </body>',
      '</html>',
      '',
    ].join('\n');
    files[`src/page/${base}.tsx`] = [
      `// Generated by Netvolution Studio from page ${js(page.id)} of site ${js(site.id)} (schemaVersion ${site.schemaVersion}).`,
      `// The ns-<id> classes match the rules of src/styles/${base}.css.`,
      ...[...used].sort().map((n) => `import ${n} from '${up}components/${n}.tsx';`),
      '',
      imageIds.length
        ? 'export default function Page({ media }: { media: Record<string, { src: string; srcSet: string; sizes: string }> }) {'
        : 'export default function Page() {',
      '  return (',
      roots.length > 1 ? `    <>\n${body}\n    </>` : body,
      '  );',
      '}',
      '',
    ].join('\n');
    files[`src/styles/${base}.css`] = `${toCss(site, registry, roots).replaceAll('}', '}\n')}`;
  }
  // Project stylesheet (ADR-0023): the parser's output, in its cascade layer above the generated styles.
  const custom = customCss(site, MEDIA_PATH);
  if (custom) files['src/styles/custom.css'] = `${custom.replaceAll('}', '}\n')}`;
  if (Object.values(files).some((f) => typeof f === 'string' && f.includes('scripts/animate.ts'))) {
    files['src/scripts/animate.ts'] = readView('animations', 'island.ts');
  }
  for (const [name, type] of usedTypes) {
    files[`src/components/${name}.tsx`] = readView(type);
    if (registry.get(type)?.island) files[`src/scripts/${type}.ts`] = readView(type, 'island.ts');
  }
  if (Object.values(files).some((f) => typeof f === 'string' && f.includes('lib/media.ts'))) {
    files['src/lib/media.ts'] = RESPONSIVE;
  }
  return files;
}

/** Id of the generated error page (`src/pages/404.astro`), never part of the site model. */
export const NOT_FOUND_ID = 'ns-404';

/**
 * The site plus its 404 page (SB-08): the shared header and footer around a message and a link to
 * the home page, shaped like the home page's root, in the site language. Not indexed, not in the sitemap.
 */
export function withNotFound(site: Site): Site {
  const text = contentText(site.settings.lang);
  const home = site.pages.find((p) => p.id === site.settings.homePageId);
  const root = home && site.nodes[home.rootId];
  const node = (id: string, type: string, props: Record<string, unknown>, children: string[] = []) => ({
    id,
    type,
    props: props as never,
    style: {},
    children,
  });
  return {
    ...site,
    pages: [
      ...site.pages,
      {
        id: NOT_FOUND_ID,
        title: text('content.notFound.title'),
        slug: '404',
        rootId: 'nnotfound00',
        publish: true,
        seo: { index: false },
      },
    ],
    nodes: {
      ...site.nodes,
      nnotfound00: {
        ...node('nnotfound00', root?.type ?? 'container', root?.props ?? { tag: 'main' }, [
          'nnotfoundh1',
          'nnotfoundtx',
          'nnotfoundbt',
        ]),
        style: root?.style ?? {},
      },
      nnotfoundh1: node('nnotfoundh1', 'heading', { level: 1, text: text('content.notFound.title') }),
      nnotfoundtx: node('nnotfoundtx', 'text', {
        content: [{ text: text('content.notFound.text') }],
      }),
      nnotfoundbt: node('nnotfoundbt', 'button', {
        label: text('content.notFound.home'),
        link: { kind: 'page', pageId: site.settings.homePageId },
        variant: 'primary',
      }),
    },
  };
}

/** SEO and sharing metadata of a page (SB-08); values go through JSON in Astro expressions, never raw. */
function headTags(site: Site, page: Page, title: string): string[] {
  const seo = page.seo ?? {};
  const origin = site.settings.siteUrl;
  const url = origin && page.id !== NOT_FOUND_ID ? `${origin}${pagePath(page.slug)}` : undefined;
  const canonical = seo.canonical || url;
  const image = seo.image ? site.assets[seo.image] : undefined;
  const tag = (html: string, value: string | undefined) =>
    value ? [`    ${html.replace('$', `{${js(value)}}`)}`] : [];
  return [
    ...tag('<meta name="description" content=$ />', seo.description),
    ...tag('<link rel="canonical" href=$ />', canonical),
    ...(seo.index === false ? ['    <meta name="robots" content="noindex" />'] : []),
    '    <meta property="og:type" content="website" />',
    ...tag('<meta property="og:title" content=$ />', title),
    ...tag('<meta property="og:description" content=$ />', seo.description),
    ...tag('<meta property="og:url" content=$ />', url),
    ...tag('<meta property="og:site_name" content=$ />', site.name),
    // Open Graph needs absolute URLs: the sharing image is only declared with the site's origin.
    ...tag(
      '<meta property="og:image" content=$ />',
      image && origin ? `${origin}/media/${image.file}` : undefined,
    ),
  ];
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Site-level files (SB-08, SB-10, SB-12): sitemap and robots.txt, redirects (Astro configuration and
 * documented host configurations), media inventory.
 */
export function siteFiles(site: Site): Files {
  const origin = site.settings.siteUrl;
  const indexed = site.pages.filter((p) => p.publish && p.seo?.index !== false);
  const redirects = (site.redirects ?? []).map((r) => ({
    from: r.from,
    to: linkHref(r.to, site),
    status: r.permanent ? 301 : 302,
  }));
  const internal = redirects.filter((r) => r.to.startsWith('/'));
  const files: Files = {
    'public/robots.txt': `User-agent: *\nAllow: /\n${origin ? `\nSitemap: ${origin}/sitemap.xml\n` : ''}`,
    'astro.config.mjs': [
      "import react from '@astrojs/react';",
      "import { defineConfig } from 'astro/config';",
      '',
      '// React components are rendered at build time only (no client: directive), so no JavaScript is shipped.',
      '// CSS is published as generated (already compact): minifying could rewrite values the Studio shows (fidelity).',
      ...(internal.length
        ? [
            '// Internal redirects: static builds get a page that redirects (meta refresh); see redirects/README.md.',
          ]
        : []),
      `export default defineConfig(${JSON.stringify(
        {
          ...(origin && { site: origin }),
          vite: { build: { cssMinify: false } },
          ...(internal.length && {
            redirects: Object.fromEntries(
              internal.map((r) => [r.from, { status: r.status, destination: r.to }]),
            ),
          }),
        },
        null,
        2,
      ).replace(/^\{/, '{\n  integrations: [react()],')});`,
      '',
    ].join('\n'),
  };
  if (origin) {
    files['public/sitemap.xml'] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...indexed.map((p) => `  <url><loc>${xml(`${origin}${pagePath(p.slug)}`)}</loc></url>`),
      '</urlset>',
      '',
    ].join('\n');
  }
  if (redirects.length) {
    files['redirects/_redirects'] = `${redirects.map((r) => `${r.from} ${r.to} ${r.status}`).join('\n')}\n`;
    files['redirects/nginx.conf'] = `${redirects
      .map((r) => `location = ${r.from} { return ${r.status} ${r.to}; }`)
      .join('\n')}\n`;
    files['redirects/.htaccess'] =
      `${redirects.map((r) => `Redirect ${r.status} ${r.from} ${r.to}`).join('\n')}\n`;
    files['redirects/README.md'] = [
      '# Redirects',
      '',
      'A static site cannot enforce an HTTP redirect on its own: it depends on the server or the host.',
      '',
      '- `_redirects`: Netlify, Cloudflare Pages (copy into `dist/` after the build).',
      '- `nginx.conf`: directives to include in the `server` block.',
      '- `.htaccess`: Apache (`mod_alias`), to copy into `dist/`.',
      '',
      'Internal redirects are also declared in `astro.config.mjs`: for each one, the build produces a page',
      'that redirects the browser (`meta refresh`), useful when the server cannot be configured.',
      '',
      '| From | To | Status |',
      '|---|---|---|',
      ...redirects.map((r) => `| \`${r.from}\` | \`${r.to}\` | ${r.status} |`),
      '',
    ].join('\n');
  }
  const media = Object.values(site.assets);
  files['MEDIA.md'] = [
    '# Media inventory',
    '',
    media.length
      ? 'Originals in `src/media/` (images optimized at build time) or `public/media/` (SVG, files, fonts, sharing images).'
      : 'No media.',
    '',
    ...(media.length
      ? [
          '| File | Type | Name | Default alternative text, or font and license | Dimensions or size |',
          '|---|---|---|---|---|',
          ...media.map((a) => {
            const cell = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');
            const about =
              a.kind === 'font'
                ? `${a.family} ${a.weight.min === a.weight.max ? a.weight.min : `${a.weight.min}–${a.weight.max}`} ${a.style}${a.license ? ` — ${a.license}` : ''}`
                : isPicture(a)
                  ? (a.alt ?? '')
                  : '—';
            const size = isPicture(a) ? `${a.width}×${a.height}` : `${a.size} bytes`;
            return `| \`${a.file}\` | ${a.kind} | ${cell(a.name ?? '')} | ${cell(about)} | ${size} |`;
          }),
        ]
      : []),
    '',
  ].join('\n');
  return files;
}

/** Copied into exports using raster images: responsive WebP variants through astro:assets. */
const RESPONSIVE = `import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

/** Width-based WebP variants of a raster image, generated at build time; the original stays in src/media/. */
export async function responsive(src: ImageMetadata) {
  const widths = [...new Set([480, 960, 1600, src.width])].filter((w) => w <= src.width);
  const sizes = \`(max-width: \${src.width}px) 100vw, \${src.width}px\`;
  const image = await getImage({ src, widths, sizes, format: 'webp' });
  return { src: image.src, srcSet: image.srcSet.attribute, sizes };
}
`;

export const readme = (site: Site) => `# ${site.name || site.id}

Static site generated by Netvolution Studio. A standard [Astro](https://astro.build) project, with no dependency on the Studio.

## Requirements

Node.js 22.12 or later.

## Commands

\`\`\`sh
npm ci            # installs the exact versions of package-lock.json (do not use --omit=optional)
npm run build     # builds the static site into dist/
npm run preview   # serves dist/ locally
\`\`\`

## Deployment

Copy the content of \`dist/\` to any static web server (Apache, nginx, Netlify, Cloudflare Pages, GitHub Pages…).
Only the pages with an interactive component load a small script; the rest is HTML and CSS.

- \`public/robots.txt\` and \`public/sitemap.xml\` (when the site URL is set) are copied to the root of \`dist/\`.
- \`dist/404.html\` is the error page: declare it to the server (\`ErrorDocument 404 /404.html\` for Apache,
  \`error_page 404 /404.html;\` for nginx; automatic on Netlify and Cloudflare Pages).
- Redirects: see \`redirects/README.md\` if it exists.
- \`MEDIA.md\` lists the media of the site.

## Structure

Each page has three files with the same name (\`index\` for the home page, else the page address):

- \`src/pages/<page>.astro\`: the route and the HTML document.
- \`src/page/<page>.tsx\`: the composition of the page (components and properties).
- \`src/styles/<page>.css\`: its styles; the \`ns-<id>\` classes target each element, the \`max-width\` media queries hold the responsive variants. They are in the \`ns\` CSS layer.

Shared by all pages:

- \`src/components/\`: the components, rendered to HTML at build time (React is not sent to the browser).
- \`src/scripts/\`: the JavaScript islands of the interactive components (tabs, video…) and of the entrance animations (\`animate.ts\`, Web Animations API), loaded only by the pages that use them; without JavaScript or with reduced motion, the content stays visible and still.
- \`src/styles/custom.css\` (if it exists): the project stylesheet, written in the Studio, in the \`ns-custom\` CSS layer, which wins over the generated styles; it targets the custom classes of the elements.
- \`src/media/\`: the original images, optimized at build time by \`astro:assets\` (WebP variants of 480, 960 and 1600 px, \`srcset\`) through \`src/lib/media.ts\`.
- \`public/media/\`: the SVG and downloadable files, copied as they are.

## Pages

${site.pages
  .filter((p) => p.publish)
  .map((p) => `- \`/${p.slug}\`: ${p.title || '(untitled)'}`)
  .join('\n')}
${formsDoc(site)}${tokensDoc(site)}`;

/** Contact forms (ADR-0026): where they send, and how to change it without the Studio. */
function formsDoc(site: Site) {
  const forms = site.pages
    .filter((p) => p.publish)
    .flatMap((page) =>
      pageRoots(site, page.id)
        .flatMap((r) => subtree(site, r))
        .flatMap((id) => {
          const node = site.nodes[id];
          if (node?.type !== 'form') return [];
          const fields = subtree(site, id).flatMap((f) =>
            site.nodes[f]?.type === 'form-field' ? [`\`${String(site.nodes[f]?.props.name)}\``] : [],
          );
          const hidden = (node.props.hidden as { name: string }[]).map((h) => `\`${h.name}\``);
          return [
            `| \`/${page.slug}\` | ${String(node.props.action) || '(not set)'} | ${fields.join(', ')} | ${hidden.join(', ') || '—'} |`,
          ];
        }),
    );
  if (!forms.length) return '';
  return `
## Forms

Forms are standard HTML \`<form method="post">\` elements, without JavaScript: the browser checks the fields, then
sends the data to the **sending address**, which does the rest (email, storage, spam protection). The site itself
sends no email. The address comes from a form service, for example:

- [Formspree](https://formspree.io): \`https://formspree.io/f/<id>\`;
- [Web3Forms](https://web3forms.com): \`https://api.web3forms.com/submit\`, with an \`access_key\` hidden field;

or from a script of the host or the agency. To change it without the Studio: \`action\` prop of the \`Form\` component
in \`src/page/<page>.tsx\`, then \`npm run build\`.

The address and the hidden fields are **public** (in the HTML of the pages): never put a secret there. The choice of
the service determines how personal data is processed (GDPR: processor, data location).

| Page | Sending address | Fields | Hidden fields |
|---|---|---|---|
${forms.join('\n')}
`;
}

/** Design tokens are CSS custom properties declared in each page's stylesheet (\`:root\`). */
function tokensDoc(site: Site) {
  const t = site.tokens;
  if (!t) return '';
  const cell = (label: string) => label.replaceAll('|', '\\|');
  const rows = [
    ...Object.entries(t.colors).map(([id, c]) => `| \`--ns-color-${id}\` | ${cell(c.label)} |`),
    ...Object.entries(t.sizes).map(([id, c]) => `| \`--ns-size-${id}\` | ${cell(c.label)} |`),
    ...Object.entries(t.fonts).map(([id, c]) => `| \`--ns-font-${id}\` | ${cell(c.label)} |`),
    ...Object.entries(t.textStyles).map(
      ([id, c]) => `| \`--ns-text-${id}-*\` | ${cell(c.label)} (text style) |`,
    ),
  ];
  if (!rows.length) return '';
  return `
## Design tokens

CSS variables declared in \`:root\` at the top of each stylesheet of \`src/styles/\` (redefined in the media queries for
responsive values). Changing a variable changes every element that references it.

| Variable | Name |
|---|---|
${rows.join('\n')}
`;
}
