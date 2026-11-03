import { serializeSite } from '@ns/core';
import {
  Archive,
  ArrowLeft,
  BookCopy,
  CircleAlert,
  CircleCheck,
  Download,
  Ellipsis,
  PackageOpen,
  Save,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button, IconButton, Menu, Tip } from '../ui/index.ts';
import { archiveUrl, getProject, saveAsTemplate } from './api.ts';
import { ExportDialog } from './ExportDialog.tsx';
import { save, setSession, useSession } from './persistence.ts';
import { useEditor, useStore } from './store.ts';

/** Project bar: back to the projects, save, export (SB-01, VE-10, VE-11). */
export function DocumentBar() {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const dirty = useEditor((s) => s.dirty);
  const session = useSession();

  const downloadJson = () => {
    const url = URL.createObjectURL(new Blob([serializeSite(doc)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${doc.id}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const [exporting, setExporting] = useState(false);

  /** Site template (CS-02) from the saved version of the project. */
  const asTemplate = async () => {
    if (dirty && !confirm('Le modèle reprend la version enregistrée. Continuer sans enregistrer ?')) return;
    const name = prompt('Nom du modèle de site', doc.name)?.trim();
    if (!name) return;
    const description = prompt('Description (facultative)', '') ?? '';
    try {
      await saveAsTemplate(doc.id, name, description);
      setSession({ notice: `Modèle de site « ${name} » enregistré : disponible à la création d’un projet.` });
    } catch (e) {
      setSession({ error: { message: (e as Error).message, conflict: false } });
    }
  };

  const overwrite = async () => {
    try {
      const { etag } = await getProject(doc.id);
      await save(store, etag);
    } catch (e) {
      setSession({ error: { message: (e as Error).message, conflict: false } });
    }
  };

  const status = session.saving ? 'Enregistrement…' : dirty ? 'Modifié (non enregistré)' : 'Enregistré';

  return (
    <>
      <a className="project-link" href="#/projects">
        <ArrowLeft aria-hidden="true" size={16} />
        Projets
      </a>
      <span className="project-name" title={doc.name}>
        {doc.name || doc.id}
      </span>
      <span
        className={`status ${session.saving ? 'status-busy' : dirty ? 'status-dirty' : 'status-saved'}`}
        aria-live="polite"
      >
        {status}
      </span>
      <Tip content="Enregistrer" shortcut="⌘S">
        <Button
          variant="primary"
          size="sm"
          icon={Save}
          onClick={() => void save(store)}
          disabled={session.saving || !dirty}
        >
          Enregistrer
        </Button>
      </Tip>
      <Menu
        label="Plus d’actions"
        icon={Ellipsis}
        tooltip="Exporter, archiver"
        items={[
          { label: 'Exporter JSON', icon: Download, onSelect: downloadJson },
          {
            label: 'Exporter l’archive (site et médias)',
            icon: Archive,
            onSelect: () => {
              // Archive of the saved version: save first so it matches what is on screen.
              if (
                dirty &&
                !confirm('L’archive contient la version enregistrée. Continuer sans enregistrer ?')
              )
                return;
              Object.assign(document.createElement('a'), { href: archiveUrl(doc.id), download: '' }).click();
            },
          },
          {
            label: 'Enregistrer comme modèle de site…',
            icon: BookCopy,
            onSelect: () => void asTemplate(),
          },
          'separator',
          { label: 'Exporter le site (Astro)…', icon: PackageOpen, onSelect: () => setExporting(true) },
        ]}
      />
      <ExportDialog open={exporting} onClose={() => setExporting(false)} />
      <div className="toasts">
        {session.notice && (
          <div className="toast notice" aria-live="polite">
            <CircleCheck aria-hidden="true" size={16} />
            <span className="toast-text" title={session.notice}>
              {session.notice}
            </span>
            <IconButton
              label="Fermer le message"
              icon={X}
              size="sm"
              onClick={() => setSession({ notice: null })}
            />
          </div>
        )}
        {session.error && (
          <div className="toast toast-error save-error" role="alert">
            <CircleAlert aria-hidden="true" size={16} />
            <span className="toast-text">Échec : {session.error.message}</span>
            {session.error.conflict ? (
              <Button size="sm" onClick={() => void overwrite()}>
                Écraser la version du serveur
              </Button>
            ) : (
              <Button size="sm" onClick={() => void save(store)}>
                Réessayer
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
