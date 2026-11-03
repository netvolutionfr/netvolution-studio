import { registry } from '@ns/components';
import { type Check, checkSite } from '@ns/core';
import { CircleAlert, PackageOpen, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/index.ts';
import { ApiError, type ExportResult, exportAstro, listMediaSizes } from './api.ts';
import { useEditor, useStore } from './store.ts';

/**
 * Pre-export checks (SB-11) then export (SB-10): errors block, warnings are listed; optionally builds
 * the static site next to the Astro sources. The server runs the same checks again.
 */
export function ExportDialog(props: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const dialog = useRef<HTMLDialogElement>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [build, setBuild] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) return;
    dialog.current?.showModal();
    setResult(null);
    setError(null);
    setChecks(null);
    store.commit();
    listMediaSizes(doc.id)
      .catch(() => undefined)
      .then((present) => setChecks(checkSite(store.getState().doc, registry, present).checks));
  }, [props.open, doc.id, store]);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await exportAstro(store.getState().doc, build));
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, String(e));
      setError(err.message);
      if (err.diagnostics.length) setChecks(err.diagnostics as Check[]);
    } finally {
      setBusy(false);
    }
  };

  const errors = checks?.filter((c) => c.severity === 'error') ?? [];
  const warnings = checks?.filter((c) => c.severity === 'warning') ?? [];
  const goTo = (c: Check) => {
    if (c.pageId) store.setPage(c.pageId);
    const node = c.path[0] === 'nodes' ? String(c.path[1]) : null;
    if (node) store.select(node);
    dialog.current?.close();
  };
  const list = (items: Check[], Icon: typeof CircleAlert) => (
    <ul className="checks">
      {items.map((c, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static list for this run.
        <li key={i}>
          <Icon aria-hidden="true" size={14} />
          {c.pageId || c.path[0] === 'nodes' ? (
            <button type="button" className="checks-link" onClick={() => goTo(c)}>
              {c.message}
            </button>
          ) : (
            <span>{c.message}</span>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <dialog
      ref={dialog}
      className="ui-dialog export-dialog"
      onClose={props.onClose}
      aria-labelledby="export-title"
    >
      <h2 id="export-title">Exporter le site</h2>
      {!checks ? (
        <p>Contrôles en cours…</p>
      ) : (
        <>
          <h3>Contrôles avant export</h3>
          {errors.length === 0 && warnings.length === 0 && <p>Aucun problème détecté.</p>}
          {errors.length > 0 && (
            <>
              <p role="alert">
                <strong>{errors.length} erreur(s) bloquante(s)</strong> : à corriger avant d'exporter.
              </p>
              {list(errors, CircleAlert)}
            </>
          )}
          {warnings.length > 0 && (
            <>
              <p>
                <strong>{warnings.length} avertissement(s)</strong> : l'export reste possible.
              </p>
              {list(warnings, TriangleAlert)}
            </>
          )}
        </>
      )}
      <label className="field-check">
        <input type="checkbox" checked={build} onChange={(e) => setBuild(e.target.checked)} />
        Construire aussi le site statique (npm ci + build Astro : réseau nécessaire, une à quelques minutes)
      </label>
      {result && (
        <p className="export-result" role="status">
          Sources Astro : <code>{result.path}</code>
          {result.download && (
            <>
              {' '}
              <a href={`./api/exports/${result.download}.tar.gz`} download>
                Télécharger (.tar.gz)
              </a>
            </>
          )}
          {result.staticPath && (
            <>
              <br />
              Site statique, prêt à héberger : <code>{result.staticPath}</code>
              {result.staticDownload && (
                <>
                  {' '}
                  <a href={`./api/exports/${result.staticDownload}.tar.gz`} download>
                    Télécharger (.tar.gz)
                  </a>
                </>
              )}
            </>
          )}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          Échec : {error}
        </p>
      )}
      <div className="dialog-actions">
        <Button type="button" onClick={() => dialog.current?.close()}>
          Fermer
        </Button>
        <Button
          type="button"
          variant="primary"
          icon={PackageOpen}
          disabled={!checks || errors.length > 0 || busy}
          onClick={() => void run()}
        >
          {busy ? (build ? 'Export et build…' : 'Export…') : 'Exporter'}
        </Button>
      </div>
    </dialog>
  );
}
