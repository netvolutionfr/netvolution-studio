import {
  animationConfig,
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
      `// Généré par Netvolution Studio depuis la page ${js(page.id)} du site ${js(site.id)} (schemaVersion ${site.schemaVersion}).`,
      `// Les classes ns-<id> correspondent aux règles de src/styles/${base}.css.`,
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
 * the home page, shaped like the home page's root. Not indexed, not in the sitemap.
 */
export function withNotFound(site: Site): Site {
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
        title: 'Page introuvable',
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
      nnotfoundh1: node('nnotfoundh1', 'heading', { level: 1, text: 'Page introuvable' }),
      nnotfoundtx: node('nnotfoundtx', 'text', {
        content: [{ text: 'La page demandée n’existe pas ou a été déplacée.' }],
      }),
      nnotfoundbt: node('nnotfoundbt', 'button', {
        label: 'Retour à l’accueil',
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
      '# Redirections',
      '',
      'Un site statique ne peut pas imposer seul une redirection HTTP : elle dépend du serveur ou de l’hébergeur.',
      '',
      '- `_redirects` : Netlify, Cloudflare Pages (copier dans `dist/` après le build).',
      '- `nginx.conf` : directives à inclure dans le bloc `server`.',
      '- `.htaccess` : Apache (`mod_alias`), à copier dans `dist/`.',
      '',
      'Les redirections internes sont aussi déclarées dans `astro.config.mjs` : le build produit pour chacune une page',
      'qui redirige le navigateur (`meta refresh`), utile si le serveur ne peut pas être configuré.',
      '',
      '| Depuis | Vers | Code |',
      '|---|---|---|',
      ...redirects.map((r) => `| \`${r.from}\` | \`${r.to}\` | ${r.status} |`),
      '',
    ].join('\n');
  }
  const media = Object.values(site.assets);
  files['MEDIA.md'] = [
    '# Inventaire des médias',
    '',
    media.length
      ? 'Originaux dans `src/media/` (images optimisées au build) ou `public/media/` (SVG, fichiers, polices, images de partage).'
      : 'Aucun média.',
    '',
    ...(media.length
      ? [
          '| Fichier | Type | Nom | Texte alternatif par défaut, ou police et licence | Dimensions ou taille |',
          '|---|---|---|---|---|',
          ...media.map((a) => {
            const cell = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');
            const about =
              a.kind === 'font'
                ? `${a.family} ${a.weight.min === a.weight.max ? a.weight.min : `${a.weight.min}–${a.weight.max}`} ${a.style}${a.license ? ` — ${a.license}` : ''}`
                : isPicture(a)
                  ? (a.alt ?? '')
                  : '—';
            const size = isPicture(a) ? `${a.width}×${a.height}` : `${a.size} octets`;
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

Site statique généré par Netvolution Studio. Projet [Astro](https://astro.build) standard, sans dépendance au Studio.

## Prérequis

Node.js 22.12 ou plus récent.

## Commandes

\`\`\`sh
npm ci            # installe les versions exactes du package-lock.json (ne pas utiliser --omit=optional)
npm run build     # génère le site statique dans dist/
npm run preview   # sert dist/ localement
\`\`\`

## Déploiement

Copier le contenu de \`dist/\` sur n'importe quel serveur web statique (Apache, nginx, Netlify, Cloudflare Pages,
GitHub Pages…). Seules les pages avec un composant interactif chargent un petit script ; le reste est du HTML et du CSS.

- \`public/robots.txt\` et \`public/sitemap.xml\` (si l'URL du site est définie) sont copiés à la racine de \`dist/\`.
- \`dist/404.html\` est la page d'erreur : la déclarer au serveur (\`ErrorDocument 404 /404.html\` pour Apache,
  \`error_page 404 /404.html;\` pour nginx ; automatique sur Netlify et Cloudflare Pages).
- Redirections : voir \`redirects/README.md\` s'il existe.
- \`MEDIA.md\` inventorie les médias du site.

## Structure

Chaque page a trois fichiers de même nom (\`index\` pour l'accueil, sinon l'adresse de la page) :

- \`src/pages/<page>.astro\` : la route et le document HTML.
- \`src/page/<page>.tsx\` : la composition de la page (composants et propriétés).
- \`src/styles/<page>.css\` : ses styles ; les classes \`ns-<id>\` désignent chaque élément, les media queries \`max-width\` portent les variantes responsive. Ils sont dans la couche CSS \`ns\`.

Communs à toutes les pages :

- \`src/components/\` : les composants, rendus en HTML au moment du build (React n'est pas envoyé au navigateur).
- \`src/scripts/\` : les îlots JavaScript des composants interactifs (onglets, vidéo) et des animations d'entrée (\`animate.ts\`, Web Animations API), chargés seulement par les pages qui les utilisent ; sans JavaScript ou en « mouvement réduit », le contenu reste visible et immobile.
- \`src/styles/custom.css\` (s'il existe) : la feuille de style du projet, écrite dans le Studio, dans la couche CSS \`ns-custom\`, qui l'emporte sur les styles générés ; elle vise les classes personnalisées des éléments.
- \`src/media/\` : les images originales, optimisées au build par \`astro:assets\` (variantes WebP 480, 960 et 1600 px, \`srcset\`) via \`src/lib/media.ts\`.
- \`public/media/\` : les SVG et les fichiers téléchargeables, copiés tels quels.

## Pages

${site.pages
  .filter((p) => p.publish)
  .map((p) => `- \`/${p.slug}\` : ${p.title || '(sans titre)'}`)
  .join('\n')}
${tokensDoc(site)}`;

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
      ([id, c]) => `| \`--ns-text-${id}-*\` | ${cell(c.label)} (style de texte) |`,
    ),
  ];
  if (!rows.length) return '';
  return `
## Design tokens

Variables CSS déclarées dans \`:root\` en tête de chaque feuille de \`src/styles/\` (redéfinies dans les media queries pour
les valeurs responsive). Modifier une variable change tous les éléments qui la référencent.

| Variable | Nom |
|---|---|
${rows.join('\n')}
`;
}
