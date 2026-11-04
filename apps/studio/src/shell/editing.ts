import { useSyncExternalStore } from 'react';

/** Node whose text is being edited in place in the canvas (ADR-0025), outside the document and the history. */
let editing: string | null = null;
const listeners = new Set<() => void>();

export const setEditing = (next: string | null) => {
  editing = next;
  for (const l of listeners) l();
};
export const getEditing = () => editing;
export const useEditing = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => editing,
  );
