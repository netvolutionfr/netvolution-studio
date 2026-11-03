import { registry } from '@ns/components';
import { createEditorStore, type EditorState, type EditorStore, loadSite, type Site } from '@ns/core';
import { createContext, useContext, useSyncExternalStore } from 'react';

// Project templates: the reference fixtures, bundled with the app.
const files = import.meta.glob<{ default: unknown }>('../../../../fixtures/*.json', { eager: true });

export const templates: { name: string; doc: Site }[] = Object.entries(files).flatMap(([path, mod]) => {
  const result = loadSite(mod.default, registry);
  if (!result.ok) {
    console.error(path, result.diagnostics);
    return [];
  }
  return [{ name: path.split('/').at(-1)?.replace('.json', '') ?? path, doc: result.doc }];
});

export const StoreContext = createContext<EditorStore | null>(null);

export function useStore(): EditorStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext missing');
  return store;
}

export function useEditor<T>(select: (s: EditorState) => T): T {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => select(store.getState()));
}

export const createStore = (doc: Site) => createEditorStore(doc, registry);
