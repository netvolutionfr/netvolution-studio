import { hrefSchema, pagePath, type Link as SiteLink, t } from '@ns/core';
import { Bold, Italic, Link, Palette, RemoveFormatting, Unlink } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import { toHref } from '../rich.ts';
import { Button, IconButton } from '../ui/index.ts';
import { useEditor } from './store.ts';

/** A formatting action on the selected text; `link` carries the editable-DOM href (see rich.ts). */
export type FormatAction =
  | { command: 'bold' | 'italic' | 'unlink' | 'removeFormat' }
  | { command: 'color' | 'link'; value: string };

/**
 * Rich text formatting buttons, with the color choices and the link form. Shared by the inspector
 * field and the floating toolbar of in-place editing (ADR-0025). Buttons never take the focus, so
 * the text selection stays where it is; `onKeep` runs first, to save it when it may move.
 */
export function FormatToolbar(props: { onFormat: (action: FormatAction) => void; onKeep?: () => void }) {
  const [panel, setPanel] = useState<'color' | 'link' | null>(null);
  const palette = useEditor((s) => s.doc.tokens?.colors) ?? {};
  const act = (action: FormatAction) => {
    setPanel(null);
    props.onFormat(action);
  };
  return (
    <>
      <div className="rt-toolbar" role="toolbar" aria-label={t('richText.formatting')}>
        {(
          [
            ['bold', Bold, () => act({ command: 'bold' }), '⌘B'],
            ['italic', Italic, () => act({ command: 'italic' }), '⌘I'],
            ['color', Palette, () => setPanel(panel === 'color' ? null : 'color'), undefined],
            ['link', Link, () => setPanel(panel === 'link' ? null : 'link'), undefined],
            ['unlink', Unlink, () => act({ command: 'unlink' }), undefined],
            ['clear', RemoveFormatting, () => act({ command: 'removeFormat' }), undefined],
          ] as const
        ).map(([key, icon, action, shortcut]) => (
          <IconButton
            key={key}
            size="sm"
            label={t(`richText.${key}`)}
            icon={icon}
            aria-pressed={key === 'color' ? panel === 'color' : key === 'link' ? panel === 'link' : undefined}
            {...(shortcut ? { shortcut } : {})}
            onMouseDown={(e) => {
              e.preventDefault();
              props.onKeep?.();
            }}
            onClick={action}
          />
        ))}
      </div>
      {panel === 'color' && (
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
              onClick={() => act({ command: 'color', value: c.value.slice(0, 7) })}
            />
          ))}
          <label className="rt-custom">
            {t('richText.other')}
            <input type="color" onChange={(e) => act({ command: 'color', value: e.target.value })} />
          </label>
        </fieldset>
      )}
      {panel === 'link' && (
        <LinkForm
          onSubmit={(link) => act({ command: 'link', value: toHref(link) })}
          onCancel={() => setPanel(null)}
        />
      )}
    </>
  );
}

/** Link target: a page or a file of the site, or a checked address. */
function LinkForm(props: { onSubmit: (link: SiteLink) => void; onCancel: () => void }) {
  const id = useId();
  const pages = useEditor((s) => s.doc.pages);
  const files = Object.values(useEditor((s) => s.doc.assets)).filter((a) => a.kind === 'file');
  // '' = an address, else a page id or `asset:<id>` (page ids never contain ':').
  const [target, setTarget] = useState('');
  const [href, setHref] = useState('https://');
  const [error, setError] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (target) {
      return props.onSubmit(
        target.startsWith('asset:')
          ? { kind: 'asset', assetId: target.slice(6) }
          : { kind: 'page', pageId: target },
      );
    }
    // An internal path becomes a page link, which follows later slug changes.
    const page = href.startsWith('/') && pages.find((p) => [pagePath(p.slug), `/${p.slug}`].includes(href));
    if (page) return props.onSubmit({ kind: 'page', pageId: page.id });
    if (!hrefSchema.safeParse(href).success) return setError(true);
    props.onSubmit({ kind: 'url', href });
  };
  return (
    <form
      className="rt-link"
      aria-label={t('richText.linkForm')}
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        props.onCancel();
      }}
    >
      <label htmlFor={`${id}-target`}>{t('richText.target')}</label>
      <select id={`${id}-target`} value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">{t('link.url')}</option>
        <optgroup label={t('link.page')}>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || p.slug || t('link.home')}
            </option>
          ))}
        </optgroup>
        {files.length > 0 && (
          <optgroup label={t('link.file')}>
            {files.map((a) => (
              <option key={a.id} value={`asset:${a.id}`}>
                {a.name || a.file}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {!target && (
        <>
          <label htmlFor={`${id}-href`}>{t('link.address')}</label>
          <input
            id={`${id}-href`}
            value={href}
            aria-invalid={error}
            aria-describedby={error ? `${id}-error` : undefined}
            // biome-ignore lint/a11y/noAutofocus: the form opens on demand, for typing the address.
            autoFocus
            onChange={(e) => {
              setHref(e.target.value);
              setError(false);
            }}
          />
          {error && (
            <span id={`${id}-error`} className="field-error">
              {t('richText.linkRefused')}
            </span>
          )}
        </>
      )}
      <div className="rt-link-actions">
        <Button size="sm" variant="primary" type="submit">
          {t('richText.apply')}
        </Button>
        <Button size="sm" onClick={props.onCancel}>
          {t('richText.cancel')}
        </Button>
      </div>
    </form>
  );
}
