import { registry } from '@ns/components';
import { type CommandResult, contentText, type DocNode, type Link, type PropField, t } from '@ns/core';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Button, IconButton } from '../ui/index.ts';
import { AssetField } from './AssetField.tsx';
import { AssetsField } from './AssetsField.tsx';
import { useEditing } from './editing.ts';
import { Field, TextField } from './fields.tsx';
import { type Inline, RichTextField, type RichValue } from './RichTextField.tsx';
import { useEditor, useStore } from './store.ts';

/** Stable empty list: a selector must not return a new array on each call. */
const NONE: never[] = [];

/** Content controls generated from the component's `fields`. */
/** `onSet` replaces the default `updateNodeProps` (e.g. a shared component's parameter). */
export type PropSetter = (prop: string, value: unknown, label: string) => CommandResult;

export function PropFields({
  node,
  fields,
  onSet,
}: {
  node: DocNode;
  fields: readonly PropField[];
  onSet?: PropSetter | undefined;
}) {
  return (
    <>
      {fields.map((f) => (
        <PropControl key={`${node.id}-${f.prop}`} node={node} field={f} onSet={onSet} />
      ))}
    </>
  );
}

function PropControl({
  node,
  field,
  onSet,
}: {
  node: DocNode;
  field: PropField;
  onSet?: PropSetter | undefined;
}) {
  const store = useStore();
  const id = useId();
  const value = node.props[field.prop];
  const editing = useEditing() === node.id && registry.get(node.type)?.inline?.prop === field.prop;
  const set = (v: unknown) =>
    onSet
      ? onSet(field.prop, v, field.label)
      : store.dispatch('updateNodeProps', { id: node.id, props: { [field.prop]: v } }, field.label);

  if (editing)
    return (
      <Field label={field.label} stack>
        <p className="hint">{t('inspector.editingInPlace')}</p>
      </Field>
    );
  switch (field.kind) {
    case 'text':
    case 'textarea':
      return (
        <TextField
          label={field.label}
          value={String(value ?? '')}
          multiline={field.kind === 'textarea'}
          onChange={set}
        />
      );
    case 'link':
      return (
        <LinkField
          label={field.label}
          value={(value as Link | null | undefined) ?? null}
          optional={field.optional === true}
          onChange={set}
        />
      );
    case 'menu':
      return <MenuField id={id} label={field.label} value={value as string | null} onChange={set} />;
    case 'asset':
      return <AssetField node={node} prop={field.prop} label={field.label} onSet={onSet} />;
    case 'assets':
      return (
        <AssetsField
          label={field.label}
          value={(value as { assetId: string; alt: string; caption?: string }[]) ?? []}
          onChange={set}
        />
      );
    case 'richText':
      return (
        <RichTextField
          label={field.label}
          value={(value as RichValue) ?? []}
          paragraphs={field.paragraphs === true}
          onChange={set}
        />
      );
    case 'richTextList':
      return <ListItemsField label={field.label} value={(value as Inline[][]) ?? []} onChange={set} />;
    case 'boolean':
      return (
        <div className="field field-boolean">
          <label className="field-check">
            <input type="checkbox" checked={value === true} onChange={(e) => set(e.target.checked)} />
            {field.label}
          </label>
        </div>
      );
    case 'number':
      return (
        <Field label={field.label} htmlFor={id}>
          <input
            id={id}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={typeof value === 'number' ? value : ''}
            onChange={(e) =>
              // Empty: null, accepted only by nullable props (inherit from the larger screen).
              e.target.value === ''
                ? set(null)
                : !Number.isNaN(e.target.valueAsNumber) && set(e.target.valueAsNumber)
            }
          />
        </Field>
      );
    case 'select':
      return (
        <Field label={field.label} htmlFor={id}>
          <select
            id={id}
            value={field.options.findIndex((o) => o.value === value)}
            onChange={(e) => set(field.options[Number(e.target.value)]?.value)}
          >
            {field.options.map((o, i) => (
              <option key={String(o.value)} value={i}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      );
  }
}

/** External URL, or a page of the site (follows its slug). */
export function LinkField(props: {
  label: string;
  /** null: no link (only when `optional`). */
  value: Link | null;
  optional?: boolean;
  onChange: (v: Link | null) => { ok: boolean };
}) {
  const id = useId();
  const pages = useEditor((s) => s.doc.pages);
  const assets = useEditor((s) => s.doc.assets);
  const pageId = useEditor((s) => s.pageId);
  const { value, onChange } = props;
  // Option values: '' = URL, ':none', a page id, or `asset:<id>` (page ids never contain ':').
  const selected = !value
    ? ':none'
    : value.kind === 'page'
      ? value.pageId
      : value.kind === 'asset'
        ? `asset:${value.assetId}`
        : '';
  const files = Object.values(assets).filter((a) => a.kind === 'file');
  return (
    <>
      <Field label={props.label} htmlFor={id}>
        <select
          id={id}
          value={selected}
          onChange={(e) => {
            const v = e.target.value;
            onChange(
              v === ':none'
                ? null
                : !v
                  ? { kind: 'url', href: '#' }
                  : v.startsWith('asset:')
                    ? { kind: 'asset', assetId: v.slice(6) }
                    : { kind: 'page', pageId: v },
            );
          }}
        >
          {props.optional && <option value=":none">{t('link.none')}</option>}
          <option value="">{t('link.url')}</option>
          <optgroup label={t('link.page')}>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.slug || t('link.home')}
                {p.id === pageId ? t('link.thisPage') : ''}
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
      </Field>
      {value?.kind === 'url' && (
        <TextField
          label={t('link.address')}
          value={value.href}
          onChange={(href) => onChange({ kind: 'url', href })}
        />
      )}
    </>
  );
}

function MenuField(props: {
  id: string;
  label: string;
  value: string | null;
  onChange: (v: string | null) => unknown;
}) {
  const menus = useEditor((s) => s.doc.menus) ?? NONE;
  return (
    <Field label={props.label} htmlFor={props.id}>
      <select
        id={props.id}
        value={props.value ?? ''}
        onChange={(e) => props.onChange(e.target.value || null)}
      >
        <option value="">{t('menuField.none')}</option>
        {menus.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name || m.id}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** List items (List component): one rich text line each, reordered, added and removed. */
function ListItemsField(props: {
  label: string;
  value: Inline[][];
  onChange: (v: Inline[][]) => CommandResult;
}) {
  const items = props.value;
  const lang = useEditor((s) => s.doc.settings.lang);
  const move = (i: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(i, 1);
    if (item) next.splice(to, 0, item);
    return props.onChange(next);
  };
  return (
    <fieldset className="list-items">
      <legend>{props.label}</legend>
      {items.map((runs, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: items have no identity; edited in place, in order.
        <div className="list-item" key={i}>
          <RichTextField
            label={t('listField.item', { n: i + 1 })}
            value={runs}
            onChange={(v) => props.onChange(items.map((x, j) => (j === i ? (v as Inline[]) : x)))}
          />
          <div className="inspector-actions" role="toolbar" aria-label={t('listField.actions', { n: i + 1 })}>
            <IconButton
              size="sm"
              label={t('listField.moveUp', { n: i + 1 })}
              icon={ArrowUp}
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
            />
            <IconButton
              size="sm"
              label={t('listField.moveDown', { n: i + 1 })}
              icon={ArrowDown}
              disabled={i === items.length - 1}
              onClick={() => move(i, i + 1)}
            />
            <IconButton
              size="sm"
              variant="danger"
              label={t('listField.remove', { n: i + 1 })}
              icon={Trash2}
              disabled={items.length <= 1}
              onClick={() => props.onChange(items.filter((_, j) => j !== i))}
            />
          </div>
        </div>
      ))}
      <Button
        size="sm"
        icon={Plus}
        onClick={() => props.onChange([...items, [{ text: contentText(lang)('content.list.new') }]])}
      >
        {t('listField.add')}
      </Button>
    </fieldset>
  );
}
