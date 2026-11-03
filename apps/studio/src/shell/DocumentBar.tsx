import { serializeSite, t } from '@ns/core';
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
    if (dirty && !confirm(t('documentBar.templateUnsaved'))) return;
    const name = prompt(t('documentBar.templateName'), doc.name)?.trim();
    if (!name) return;
    const description = prompt(t('documentBar.templateDescription'), '') ?? '';
    try {
      await saveAsTemplate(doc.id, name, description);
      setSession({ notice: t('documentBar.templateSaved', { name }) });
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

  const status = session.saving
    ? t('documentBar.saving')
    : dirty
      ? t('documentBar.modified')
      : t('documentBar.saved');

  return (
    <>
      <a className="project-link" href="#/projects">
        <ArrowLeft aria-hidden="true" size={16} />
        {t('documentBar.projects')}
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
      <Tip content={t('documentBar.save')} shortcut="⌘S">
        <Button
          variant="primary"
          size="sm"
          icon={Save}
          onClick={() => void save(store)}
          disabled={session.saving || !dirty}
        >
          {t('documentBar.save')}
        </Button>
      </Tip>
      <Menu
        label={t('documentBar.more')}
        icon={Ellipsis}
        tooltip={t('documentBar.moreTip')}
        items={[
          { label: t('documentBar.exportJson'), icon: Download, onSelect: downloadJson },
          {
            label: t('documentBar.exportArchive'),
            icon: Archive,
            onSelect: () => {
              // Archive of the saved version: save first so it matches what is on screen.
              if (dirty && !confirm(t('documentBar.archiveUnsaved'))) return;
              Object.assign(document.createElement('a'), { href: archiveUrl(doc.id), download: '' }).click();
            },
          },
          {
            label: t('documentBar.saveAsTemplate'),
            icon: BookCopy,
            onSelect: () => void asTemplate(),
          },
          'separator',
          { label: t('documentBar.exportSite'), icon: PackageOpen, onSelect: () => setExporting(true) },
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
              label={t('documentBar.closeMessage')}
              icon={X}
              size="sm"
              onClick={() => setSession({ notice: null })}
            />
          </div>
        )}
        {session.error && (
          <div className="toast toast-error save-error" role="alert">
            <CircleAlert aria-hidden="true" size={16} />
            <span className="toast-text">{t('documentBar.failed', { message: session.error.message })}</span>
            {session.error.conflict ? (
              <Button size="sm" onClick={() => void overwrite()}>
                {t('documentBar.overwrite')}
              </Button>
            ) : (
              <Button size="sm" onClick={() => void save(store)}>
                {t('documentBar.retry')}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
