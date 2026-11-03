import { registry } from '@ns/components';
import { type EditorStore, insertionPoint, type NodeTemplate, toTemplate } from '@ns/core';

// ponytail: in-memory clipboard within the Studio tab; system clipboard and cross-document paste come later.
let clipboard: NodeTemplate | null = null;

export const hasClipboard = () => clipboard !== null;

export function copy(store: EditorStore) {
  const { doc, rootId, selection } = store.getState();
  if (!selection || selection === rootId) return false;
  clipboard = toTemplate(doc, selection);
  return true;
}

export function cut(store: EditorStore) {
  const id = store.getState().selection;
  if (!id || !copy(store)) return;
  store.dispatch('removeNode', { id }, 'Couper');
}

/** Pastes inside the selected container, after the selected node, or at the end of the page; refusals are reported. */
export function paste(store: EditorStore) {
  if (!clipboard) return;
  const { doc, rootId, selection } = store.getState();
  const at = insertionPoint(doc, rootId, registry, selection, clipboard.type) ?? {
    parentId: rootId,
    index: 0,
  };
  store.dispatch('insertTree', { ...at, tree: clipboard }, 'Coller');
}
