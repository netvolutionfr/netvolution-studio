import {
  contentText,
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
  t,
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
    const text = contentText(doc.settings.lang);
    store.dispatch(
      'createPage',
      { title: text('content.newPage.title'), slug: freeSlug(doc, text('content.newPage.slug')), tree },
      t('pages.add'),
    );
  };

  return (
    <section className="panel pages" aria-label={t('pages.title')}>
      <div className="panel-title-row">
        <h2 className="panel-title">{t('pages.title')}</h2>
        <IconButton size="sm" label={t('pages.add')} icon={FilePlus} onClick={add} />
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
                <House aria-label={t('pages.home')} size={14} strokeWidth={1.75} />
              ) : (
                <span className="pages-icon" aria-hidden="true" />
              )}
              <span className="pages-title">{p.title || t('pages.untitled')}</span>
              {!p.publish && <EyeOff aria-label={t('pages.unpublished')} size={14} strokeWidth={1.75} />}
              <span className="pages-path">{pagePath(p.slug)}</span>
            </button>
          </li>
        ))}
      </ul>
      {symbols.length > 0 && (
        <>
          <h3 className="pages-subtitle">{t('pages.symbols')}</h3>
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
      <h3 className="pages-subtitle">{t('pages.layouts')}</h3>
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
                  {role === 'header' ? t('pages.createHeader') : t('pages.createFooter')}
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
  // What the Studio writes into the site follows the site language (ADR-0024).
  const text = contentText(doc.settings.lang);
  const name = text(role === 'header' ? 'content.layout.header' : 'content.layout.footer');
  const siteName = doc.name || text('content.layout.siteName');
  store.begin(role === 'header' ? t('pages.createHeader') : t('pages.createFooter'));
  let menuId = doc.menus?.[0]?.id;
  if (!menuId) {
    menuId = 'principal';
    const items = doc.pages
      .filter((p) => p.publish)
      .slice(0, 50)
      .map((p, i) => ({
        id: `e${i + 1}`,
        label: p.title || text('content.layout.page'),
        link: { kind: 'page' as const, pageId: p.id },
      }));
    store.dispatch('setMenu', { menu: { id: menuId, name: text('content.layout.menu'), items } });
  }
  const bar = (children: NodeTemplate[]): NodeTemplate => ({
    type: 'stack',
    name: text('content.layout.bar'),
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
    props: { menuId, label, toggle: text('content.nav.toggle'), collapse },
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
                name: text('content.sections.logo'),
                props: {
                  label: siteName,
                  link: { kind: 'page', pageId: doc.settings.homePageId },
                  variant: 'text',
                },
                style: { base: { fontSize: px(20), fontWeight: 700 } },
              },
              nav(text('content.nav.label'), 'mobile'),
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
                props: { content: [{ text: text('content.layout.copyright', { name: siteName }) }] },
                style: { base: { color: '#e5e7eb' } },
              },
              nav(text('content.layout.footerNav'), 'never', '#e5e7eb'),
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
    <Section title={layout.role === 'header' ? t('pages.sharedHeader') : t('pages.sharedFooter')}>
      <p className="hint">{t('pages.layoutShown', { count: shown, total: doc.pages.length })}</p>
      <Button
        size="sm"
        icon={Trash2}
        variant="danger"
        onClick={() =>
          confirm(t('pages.confirmRemoveLayout', { name: layout.name })) &&
          store.dispatch(
            'removeLayout',
            { id: layout.id },
            t('pages.removeLayoutDone', { name: layout.name }),
          )
        }
      >
        {t('pages.remove')}
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
      <Section title={t('pages.page')}>
        <TextField
          key={`${page.id}-title`}
          label={t('pages.pageTitle')}
          value={page.title}
          onChange={(title) => update({ title }, t('pages.pageTitleDone'))}
        />
        {isHome ? (
          <p className="hint">
            {t('pages.address')}
            <code>/</code>
            {t('pages.homeSuffix')}
          </p>
        ) : (
          <TextField
            key={`${page.id}-slug`}
            label={t('pages.slug')}
            value={page.slug}
            onChange={(slug) => update({ slug }, t('pages.slugDone'))}
          />
        )}
        {!isHome && (
          <p className="hint">
            {t('pages.publishedAt')}
            <code>{pagePath(page.slug)}</code>
            {t('pages.slugHint')}
          </p>
        )}
        {links > 0 && (
          <p className="hint" role="note">
            {t('pages.inboundLinks', { count: links })}
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
                      role === 'header' ? t('pages.showHeader') : t('pages.showFooter'),
                    )
                  }
                />
                {role === 'header' ? t('pages.showHeader') : t('pages.showFooter')}
              </label>
            </div>
          ))}
        <div className="field field-boolean">
          <label className="field-check">
            <input
              type="checkbox"
              checked={page.publish}
              disabled={isHome}
              onChange={(e) => update({ publish: e.target.checked }, t('pages.publishDone'))}
            />
            {t('pages.publish')}
          </label>
        </div>
        <div className="inspector-actions" role="toolbar" aria-label={t('pages.actions')}>
          <IconButton
            size="sm"
            label={t('pages.moveUp')}
            icon={ArrowUp}
            disabled={index <= 0}
            onClick={() => store.dispatch('movePage', { id: page.id, index: index - 1 }, t('pages.moveUp'))}
          />
          <IconButton
            size="sm"
            label={t('pages.moveDown')}
            icon={ArrowDown}
            disabled={index >= doc.pages.length - 1}
            onClick={() => store.dispatch('movePage', { id: page.id, index: index + 1 }, t('pages.moveDown'))}
          />
          <IconButton
            size="sm"
            label={t('pages.duplicate')}
            icon={CopyPlus}
            onClick={() => store.dispatch('duplicatePage', { id: page.id }, t('pages.duplicate'))}
          />
          <IconButton
            size="sm"
            label={t('pages.removePage')}
            icon={Trash2}
            variant="danger"
            disabled={isHome}
            onClick={() =>
              confirm(t('pages.confirmRemovePage', { title: page.title })) &&
              store.dispatch('removePage', { id: page.id }, t('pages.removePage'))
            }
          />
        </div>
        {!isHome && (
          <Button
            size="sm"
            icon={House}
            onClick={() => store.dispatch('setHomePage', { id: page.id }, t('pages.setHomeDone'))}
          >
            {t('pages.setHome')}
          </Button>
        )}
      </Section>
      <SeoSection key={page.id} pageId={page.id} />
      <Section title={t('pages.site')}>
        <TextField
          label={t('pages.projectName')}
          value={doc.name}
          onChange={(name) => site({ name }, t('pages.projectName'))}
        />
        <TextField
          label={t('pages.siteLang')}
          value={doc.settings.lang}
          onChange={(lang) => site({ lang }, t('pages.siteLangDone'))}
        />
        <TextField
          label={t('pages.siteUrl')}
          value={doc.settings.siteUrl ?? ''}
          onChange={(siteUrl) => site({ siteUrl: siteUrl || null }, t('pages.siteUrlDone'))}
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
    <Section title={t('seo.title')}>
      <TextField
        label={t('seo.seoTitle')}
        value={seo.title ?? ''}
        onChange={(title) => set({ title }, t('seo.seoTitleDone'))}
      />
      <TextField
        label={t('seo.description')}
        multiline
        value={seo.description ?? ''}
        onChange={(description) => set({ description }, t('seo.descriptionDone'))}
      />
      <TextField
        label={t('seo.canonical')}
        value={seo.canonical ?? ''}
        onChange={(canonical) => set({ canonical }, t('seo.canonicalDone'))}
      />
      <div className="field field-boolean">
        <label className="field-check">
          <input
            type="checkbox"
            checked={seo.index !== false}
            onChange={(e) => set({ index: e.target.checked ? undefined : false }, t('seo.indexDone'))}
          />
          {t('seo.index')}
        </label>
      </div>
      <label className="field field-stack">
        <span className="field-label">{t('seo.image')}</span>
        <select
          value={seo.image ?? ''}
          onChange={(e) => set({ image: e.target.value || undefined }, t('seo.imageDone'))}
        >
          <option value="">{t('seo.none')}</option>
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
  const lang = useEditor((s) => s.doc.settings.lang);
  const save = (next: Redirect[], label: string) =>
    store.dispatch('setRedirects', { redirects: next }, label);
  const edit = (i: number, patch: Partial<Redirect>, label: string) =>
    save(
      redirects.map((r, j) => (j === i ? { ...r, ...patch } : r)),
      label,
    );
  return (
    <Section title={t('redirects.title')}>
      {redirects.map((r, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place, in order.
        <div className="menu-row" key={i}>
          <TextField
            label={t('redirects.from')}
            value={r.from}
            onChange={(from) => edit(i, { from }, t('redirects.done'))}
          />
          <LinkField
            label={t('redirects.to')}
            value={r.to}
            onChange={(to) => edit(i, { to: to ?? r.to }, t('redirects.done'))}
          />
          <div className="field field-boolean">
            <label className="field-check">
              <input
                type="checkbox"
                checked={r.permanent}
                onChange={(e) => edit(i, { permanent: e.target.checked }, t('redirects.done'))}
              />
              {t('redirects.permanent')}
            </label>
            <IconButton
              size="sm"
              variant="danger"
              label={t('redirects.remove')}
              icon={Trash2}
              onClick={() =>
                save(
                  redirects.filter((_, j) => j !== i),
                  t('redirects.removeDone'),
                )
              }
            />
          </div>
        </div>
      ))}
      <p className="hint">{t('redirects.hint')}</p>
      <Button
        size="sm"
        icon={Plus}
        onClick={() => {
          const from = (n: number) => contentText(lang)('content.redirect.from', { n });
          let n = redirects.length + 1;
          while (redirects.some((r) => r.from === from(n))) n++;
          save(
            [...redirects, { from: from(n), to: { kind: 'page', pageId: homeId }, permanent: true }],
            t('redirects.add'),
          );
        }}
      >
        {t('redirects.add')}
      </Button>
    </Section>
  );
}
