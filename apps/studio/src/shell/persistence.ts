import type { EditorStore } from '@ns/core';
import { useSyncExternalStore } from 'react';
import { ApiError, saveProject } from './api.ts';

/** Persistence session of the open project, outside the editor store (not part of the history). */
export type Session = {
  /** ETag of the server version the site derives from. */
  etag: string;
  saving: boolean;
  error: { message: string; conflict: boolean } | null;
  notice: string | null;
};

let session: Session = { etag: '', saving: false, error: null, notice: null };
const listeners = new Set<() => void>();
export const setSession = (patch: Partial<Session>) => {
  session = { ...session, ...patch };
  for (const l of listeners) l();
};
export const useSession = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
export const getSession = () => session;

/**
 * Saves the current snapshot. On failure the document stays in memory and
 * dirty, and the error stays visible until the next attempt (VE-10).
 */
export async function save(store: EditorStore, etag: string = session.etag) {
  if (session.saving) return;
  store.commit();
  const doc = store.getState().doc;
  setSession({ saving: true, error: null, notice: null });
  try {
    const next = await saveProject(doc, etag);
    store.markSaved(doc);
    setSession({ etag: next, saving: false });
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError(0, String(e));
    setSession({ saving: false, error: { message: err.message, conflict: err.status === 412 } });
  }
}
