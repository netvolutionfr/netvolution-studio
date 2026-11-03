import { type Animation, type DocNode, EASINGS } from '@ns/core';
import { Play, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Button, IconButton } from '../ui/index.ts';
import { Field, useTransaction } from './fields.tsx';
import { replay, setMotion, useMotion } from './motion.ts';
import { Section } from './StyleFields.tsx';
import { useStore } from './store.ts';

const TRIGGERS: [Animation['trigger'], string][] = [
  ['load', 'Au chargement'],
  ['inView', 'À l’apparition (défilement)'],
  ['hover', 'Au survol'],
  ['focus', 'Au focus clavier'],
  ['click', 'Au clic'],
];
const EASING_LABELS: Record<(typeof EASINGS)[number], string> = {
  linear: 'Linéaire',
  ease: 'Douce',
  'ease-in': 'Accélérée',
  'ease-out': 'Décélérée',
  'ease-in-out': 'Accélérée puis décélérée',
};
const ENTRANCE: Animation = {
  trigger: 'inView',
  effect: { opacity: 0, y: 24 },
  duration: 600,
  delay: 0,
  easing: 'ease-out',
  iterations: 1,
  direction: 'normal',
};

/** Number field; an optional one is cleared by emptying it. A keyboard edit is one undo step. */
function Num(props: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number | undefined) => void;
}) {
  const id = useId();
  const tx = useTransaction(props.label);
  return (
    <Field label={props.label} htmlFor={id}>
      <input
        id={id}
        type="number"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value ?? ''}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          tx.edit();
          props.onChange(Number.isNaN(n) ? undefined : Math.min(props.max, Math.max(props.min, n)));
        }}
        onBlur={tx.end}
      />
    </Field>
  );
}

/** Animations of the selected element (CS-05, CS-07, ADR-0012), with canvas playback controls. */
export function AnimationSection({ node }: { node: DocNode }) {
  const store = useStore();
  const motion = useMotion();
  const list = node.animations ?? [];
  const save = (next: Animation[], label: string) =>
    store.dispatch('setAnimations', { id: node.id, animations: next }, label);
  const edit = (i: number, patch: Partial<Animation>, label: string) =>
    save(
      list.map((a, j) => (j === i ? { ...a, ...patch } : a)),
      label,
    );
  const effect = (i: number, a: Animation, key: keyof Animation['effect'], v: number | undefined) => {
    const next = { ...a.effect, [key]: v };
    if (v === undefined) delete next[key];
    return edit(i, { effect: next }, 'Effet de l’animation');
  };

  return (
    <Section title="Animations">
      <div className="field field-boolean">
        <label className="field-check">
          <input
            type="checkbox"
            checked={motion === 'on'}
            onChange={(e) => setMotion(e.target.checked ? 'on' : 'off')}
          />
          Jouer les animations dans le canvas
        </label>
      </div>
      <div className="field field-boolean">
        <label className="field-check">
          <input
            type="checkbox"
            checked={motion === 'reduce'}
            onChange={(e) => setMotion(e.target.checked ? 'reduce' : 'off')}
          />
          Simuler « mouvement réduit » (aucune animation)
        </label>
      </div>
      {list.length > 0 && (
        <p className="hint">
          L’effet est l’état de départ d’une entrée (chargement, apparition, clic) ou l’état visé au survol et
          au focus. Sans JavaScript ou en mouvement réduit, le contenu reste visible et immobile.
        </p>
      )}
      {list.map((a, i) => {
        const entrance = a.trigger !== 'hover' && a.trigger !== 'focus';
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: animations are edited in place, in order.
          <div className="menu-row animation-row" key={i}>
            <Field label="Déclencheur">
              <select
                aria-label="Déclencheur"
                value={a.trigger}
                onChange={(e) => {
                  const trigger = e.target.value as Animation['trigger'];
                  edit(
                    i,
                    {
                      trigger,
                      ...(a.iterations === 'infinite' && trigger !== 'load' ? { iterations: 1 } : {}),
                    },
                    'Déclencheur de l’animation',
                  );
                }}
              >
                {TRIGGERS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Num
              label={entrance ? 'Opacité de départ' : 'Opacité visée'}
              value={a.effect.opacity}
              min={0}
              max={1}
              step={0.1}
              onChange={(v) => effect(i, a, 'opacity', v)}
            />
            <Num
              label="Décalage X (px)"
              value={a.effect.x}
              min={-2000}
              max={2000}
              onChange={(v) => effect(i, a, 'x', v)}
            />
            <Num
              label="Décalage Y (px)"
              value={a.effect.y}
              min={-2000}
              max={2000}
              onChange={(v) => effect(i, a, 'y', v)}
            />
            <Num
              label="Échelle"
              value={a.effect.scale}
              min={0}
              max={10}
              step={0.05}
              onChange={(v) => effect(i, a, 'scale', v)}
            />
            <Num
              label="Rotation (°)"
              value={a.effect.rotate}
              min={-720}
              max={720}
              onChange={(v) => effect(i, a, 'rotate', v)}
            />
            <Num
              label="Durée (ms)"
              value={a.duration}
              min={0}
              max={10000}
              step={50}
              onChange={(v) => edit(i, { duration: v ?? 0 }, 'Durée de l’animation')}
            />
            <Num
              label="Délai (ms)"
              value={a.delay}
              min={0}
              max={10000}
              step={50}
              onChange={(v) => edit(i, { delay: v ?? 0 }, 'Délai de l’animation')}
            />
            <Field label="Accélération">
              <select
                aria-label="Accélération"
                value={typeof a.easing === 'string' ? a.easing : 'ease'}
                onChange={(e) =>
                  edit(i, { easing: e.target.value as Animation['easing'] }, 'Accélération de l’animation')
                }
              >
                {EASINGS.map((value) => (
                  <option key={value} value={value}>
                    {EASING_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            {entrance && (
              <>
                <Num
                  label="Répétitions"
                  value={a.iterations === 'infinite' ? undefined : a.iterations}
                  min={1}
                  max={10}
                  onChange={(v) => edit(i, { iterations: v ?? 1 }, 'Répétitions de l’animation')}
                />
                {a.trigger === 'load' && (
                  <div className="field field-boolean">
                    <label className="field-check">
                      <input
                        type="checkbox"
                        checked={a.iterations === 'infinite'}
                        onChange={(e) =>
                          edit(i, { iterations: e.target.checked ? 'infinite' : 1 }, 'Répétition infinie')
                        }
                      />
                      Répéter sans fin
                    </label>
                  </div>
                )}
                <Field label="Sens">
                  <select
                    aria-label="Sens"
                    value={a.direction}
                    onChange={(e) =>
                      edit(i, { direction: e.target.value as Animation['direction'] }, 'Sens de l’animation')
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="alternate">Aller-retour</option>
                  </select>
                </Field>
                <Num
                  label="Cascade des enfants (ms)"
                  value={a.stagger}
                  min={0}
                  max={2000}
                  step={50}
                  onChange={(v) => {
                    const { stagger: _, ...rest } = a;
                    save(
                      list.map((x, j) => (j === i ? (v === undefined ? rest : { ...rest, stagger: v }) : x)),
                      'Cascade de l’animation',
                    );
                  }}
                />
              </>
            )}
            <div className="inspector-actions" role="toolbar" aria-label={`Animation ${i + 1}`}>
              <Button size="sm" icon={Play} disabled={motion === 'reduce'} onClick={() => replay(node.id)}>
                Rejouer
              </Button>
              <IconButton
                size="sm"
                variant="danger"
                icon={Trash2}
                label="Supprimer l’animation"
                onClick={() =>
                  save(
                    list.filter((_, j) => j !== i),
                    'Supprimer une animation',
                  )
                }
              />
            </div>
          </div>
        );
      })}
      {list.length < 5 && (
        <Button size="sm" icon={Plus} onClick={() => save([...list, ENTRANCE], 'Ajouter une animation')}>
          Ajouter une animation
        </Button>
      )}
    </Section>
  );
}
