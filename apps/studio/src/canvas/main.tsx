import { animate, canvasIslands, DocumentView, registry, replayAnimations } from '@ns/components';
import {
  animationConfig,
  type CanvasMessage,
  customCss,
  loadSite,
  MEDIA_PATH,
  pageRoots,
  type Rect,
  type Site,
  shellMessageSchema,
  tm,
  toCss,
} from '@ns/core';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// Canvas runtime: renders only the page (same views and CSS as the export),
// never editor controls. Selection and hover overlays are drawn by the shell
// from the rects reported here, so this DOM stays identical to the export.
const container = document.getElementById('ns-root');
const style = document.getElementById('ns-css');
if (!container || !style) throw new Error('canvas.html is missing #ns-root or #ns-css');
const root = createRoot(container);
let doc: Site | null = null;
let hovered: string | null = null;

// ponytail: '*' because the shell origin is not configured yet; the payload is the user's own layout data.
const post = (message: CanvasMessage) => window.parent.postMessage(message, '*');

const NODE_CLASS = /^ns-(n[a-z0-9]{8,32})$/;
function nodeIdAt(target: EventTarget | null): string | null {
  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    for (const c of el.classList) {
      const id = NODE_CLASS.exec(c)?.[1];
      if (id && doc?.nodes[id]) return id;
    }
  }
  return null;
}

function reportLayout() {
  if (!doc) return;
  const rects: Record<string, Rect> = {};
  for (const id of Object.keys(doc.nodes)) {
    const r = document.querySelector(`.ns-${id}`)?.getBoundingClientRect();
    if (r) rects[id] = { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  post({ type: 'layout', rects });
}
let frame = 0;
const scheduleLayout = () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(reportLayout);
};
addEventListener('scroll', scheduleLayout, { passive: true });
new ResizeObserver(scheduleLayout).observe(document.documentElement);

// The canvas is not a browsing surface: links and other defaults are disabled.
document.addEventListener(
  'click',
  (e) => {
    e.preventDefault();
    post({ type: 'pointer', kind: 'click', nodeId: nodeIdAt(e.target) });
  },
  true,
);
const hover = (id: string | null) => {
  if (id === hovered) return;
  hovered = id;
  post({ type: 'pointer', kind: 'hover', nodeId: id });
};
document.addEventListener('mouseover', (e) => hover(nodeIdAt(e.target)));
document.documentElement.addEventListener('mouseleave', () => hover(null));

// Shortcuts are handled by the shell; forward them when focus is in the canvas.
const SHORTCUTS = new Set(['s', 'z', 'y', 'c', 'x', 'v', 'd', 'Delete', 'Backspace', 'Escape']);
addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!SHORTCUTS.has(key) || (key.length === 1 && !(e.metaKey || e.ctrlKey))) return;
  e.preventDefault();
  post({ type: 'key', key, mod: e.metaKey || e.ctrlKey, shift: e.shiftKey });
});

addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  const message = shellMessageSchema.safeParse(event.data);
  if (!message.success) return;
  if (message.data.type === 'replay') {
    const anims = doc?.nodes[message.data.nodeId]?.animations ?? [];
    replayAnimations(container, message.data.nodeId, anims, { reduced: message.data.reduce });
    return;
  }
  const result = loadSite(message.data.doc, registry);
  if (!result.ok) {
    // Translated here: the canvas shares the interface language of the Studio.
    post({ type: 'error', diagnostics: result.diagnostics.map((d) => ({ ...d, message: tm(d.message) })) });
    return;
  }
  const { pageId, mediaBase } = message.data;
  doc = result.doc;
  // The site's language, as in the export (hyphenation, quotes): not the interface's.
  document.documentElement.lang = doc.settings.lang;
  style.textContent =
    toCss(result.doc, registry, pageRoots(result.doc, pageId), mediaBase) +
    customCss(result.doc, mediaBase ?? MEDIA_PATH);
  flushSync(() => root.render(<DocumentView site={result.doc} pageId={pageId} mediaBase={mediaBase} />));
  // Same enhanced markup as the exported page (tabs), so canvas and export stay identical.
  for (const init of canvasIslands) init(container);
  // Animations only when switched on in the Studio (never on the editor's own controls).
  if (message.data.motion === 'on')
    animate(container, animationConfig(result.doc, pageRoots(result.doc, pageId)), { reduced: false });
  post({ type: 'rendered' });
  reportLayout();
});

post({ type: 'ready' });
