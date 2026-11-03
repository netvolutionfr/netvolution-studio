import { hrefSchema, pagePath, type Link as SiteLink, t } from '@ns/core';
import { Bold, Italic, Link, Palette, RemoveFormatting, Unlink } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { IconButton } from '../ui/index.ts';
import { useTransaction } from './fields.tsx';
import { useEditor } from './store.ts';

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

/** Page and media links live in the editable DOM as `ns-page:<id>` / `ns-asset:<id>` hrefs (inspector only). */
const PAGE_HREF = 'ns-page:';
const ASSET_HREF = 'ns-asset:';
const toHref = (link: SiteLink) =>
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

function render(el: HTMLElement, paragraphs: Inline[][], multi: boolean) {
  if (!multi) return el.replaceChildren(...renderRuns(paragraphs[0] ?? []));
  el.replaceChildren(
    ...paragraphs.map((runs) => {
      const p = document.createElement('p');
      p.append(...renderRuns(runs));
      return p;
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
function parse(el: HTMLElement, multi: boolean): Inline[][] {
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

/**
 * Rich text: bold, italic, color, links and line breaks; with `paragraphs`, several paragraphs
 * (Enter starts a new one, Shift+Enter breaks the line). Uses contentEditable + execCommand.
 * ponytail: execCommand is deprecated but universally supported; replace with a dedicated editor
 * only if richer content is required (lists or headings inside a text).
 */
export function RichTextField(props: {
  label: string;
  value: RichValue;
  paragraphs?: boolean;
  onChange: (v: Inline[] | Inline[][]) => { ok: boolean };
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const tx = useTransaction(props.label);
  const [invalid, setInvalid] = useState(false);
  const [colors, setColors] = useState(false);
  const multi = props.paragraphs === true;
  const paragraphs = toParagraphs(props.value);
  const pages = useEditor((s) => s.doc.pages);
  const palette = useEditor((s) => s.doc.tokens?.colors) ?? {};
  // The selection, kept while a color is chosen outside the editor.
  const saved = useRef<Range | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-rendered when the value changes.
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) render(ref.current, paragraphs, multi);
  }, [props.value, multi]);

  const sync = () => {
    if (!ref.current) return;
    tx.edit();
    const next = parse(ref.current, multi);
    setInvalid(!props.onChange(multi ? next : (next[0] ?? [])).ok);
  };
  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    if (saved.current) {
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(saved.current);
      saved.current = null;
    }
    document.execCommand(command, false, arg);
    sync();
  };
  const keepSelection = () => {
    const range = getSelection()?.rangeCount ? getSelection()?.getRangeAt(0) : null;
    if (range && ref.current?.contains(range.commonAncestorContainer)) saved.current = range.cloneRange();
  };
  const setColor = (color: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    exec('foreColor', color);
    setColors(false);
  };
  const link = () => {
    const href = prompt(t('richText.linkPrompt'), 'https://');
    if (href === null) return;
    // An internal path becomes a page link, which follows later slug changes.
    const page = href.startsWith('/') && pages.find((p) => [pagePath(p.slug), `/${p.slug}`].includes(href));
    if (page) return exec('createLink', toHref({ kind: 'page', pageId: page.id }));
    if (!hrefSchema.safeParse(href).success) return alert(t('richText.linkRefused'));
    exec('createLink', href);
  };

  return (
    <div className="field field-stack">
      <span id={id} className="field-label">
        {props.label}
      </span>
      <div className="rt-toolbar" role="toolbar" aria-label={t('richText.formatting')}>
        {(
          [
            ['bold', Bold, () => exec('bold'), '⌘B'],
            ['italic', Italic, () => exec('italic'), '⌘I'],
            ['color', Palette, () => setColors(!colors), undefined],
            ['link', Link, link, undefined],
            ['unlink', Unlink, () => exec('unlink'), undefined],
            ['clear', RemoveFormatting, () => exec('removeFormat'), undefined],
          ] as const
        ).map(([key, icon, action, shortcut]) => (
          <IconButton
            key={key}
            size="sm"
            label={t(`richText.${key}`)}
            icon={icon}
            aria-pressed={key === 'color' ? colors : undefined}
            {...(shortcut ? { shortcut } : {})}
            onMouseDown={(e) => {
              e.preventDefault();
              keepSelection();
            }}
            onClick={action}
          />
        ))}
      </div>
      {colors && (
        <fieldset className="rt-colors">
          <legend className="visually-hidden">{t('richText.colorLegend')}</legend>
          {Object.values(palette).map((c) => (
            <button
              key={c.label}
              type="button"
              className="rt-swatch"
              title={c.label}
              aria-label={c.label}
              style={{ backgroundColor: c.value }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setColor(c.value.slice(0, 7))}
            />
          ))}
          <label className="rt-custom">
            {t('richText.other')}
            <input type="color" onChange={(e) => setColor(e.target.value)} />
          </label>
        </fieldset>
      )}
      {/* biome-ignore lint/a11y/useSemanticElements: a contentEditable textbox has no native equivalent. */}
      <div
        ref={ref}
        role="textbox"
        tabIndex={0}
        aria-multiline={multi}
        aria-labelledby={id}
        aria-invalid={invalid}
        className="rt-editor"
        contentEditable
        suppressContentEditableWarning
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        onInput={sync}
        onBlur={() => {
          tx.end();
          setInvalid(false);
          if (ref.current) render(ref.current, toParagraphs(props.value), multi);
        }}
        onKeyDown={(e) => {
          // Enter: a new paragraph (paragraphs) or a line break (one paragraph); Shift+Enter: a line break.
          if (e.key !== 'Enter' || (multi && !e.shiftKey)) return;
          e.preventDefault();
          document.execCommand('insertLineBreak');
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand(
            'insertText',
            false,
            e.clipboardData.getData('text/plain').replace(/\s+/g, ' '),
          );
        }}
      />
      {invalid && <span className="field-error">{t('richText.invalid')}</span>}
    </div>
  );
}
