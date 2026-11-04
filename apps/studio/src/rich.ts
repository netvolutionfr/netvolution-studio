import type { Link as SiteLink } from '@ns/core';

// Rich text ↔ editable DOM (ADR-0020), shared by the inspector field and in-place editing in the
// canvas (ADR-0025), so both write the same value.

export type Inline = { text: string; bold?: boolean; italic?: boolean; color?: string; link?: SiteLink };
/** What a rich text prop may hold: plain text (headings), one paragraph, or several (ADR-0020). */
export type RichValue = string | Inline[] | Inline[][];

export const toParagraphs = (value: RichValue | undefined): Inline[][] =>
  typeof value === 'string'
    ? [[{ text: value }]]
    : !value?.length
      ? [[]]
      : Array.isArray(value[0])
        ? (value as Inline[][])
        : [value as Inline[]];

/** Page and media links live in the editable DOM as `ns-page:<id>` / `ns-asset:<id>` hrefs (never published). */
const PAGE_HREF = 'ns-page:';
const ASSET_HREF = 'ns-asset:';
export const toHref = (link: SiteLink) =>
  link.kind === 'url'
    ? link.href
    : link.kind === 'page'
      ? `${PAGE_HREF}${link.pageId}`
      : `${ASSET_HREF}${link.assetId}`;
const fromHref = (href: string): SiteLink =>
  href.startsWith(PAGE_HREF)
    ? { kind: 'page', pageId: href.slice(PAGE_HREF.length) }
    : href.startsWith(ASSET_HREF)
      ? { kind: 'asset', assetId: href.slice(ASSET_HREF.length) }
      : { kind: 'url', href };

/** `rgb(…)` (what the browser writes) or `#rgb` → `#rrggbb`; null when not a plain color. */
function toHex(css: string): string | null {
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/.exec(css.trim());
  if (rgb) {
    const hex = [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
    const alpha =
      rgb[4] === undefined
        ? ''
        : Math.round(Number(rgb[4]) * 255)
            .toString(16)
            .padStart(2, '0');
    return `#${hex}${alpha === 'ff' ? '' : alpha}`;
  }
  return /^#[0-9a-f]{6}$/i.test(css.trim()) ? css.trim().toLowerCase() : null;
}

/** Builds the editable DOM of one paragraph's runs, without innerHTML. */
function renderRuns(runs: Inline[]): Node[] {
  return runs.map((run) => {
    // Line breaks (`\n`) become <br> elements.
    let node: Node = document.createDocumentFragment();
    run.text.split('\n').forEach((line, i) => {
      if (i > 0) node.appendChild(document.createElement('br'));
      if (line) node.appendChild(document.createTextNode(line));
    });
    for (const [on, tag] of [
      [run.bold, 'strong'],
      [run.italic, 'em'],
    ] as const) {
      if (!on) continue;
      const wrap = document.createElement(tag);
      wrap.append(node);
      node = wrap;
    }
    if (run.color) {
      const span = document.createElement('span');
      span.style.color = run.color;
      span.append(node);
      node = span;
    }
    if (run.link) {
      const a = document.createElement('a');
      a.setAttribute('href', toHref(run.link));
      a.append(node);
      node = a;
    }
    return node;
  });
}

export function render(el: HTMLElement, paragraphs: Inline[][], multi: boolean) {
  if (!multi) return el.replaceChildren(...renderRuns(paragraphs[0] ?? []));
  el.replaceChildren(
    ...paragraphs.map((runs) => {
      const p = document.createElement('p');
      p.append(...renderRuns(runs));
      return p;
    }),
  );
}

/** List items as <li> elements (in-place editing of a List). */
export function renderItems(el: HTMLElement, items: Inline[][]) {
  el.replaceChildren(
    ...items.map((runs) => {
      const li = document.createElement('li');
      li.append(...renderRuns(runs));
      return li;
    }),
  );
}

const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE']);

/** Whitelist parser: text, line breaks, bold, italic, color and links; anything else is flattened to text. */
function parseRuns(nodes: Iterable<Node>): Inline[] {
  const runs: Inline[] = [];
  const walk = (node: Node, marks: Omit<Inline, 'text'>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!text) return;
      const last = runs.at(-1);
      const same =
        last &&
        last.bold === marks.bold &&
        last.italic === marks.italic &&
        last.color === marks.color &&
        JSON.stringify(last.link) === JSON.stringify(marks.link);
      if (same) last.text += text;
      else runs.push({ text, ...marks });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (tag === 'BR') return walk(document.createTextNode('\n'), marks);
    const next = { ...marks };
    if (tag === 'B' || tag === 'STRONG') next.bold = true;
    if (tag === 'I' || tag === 'EM') next.italic = true;
    if (tag === 'A' && node.getAttribute('href')) next.link = fromHref(node.getAttribute('href') as string);
    const color = toHex(node.style.color || (tag === 'FONT' ? (node.getAttribute('color') ?? '') : ''));
    if (color) next.color = color;
    for (const child of node.childNodes) walk(child, next);
  };
  for (const node of nodes) walk(node, {});
  return runs
    .map(
      (r) =>
        Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== false)) as Inline,
    )
    .filter((r) => r.text.replace(/\n/g, ''));
}

/** Paragraphs from the editable DOM: each block element is one; loose inline content forms one. */
export function parse(el: HTMLElement, multi: boolean): Inline[][] {
  if (!multi) return [parseRuns(el.childNodes)];
  const paragraphs: Inline[][] = [];
  let loose: Node[] = [];
  const flush = () => {
    if (loose.length) paragraphs.push(parseRuns(loose));
    loose = [];
  };
  for (const node of el.childNodes) {
    if (node instanceof HTMLElement && BLOCKS.has(node.tagName)) {
      flush();
      paragraphs.push(parseRuns(node.childNodes));
    } else loose.push(node);
  }
  flush();
  return paragraphs.filter((runs) => runs.length);
}

/** Items of an edited list: one per <li>, empty ones dropped. */
export const parseItems = (el: HTMLElement): Inline[][] =>
  [...el.children]
    .filter((child) => child.tagName === 'LI')
    .map((li) => parseRuns(li.childNodes))
    .filter((runs) => runs.length);
