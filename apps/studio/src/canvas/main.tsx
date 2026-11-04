import { animate, canvasIslands, DocumentView, registry, replayAnimations } from '@ns/components';
import {
  animationConfig,
  type CanvasMessage,
  customCss,
  loadSite,
  MEDIA_PATH,
  pageRoots,
  type Rect,
  type ShellMessage,
  type Site,
  shellMessageSchema,
  tm,
  toCss,
} from '@ns/core';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { parse, parseItems, render, renderItems, toParagraphs } from '../rich.ts';

// Canvas runtime: renders only the page (same views and CSS as the export),
// never editor controls. Selection and hover overlays are drawn by the shell
// from the rects reported here, so this DOM stays identical to the export.
const required = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`canvas.html is missing #${id}`);
  return el;
};
const container = required('ns-root');
const style = required('ns-css');
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
    // The release of a drag is not a click (no selection, no header opening).
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    post({ type: 'pointer', kind: 'click', nodeId: nodeIdAt(e.target) });
  },
  true,
);

// ---------- Grabbing an element (lot ED-D) ----------
// Past a 4 px threshold, a press becomes a drag. The frame keeps the pointer (captured here), so it
// forwards the gesture to the shell, which runs the same drop logic as for the tree and library.
let press: { x: number; y: number; nodeId: string } | null = null;
let dragging = false;
let suppressClick = false;
const dragTo = (phase: 'start' | 'move' | 'end' | 'cancel', e: { clientX: number; clientY: number }) =>
  post({
    type: 'drag',
    phase,
    x: e.clientX,
    y: e.clientY,
    ...(phase === 'start' && press ? { nodeId: press.nodeId } : {}),
  });
const endDrag = () => {
  press = null;
  if (!dragging) return;
  dragging = false;
  suppressClick = true;
  document.documentElement.style.userSelect = '';
};
document.addEventListener('pointerdown', (e) => {
  const nodeId = nodeIdAt(e.target);
  press = e.button === 0 && !editing && nodeId ? { x: e.clientX, y: e.clientY, nodeId } : null;
  suppressClick = false;
});
document.addEventListener('pointermove', (e) => {
  if (!press || editing) return;
  if (!dragging) {
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 4) return;
    dragging = true;
    getSelection()?.removeAllRanges();
    document.documentElement.style.userSelect = 'none';
    document.documentElement.setPointerCapture(e.pointerId);
    dragTo('start', e);
  }
  dragTo('move', e);
});
document.addEventListener('pointerup', (e) => {
  if (dragging) dragTo('end', e);
  endDrag();
});
document.addEventListener('pointercancel', (e) => {
  if (dragging) dragTo('cancel', e);
  endDrag();
});
document.addEventListener('dblclick', (e) => {
  if (editing) return;
  caretAt = { x: e.clientX, y: e.clientY };
  post({ type: 'pointer', kind: 'dblclick', nodeId: editableAt(e.target) });
});
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
  if (dragging) {
    e.preventDefault();
    if (key === 'Escape') {
      dragTo('cancel', { clientX: 0, clientY: 0 });
      endDrag();
    }
    return;
  }
  if (editing) {
    // While editing, keys keep their text meaning (Delete, ⌘Z, ⌘C…); only ⌘S reaches the shell.
    if (key === 'Escape') {
      e.preventDefault();
      return endEdit(false);
    }
    // Enter validates one-block texts; in paragraphs and lists it starts the next block (native).
    if (key === 'Enter' && !e.isComposing && (editing.kind === 'plain' || editing.kind === 'rich')) {
      e.preventDefault();
      if (e.shiftKey && editing.kind === 'rich') document.execCommand('insertLineBreak');
      else endEdit(true);
      return;
    }
    // In a <summary> or a <button> (accordion and tab titles), Space would toggle or press it.
    if (key === ' ' && editing.kind === 'plain') {
      e.preventDefault();
      document.execCommand('insertText', false, ' ');
      return;
    }
    if ((key === 'b' || key === 'i') && (e.metaKey || e.ctrlKey) && editing.kind !== 'plain') {
      e.preventDefault();
      return format(key === 'b' ? 'bold' : 'italic', undefined);
    }
    if (key !== 's' || !(e.metaKey || e.ctrlKey)) return;
    endEdit(true);
  }
  // Alt+↑/↓ moves the selection (plain arrows keep scrolling the page); Enter or F2 edits its text.
  const arrow = (key === 'ArrowUp' || key === 'ArrowDown') && e.altKey;
  const edit = key === 'Enter' || key === 'F2';
  if (!arrow && !edit && (!SHORTCUTS.has(key) || (key.length === 1 && !(e.metaKey || e.ctrlKey)))) return;
  e.preventDefault();
  post({ type: 'key', key, mod: e.metaKey || e.ctrlKey, shift: e.shiftKey, alt: e.altKey });
});

addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  const message = shellMessageSchema.safeParse(event.data);
  if (!message.success) return;
  if (message.data.type === 'replay') {
    const anims = doc?.nodes[message.data.nodeId]?.animations ?? [];
    replayAnimations(container, message.data.nodeId, anims, { reduced: message.data.reduce });
  } else if (message.data.type === 'edit') startEdit(message.data.nodeId);
  else if (message.data.type === 'editEnd') endEdit(true);
  else if (message.data.type === 'scrollBy') scrollBy(0, message.data.dy);
  else if (message.data.type === 'editFormat') format(message.data.command, message.data.value);
  // During an edit, React must not overwrite the text being typed: the render waits for the end.
  else if (editing) pending = message.data;
  else renderPage(message.data);
});

function renderPage(data: Extract<ShellMessage, { type: 'render' }>) {
  const result = loadSite(data.doc, registry);
  if (!result.ok) {
    // Translated here: the canvas shares the interface language of the Studio.
    post({ type: 'error', diagnostics: result.diagnostics.map((d) => ({ ...d, message: tm(d.message) })) });
    return;
  }
  const { pageId, mediaBase } = data;
  doc = result.doc;
  // The site's language, as in the export (hyphenation, quotes): not the interface's.
  document.documentElement.lang = doc.settings.lang;
  style.textContent =
    toCss(result.doc, registry, pageRoots(result.doc, pageId), mediaBase) +
    customCss(result.doc, mediaBase ?? MEDIA_PATH);
  flushSync(() =>
    root.render(<DocumentView key={generation} site={result.doc} pageId={pageId} mediaBase={mediaBase} />),
  );
  // Same enhanced markup as the exported page (tabs), so canvas and export stay identical.
  for (const init of canvasIslands) init(container);
  // Animations only when switched on in the Studio (never on the editor's own controls).
  if (data.motion === 'on')
    animate(container, animationConfig(result.doc, pageRoots(result.doc, pageId)), { reduced: false });
  post({ type: 'rendered' });
  reportLayout();
}

// ---------- In-place text editing (ADR-0025) ----------
// The rendered element itself becomes editable, so the text keeps its real fonts and layout. Only a
// structured value goes back to the shell, and the DOM is rebuilt from the document afterwards
// (new `generation` key): no editing state survives in the canvas markup.
type EditKind = 'plain' | 'rich' | 'paragraphs' | 'items';
let editing: { id: string; el: HTMLElement; kind: EditKind } | null = null;
let pending: Extract<ShellMessage, { type: 'render' }> | null = null;
let generation = 0;
let caretAt: { x: number; y: number } | null = null;
// Selection in the edited text, restored when the shell's toolbar or link form had the focus.
let saved: Range | null = null;

// A press or focus elsewhere in the page validates. Leaving the canvas is decided by the shell,
// which sends `editEnd` unless its formatting toolbar was used: a click there takes the focus away
// from the frame even when prevented, so `blur` cannot tell the two apart.
const elsewhere = (e: Event) => {
  if (editing && !(e.target instanceof Node && editing.el.contains(e.target))) endEdit(true);
};
document.addEventListener('pointerdown', elsewhere, true);
document.addEventListener('focusin', elsewhere, true);
const onInput = () => scheduleLayout();
document.addEventListener('selectionchange', () => {
  const range = getSelection()?.rangeCount ? getSelection()?.getRangeAt(0) : null;
  if (editing && range && editing.el.contains(range.commonAncestorContainer)) saved = range.cloneRange();
});

/** Element holding the text a node edits in place, if any (`inline.selector`, ADR-0025). */
function inlineElement(id: string): HTMLElement | null {
  const node = doc?.nodes[id];
  const inline = node && registry.get(node.type)?.inline;
  if (!inline) return null;
  return container.querySelector<HTMLElement>((inline.selector ?? '.ns-{id}').replaceAll('{id}', id));
}

/** Node whose editable text holds `target`, the innermost one (a tab label is in its Tabs parent). */
function editableAt(target: EventTarget | null): string | null {
  if (!(target instanceof Node) || !doc) return null;
  let best: { id: string; el: HTMLElement } | null = null;
  for (const id of Object.keys(doc.nodes)) {
    const el = inlineElement(id);
    if (el?.contains(target) && (!best || best.el.contains(el))) best = { id, el };
  }
  return best?.id ?? null;
}

function format(command: string, value: string | undefined) {
  if (!editing || editing.kind === 'plain') return;
  editing.el.focus();
  if (saved) {
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(saved);
  }
  if (command === 'color') {
    if (!/^#[0-9a-f]{6}$/i.test(value ?? '')) return;
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, value);
  } else if (command === 'bold' || command === 'italic') {
    // Bold and italic are marks of the text, whatever the element's own style (a heading is already
    // bold): neutralized for the command, so the browser wraps or unwraps <b>/<i> instead of adding
    // `font-weight: normal` spans.
    const prop = command === 'bold' ? 'fontWeight' : 'fontStyle';
    const before = editing.el.style[prop];
    editing.el.style[prop] = 'normal';
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command);
    editing.el.style[prop] = before;
  } else if (command === 'link') {
    // Checked again by the command on commit (hrefSchema, page and media ids).
    if (value) document.execCommand('createLink', false, value);
  } else document.execCommand(command);
  scheduleLayout();
}
// Pasted or dropped content is inserted as plain text: no HTML from outside reaches the document.
const onPaste = (e: ClipboardEvent) => {
  e.preventDefault();
  document.execCommand(
    'insertText',
    false,
    (e.clipboardData?.getData('text/plain') ?? '').replace(/\s+/g, ' '),
  );
};
const onDrop = (e: DragEvent) => e.preventDefault();

function startEdit(id: string) {
  const node = doc?.nodes[id];
  const def = node && registry.get(node.type);
  const prop = def?.inline?.prop;
  const field = prop ? def.fields.find((f) => f.prop === prop) : undefined;
  const el = inlineElement(id);
  const kind: EditKind | null =
    field?.kind === 'text'
      ? 'plain'
      : field?.kind === 'richTextList'
        ? 'items'
        : field?.kind === 'richText'
          ? field.paragraphs
            ? 'paragraphs'
            : 'rich'
          : null;
  if (editing || !node || !prop || !el || !kind) {
    post({ type: 'editCancel', nodeId: id });
    return;
  }
  const value = node.props[prop];
  // Same editable DOM as the inspector (page links as `ns-page:` hrefs); one paragraph stays loose,
  // as in the rendered <p>.
  if (kind === 'items') renderItems(el, value as Parameters<typeof renderItems>[1]);
  else if (kind !== 'plain') {
    const paragraphs = toParagraphs(value as Parameters<typeof toParagraphs>[0]);
    render(el, paragraphs, kind === 'paragraphs' && paragraphs.length > 1);
  }
  editing = { id, el, kind };
  el.contentEditable = kind === 'plain' ? 'plaintext-only' : 'true';
  el.style.outline = 'none';
  el.addEventListener('input', onInput);
  el.addEventListener('paste', onPaste);
  el.addEventListener('drop', onDrop);
  el.focus();
  if (kind === 'paragraphs') document.execCommand('defaultParagraphSeparator', false, 'p');
  // Caret where the double-click happened, else at the end.
  const at = caretAt && document.caretPositionFromPoint?.(caretAt.x, caretAt.y);
  caretAt = null;
  const range = document.createRange();
  if (at && el.contains(at.offsetNode)) range.setStart(at.offsetNode, at.offset);
  else range.selectNodeContents(el);
  range.collapse(!!at && el.contains(at.offsetNode));
  getSelection()?.removeAllRanges();
  getSelection()?.addRange(range);
}

function endEdit(commit: boolean) {
  if (!editing) return;
  const { id, el, kind } = editing;
  editing = null;
  saved = null;
  generation++;
  if (commit) {
    const value =
      kind === 'plain'
        ? (el.textContent ?? '').replace(/\s+/g, ' ').trim()
        : kind === 'items'
          ? parseItems(el)
          : kind === 'paragraphs'
            ? parse(el, true)
            : (parse(el, false)[0] ?? []);
    post({ type: 'editCommit', nodeId: id, value });
  } else post({ type: 'editCancel', nodeId: id });
  // The shell answers with a render; a render received meanwhile is applied now.
  if (pending) renderPage(pending);
  pending = null;
}

post({ type: 'ready' });
