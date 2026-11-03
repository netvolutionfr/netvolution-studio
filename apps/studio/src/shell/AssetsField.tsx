import { type CommandResult, isPicture } from '@ns/core';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, IconButton } from '../ui/index.ts';
import { mediaBase, uploadMedia } from './api.ts';
import { TextField } from './fields.tsx';
import { useEditor, useStore } from './store.ts';

type Item = { assetId: string; alt: string; caption?: string };

/**
 * Media list of a gallery (ADR-0021): per image a text alternative and a caption; reorder, remove,
 * add from the media library or import several files at once (one undo step).
 */
export function AssetsField(props: { label: string; value: Item[]; onChange: (v: Item[]) => CommandResult }) {
  const store = useStore();
  const assets = useEditor((s) => s.doc.assets);
  const projectId = useEditor((s) => s.doc.id);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = props.value;
  const pictures = Object.values(assets).filter(isPicture);
  const edit = (i: number, patch: { alt?: string; caption?: string | undefined }) =>
    props.onChange(
      items.map((x, j) => {
        if (j !== i) return x;
        const { caption, ...rest } = { ...x, ...patch };
        return caption ? { ...rest, caption } : rest;
      }),
    );
  const move = (i: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(i, 1);
    if (item) next.splice(to, 0, item);
    return props.onChange(next);
  };
  const upload = async (files: File[]) => {
    setBusy(true);
    setError(null);
    store.begin(`Ajouter ${files.length} image(s)`);
    const added: Item[] = [];
    try {
      for (const file of files) {
        const asset = await uploadMedia(projectId, file);
        if (store.dispatch('addAsset', { asset }).ok) added.push({ assetId: asset.id, alt: '' });
      }
      if (added.length && props.onChange([...items, ...added]).ok) store.commit();
      else store.cancel();
    } catch (e) {
      store.cancel();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset className="list-items gallery-items">
      <legend>
        {props.label} ({items.length})
      </legend>
      {items.map((item, i) => {
        const asset = assets[item.assetId];
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: the same image may appear twice; order is the identity.
          <div className="gallery-item" key={i}>
            {isPicture(asset) && (
              <img className="gallery-thumb" src={`.${mediaBase(projectId)}${asset.file}`} alt="" />
            )}
            <div className="gallery-fields">
              <TextField
                label={`Texte alternatif de l’image ${i + 1} (vide : décorative)`}
                value={item.alt}
                onChange={(alt) => edit(i, { alt })}
              />
              <TextField
                label={`Légende de l’image ${i + 1}`}
                value={item.caption ?? ''}
                onChange={(caption) => edit(i, caption ? { caption } : { caption: undefined })}
              />
              <div className="inspector-actions" role="toolbar" aria-label={`Actions sur l’image ${i + 1}`}>
                <IconButton
                  size="sm"
                  label={`Monter l’image ${i + 1}`}
                  icon={ArrowUp}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                />
                <IconButton
                  size="sm"
                  label={`Descendre l’image ${i + 1}`}
                  icon={ArrowDown}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                />
                <IconButton
                  size="sm"
                  variant="danger"
                  label={`Retirer l’image ${i + 1}`}
                  icon={Trash2}
                  onClick={() => props.onChange(items.filter((_, j) => j !== i))}
                />
              </div>
            </div>
          </div>
        );
      })}
      {pictures.length > 0 && (
        <label className="field field-stack">
          <span className="field-label">Ajouter depuis la médiathèque</span>
          <select
            value=""
            onChange={(e) => {
              const asset = assets[e.target.value];
              if (isPicture(asset)) props.onChange([...items, { assetId: asset.id, alt: asset.alt ?? '' }]);
            }}
          >
            <option value="">Choisir une image…</option>
            {pictures.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.file}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button size="sm" icon={ImagePlus} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Import…' : 'Importer des images…'}
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) void upload(files);
        }}
      />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
