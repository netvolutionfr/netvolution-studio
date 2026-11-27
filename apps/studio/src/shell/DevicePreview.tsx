import { t } from '@ns/core';
import { CircleStop } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/index.ts';
import { type LanShare, lanStatus, pushLive, setLiveProject, startLan, stopLan } from './api.ts';
import { useEditor, useStore } from './store.ts';

/**
 * Device preview on the local network (ADR-0027): shares the open project's preview with the phones
 * and tablets of the same network, through a QR code. Sharing goes on once the dialog is closed.
 */
export function DevicePreview(props: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const id = useEditor((s) => s.doc.id);
  const dialog = useRef<HTMLDialogElement>(null);
  const [share, setShare] = useState<LanShare | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) return;
    dialog.current?.showModal();
    setError(null);
    lanStatus()
      .then(async (status) => {
        setUnavailable(!status.available);
        if (!status.available) return;
        const current = status.share?.projectId === id ? status.share : await startLan(id);
        setLiveProject(id);
        pushLive(store.getState().doc);
        setShare(current);
      })
      .catch((e: Error) => setError(e.message));
  }, [props.open, id, store]);

  const stop = async () => {
    await stopLan().catch(() => undefined);
    setLiveProject(null);
    setShare(null);
    dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      className="ui-dialog device-dialog"
      onClose={props.onClose}
      aria-labelledby="device-title"
    >
      <h2 id="device-title">{t('devicePreview.title')}</h2>
      {unavailable ? (
        <p>{t('devicePreview.unavailable')}</p>
      ) : error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : !share ? (
        <p>{t('devicePreview.starting')}</p>
      ) : (
        <>
          <p>{t('devicePreview.intro')}</p>
          <img
            className="device-qr"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(share.qr)}`}
            alt={share.url}
          />
          <p>
            {t('devicePreview.link')} <code>{share.url}</code>
          </p>
          <p className="hint">{t('devicePreview.security')}</p>
        </>
      )}
      <div className="dialog-actions">
        {share && (
          <Button type="button" icon={CircleStop} onClick={() => void stop()}>
            {t('devicePreview.stop')}
          </Button>
        )}
        <Button type="button" variant="primary" onClick={() => dialog.current?.close()}>
          {t('devicePreview.close')}
        </Button>
      </div>
    </dialog>
  );
}
