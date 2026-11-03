import type { EditorStore } from '@ns/core';
import { copy, cut, paste } from './clipboard.ts';
import { save } from './persistence.ts';

export type Shortcut = { key: string; mod: boolean; shift: boolean };

/** Shared by the shell keydown listener and keys forwarded by the canvas. Returns true when handled. */
export function handleShortcut(store: EditorStore, { key, mod, shift }: Shortcut): boolean {
  if (mod && key === 's') void save(store);
  else if (mod && key === 'z') shift ? store.redo() : store.undo();
  else if (mod && key === 'y') store.redo();
  else if (mod && key === 'c') copy(store);
  else if (mod && key === 'x') cut(store);
  else if (mod && key === 'v') paste(store);
  else if (mod && key === 'd') {
    const id = store.getState().selection;
    if (id) store.dispatch('duplicateNode', { id }, 'Dupliquer');
  } else if (key === 'Escape') store.select(null);
  else if (key === 'Delete' || key === 'Backspace') {
    const id = store.getState().selection;
    if (id) store.dispatch('removeNode', { id }, 'Supprimer');
  } else return false;
  return true;
}
