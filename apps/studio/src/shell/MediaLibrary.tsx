import { registry } from '@ns/components';
import { type Asset, assetReferences, isPicture } from '@ns/core';
import { FileText, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, IconButton } from '../ui/index.ts';
import { listMediaFiles, MEDIA_ACCEPT, mediaBase, uploadMedia } from './api.ts';
import { TextField } from './fields.tsx';
import { useEditor, useStore } from './store.ts';

const KIND_LABELS = { image: 'Image', svg: 'SVG', file: 'Fichier', font: 'Police' } as const;
const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
const matches = (a: Asset, q: string) =>
  !q ||
  [a.name ?? '', a.file, a.kind === 'font' ? a.family : '', ...(a.tags ?? [])].some((v) =>
    v.toLowerCase().includes(q.toLowerCase()),
  );
const weightText = (w: { min: number; max: number }) => (w.min === w.max ? `${w.min}` : `${w.min}-${w.max}`);
/** "400" or "100-900" (a variable font's range); null when invalid. */
const parseWeight = (v: string) => {
  const m = /^\s*(\d{1,4})\s*(?:[-–]\s*(\d{1,4}))?\s*$/.exec(v);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2] ?? m[1]);
  return min >= 1 && max <= 1000 && min <= max ? { min, max } : null;
};

/**
 * Project media library (SB-06): import images, SVG and downloadable files, search by name or
 * tag, metadata (name, default text alternative, tags), usage and missing files.
 */
export function MediaLibrary() {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const [query, setQuery] = useState('');
  const [present, setPresent] = useState<Set<string> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const refresh = () =>
    listMediaFiles(doc.id)
      .then((files) => setPresent(new Set(files)))
      .catch(() => setPresent(null));
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per project.
  useEffect(() => void refresh(), [doc.id]);

  const upload = async (files: File[]) => {
    setBusy(true);
    const failed: string[] = [];
    store.begin('Importer des médias');
    for (const file of files) {
      try {
        store.dispatch('addAsset', { asset: await uploadMedia(doc.id, file) });
      } catch (e) {
        failed.push(`${file.name} : ${(e as Error).message}`);
      }
    }
    store.commit();
    setErrors(failed);
    setBusy(false);
    void refresh();
  };

  const assets = Object.values(doc.assets).filter((a) => matches(a, query));
  return (
    <div className="ds media">
      <div className="media-tools">
        <input
          type="search"
          aria-label="Rechercher un média (nom, fichier, tag)"
          placeholder="Rechercher (nom, tag)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button size="sm" icon={Upload} disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Import…' : 'Importer'}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={MEDIA_ACCEPT}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            if (files.length) void upload(files);
          }}
        />
      </div>
      <p className="hint">
        Images (PNG, JPEG, WebP, AVIF), SVG vérifiés (sans script ni référence externe), polices WOFF2 et
        fichiers PDF, ZIP, DOCX, XLSX, PPTX. Les images sont optimisées à l'export.
      </p>
      {errors.map((e) => (
        <p key={e} className="field-error" role="alert">
          {e}
        </p>
      ))}
      {assets.length === 0 && <p className="hint">{query ? 'Aucun média ne correspond.' : 'Aucun média.'}</p>}
      <ul className="media-list">
        {assets.map((a) => {
          // A font is used through the font stacks of the design system (ADR-0018).
          const used =
            a.kind === 'font'
              ? Object.values(doc.tokens?.fonts ?? {}).filter((f) => f.stack.includes(a.family)).length
              : assetReferences(doc, registry, a.id).length;
          const missing = present !== null && !present.has(a.file);
          const update = (patch: { name?: string; alt?: string; tags?: string[] }, label: string) =>
            store.dispatch('updateAsset', { id: a.id, ...patch }, label);
          return (
            <li key={a.id} className="media-card" aria-label={a.name || a.file}>
              <div className="media-preview">
                {isPicture(a) ? (
                  <img src={`.${mediaBase(doc.id)}${a.file}`} alt="" />
                ) : a.kind === 'font' ? (
                  <span
                    className="media-font"
                    aria-hidden="true"
                    style={{ fontFamily: `"ns-media-${a.id}"`, fontWeight: a.weight.min, fontStyle: a.style }}
                  >
                    <style>{`@font-face{font-family:"ns-media-${a.id}";src:url(".${mediaBase(doc.id)}${a.file}")}`}</style>
                    Aa
                  </span>
                ) : (
                  <FileText aria-hidden="true" size={28} strokeWidth={1.5} />
                )}
              </div>
              <div className="media-body">
                <p className="media-meta">
                  {KIND_LABELS[a.kind]} · {isPicture(a) ? `${a.width}×${a.height}` : size(a.size)} ·{' '}
                  <span className={used ? undefined : 'media-unused'}>
                    {used ? `utilisé ${used} fois` : 'inutilisé'}
                  </span>
                  {missing && (
                    <strong className="media-missing" role="alert">
                      {' '}
                      · fichier manquant
                    </strong>
                  )}
                </p>
                <TextField
                  label="Nom"
                  value={a.name ?? ''}
                  onChange={(name) => update({ name }, 'Nom du média')}
                />
                {isPicture(a) && (
                  <TextField
                    label="Texte alternatif par défaut"
                    value={a.alt ?? ''}
                    onChange={(alt) => update({ alt }, 'Texte alternatif du média')}
                  />
                )}
                {a.kind === 'font' && (
                  <>
                    <TextField
                      label="Famille"
                      value={a.family}
                      onChange={(family) =>
                        store.dispatch(
                          'updateAsset',
                          { id: a.id, font: { family, weight: a.weight, style: a.style } },
                          'Famille de la police',
                        )
                      }
                    />
                    <TextField
                      label="Graisse (400, ou 100-900 pour une police variable)"
                      value={weightText(a.weight)}
                      onChange={(v) => {
                        const weight = parseWeight(v);
                        return weight
                          ? store.dispatch(
                              'updateAsset',
                              { id: a.id, font: { family: a.family, weight, style: a.style } },
                              'Graisse de la police',
                            )
                          : { ok: false };
                      }}
                    />
                    <label className="field-check">
                      <input
                        type="checkbox"
                        checked={a.style === 'italic'}
                        onChange={(e) =>
                          store.dispatch(
                            'updateAsset',
                            {
                              id: a.id,
                              font: {
                                family: a.family,
                                weight: a.weight,
                                style: e.target.checked ? 'italic' : 'normal',
                              },
                            },
                            'Style de la police',
                          )
                        }
                      />
                      Italique
                    </label>
                    {a.license && <p className="hint">{a.license}</p>}
                  </>
                )}
                <TextField
                  label="Tags (séparés par des virgules)"
                  value={(a.tags ?? []).join(',')}
                  onChange={(v) => update({ tags: v ? v.split(',') : [] }, 'Tags du média')}
                />
              </div>
              <IconButton
                size="sm"
                variant="danger"
                label={`Retirer ${a.name || a.file} de la médiathèque`}
                icon={Trash2}
                onClick={() => store.dispatch('removeAsset', { id: a.id }, 'Retirer un média')}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
