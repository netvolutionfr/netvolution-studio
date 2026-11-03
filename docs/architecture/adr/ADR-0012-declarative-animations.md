# ADR-0012 — Declarative animations

**Status:** Accepted on 10/30/2026 · **Date:** 10/30/2026 · **Ref.:** CS-05, CS-06, CS-07, CS-12, ADR-0002 (islands); milestone 3 study §4.4

## Context

CS-05 asks for:
- **triggers**: load, entering the viewport, hover, focus, click;
- **effects**: opacity, translation, scale, rotation and their combinations;
- **parameters**: duration, delay, easing, direction, repetition, stagger.

The related constraints:
- **Model**: it must depend on no library (CS-06).
- **Export**: it embeds only the runtime it needs.
- **Accessibility**: `prefers-reduced-motion` is respected (CS-12).
- **Editor**: it can replay an effect, without animating its own controls (CS-07).
- **Licenses**: GSAP may only be used after its license has been checked.

## Decision

1. **Model**: `node.animations?: Animation[]`, an optional node field, typed and without any library reference.
   - `trigger`: `load` | `inView` | `hover` | `focus` | `click`;
   - `effect`: `{ opacity?, x?, y? (px), scale?, rotate? (deg) }`:
     - for an entrance (`load`, `inView`, `click`), it is the starting state, and the element returns to its normal state;
     - for `hover` and `focus`, it is the target state;
   - `duration`, `delay` (ms, bounded); `easing` from a closed list, or a `cubic-bezier` with 4 bounded numbers;
   - `iterations`: 1 to 10, or `infinite` for `load` only; `direction`: `normal` | `alternate`;
   - `stagger` (ms): offsets the animation of the direct children rather than that of the element.
2. **Runtime: native CSS and the Web Animations API, without dependencies.**
   - **`hover` and `focus`**: CSS only. Transitions are generated in the node's rule (`:hover`, `:focus-visible`, `:focus-within`).
   - **`load`, `inView`, `click`, `stagger`**: an `animate` island (Web Animations API + IntersectionObserver), added only to the pages that contain an animation of that kind. The parameters are read from a `data-ns-animate` attribute produced by the view from the validated model.
3. **Content always accessible.**
   - The CSS never hides an element.
   - The island applies the starting state just before animating. Without JavaScript, or if the island fails, the content stays visible in its final state.
   - With `prefers-reduced-motion: reduce`, the CSS neutralizes transitions and the island animates nothing.
4. **Editor.**
   - The runtime only lives in the canvas, the site preview and the export; the Studio's controls are never animated by it.
   - The canvas offers an "animations" switch, a reduced-motion simulation and a "Replay" button on the selected element.
   - Scrolling the preview triggers `inView` as on the site.
5. **Fidelity.**
   - The bench compares the final state, with `reduced-motion` emulated.
   - A dedicated check verifies, on the built site, that animations are triggered and that they are absent with reduced motion.
6. **Third-party engines.** Motion is only added if a needed effect cannot be covered by the Web Animations API. GSAP is excluded until its license has been checked.

## Alternatives

- **Motion from the start**: more effects available, but a dependency shipped to the animated pages for effects the Web Animations API covers.
- **Pure CSS with `animation-timeline: view()`**: no JavaScript for `inView`, but incomplete browser support. Content could stay hidden where the feature is missing.

## Consequences

- One more island (a few dozen lines), on the same model as the tabs.
- The bench must emulate reduced motion: the fidelity of intermediate states is not compared pixel by pixel, only their triggering.
