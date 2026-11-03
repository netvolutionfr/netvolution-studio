import { registry } from '@ns/components';
import { type EditorStore, getLocale, loadSite, t, tm } from '@ns/core';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import '../ui/tokens.css';
import '../ui/ui.css';
import './shell.css';
import { TipProvider } from '../ui/index.ts';
import { getProject } from './api.ts';
import { Projects, projectHash } from './Projects.tsx';
import { setSession } from './persistence.ts';
import { createStore, StoreContext } from './store.ts';

/** `#/p/<projectId>/<pageId>` opens the editor, anything else the projects screen. */
const route = () => {
  const m = /^#\/p\/([a-z0-9]+)(?:\/([a-z0-9-]+))?$/.exec(location.hash);
  return m ? { projectId: m[1] as string, pageId: m[2] } : null;
};

function Root() {
  const [current, setCurrent] = useState(route);
  const [editor, setEditor] = useState<{ id: string; store: EditorStore } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let previous = location.hash;
    const onHash = () => {
      const next = route();
      const leaving = editor && next?.projectId !== editor.id;
      if (leaving && editor.store.getState().dirty && !confirm(t('app.unsavedLost'))) {
        history.replaceState(null, '', previous);
        return;
      }
      previous = location.hash;
      setCurrent(next);
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, [editor]);

  const projectId = current?.projectId;
  useEffect(() => {
    if (!projectId) return setEditor(null);
    if (editor?.id === projectId) return;
    setError(null);
    getProject(projectId)
      .then(({ doc, etag }) => {
        const result = loadSite(doc, registry);
        if (!result.ok) throw new Error(result.diagnostics.map((d) => tm(d.message)).join('; '));
        setSession({ etag, saving: false, error: null, notice: null });
        setEditor({ id: projectId, store: createStore(result.doc) });
      })
      .catch((e: Error) => setError(e.message));
  }, [projectId, editor]);

  // Live site preview (preview.html): the current site, saved or not, on every change and on request.
  useEffect(() => {
    if (!editor) return;
    const channel = new BroadcastChannel('ns-preview');
    let last = editor.store.getState().doc;
    const send = () => channel.postMessage({ type: 'site', doc: editor.store.getState().doc });
    channel.onmessage = (e: MessageEvent<{ type?: string; projectId?: string }>) => {
      if (e.data?.type === 'request' && e.data.projectId === editor.id) send();
    };
    const off = editor.store.subscribe(() => {
      if (editor.store.getState().doc === last) return;
      last = editor.store.getState().doc;
      send();
    });
    return () => {
      off();
      channel.close();
    };
  }, [editor]);

  // Page shown ↔ URL: the hash follows the store, and a pasted URL opens its page.
  const pageId = current?.pageId;
  useEffect(() => {
    if (!editor) return;
    if (pageId) editor.store.setPage(pageId);
    const sync = () => {
      const hash = projectHash(editor.id, editor.store.getState().pageId);
      if (location.hash !== hash) history.replaceState(null, '', hash);
    };
    sync();
    const off = editor.store.subscribe(sync);
    return () => void off();
  }, [editor, pageId]);

  if (!projectId) return <Projects />;
  if (error)
    return (
      <main className="projects">
        <p role="alert">{t('app.openFailed', { error })}</p>
        <a href="#/projects">{t('app.backToProjects')}</a>
      </main>
    );
  if (!editor || editor.id !== projectId) return <p className="projects">{t('app.loading')}</p>;
  return (
    <StoreContext.Provider value={editor.store}>
      <App key={editor.id} />
    </StoreContext.Provider>
  );
}

document.documentElement.lang = getLocale();
const container = document.getElementById('app');
if (!container) throw new Error('#app missing');
createRoot(container).render(
  <TipProvider delayDuration={400} skipDelayDuration={200}>
    <Root />
  </TipProvider>,
);
