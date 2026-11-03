import { z } from 'zod';

/**
 * Declarative animations (CS-05, ADR-0012), independent of any animation library. `effect` is the
 * starting state of an entrance (`load`, `inView`, `click`) or the target state of `hover`/`focus`.
 */
export const animationEffectSchema = z.strictObject({
  opacity: z.number().min(0).max(1).optional(),
  /** Translation in px. */
  x: z.number().min(-2000).max(2000).optional(),
  y: z.number().min(-2000).max(2000).optional(),
  scale: z.number().min(0).max(10).optional(),
  /** Rotation in degrees. */
  rotate: z.number().min(-720).max(720).optional(),
});
export type AnimationEffect = z.infer<typeof animationEffectSchema>;

export const EASINGS = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'] as const;
const bezier = z.tuple([
  z.number().min(0).max(1),
  z.number().min(-2).max(3),
  z.number().min(0).max(1),
  z.number().min(-2).max(3),
]);

export const animationSchema = z
  .strictObject({
    trigger: z.enum(['load', 'inView', 'hover', 'focus', 'click']),
    effect: animationEffectSchema,
    /** ms */
    duration: z.number().int().min(0).max(10000),
    delay: z.number().int().min(0).max(10000),
    easing: z.union([z.enum(EASINGS), bezier]),
    iterations: z.union([z.number().int().min(1).max(10), z.literal('infinite')]),
    direction: z.enum(['normal', 'alternate']),
    /** ms between the direct children, animated instead of the element. */
    stagger: z.number().int().min(0).max(2000).optional(),
  })
  .refine((a) => a.iterations !== 'infinite' || a.trigger === 'load', {
    message: 'Répétition infinie réservée au déclencheur « chargement »',
    path: ['iterations'],
  });
export type Animation = z.infer<typeof animationSchema>;

/** Animations run by the island (entrances); `hover` and `focus` are pure CSS. */
export const isEntrance = (a: Animation) =>
  a.trigger === 'load' || a.trigger === 'inView' || a.trigger === 'click';

export const easingCss = (e: Animation['easing']) =>
  typeof e === 'string' ? e : `cubic-bezier(${e.join(',')})`;

export function transformCss(e: AnimationEffect): string {
  const parts = [
    e.x !== undefined || e.y !== undefined ? `translate(${e.x ?? 0}px,${e.y ?? 0}px)` : '',
    e.scale !== undefined ? `scale(${e.scale})` : '',
    e.rotate !== undefined ? `rotate(${e.rotate}deg)` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : 'none';
}

/**
 * Hover and focus states as CSS: a transition on the node, its target state on `:hover` and
 * `:focus-visible` / `:focus-within`. Neutralized by `prefers-reduced-motion` (see `toCss`).
 */
export function interactionCss(selector: string, animations: readonly Animation[]): string {
  const states = animations.filter((a) => a.trigger === 'hover' || a.trigger === 'focus');
  const first = states[0];
  if (!first) return '';
  const transition = `transform ${first.duration}ms ${easingCss(first.easing)} ${first.delay}ms,opacity ${first.duration}ms ${easingCss(first.easing)} ${first.delay}ms`;
  return [
    `${selector}{transition:${transition}}`,
    ...states.map((a) => {
      const target = [
        a.effect.opacity !== undefined ? `opacity:${a.effect.opacity}` : '',
        transformCss(a.effect) !== 'none' ? `transform:${transformCss(a.effect)}` : '',
      ]
        .filter(Boolean)
        .join(';');
      const on =
        a.trigger === 'hover'
          ? [`${selector}:hover`]
          : [`${selector}:focus-visible`, `${selector}:focus-within`];
      return target ? `${on.join(',')}{${target}}` : '';
    }),
  ].join('');
}

/** Entrance animations of the nodes under `roots`, by node id: the island's input (JSON data, never code). */
export type AnimationConfig = Record<string, Animation[]>;
