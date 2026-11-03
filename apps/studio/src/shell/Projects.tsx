import type { Diagnostic } from '@ns/core';
import { CopyPlus, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, IconButton } from '../ui/index.ts';
import {
  ApiError,
  createFromTemplate,
  createProject,
  deleteProject,
  deleteTemplate,
  duplicateProject,
  importArchive,
  listProjects,
  listTemplates,
  type ProjectSummary,
  type TemplateSummary,
} from './api.ts';
import { templates } from './store.ts';

export const projectHash = (id: string, pageId?: string) => `#/p/${id}${pageId ? `/${pageId}` : ''}`;

/** Projects screen (SB-01): create from a template, import, open, duplicate, delete (to the trash). */
export function Projects() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [siteTemplates, setSiteTemplates] = useState<TemplateSummary[]>([]);
  const [error, setError] = useState<{ message: string; diagnostics: Diagnostic[] } | null>(null);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState(templates[0]?.doc.id ?? '');
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, String(e));
      setError({ message: err.message, diagnostics: err.diagnostics });
    }
  };
  const refresh = () =>
    run(async () => {
      setProjects(await listProjects());
      setSiteTemplates(await listTemplates());
    });
  // biome-ignore lint/correctness/useExhaustiveDependencies: load once.
  useEffect(() => void refresh(), []);

  const open = (id: string, missingMedia = 0) => {
    if (missingMedia) alert(`${missingMedia} média(s) référencé(s) introuvable(s) : images à remplacer.`);
    location.hash = projectHash(id);
  };
  const create = () =>
    run(async () => {
      // `site:<id>`: a complete site template (CS-02); otherwise a starter page.
      if (template.startsWith('site:')) {
        const created = await createFromTemplate(template.slice(5), name.trim());
        return open(created.id, created.missingMedia);
      }
      const tpl = templates.find((t) => t.doc.id === template);
      if (!tpl) return;
      const created = await createProject({ ...tpl.doc, name: name.trim() || tpl.doc.name });
      open(created.id, created.missingMedia);
    });
  const importJson = (file: File) =>
    run(async () => {
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        throw new ApiError(400, 'Fichier JSON illisible');
      }
      // An archive (site + media) or a bare site JSON.
      const created =
        (raw as { format?: unknown } | null)?.format === 'ns.archive'
          ? await importArchive(raw)
          : await createProject(raw);
      open(created.id, created.missingMedia);
    });

  return (
    <main className="projects">
      <div className="projects-inner">
        <h1>Projets</h1>
        <p className="projects-help">
          Première fois ?{' '}
          <a href="./guide/01-prise-en-main/" target="_blank" rel="noopener">
            Suivez la prise en main
          </a>{' '}
          ou ouvrez le{' '}
          <a href="./guide/" target="_blank" rel="noopener">
            guide d’utilisation
          </a>
          .
        </p>
        <form
          className="projects-new"
          aria-label="Nouveau projet"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label>
            Nom du projet
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </label>
          <label>
            Modèle
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
              <optgroup label="Pages de départ">
                {templates.map((t) => (
                  <option key={t.doc.id} value={t.doc.id}>
                    {t.doc.name}
                  </option>
                ))}
              </optgroup>
              {siteTemplates.length > 0 && (
                <optgroup label="Sites complets">
                  {siteTemplates.map((t) => (
                    <option key={t.id} value={`site:${t.id}`}>
                      {t.name} ({t.pages} pages)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <Button type="submit" variant="primary" icon={Plus}>
            Créer le projet
          </Button>
          <Button type="button" icon={Upload} onClick={() => fileInput.current?.click()}>
            Importer (archive ou JSON)…
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void importJson(file);
            }}
          />
        </form>
        {error && (
          <div className="toast toast-error" role="alert">
            <span className="toast-text">
              Échec : {error.message}
              {error.diagnostics.slice(0, 5).map((d) => (
                <span key={`${d.code}-${d.path.join('.')}`}>
                  <br />
                  <code>{d.code}</code> {d.path.join('.')} — {d.message}
                </span>
              ))}
            </span>
          </div>
        )}
        {projects?.length === 0 && <p>Aucun projet : créez-en un depuis un modèle.</p>}
        <ul className="projects-list" aria-label="Mes projets">
          {projects?.map((p) => (
            <li key={p.id} className="projects-row">
              <a href={projectHash(p.id)}>{p.name || p.id}</a>
              <span className="projects-meta">
                {p.pages} page{p.pages > 1 ? 's' : ''} · modifié le{' '}
                {new Date(p.updatedAt).toLocaleString('fr-FR')}
              </span>
              <IconButton
                size="sm"
                label={`Dupliquer ${p.name}`}
                icon={CopyPlus}
                onClick={() =>
                  run(async () => {
                    await duplicateProject(p.id);
                    await refresh();
                  })
                }
              />
              <IconButton
                size="sm"
                label={`Supprimer ${p.name}`}
                icon={Trash2}
                variant="danger"
                onClick={() =>
                  confirm(`Déplacer le projet « ${p.name} » dans la corbeille ?`) &&
                  run(async () => {
                    await deleteProject(p.id);
                    await refresh();
                  })
                }
              />
            </li>
          ))}
        </ul>
        {siteTemplates.some((t) => !t.builtIn) && (
          <>
            <h2 className="projects-subtitle">Mes modèles de site</h2>
            <ul className="projects-list" aria-label="Mes modèles de site">
              {siteTemplates
                .filter((t) => !t.builtIn)
                .map((t) => (
                  <li key={t.id} className="projects-row">
                    <span>
                      <strong>{t.name}</strong>
                      {t.description && <span className="projects-meta"> · {t.description}</span>}
                    </span>
                    <span className="projects-meta">{t.pages} page(s)</span>
                    <IconButton
                      size="sm"
                      label={`Supprimer le modèle ${t.name}`}
                      icon={Trash2}
                      variant="danger"
                      onClick={() =>
                        confirm(
                          `Supprimer le modèle « ${t.name} » ? Les projets créés avec restent intacts.`,
                        ) &&
                        run(async () => {
                          await deleteTemplate(t.id);
                          await refresh();
                        })
                      }
                    />
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
