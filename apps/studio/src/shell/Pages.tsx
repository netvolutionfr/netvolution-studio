import {
  type EditorStore,
  freeSlug,
  isPicture,
  type LayoutRole,
  type NodeTemplate,
  pageById,
  pageLayout,
  pagePath,
  pageReferences,
  type Redirect,
  type Seo,
} from '@ns/core';
import {
  ArrowDown,
  ArrowUp,
  Component,
  CopyPlus,
  EyeOff,
  FilePlus,
  House,
  PanelBottom,
  PanelTop,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button, IconButton } from '../ui/index.ts';
import { TextField } from './fields.tsx';
import { LinkField } from './PropFields.tsx';
import { Section } from './StyleFields.tsx';
import { useEditor, useStore } from './store.ts';

/** Stable empty list: a selector must not return a new array on each call. */
const NONE: never[] = [];

/** Page list (SB-02): selecting a page shows it in the canvas. */
export function PagesPanel() {
  const store = useStore();
  const pages = useEditor((s) => s.doc.pages);
  const current = useEditor((s) => s.pageId);
  const home = useEditor((s) => s.doc.settings.homePageId);
  const layouts = useEditor((s) => s.doc.layouts) ?? NONE;
  const symbols = useEditor((s) => s.doc.symbols) ?? NONE;

  const add = () => {
    const { doc } = store.getState();
    const root = doc.nodes[pageById(doc, doc.settings.homePageId)?.rootId ?? ''];
    // A new page starts with an empty root shaped like the home page's (container, width, padding).
    const tree = root ? { type: root.type, props: root.props, style: root.style } : { type: 'container' };
    store.dispatch(
      'createPage',
      { title: 'Nouvelle page', slug: freeSlug(doc, 'nouvelle-page'), tree },
      'Ajouter une page',
    );
  };

  return (
    <section className="panel pages" aria-label="Pages">
      <div className="panel-title-row">
        <h2 className="panel-title">Pages</h2>
        <IconButton size="sm" label="Ajouter une page" icon={FilePlus} onClick={add} />
      </div>
      <ul className="pages-list">
        {pages.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="pages-item"
              aria-current={p.id === current ? 'page' : undefined}
              onClick={() => store.setPage(p.id)}
            >
              {p.id === home ? (
                <House aria-label="Page d'accueil" size={14} strokeWidth={1.75} />
              ) : (
                <span className="pages-icon" aria-hidden="true" />
              )}
              <span className="pages-title">{p.title || 'Sans titre'}</span>
              {!p.publish && <EyeOff aria-label="Non publiée" size={14} strokeWidth={1.75} />}
              <span className="pages-path">{pagePath(p.slug)}</span>
            </button>
          </li>
        ))}
      </ul>
      {symbols.length > 0 && (
        <>
          <h3 className="pages-subtitle">Composants partagés</h3>
          <ul className="pages-list">
            {symbols.map((sym) => (
              <li key={sym.id}>
                <button
                  type="button"
                  className="pages-item"
                  aria-current={sym.id === current ? 'page' : undefined}
                  onClick={() => store.setPage(sym.id)}
                >
                  <Component aria-hidden="true" size={14} strokeWidth={1.75} />
                  <span className="pages-title">{sym.name}</span>
                  <span className="pages-path">v{sym.version}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="pages-subtitle">Header et footer</h3>
      <ul className="pages-list">
        {layouts.map((l) => {
          const Icon = l.role === 'header' ? PanelTop : PanelBottom;
          return (
            <li key={l.id}>
              <button
                type="button"
                className="pages-item"
                aria-current={l.id === current ? 'page' : undefined}
                onClick={() => store.setPage(l.id)}
              >
                <Icon aria-hidden="true" size={14} strokeWidth={1.75} />
                <span className="pages-title">{l.name || l.id}</span>
              </button>
            </li>
          );
        })}
        {(['header', 'footer'] as const)
          .filter((role) => !layouts.some((l) => l.role === role))
          .map((role) => (
            <li key={role}>
              <button type="button" className="pages-item" onClick={() => createLayout(store, role)}>
                <Plus aria-hidden="true" size={14} strokeWidth={1.75} />
                <span className="pages-title">
                  {role === 'header' ? 'Créer le header' : 'Créer le footer'}
                </span>
              </button>
            </li>
          ))}
      </ul>
    </section>
  );
}

const px = (value: number) => ({ value, unit: 'px' as const });

/**
 * Creates the site's header or footer from a starter composition, with the first menu (created from the
 * published pages when there is none), as one undo step.
 */
function createLayout(store: EditorStore, role: LayoutRole) {
  const { doc } = store.getState();
  const name = role === 'header' ? 'Header' : 'Footer';
  store.begin(`Créer le ${role}`);
  let menuId = doc.menus?.[0]?.id;
  if (!menuId) {
    menuId = 'principal';
    const items = doc.pages
      .filter((p) => p.publish)
      .slice(0, 50)
      .map((p, i) => ({
        id: `e${i + 1}`,
        label: p.title || 'Page',
        link: { kind: 'page' as const, pageId: p.id },
      }));
    store.dispatch('setMenu', { menu: { id: menuId, name: 'Menu principal', items } });
  }
  const bar = (children: NodeTemplate[]): NodeTemplate => ({
    type: 'stack',
    name: 'Barre',
    style: {
      base: {
        direction: 'row',
        justify: 'space-between',
        align: 'center',
        wrap: true,
        gap: px(24),
        maxWidth: px(1120),
        marginLeft: 'auto',
        marginRight: 'auto',
      },
    },
    children,
  });
  const padding = { paddingTop: px(16), paddingBottom: px(16), paddingLeft: px(24), paddingRight: px(24) };
  const nav = (label: string, collapse: string, color?: string): NodeTemplate => ({
    type: 'nav',
    props: { menuId, label, toggle: 'Menu', collapse },
    ...(color ? { style: { base: { color } } } : {}),
  });
  const tree: NodeTemplate =
    role === 'header'
      ? {
          type: 'container',
          name,
          props: { tag: 'header' },
          style: { base: { ...padding, backgroundColor: '#ffffff' } },
          children: [
            bar([
              {
                type: 'button',
                name: 'Logo',
                props: {
                  label: doc.name || 'Mon site',
                  link: { kind: 'page', pageId: doc.settings.homePageId },
                  variant: 'text',
                },
                style: { base: { fontSize: px(20), fontWeight: 700 } },
              },
              nav('Navigation principale', 'mobile'),
            ]),
          ],
        }
      : {
          type: 'container',
          name,
          props: { tag: 'footer' },
          style: {
            base: { ...padding, paddingTop: px(32), paddingBottom: px(32), backgroundColor: '#111827' },
          },
          children: [
            bar([
              {
                type: 'text',
                props: { content: [{ text: `© ${doc.name || 'Mon site'}` }] },
                style: { base: { color: '#e5e7eb' } },
              },
              nav('Navigation du pied de page', 'never', '#e5e7eb'),
            ]),
          ],
        };
  store.dispatch('createLayout', { role, name, tree });
  store.commit();
}

/** Settings of the header or footer being edited. */
export function LayoutSettings() {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const id = useEditor((s) => s.pageId);
  const layout = doc.layouts?.find((l) => l.id === id);
  if (!layout) return null;
  const shown = doc.pages.filter((p) => pageLayout(doc, p.id, layout.role)?.id === layout.id).length;
  return (
    <Section title={layout.role === 'header' ? 'Header partagé' : 'Footer partagé'}>
      <p className="hint">
        Affiché sur {shown} page{shown > 1 ? 's' : ''} sur {doc.pages.length}. Une modification ici s'applique
        à toutes ces pages.
      </p>
      <Button
        size="sm"
        icon={Trash2}
        variant="danger"
        onClick={() =>
          confirm(`Supprimer « ${layout.name} » de toutes les pages ?`) &&
          store.dispatch('removeLayout', { id: layout.id }, `Supprimer ${layout.name}`)
        }
      >
        Supprimer
      </Button>
    </Section>
  );
}

/** Settings of the current page and of the site, shown in the inspector when nothing is selected. */
export function PageSettings() {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) return null;
  const index = doc.pages.indexOf(page);
  const isHome = page.id === doc.settings.homePageId;
  const links = pageReferences(doc, page.id).length;
  const update = (patch: { title?: string; slug?: string; publish?: boolean }, label: string) =>
    store.dispatch('updatePage', { id: page.id, ...patch }, label);
  const site = (patch: { name?: string; lang?: string; siteUrl?: string | null }, label: string) =>
    store.dispatch('updateSite', patch, label);

  return (
    <>
      <Section title="Page">
        <TextField
          key={`${page.id}-title`}
          label="Titre"
          value={page.title}
          onChange={(title) => update({ title }, 'Titre de la page')}
        />
        {isHome ? (
          <p className="hint">
            Adresse : <code>/</code> (page d'accueil)
          </p>
        ) : (
          <TextField
            key={`${page.id}-slug`}
            label="Adresse (slug)"
            value={page.slug}
            onChange={(slug) => update({ slug }, 'Adresse de la page')}
          />
        )}
        {!isHome && (
          <p className="hint">
            Publiée à <code>{pagePath(page.slug)}</code>. Minuscules, chiffres et tirets ; « / » pour une
            sous-adresse.
          </p>
        )}
        {links > 0 && (
          <p className="hint" role="note">
            {links} élément{links > 1 ? 's' : ''} du site lie{links > 1 ? 'nt' : ''} vers cette page : leurs
            liens suivent automatiquement un changement d'adresse.
          </p>
        )}
        {(['header', 'footer'] as const)
          .filter((role) => doc.settings.defaultLayouts?.[role])
          .map((role) => (
            <div className="field field-boolean" key={role}>
              <label className="field-check">
                <input
                  type="checkbox"
                  checked={pageLayout(doc, page.id, role) !== undefined}
                  onChange={(e) =>
                    store.dispatch(
                      'setPageLayout',
                      { id: page.id, role, show: e.target.checked },
                      role === 'header' ? 'Afficher le header' : 'Afficher le footer',
                    )
                  }
                />
                {role === 'header' ? 'Afficher le header' : 'Afficher le footer'}
              </label>
            </div>
          ))}
        <div className="field field-boolean">
          <label className="field-check">
            <input
              type="checkbox"
              checked={page.publish}
              disabled={isHome}
              onChange={(e) => update({ publish: e.target.checked }, 'Publication de la page')}
            />
            Publier (inclure dans l'export)
          </label>
        </div>
        <div className="inspector-actions" role="toolbar" aria-label="Actions sur la page">
          <IconButton
            size="sm"
            label="Monter la page"
            icon={ArrowUp}
            disabled={index <= 0}
            onClick={() => store.dispatch('movePage', { id: page.id, index: index - 1 }, 'Monter la page')}
          />
          <IconButton
            size="sm"
            label="Descendre la page"
            icon={ArrowDown}
            disabled={index >= doc.pages.length - 1}
            onClick={() => store.dispatch('movePage', { id: page.id, index: index + 1 }, 'Descendre la page')}
          />
          <IconButton
            size="sm"
            label="Dupliquer la page"
            icon={CopyPlus}
            onClick={() => store.dispatch('duplicatePage', { id: page.id }, 'Dupliquer la page')}
          />
          <IconButton
            size="sm"
            label="Supprimer la page"
            icon={Trash2}
            variant="danger"
            disabled={isHome}
            onClick={() =>
              confirm(`Supprimer la page « ${page.title} » et son contenu ?`) &&
              store.dispatch('removePage', { id: page.id }, 'Supprimer la page')
            }
          />
        </div>
        {!isHome && (
          <Button
            size="sm"
            icon={House}
            onClick={() => store.dispatch('setHomePage', { id: page.id }, "Définir la page d'accueil")}
          >
            Définir comme page d'accueil
          </Button>
        )}
      </Section>
      <SeoSection key={page.id} pageId={page.id} />
      <Section title="Site">
        <TextField
          label="Nom du projet"
          value={doc.name}
          onChange={(name) => site({ name }, 'Nom du projet')}
        />
        <TextField
          label="Langue (fr, en-GB…)"
          value={doc.settings.lang}
          onChange={(lang) => site({ lang }, 'Langue du site')}
        />
        <TextField
          label="URL canonique (https://exemple.fr)"
          value={doc.settings.siteUrl ?? ''}
          onChange={(siteUrl) => site({ siteUrl: siteUrl || null }, 'URL canonique')}
        />
      </Section>
      <RedirectsSection />
    </>
  );
}

/** Search and sharing metadata of a page (SB-08). Empty fields fall back to the page and site. */
function SeoSection({ pageId }: { pageId: string }) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) return null;
  const seo = page.seo ?? {};
  const set = (patch: Partial<Seo>, label: string) => {
    const next = Object.fromEntries(
      Object.entries({ ...seo, ...patch }).filter(([, v]) => v !== undefined && v !== ''),
    ) as Seo;
    return store.dispatch('updatePage', { id: page.id, seo: Object.keys(next).length ? next : null }, label);
  };
  const images = Object.values(doc.assets).filter(isPicture);
  return (
    <Section title="Référencement et partage">
      <TextField
        label="Titre SEO (sinon le titre de la page)"
        value={seo.title ?? ''}
        onChange={(title) => set({ title }, 'Titre SEO')}
      />
      <TextField
        label="Meta description (≈ 160 caractères)"
        multiline
        value={seo.description ?? ''}
        onChange={(description) => set({ description }, 'Meta description')}
      />
      <TextField
        label="URL canonique (si différente de la page)"
        value={seo.canonical ?? ''}
        onChange={(canonical) => set({ canonical }, 'URL canonique de la page')}
      />
      <div className="field field-boolean">
        <label className="field-check">
          <input
            type="checkbox"
            checked={seo.index !== false}
            onChange={(e) => set({ index: e.target.checked ? undefined : false }, 'Indexation de la page')}
          />
          Indexer (moteurs de recherche, sitemap)
        </label>
      </div>
      <label className="field field-stack">
        <span className="field-label">Image de partage (Open Graph)</span>
        <select
          value={seo.image ?? ''}
          onChange={(e) => set({ image: e.target.value || undefined }, 'Image de partage')}
        >
          <option value="">Aucune</option>
          {images.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name || a.file}
            </option>
          ))}
        </select>
      </label>
    </Section>
  );
}

/** Old addresses redirected to a page or URL (SB-08), exported as host configurations. */
function RedirectsSection() {
  const store = useStore();
  const redirects = useEditor((s) => s.doc.redirects) ?? NONE;
  const homeId = useEditor((s) => s.doc.settings.homePageId);
  const save = (next: Redirect[], label: string) =>
    store.dispatch('setRedirects', { redirects: next }, label);
  const edit = (i: number, patch: Partial<Redirect>, label: string) =>
    save(
      redirects.map((r, j) => (j === i ? { ...r, ...patch } : r)),
      label,
    );
  return (
    <Section title="Redirections">
      {redirects.map((r, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place, in order.
        <div className="menu-row" key={i}>
          <TextField
            label="Ancienne adresse (/chemin/)"
            value={r.from}
            onChange={(from) => edit(i, { from }, 'Redirection')}
          />
          <LinkField
            label="Vers"
            value={r.to}
            onChange={(to) => edit(i, { to: to ?? r.to }, 'Redirection')}
          />
          <div className="field field-boolean">
            <label className="field-check">
              <input
                type="checkbox"
                checked={r.permanent}
                onChange={(e) => edit(i, { permanent: e.target.checked }, 'Redirection')}
              />
              Permanente (301)
            </label>
            <IconButton
              size="sm"
              variant="danger"
              label="Supprimer la redirection"
              icon={Trash2}
              onClick={() =>
                save(
                  redirects.filter((_, j) => j !== i),
                  'Supprimer une redirection',
                )
              }
            />
          </div>
        </div>
      ))}
      <p className="hint">
        Exportées pour Netlify, Cloudflare, nginx et Apache ; un site statique ne peut pas les imposer seul.
      </p>
      <Button
        size="sm"
        icon={Plus}
        onClick={() => {
          let n = redirects.length + 1;
          while (redirects.some((r) => r.from === `/ancienne-page-${n}/`)) n++;
          save(
            [
              ...redirects,
              { from: `/ancienne-page-${n}/`, to: { kind: 'page', pageId: homeId }, permanent: true },
            ],
            'Ajouter une redirection',
          );
        }}
      >
        Ajouter une redirection
      </Button>
    </Section>
  );
}
