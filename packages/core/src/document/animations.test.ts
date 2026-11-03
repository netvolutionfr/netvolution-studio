import { describe, expect, it } from 'vitest';
import { createEditorStore } from '../editor/store.ts';
import { animationConfig, toCss } from '../style/css.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import type { Animation } from './animations.ts';
import { loadSite } from './load.ts';

const entrance: Animation = {
  trigger: 'inView',
  effect: { opacity: 0, y: 24 },
  duration: 600,
  delay: 100,
  easing: 'ease-out',
  iterations: 1,
  direction: 'normal',
  stagger: 80,
};
const hover: Animation = {
  ...entrance,
  trigger: 'hover',
  effect: { scale: 1.1, rotate: 2 },
  duration: 150,
  delay: 0,
};

describe('declarative animations (ADR-0012)', () => {
  it('hover and focus are CSS transitions, neutralized by reduced motion; entrances feed the island', () => {
    const s = createEditorStore(sampleDoc(), testRegistry);
    expect(s.dispatch('setAnimations', { id: 'nlabel001', animations: [entrance, hover] }).ok).toBe(true);
    const doc = s.getState().doc;
    const css = toCss(doc, testRegistry, ['nroot0001']);
    expect(css).toContain(
      '.ns-nlabel001{transition:transform 150ms ease-out 0ms,opacity 150ms ease-out 0ms}',
    );
    expect(css).toContain('.ns-nlabel001:hover{transform:scale(1.1) rotate(2deg)}');
    expect(css).toContain('@media (prefers-reduced-motion:reduce){*{transition:none!important}}');
    expect(animationConfig(doc, ['nroot0001'])).toEqual({ nlabel001: [entrance] });
    // No hidden content by CSS: entrances never produce an initial state in the stylesheet.
    expect(css).not.toMatch(/opacity:0/);
  });

  it('refuses unbounded or ill-placed values; removing all animations removes the field', () => {
    const s = createEditorStore(sampleDoc(), testRegistry);
    expect(
      s.dispatch('setAnimations', { id: 'nlabel001', animations: [{ ...entrance, iterations: 'infinite' }] })
        .ok,
    ).toBe(false);
    expect(
      s.dispatch('setAnimations', { id: 'nlabel001', animations: [{ ...entrance, duration: 60000 }] }).ok,
    ).toBe(false);
    expect(
      s.dispatch('setAnimations', {
        id: 'nlabel001',
        animations: [{ ...entrance, trigger: 'load', iterations: 'infinite' }],
      }).ok,
    ).toBe(true);
    s.dispatch('setAnimations', { id: 'nlabel001', animations: [] });
    expect(s.getState().doc.nodes.nlabel001).not.toHaveProperty('animations');
    expect(loadSite(s.getState().doc, testRegistry).ok).toBe(true);
  });
});
