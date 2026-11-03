import { useSyncExternalStore } from 'react';

/** Animation mode of the canvas (CS-07), outside the document and the history. */
export type Motion = 'off' | 'on' | 'reduce';
let motion: Motion = 'off';
const listeners = new Set<() => void>();

export const setMotion = (next: Motion) => {
  motion = next;
  for (const l of listeners) l();
};
export const getMotion = () => motion;
export const useMotion = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => motion,
  );

/** Asks the canvas to replay the animations of a node (handled by Canvas, which owns the iframe). */
export const replay = (nodeId: string) => dispatchEvent(new CustomEvent('ns:replay', { detail: nodeId }));
