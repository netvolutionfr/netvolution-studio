import { type Asset, type DocNode, isPicture } from '@ns/core';
import { ImagePlus } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '../ui/index.ts';
import { mediaBase, uploadMedia } from './api.ts';
import type { PropSetter } from './PropFields.tsx';
import { useEditor, useStore } from './store.ts';

/**
 * Image picker: upload (PNG, JPEG, WebP, AVIF, SVG; checked by the server)
 * with a mandatory text alternative unless decorative, or reuse of an image of
 * the media library, whose default alternative is proposed. One undo step.
 */
export function AssetField({
  node,
  prop,
  label,
  onSet,
}: {
  node: DocNode;
  prop: string;
  label: string;
  /** Records the media like a component parameter instead of a plain prop change. */
  onSet?: PropSetter | undefined;
}) {
  const store = useStore();
  const id = useId();
  const assets = useEditor((s) => s.doc.assets);
  const projectId = useEditor((s) => s.doc.id);
  const current = typeof node.props[prop] === 'string' ? assets[node.props[prop] as string] : undefined;
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [decorative, setDecorative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const use = (asset: Asset, isNew: boolean) => {
    store.begin(label);
    const added = isNew ? store.dispatch('addAsset', { asset }, label) : { ok: true };
    const proposed = isPicture(asset) && asset.alt && !node.props.alt ? { alt: asset.alt } : {};
    const props = {
      [prop]: asset.id,
      ...(isNew ? { alt: decorative ? '' : alt.trim(), decorative } : proposed),
    };
    const set = !added.ok
      ? null
      : onSet
        ? onSet(prop, asset.id, label)
        : store.dispatch('updateNodeProps', { id: node.id, props }, label);
    if (!set?.ok) {
      store.cancel();
      setError(set && !set.ok ? set.error.message : 'Ajout refusé');
      return;
    }
    store.commit();
    setFile(null);
    setAlt('');
    setError(null);
  };

  const upload = async () => {
    if (!file) return;
    if (!decorative && !alt.trim())
      return setError('Texte alternatif obligatoire (ou cocher « décorative »).');
    setBusy(true);
    try {
      use(await uploadMedia(projectId, file, decorative ? '' : alt.trim()), true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const others = Object.values(assets)
    .filter((a) => a.id !== current?.id)
    .filter(isPicture);
  return (
    <fieldset className="asset-field">
      <legend>{label}</legend>
      {current ? (
        <img className="asset-thumb" src={`.${mediaBase(projectId)}${current.file}`} alt="" />
      ) : (
        <p className="hint">Aucune image.</p>
      )}
      <label className="field">
        Envoyer une image (PNG, JPEG, WebP, AVIF, SVG ; 10 Mo max.)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
        />
      </label>
      {file && (
        <>
          <label className="field" htmlFor={`${id}-alt`}>
            Texte alternatif
          </label>
          <input
            id={`${id}-alt`}
            value={alt}
            disabled={decorative}
            onChange={(e) => setAlt(e.target.value)}
          />
          <label className="field-check">
            <input type="checkbox" checked={decorative} onChange={(e) => setDecorative(e.target.checked)} />
            Image décorative
          </label>
          <Button variant="primary" size="sm" icon={ImagePlus} disabled={busy} onClick={() => void upload()}>
            {busy ? 'Envoi…' : "Ajouter l'image"}
          </Button>
        </>
      )}
      {others.length > 0 && (
        <label className="field">
          Médiathèque
          <select
            value=""
            onChange={(e) => {
              const asset = assets[e.target.value];
              if (asset) use(asset, false);
            }}
          >
            <option value="">Réutiliser…</option>
            {others.map((a) => (
              <option key={a.id} value={a.id}>
                {`${a.name || a.file} (${a.width}×${a.height})`}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
