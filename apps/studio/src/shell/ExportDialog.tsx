import { registry } from '@ns/components';
import { type Check, checkSite, t, tm } from '@ns/core';
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
              {tm(c.message)}
            </button>
          ) : (
            <span>{tm(c.message)}</span>
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
      <h2 id="export-title">{t('export.title')}</h2>
      {!checks ? (
        <p>{t('export.checking')}</p>
      ) : (
        <>
          <h3>{t('export.checks')}</h3>
          {errors.length === 0 && warnings.length === 0 && <p>{t('export.noProblem')}</p>}
          {errors.length > 0 && (
            <>
              <p role="alert">
                <strong>{t('export.errors', { count: errors.length })}</strong>
                {t('export.errorsHint')}
              </p>
              {list(errors, CircleAlert)}
            </>
          )}
          {warnings.length > 0 && (
            <>
              <p>
                <strong>{t('export.warnings', { count: warnings.length })}</strong>
                {t('export.warningsHint')}
              </p>
              {list(warnings, TriangleAlert)}
            </>
          )}
        </>
      )}
      <label className="field-check">
        <input type="checkbox" checked={build} onChange={(e) => setBuild(e.target.checked)} />
        {t('export.build')}
      </label>
      {result && (
        <p className="export-result" role="status">
          {t('export.sources')}
          <code>{result.path}</code>
          {result.download && (
            <>
              {' '}
              <a href={`./api/exports/${result.download}.tar.gz`} download>
                {t('export.download')}
              </a>
            </>
          )}
          {result.staticPath && (
            <>
              <br />
              {t('export.staticSite')}
              <code>{result.staticPath}</code>
              {result.staticDownload && (
                <>
                  {' '}
                  <a href={`./api/exports/${result.staticDownload}.tar.gz`} download>
                    {t('export.download')}
                  </a>
                </>
              )}
            </>
          )}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {t('export.failed', { message: error })}
        </p>
      )}
      <div className="dialog-actions">
        <Button type="button" onClick={() => dialog.current?.close()}>
          {t('export.close')}
        </Button>
        <Button
          type="button"
          variant="primary"
          icon={PackageOpen}
          disabled={!checks || errors.length > 0 || busy}
          onClick={() => void run()}
        >
          {busy ? (build ? t('export.exportingWithBuild') : t('export.exporting')) : t('export.export')}
        </Button>
      </div>
    </dialog>
  );
}
