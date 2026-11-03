import {
  breakpointsByWidth,
  CUSTOM_CSS_MAX,
  checkCustomCss,
  EMPTY_TOKENS,
  isPicture,
  type Length,
  type Site,
  type TokenKind,
  type Tokens,
  t,
} from '@ns/core';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, IconButton } from '../ui/index.ts';
import { highlightCss } from './cssHighlight.ts';
import { FontCatalog } from './FontCatalog.tsx';
import { TextField, useTransaction } from './fields.tsx';
import { Section } from './StyleFields.tsx';
import { useEditor, useStore } from './store.ts';

type Size = Tokens['sizes'][string];
type TextStyle = Tokens['textStyles'][string];

/** Size group and the id prefix of its new tokens. */
const SIZE_GROUPS: [Size['group'], string][] = [
  ['spacing', 'espace'],
  ['radius', 'arrondi'],
  ['width', 'largeur'],
  ['font', 'taille'],
];
/** Text styles with these ids also style the matching HTML element (ADR-0009). */
const ELEMENT_STYLES = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
const UNITS = ['px', 'rem', 'em', '%', 'vw', 'vh'] as const;
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const freeId = (taken: Record<string, unknown>, base: string) => {
  for (let i = 1; ; i++) {
    const id = i === 1 ? base : `${base}-${i}`;
    if (!taken[id]) return id;
  }
};

/** Site design system (SB-05): colors, sizes, fonts and text styles. Every edit is an undoable command. */
export function DesignSystem() {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const tokens = doc.tokens ?? EMPTY_TOKENS;
  const bps = breakpointsByWidth(doc);
  const [catalog, setCatalog] = useState(false);
  const importedFamilies = [
    ...new Set(Object.values(doc.assets).flatMap((a) => (a.kind === 'font' ? [a.family] : []))),
  ];
  const set = (kind: TokenKind, id: string, value: unknown, label = t('ds.editToken')) =>
    store.dispatch('setToken', { kind, id, value }, label);
  const remove = (kind: TokenKind, id: string) =>
    store.dispatch('removeToken', { kind, id }, t('ds.removeToken'));

  return (
    <div className="ds">
      <Section title={t('ds.colors')}>
        {Object.entries(tokens.colors).map(([id, c]) => (
          <div className="ds-row" key={id}>
            <ColorInput
              label={c.label}
              value={c.value}
              onChange={(value) => set('colors', id, { ...c, value })}
            />
            <TextField
              label={t('ds.name')}
              value={c.label}
              onChange={(label) => set('colors', id, { ...c, label })}
            />
            <RemoveButton label={c.label} onClick={() => remove('colors', id)} />
          </div>
        ))}
        <AddButton
          label={t('ds.addColor')}
          onClick={() =>
            set(
              'colors',
              freeId(tokens.colors, 'couleur'),
              { label: t('ds.newColor'), value: '#2563eb' },
              t('ds.addColor'),
            )
          }
        />
      </Section>

      {SIZE_GROUPS.map(([group, prefix]) => (
        <Section key={group} title={t(`ds.sizeGroups.${group}`)}>
          {Object.entries(tokens.sizes)
            .filter(([, tok]) => tok.group === group)
            .map(([id, tok]) => (
              <div className="ds-row" key={id}>
                <TextField
                  label={t('ds.name')}
                  value={tok.label}
                  onChange={(label) => set('sizes', id, { ...tok, label })}
                />
                {[{ id: 'base', label: t('ds.base') }, ...bps].map((bp) => (
                  <LengthInput
                    key={bp.id}
                    label={`${tok.label} — ${bp.label}`}
                    caption={bp.label}
                    value={tok.value[bp.id]}
                    optional={bp.id !== 'base'}
                    onChange={(v) => {
                      const { [bp.id]: _, ...rest } = tok.value;
                      set('sizes', id, { ...tok, value: v ? { ...rest, [bp.id]: v } : rest });
                    }}
                  />
                ))}
                <RemoveButton label={tok.label} onClick={() => remove('sizes', id)} />
              </div>
            ))}
          <AddButton
            label={t('ds.addSize', { name: t(`ds.sizeSingular.${group}`).toLowerCase() })}
            onClick={() =>
              set(
                'sizes',
                freeId(tokens.sizes, prefix),
                { label: t(`ds.sizeSingular.${group}`), group, value: { base: { value: 16, unit: 'px' } } },
                t('ds.addToken'),
              )
            }
          />
        </Section>
      ))}

      <Section title={t('ds.fonts')}>
        {Object.entries(tokens.fonts).map(([id, f]) => (
          <div className="ds-row" key={id}>
            <TextField
              label={t('ds.name')}
              value={f.label}
              onChange={(label) => set('fonts', id, { ...f, label })}
            />
            <TextField
              label={t('ds.families')}
              value={f.stack.join(', ')}
              onChange={(v) =>
                set('fonts', id, {
                  ...f,
                  stack: v
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
            <RemoveButton label={f.label} onClick={() => remove('fonts', id)} />
          </div>
        ))}
        <p className="hint">
          {importedFamilies.length > 0
            ? t('ds.imported', { families: importedFamilies.join(', ') })
            : t('ds.noImported')}
          {t('ds.generic')}
        </p>
        <Button size="sm" icon={BookOpen} onClick={() => setCatalog(true)}>
          {t('ds.catalog')}
        </Button>
        <FontCatalog open={catalog} onClose={() => setCatalog(false)} />
        <AddButton
          label={t('ds.addFont')}
          onClick={() =>
            set(
              'fonts',
              freeId(tokens.fonts, 'police'),
              { label: t('ds.newFont'), stack: ['system-ui', 'sans-serif'] },
              t('ds.addFont'),
            )
          }
        />
      </Section>

      <Section title={t('ds.textStyles')}>
        {Object.entries(tokens.textStyles).map(([id, ts]) => (
          <TextStyleRow
            key={id}
            id={id}
            style={ts}
            doc={doc}
            onChange={(v) => set('textStyles', id, v)}
            onRemove={() => remove('textStyles', id)}
          />
        ))}
        <p className="hint">{t('ds.textStylesHint')}</p>
        <div className="ds-add">
          {ELEMENT_STYLES.filter((id) => !tokens.textStyles[id]).map((id) => (
            <AddButton
              key={id}
              label={t(`ds.elementStyles.${id}`)}
              onClick={() =>
                set(
                  'textStyles',
                  id,
                  { label: t(`ds.elementStyles.${id}`), style: { base: {} } },
                  t('ds.addTextStyle'),
                )
              }
            />
          ))}
          <AddButton
            label={t('ds.customStyle')}
            onClick={() =>
              set(
                'textStyles',
                freeId(tokens.textStyles, 'texte'),
                { label: t('ds.newStyle'), style: { base: {} } },
                t('ds.addTextStyle'),
              )
            }
          />
        </div>
      </Section>

      <Section title={t('ds.projectCss')}>
        <ProjectCss />
      </Section>
    </div>
  );
}

/**
 * Project stylesheet (ADR-0023): checked as typed, line by line. Only a sheet the parser accepts
 * reaches the document; while it has errors the last valid one stays applied.
 */
function ProjectCss() {
  const store = useStore();
  const id = useId();
  const saved = useEditor((s) => s.doc.customCss ?? '');
  // The assets object is stable between edits; filtering in the selector would loop.
  const assets = useEditor((s) => s.doc.assets);
  const images = Object.values(assets).filter(isPicture);
  const tx = useTransaction(t('ds.projectCss'));
  const editor = useRef<HTMLTextAreaElement>(null);
  const colors = useRef<HTMLPreElement>(null);
  const [draft, setDraft] = useState(saved);
  // An undo or another edit replaces the draft, except while typing.
  useEffect(() => {
    if (document.activeElement !== editor.current) setDraft(saved);
  }, [saved]);
  const check = draft.trim() ? checkCustomCss(draft) : null;
  const issues = check
    ? [...(check.ok ? [] : check.errors.map((e) => ({ ...e, error: true }))), ...check.warnings]
    : [];
  const change = (css: string) => {
    setDraft(css);
    tx.edit();
    if (css.length <= CUSTOM_CSS_MAX) store.dispatch('setProjectCss', { css });
  };
  const insertImage = (assetId: string) => {
    const el = editor.current;
    if (!el || !assetId) return;
    const text = `url("ns-asset:${assetId}")`;
    el.focus();
    change(draft.slice(0, el.selectionStart) + text + draft.slice(el.selectionEnd));
    tx.end();
  };
  return (
    <div className="field field-stack">
      <label htmlFor={id} className="field-label">
        {t('ds.stylesheet')}
      </label>
      {/* Colored copy under a transparent textarea, which stays the real, accessible control. */}
      <div className="css-editor">
        <pre ref={colors} aria-hidden="true">
          {highlightCss(draft).map((s) =>
            s.kind ? (
              <span key={s.start} className={`css-tok-${s.kind}`}>
                {s.text}
              </span>
            ) : (
              s.text
            ),
          )}
          {/* A final newline keeps the last empty line as tall as in the textarea. */}
          {'\n'}
        </pre>
        <textarea
          ref={editor}
          id={id}
          rows={14}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          value={draft}
          placeholder={'.carte-relief:hover {\n  transform: translateY(-4px);\n}'}
          aria-invalid={check?.ok === false}
          aria-describedby={`${id}-issues`}
          onChange={(e) => change(e.target.value)}
          onBlur={() => tx.end()}
          onScroll={(e) => {
            if (colors.current) colors.current.scrollTop = e.currentTarget.scrollTop;
          }}
        />
      </div>
      <ul id={`${id}-issues`} className="css-issues" aria-live="polite">
        {issues.map((issue, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: issues are recomputed as a whole on each keystroke.
          <li key={i} className={'error' in issue ? 'css-error' : 'css-warning'}>
            {'error' in issue
              ? t('ds.cssError', { line: issue.line, message: issue.message })
              : t('ds.cssWarning', { line: issue.line, message: issue.message })}
          </li>
        ))}
      </ul>
      {check?.ok === false && <p className="field-error">{t('ds.cssNotApplied')}</p>}
      {images.length > 0 && (
        <select aria-label={t('ds.insertImage')} value="" onChange={(e) => insertImage(e.target.value)}>
          <option value="">{t('ds.insertImageOption')}</option>
          {images.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name || a.file}
            </option>
          ))}
        </select>
      )}
      <p className="hint">{t('ds.cssHint')}</p>
    </div>
  );
}

function TextStyleRow(props: {
  id: string;
  style: TextStyle;
  doc: Site;
  onChange: (v: TextStyle) => { ok: boolean };
  onRemove: () => void;
}) {
  const { style: ts, doc } = props;
  const fonts = doc.tokens?.fonts ?? {};
  const base = ts.style.base ?? {};
  const setBp = (bp: string, patch: Record<string, unknown>) => {
    const decls = Object.fromEntries(
      Object.entries({ ...(ts.style[bp] ?? {}), ...patch }).filter(([, v]) => v !== undefined),
    );
    return props.onChange({ ...ts, style: { ...ts.style, [bp]: decls } });
  };
  return (
    <div className="ds-text">
      <div className="ds-row">
        <TextField
          label={t('ds.name')}
          value={ts.label}
          onChange={(label) => props.onChange({ ...ts, label })}
        />
        <label className="ds-select">
          {t('ds.font')}
          <select
            value={base.fontFamily?.token ?? ''}
            onChange={(e) =>
              setBp('base', { fontFamily: e.target.value ? { token: e.target.value } : undefined })
            }
          >
            <option value="">—</option>
            {Object.entries(fonts).map(([fid, f]) => (
              <option key={fid} value={fid}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ds-select">
          {t('ds.weight')}
          <select
            value={base.fontWeight ?? ''}
            onChange={(e) =>
              setBp('base', { fontWeight: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">—</option>
            {WEIGHTS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <RemoveButton label={ts.label} onClick={props.onRemove} />
      </div>
      <div className="ds-row">
        <label className="ds-select">
          {t('ds.case')}
          <select
            value={base.textTransform ?? ''}
            onChange={(e) => setBp('base', { textTransform: e.target.value || undefined })}
          >
            <option value="">—</option>
            <option value="uppercase">{t('ds.uppercase')}</option>
            <option value="lowercase">{t('ds.lowercase')}</option>
            <option value="capitalize">{t('ds.capitalize')}</option>
            <option value="none">{t('ds.asTyped')}</option>
          </select>
        </label>
        <label className="field-check">
          <input
            type="checkbox"
            checked={base.fontStyle === 'italic'}
            onChange={(e) => setBp('base', { fontStyle: e.target.checked ? 'italic' : undefined })}
          />
          {t('ds.italic')}
        </label>
      </div>
      <div className="ds-row">
        {[{ id: 'base', label: t('ds.base') }, ...breakpointsByWidth(doc)].map((bp) => {
          const d = ts.style[bp.id] ?? {};
          const size = d.fontSize && 'unit' in d.fontSize ? d.fontSize : undefined;
          return (
            <div className="ds-bp" key={bp.id}>
              <LengthInput
                label={t('ds.sizeLabel', { style: ts.label, bp: bp.label })}
                caption={t('ds.sizeCaption', { bp: bp.label })}
                value={size}
                optional
                onChange={(fontSize) => setBp(bp.id, { fontSize })}
              />
              <NumberInput
                label={t('ds.lineHeightLabel', { style: ts.label, bp: bp.label })}
                caption={t('ds.lineHeight')}
                value={d.lineHeight}
                onChange={(lineHeight) => setBp(bp.id, { lineHeight })}
              />
              <LengthInput
                label={t('ds.letterSpacingLabel', { style: ts.label, bp: bp.label })}
                caption={t('ds.letters')}
                value={d.letterSpacing}
                optional
                onChange={(letterSpacing) => setBp(bp.id, { letterSpacing })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColorInput(props: { label: string; value: string; onChange: (v: string) => void }) {
  const tx = useTransaction(t('ds.color'));
  return (
    <input
      type="color"
      aria-label={t('ds.colorValue', { label: props.label })}
      value={
        props.value.length === 4
          ? `#${[...props.value.slice(1)].map((c) => c + c).join('')}`
          : props.value.slice(0, 7)
      }
      onInput={(e) => {
        tx.edit();
        props.onChange((e.target as HTMLInputElement).value);
      }}
      onChange={tx.end}
      onBlur={tx.end}
    />
  );
}

/** Number + unit; an optional value is cleared by emptying the number. */
function LengthInput(props: {
  label: string;
  caption: string;
  value: Length | undefined;
  optional?: boolean;
  onChange: (v: Length | undefined) => void;
}) {
  const id = useId();
  const tx = useTransaction(props.label);
  const unit = props.value?.unit ?? 'px';
  return (
    <span className="ds-length">
      <label htmlFor={id}>{props.caption}</label>
      <span className="length">
        <input
          id={id}
          type="number"
          min={0}
          placeholder={props.optional ? t('ds.inherited') : undefined}
          value={props.value?.value ?? ''}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            tx.edit();
            if (Number.isNaN(n)) props.optional && props.onChange(undefined);
            else props.onChange({ value: n, unit });
          }}
          onBlur={tx.end}
        />
        <select
          aria-label={t('ds.unit', { label: props.label })}
          value={unit}
          onChange={(e) =>
            props.onChange({ value: props.value?.value ?? 0, unit: e.target.value as Length['unit'] })
          }
        >
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </span>
    </span>
  );
}

function NumberInput(props: {
  label: string;
  caption: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const id = useId();
  const tx = useTransaction(props.label);
  return (
    <span className="ds-length">
      <label htmlFor={id}>{props.caption}</label>
      <input
        id={id}
        type="number"
        min={0.5}
        max={4}
        step={0.05}
        placeholder={t('ds.inherited')}
        value={props.value ?? ''}
        onChange={(e) => {
          tx.edit();
          props.onChange(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber);
        }}
        onBlur={tx.end}
      />
    </span>
  );
}

const AddButton = (props: { label: string; onClick: () => void }) => (
  <Button size="sm" icon={Plus} onClick={props.onClick}>
    {props.label}
  </Button>
);
const RemoveButton = (props: { label: string; onClick: () => void }) => (
  <IconButton
    size="sm"
    variant="danger"
    label={t('ds.remove', { label: props.label })}
    icon={Trash2}
    onClick={props.onClick}
  />
);
