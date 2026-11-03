// Animation island (CS-05/06/07, ADR-0012): entrance animations (page load, entering the viewport,
// click) and stagger, with the Web Animations API. Dependency-free; copied into exports and loaded
// only by animated pages. The content is never hidden by CSS: a starting state is applied by this
// script when it prepares an animation, so without JavaScript (or with reduced motion) everything
// stays visible in its final state.

type Effect = {
  opacity?: number | undefined;
  x?: number | undefined;
  y?: number | undefined;
  scale?: number | undefined;
  rotate?: number | undefined;
};
type Anim = {
  trigger: 'load' | 'inView' | 'click' | 'hover' | 'focus';
  effect: Effect;
  duration: number;
  delay: number;
  easing: string | number[];
  iterations: number | 'infinite';
  direction: 'normal' | 'alternate';
  stagger?: number | undefined;
};
type Config = Record<string, Anim[]>;

const ready = new WeakSet<Element>();

const transformOf = (e: Effect) =>
  [
    e.x !== undefined || e.y !== undefined ? `translate(${e.x ?? 0}px,${e.y ?? 0}px)` : '',
    e.scale !== undefined ? `scale(${e.scale})` : '',
    e.rotate !== undefined ? `rotate(${e.rotate}deg)` : '',
  ]
    .filter(Boolean)
    .join(' ');

/** Animations of one element, or of its direct children when staggered; started at once. */
function play(el: Element, a: Anim, toState = false): Animation[] {
  const targets = a.stagger !== undefined ? [...el.children] : [el];
  return targets.map((target, i) => {
    const style = getComputedStyle(target);
    const normal = {
      opacity: style.opacity,
      transform: style.transform === 'none' ? 'none' : style.transform,
    };
    const moved = {
      opacity: String(a.effect.opacity ?? style.opacity),
      transform:
        `${normal.transform === 'none' ? '' : `${normal.transform} `}${transformOf(a.effect)}`.trim() ||
        'none',
    };
    // Entrances go from the effect to the normal state; a replayed hover/focus goes to the effect and back.
    const frames = toState ? [normal, moved, normal] : [moved, normal];
    return target.animate(frames, {
      duration: a.duration,
      delay: a.delay + i * (a.stagger ?? 0),
      easing: typeof a.easing === 'string' ? a.easing : `cubic-bezier(${a.easing.join(',')})`,
      iterations: a.iterations === 'infinite' ? Number.POSITIVE_INFINITY : a.iterations,
      direction: a.direction,
      fill: 'both',
    });
  });
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Starts the entrance animations of `config` (default: the page's `#ns-animations` JSON data).
 * Idempotent per element.
 */
export function init(root: ParentNode = document, config?: Config, options: { reduced?: boolean } = {}) {
  if (options.reduced ?? reducedMotion()) return;
  const data: Config = config ?? JSON.parse(document.getElementById('ns-animations')?.textContent || '{}');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        for (const animation of pending.get(entry.target) ?? []) animation.play();
      }
    },
    { threshold: 0.15 },
  );
  const pending = new Map<Element, Animation[]>();
  for (const [id, anims] of Object.entries(data)) {
    const el = root.querySelector(`.ns-${CSS.escape(id)}`);
    if (!el || ready.has(el)) continue;
    ready.add(el);
    for (const a of anims) {
      if (a.trigger === 'load') play(el, a);
      else if (a.trigger === 'inView') {
        // Prepared paused on its first frame, played when it enters the viewport.
        const animations = play(el, a);
        for (const animation of animations) animation.pause();
        pending.set(el, [...(pending.get(el) ?? []), ...animations]);
        observer.observe(el);
      } else if (a.trigger === 'click') {
        let last: Animation[] = [];
        el.addEventListener('click', () => {
          for (const animation of last) animation.cancel();
          last = play(el, a);
        });
      }
    }
  }
}

/** Replays every animation of one element at once (Studio « Rejouer »); no-op in reduced motion. */
export function replay(root: ParentNode, id: string, anims: Anim[], options: { reduced?: boolean } = {}) {
  if (options.reduced ?? reducedMotion()) return;
  const el = root.querySelector(`.ns-${CSS.escape(id)}`);
  if (!el) return;
  for (const animation of el.getAnimations({ subtree: true })) animation.cancel();
  for (const a of anims) play(el, a, a.trigger === 'hover' || a.trigger === 'focus');
}
