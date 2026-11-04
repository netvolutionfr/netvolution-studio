import { type EditorStore, parentOf, t } from '@ns/core';
import { copy, cut, paste } from './clipboard.ts';
import { save } from './persistence.ts';

export type Shortcut = { key: string; mod: boolean; shift: boolean; alt?: boolean | undefined };

/** Asks the canvas to edit the selected text in place (handled by Canvas, which owns the iframe). */
export const editSelection = () => dispatchEvent(new Event('ns:edit'));

/** Shared by the shell keydown listener and keys forwarded by the canvas. Returns true when handled. */
export function handleShortcut(store: EditorStore, { key, mod, shift, alt }: Shortcut): boolean {
  if (mod && key === 's') void save(store);
  else if (alt && (key === 'ArrowUp' || key === 'ArrowDown')) {
    // One rank among its siblings (ED-03), the keyboard alternative to dragging.
    const { doc, selection } = store.getState();
    const parent = selection ? parentOf(doc, selection) : undefined;
    const index =
      parent && selection ? parent.children.indexOf(selection) + (key === 'ArrowUp' ? -1 : 1) : -1;
    if (parent && selection && index >= 0 && index < parent.children.length)
      store.dispatch(
        'moveNode',
        { id: selection, parentId: parent.id, index },
        key === 'ArrowUp' ? t('inspector.moveUp') : t('inspector.moveDown'),
      );
  } else if (!mod && (key === 'Enter' || key === 'F2')) editSelection();
  else if (mod && key === 'z') shift ? store.redo() : store.undo();
  else if (mod && key === 'y') store.redo();
  else if (mod && key === 'c') copy(store);
  else if (mod && key === 'x') cut(store);
  else if (mod && key === 'v') paste(store);
  else if (mod && key === 'd') {
    const id = store.getState().selection;
    if (id) store.dispatch('duplicateNode', { id }, t('inspector.duplicate'));
  } else if (key === 'Escape') store.select(null);
  else if (key === 'Delete' || key === 'Backspace') {
    const id = store.getState().selection;
    if (id) store.dispatch('removeNode', { id }, t('inspector.remove'));
  } else return false;
  return true;
}
