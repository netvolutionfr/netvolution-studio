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

const SIZE_GROUPS: [Size['group'], string, string, string][] = [
  ['spacing', 'Espacements', 'Espacement', 'espace'],
  ['radius', 'Arrondis', 'Arrondi', 'arrondi'],
  ['width', 'Largeurs maximales', 'Largeur maximale', 'largeur'],
  ['font', 'Tailles de police', 'Taille de police', 'taille'],
];
/** Text styles with these ids also style the matching HTML element (ADR-0009). */
const ELEMENT_STYLES: [string, string][] = [
  ['body', 'Texte courant'],
  ['h1', 'Titre 1'],
  ['h2', 'Titre 2'],
  ['h3', 'Titre 3'],
  ['h4', 'Titre 4'],
  ['h5', 'Titre 5'],
  ['h6', 'Titre 6'],
];
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
  const set = (kind: TokenKind, id: string, value: unknown, label = 'Modifier un token') =>
    store.dispatch('setToken', { kind, id, value }, label);
  const remove = (kind: TokenKind, id: string) =>
    store.dispatch('removeToken', { kind, id }, 'Supprimer un token');

  return (
    <div className="ds">
      <Section title="Couleurs">
        {Object.entries(tokens.colors).map(([id, c]) => (
          <div className="ds-row" key={id}>
            <ColorInput
              label={c.label}
              value={c.value}
              onChange={(value) => set('colors', id, { ...c, value })}
            />
            <TextField label="Nom" value={c.label} onChange={(label) => set('colors', id, { ...c, label })} />
            <RemoveButton label={c.label} onClick={() => remove('colors', id)} />
          </div>
        ))}
        <AddButton
          label="Ajouter une couleur"
          onClick={() =>
            set(
              'colors',
              freeId(tokens.colors, 'couleur'),
              { label: 'Couleur', value: '#2563eb' },
              'Ajouter une couleur',
            )
          }
        />
      </Section>

      {SIZE_GROUPS.map(([group, title, singular, prefix]) => (
        <Section key={group} title={title}>
          {Object.entries(tokens.sizes)
            .filter(([, t]) => t.group === group)
            .map(([id, t]) => (
              <div className="ds-row" key={id}>
                <TextField
                  label="Nom"
                  value={t.label}
                  onChange={(label) => set('sizes', id, { ...t, label })}
                />
                {[{ id: 'base', label: 'Base' }, ...bps].map((bp) => (
                  <LengthInput
                    key={bp.id}
                    label={`${t.label} — ${bp.label}`}
                    caption={bp.label}
                    value={t.value[bp.id]}
                    optional={bp.id !== 'base'}
                    onChange={(v) => {
                      const { [bp.id]: _, ...rest } = t.value;
                      set('sizes', id, { ...t, value: v ? { ...rest, [bp.id]: v } : rest });
                    }}
                  />
                ))}
                <RemoveButton label={t.label} onClick={() => remove('sizes', id)} />
              </div>
            ))}
          <AddButton
            label={`Ajouter : ${singular.toLowerCase()}`}
            onClick={() =>
              set(
                'sizes',
                freeId(tokens.sizes, prefix),
                { label: singular, group, value: { base: { value: 16, unit: 'px' } } },
                'Ajouter un token',
              )
            }
          />
        </Section>
      ))}

      <Section title="Polices">
        {Object.entries(tokens.fonts).map(([id, f]) => (
          <div className="ds-row" key={id}>
            <TextField label="Nom" value={f.label} onChange={(label) => set('fonts', id, { ...f, label })} />
            <TextField
              label="Familles, par ordre de préférence"
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
            ? `Polices importées : ${importedFamilies.join(', ')}. Placez leur nom en tête des familles ; les autres ne s’affichent que si le visiteur les a installées. `
            : 'Sans police importée (catalogue ou fichier WOFF2 de la médiathèque), seules les polices installées chez le visiteur s’affichent. '}
          Terminez par une famille générique (serif, sans-serif).
        </p>
        <Button size="sm" icon={BookOpen} onClick={() => setCatalog(true)}>
          Catalogue de polices…
        </Button>
        <FontCatalog open={catalog} onClose={() => setCatalog(false)} />
        <AddButton
          label="Ajouter une police"
          onClick={() =>
            set(
              'fonts',
              freeId(tokens.fonts, 'police'),
              { label: 'Police', stack: ['system-ui', 'sans-serif'] },
              'Ajouter une police',
            )
          }
        />
      </Section>

      <Section title="Styles de texte">
        {Object.entries(tokens.textStyles).map(([id, t]) => (
          <TextStyleRow
            key={id}
            id={id}
            style={t}
            doc={doc}
            onChange={(v) => set('textStyles', id, v)}
            onRemove={() => remove('textStyles', id)}
          />
        ))}
        <p className="hint">
          Les styles « Texte courant » et « Titre 1 » à « Titre 6 » s'appliquent aussi par défaut aux
          paragraphes et aux titres de même niveau.
        </p>
        <div className="ds-add">
          {ELEMENT_STYLES.filter(([id]) => !tokens.textStyles[id]).map(([id, label]) => (
            <AddButton
              key={id}
              label={label}
              onClick={() =>
                set('textStyles', id, { label, style: { base: {} } }, 'Ajouter un style de texte')
              }
            />
          ))}
          <AddButton
            label="Style personnalisé"
            onClick={() =>
              set(
                'textStyles',
                freeId(tokens.textStyles, 'texte'),
                { label: 'Style', style: { base: {} } },
                'Ajouter un style de texte',
              )
            }
          />
        </div>
      </Section>

      <Section title="CSS du projet">
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
  const tx = useTransaction('CSS du projet');
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
        Feuille de style
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
            {'error' in issue ? 'Erreur' : 'Attention'}, ligne {issue.line} : {issue.message}
          </li>
        ))}
      </ul>
      {check?.ok === false && (
        <p className="field-error">Feuille non appliquée : la dernière version valide reste en place.</p>
      )}
      {images.length > 0 && (
        <select
          aria-label="Insérer une image de la médiathèque"
          value=""
          onChange={(e) => insertImage(e.target.value)}
        >
          <option value="">Insérer une image de la médiathèque…</option>
          {images.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name || a.file}
            </option>
          ))}
        </select>
      )}
      <p className="hint">
        Visez vos éléments par les classes de l’inspecteur (section Avancé, « Classes CSS »). Sont refusés :
        @import, @font-face, les adresses externes et les scripts. Cette feuille l’emporte sur les réglages de
        l’inspecteur.
      </p>
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
  const { style: t, doc } = props;
  const fonts = doc.tokens?.fonts ?? {};
  const base = t.style.base ?? {};
  const setBp = (bp: string, patch: Record<string, unknown>) => {
    const decls = Object.fromEntries(
      Object.entries({ ...(t.style[bp] ?? {}), ...patch }).filter(([, v]) => v !== undefined),
    );
    return props.onChange({ ...t, style: { ...t.style, [bp]: decls } });
  };
  return (
    <div className="ds-text">
      <div className="ds-row">
        <TextField label="Nom" value={t.label} onChange={(label) => props.onChange({ ...t, label })} />
        <label className="ds-select">
          Police
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
          Graisse
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
        <RemoveButton label={t.label} onClick={props.onRemove} />
      </div>
      <div className="ds-row">
        <label className="ds-select">
          Casse
          <select
            value={base.textTransform ?? ''}
            onChange={(e) => setBp('base', { textTransform: e.target.value || undefined })}
          >
            <option value="">—</option>
            <option value="uppercase">CAPITALES</option>
            <option value="lowercase">minuscules</option>
            <option value="capitalize">Initiales</option>
            <option value="none">Telle que saisie</option>
          </select>
        </label>
        <label className="field-check">
          <input
            type="checkbox"
            checked={base.fontStyle === 'italic'}
            onChange={(e) => setBp('base', { fontStyle: e.target.checked ? 'italic' : undefined })}
          />
          Italique
        </label>
      </div>
      <div className="ds-row">
        {[{ id: 'base', label: 'Base' }, ...breakpointsByWidth(doc)].map((bp) => {
          const d = t.style[bp.id] ?? {};
          const size = d.fontSize && 'unit' in d.fontSize ? d.fontSize : undefined;
          return (
            <div className="ds-bp" key={bp.id}>
              <LengthInput
                label={`${t.label} — taille (${bp.label})`}
                caption={`Taille · ${bp.label}`}
                value={size}
                optional
                onChange={(fontSize) => setBp(bp.id, { fontSize })}
              />
              <NumberInput
                label={`${t.label} — interligne (${bp.label})`}
                caption="Interligne"
                value={d.lineHeight}
                onChange={(lineHeight) => setBp(bp.id, { lineHeight })}
              />
              <LengthInput
                label={`${t.label} — espacement des lettres (${bp.label})`}
                caption="Lettres"
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
  const tx = useTransaction('Couleur');
  return (
    <input
      type="color"
      aria-label={`${props.label} — valeur`}
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
          placeholder={props.optional ? 'hérité' : undefined}
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
          aria-label={`${props.label} (unité)`}
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
        placeholder="hérité"
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
    label={`Supprimer ${props.label}`}
    icon={Trash2}
    onClick={props.onClick}
  />
);
