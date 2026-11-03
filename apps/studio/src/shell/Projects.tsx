import { type Diagnostic, formatDate, getLocale, t, tm } from '@ns/core';
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
import { guideUrl, LanguageMenu } from './LanguageMenu.tsx';
import { templates } from './store.ts';

export const projectHash = (id: string, pageId?: string) => `#/p/${id}${pageId ? `/${pageId}` : ''}`;

/** A language in the interface language (« anglais », « English »); shown when it is not the interface's. */
const languageName = (lang: string) => {
  try {
    return new Intl.DisplayNames(getLocale(), { type: 'language' }).of(lang) ?? lang;
  } catch {
    return lang;
  }
};

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
    if (missingMedia) alert(t('projects.missingMedia', { count: missingMedia }));
    location.hash = projectHash(id);
  };
  const create = () =>
    run(async () => {
      // `site:<id>`: a complete site template (CS-02); otherwise a starter page.
      if (template.startsWith('site:')) {
        const created = await createFromTemplate(template.slice(5), name.trim());
        return open(created.id, created.missingMedia);
      }
      const tpl = templates.find((x) => x.doc.id === template);
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
        throw new ApiError(400, t('projects.unreadableJson'));
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
        <div className="projects-head">
          <h1>{t('projects.title')}</h1>
          <LanguageMenu />
        </div>
        <p className="projects-help">
          {t('projects.firstTime')}{' '}
          <a href={guideUrl('01-getting-started/')} target="_blank" rel="noopener">
            {t('projects.followTutorial')}
          </a>{' '}
          {t('projects.orOpenThe')}{' '}
          <a href={guideUrl()} target="_blank" rel="noopener">
            {t('projects.userGuide')}
          </a>
          .
        </p>
        <form
          className="projects-new"
          aria-label={t('projects.newProject')}
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label>
            {t('projects.projectName')}
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </label>
          <label>
            {t('projects.template')}
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
              <optgroup label={t('projects.starterPages')}>
                {templates.map((tpl) => (
                  <option key={tpl.doc.id} value={tpl.doc.id}>
                    {tpl.doc.name}
                  </option>
                ))}
              </optgroup>
              {siteTemplates.length > 0 && (
                <optgroup label={t('projects.fullSites')}>
                  {siteTemplates.map((tpl) => (
                    <option key={tpl.id} value={`site:${tpl.id}`}>
                      {tpl.name} ({t('projects.pageCount', { count: tpl.pages })}
                      {tpl.lang && tpl.lang.split('-')[0] !== getLocale() && ` · ${languageName(tpl.lang)}`})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <Button type="submit" variant="primary" icon={Plus}>
            {t('projects.create')}
          </Button>
          <Button type="button" icon={Upload} onClick={() => fileInput.current?.click()}>
            {t('projects.import')}
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
              {t('projects.failed', { message: error.message })}
              {error.diagnostics.slice(0, 5).map((d) => (
                <span key={`${d.code}-${d.path.join('.')}`}>
                  <br />
                  <code>{d.code}</code> {d.path.join('.')} — {tm(d.message)}
                </span>
              ))}
            </span>
          </div>
        )}
        {projects?.length === 0 && <p>{t('projects.empty')}</p>}
        <ul className="projects-list" aria-label={t('projects.myProjects')}>
          {projects?.map((p) => (
            <li key={p.id} className="projects-row">
              <a href={projectHash(p.id)}>{p.name || p.id}</a>
              <span className="projects-meta">
                {t('projects.pageCount', { count: p.pages })} ·{' '}
                {t('projects.modifiedOn', {
                  date: formatDate(p.updatedAt, { dateStyle: 'short', timeStyle: 'medium' }),
                })}
              </span>
              <IconButton
                size="sm"
                label={t('projects.duplicate', { name: p.name })}
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
                label={t('projects.remove', { name: p.name })}
                icon={Trash2}
                variant="danger"
                onClick={() =>
                  confirm(t('projects.confirmTrash', { name: p.name })) &&
                  run(async () => {
                    await deleteProject(p.id);
                    await refresh();
                  })
                }
              />
            </li>
          ))}
        </ul>
        {siteTemplates.some((tpl) => !tpl.builtIn) && (
          <>
            <h2 className="projects-subtitle">{t('projects.myTemplates')}</h2>
            <ul className="projects-list" aria-label={t('projects.myTemplates')}>
              {siteTemplates
                .filter((tpl) => !tpl.builtIn)
                .map((tpl) => (
                  <li key={tpl.id} className="projects-row">
                    <span>
                      <strong>{tpl.name}</strong>
                      {tpl.description && <span className="projects-meta"> · {tpl.description}</span>}
                    </span>
                    <span className="projects-meta">{t('projects.pageCount', { count: tpl.pages })}</span>
                    <IconButton
                      size="sm"
                      label={t('projects.removeTemplate', { name: tpl.name })}
                      icon={Trash2}
                      variant="danger"
                      onClick={() =>
                        confirm(t('projects.confirmRemoveTemplate', { name: tpl.name })) &&
                        run(async () => {
                          await deleteTemplate(tpl.id);
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
