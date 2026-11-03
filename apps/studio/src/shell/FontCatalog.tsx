import { Check, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/index.ts';
import { addCatalogFont, type CatalogFont, fontFileUrl, listFonts } from './api.ts';
import { useEditor, useStore } from './store.ts';

const CATEGORIES = { 'sans-serif': 'Sans empattement', serif: 'Avec empattement' } as const;
const SAMPLE = 'Portez ce vieux whisky au juge blond qui fume';
/** Generic family closing the stack of a catalog font, by category. */
const fallback = (category: string) => (category === 'serif' ? 'serif' : 'sans-serif');
const tokenId = (family: string) =>
  `police-${family
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`.slice(0, 32);

/**
 * Catalog of popular open-licensed fonts (ADR-0018): one click copies the files into the project
 * (self-hosted, no font service) and adds a design system font using them.
 */
export function FontCatalog(props: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const dialog = useRef<HTMLDialogElement>(null);
  const [fonts, setFonts] = useState<CatalogFont[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) return;
    dialog.current?.showModal();
    setError(null);
    listFonts()
      .then(setFonts)
      .catch((e) => setError((e as Error).message));
  }, [props.open]);

  const imported = new Set(Object.values(doc.assets).flatMap((a) => (a.kind === 'font' ? [a.family] : [])));
  const add = async (font: CatalogFont) => {
    setBusy(font.id);
    setError(null);
    try {
      const assets = await addCatalogFont(doc.id, font.id);
      const tokens = store.getState().doc.tokens;
      const hasToken = Object.values(tokens?.fonts ?? {}).some((f) => f.stack[0] === font.family);
      store.begin(`Ajouter la police ${font.family}`);
      const results = [
        ...assets.map((asset) => store.dispatch('addAsset', { asset })),
        ...(hasToken
          ? []
          : [
              store.dispatch('setToken', {
                kind: 'fonts',
                id: tokenId(font.family),
                value: { label: font.family, stack: [font.family, fallback(font.category)] },
              }),
            ]),
      ];
      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) {
        store.cancel();
        setError(failed.error.message);
      } else store.commit();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="ui-dialog font-catalog"
      onClose={props.onClose}
      aria-labelledby="font-catalog-title"
    >
      <h2 id="font-catalog-title">Catalogue de polices</h2>
      <p className="hint">
        Polices libres (licence SIL OFL ou Apache), jeu de caractères latin (français compris). Les fichiers
        sont copiés dans le projet et livrés avec le site : aucun appel à Google Fonts ni à un autre service.
      </p>
      {fonts && (
        <style>
          {fonts
            .flatMap((f) =>
              f.files.map(
                (file) =>
                  `@font-face{font-family:"ns-catalog-${f.id}";src:url("${fontFileUrl(file.file)}") format("woff2");font-weight:${file.weight.min} ${file.weight.max};font-style:${file.style}}`,
              ),
            )
            .join('')}
        </style>
      )}
      {error && (
        <p className="field-error" role="alert">
          Échec : {error}
        </p>
      )}
      {!fonts && !error && <p>Chargement…</p>}
      {fonts &&
        Object.entries(CATEGORIES).map(([category, title]) => {
          const list = fonts.filter((f) => fallback(f.category) === category);
          return (
            list.length > 0 && (
              <section key={category} aria-label={title}>
                <h3>{title}</h3>
                <ul className="font-list">
                  {list.map((f) => (
                    <li key={f.id} className="font-row">
                      <span className="font-name">{f.family}</span>
                      <span
                        className="font-sample"
                        style={{ fontFamily: `"ns-catalog-${f.id}", ${fallback(f.category)}` }}
                      >
                        {SAMPLE}
                      </span>
                      {imported.has(f.family) ? (
                        <span className="font-added">
                          <Check aria-hidden="true" size={14} /> Ajoutée
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          icon={Plus}
                          disabled={busy !== null}
                          aria-label={`Ajouter ${f.family}`}
                          onClick={() => void add(f)}
                        >
                          {busy === f.id ? 'Ajout…' : 'Ajouter'}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          );
        })}
      <div className="dialog-actions">
        <Button type="button" onClick={() => dialog.current?.close()}>
          Fermer
        </Button>
      </div>
    </dialog>
  );
}
