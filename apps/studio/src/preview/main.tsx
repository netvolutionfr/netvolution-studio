import { animate, DocumentView, islands, registry } from '@ns/components';
import { animationConfig, customCss, loadSite, pagePath, pageRoots, type Site, toCss } from '@ns/core';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// Site preview (SB-09): the site as published (same views and CSS as the export), without any
// editor tool, navigable through its internal links. URL: preview.html#/<projectId>/<page path>.
// The open editor sends its current site, saved or not, over a BroadcastChannel; without an
// editor, the saved version is read from the development API.
const host = document.getElementById('ns-root');
const css = document.getElementById('ns-css');
if (!host || !css) throw new Error('preview.html is missing #ns-root or #ns-css');
const container: HTMLElement = host;
const style: HTMLElement = css;
const root = createRoot(container);
const route = () => /^#\/(p[a-z0-9]{10})(\/.*)$/.exec(location.hash);
const projectId = route()?.[1];
let site: Site | null = null;

function render() {
  const m = route();
  // Other hashes are in-page anchors: the browser scrolls, the page stays.
  if (!m || !site) return;
  const path = decodeURI(m[2] as string);
  const page = site.pages.find((p) => pagePath(p.slug) === path);
  document.documentElement.lang = site.settings.lang;
  if (!page) {
    document.title = 'Page introuvable';
    style.textContent = '';
    root.render(
      <main>
        <h1>Page introuvable</h1>
        <p>
          <a href={`#/${projectId}/`}>Retour à l'accueil</a>
        </p>
      </main>,
    );
    return;
  }
  document.title = page.title || site.name;
  style.textContent =
    toCss(site, registry, pageRoots(site, page.id), `/media/${projectId}/`) +
    customCss(site, `/media/${projectId}/`);
  const current = site;
  flushSync(() =>
    root.render(
      <DocumentView
        site={current}
        pageId={page.id}
        mediaBase={`/media/${projectId}/`}
        basePath={`#/${projectId}`}
      />,
    ),
  );
  // The site as published: every island runs (tabs, video players on click).
  for (const init of Object.values(islands)) init(container);
  // As on the published site: entrance animations, unless the visitor prefers reduced motion.
  animate(container, animationConfig(current, pageRoots(current, page.id)));
}

const accept = (raw: unknown) => {
  const result = loadSite(raw, registry);
  if (!result.ok || result.doc.id !== projectId) return;
  site = result.doc;
  render();
};

if (!projectId) {
  root.render(<p>Aucun projet à prévisualiser.</p>);
} else {
  const channel = new BroadcastChannel('ns-preview');
  channel.onmessage = (e: MessageEvent<{ type?: string; doc?: unknown }>) => {
    if (e.data?.type === 'site') accept(e.data.doc);
  };
  channel.postMessage({ type: 'request', projectId });
  setTimeout(() => {
    if (site) return;
    fetch(`./api/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => d && accept(d))
      .catch(() => root.render(<p>Projet introuvable.</p>));
  }, 300);
  addEventListener('hashchange', () => {
    render();
    if (route()) scrollTo(0, 0);
  });
}
