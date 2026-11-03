# ADR-0009 — Design tokens

**Status:** Accepted on 10/30/2026 (implementation of the milestone 2 study §4.3, slice 3) · **Date:** 10/30/2026 · **Ref.:** SB-05, ADR-0007

## Context

SB-05 asks for named colors, typography (families, heading and text styles, weights, sizes, line heights,
responsive variants), a spacing scale, radii and maximum widths. A changed token must apply to every component that
references it, and custom values must remain possible. Rendering must stay identical between the canvas and the
export (ADR-0002).

## Decision

1. **Optional `tokens` field of v2** (no migration):
   - `colors`: `{ label, value: #hex }`;
   - `sizes`: `{ label, group: spacing | radius | width | font, value: { base, [breakpoint]? } }`;
   - `fonts`: `{ label, stack: string[] }`;
   - `textStyles`: `{ label, style: { base?, [breakpoint]? } }`, each limited to `fontFamily`, `fontSize`,
     `fontWeight` and `lineHeight`.

   Token ids follow `^[a-z][a-z0-9-]{0,31}$` and never change: renaming a token only changes its label.
2. **Reference = `{ token: id }`** instead of a literal value:
   - colors (`color`, `backgroundColor`) reference `colors`;
   - lengths reference `sizes`;
   - two new style properties, `fontFamily` and `textStyle`, reference `fonts` and `textStyles`.

   `loadSite` refuses a reference to a missing token (`missing-token`) or to an unknown breakpoint.
3. **Everything goes through CSS variables.** `toCss` emits `:root { --ns-color-<id>; --ns-size-<id>; --ns-font-<id>;
   --ns-text-<id>-<property> }`, then redefines the responsive values in the same `@media (max-width)` as the
   nodes. A reference produces `var(--ns-…)`. Changing a token therefore changes a variable, without rewriting the
   nodes.
4. **Text styles without an extra class.** A node whose style contains `textStyle` receives, in its own rule and
   before its local properties, the `font-*: var(--ns-text-<id>-…)` declarations. Local values win by cascade
   order. The React views do not change, and neither does the export.
5. **Default styles of elements.** The text styles with ids `body` and `h1`…`h6` also apply to the matching
   elements (`body{…}`, `h1{…}`). A node class stays a priority.
6. **Fonts**:
   - the Studio only accepts family stacks (system or installed fonts); each name must match
     `^[A-Za-z0-9 _-]{1,60}$` and is quoted on emission, except generic families;
   - no call to a third-party service;
   - font files (`@font-face`) will come with the media library (slice 5).
7. **Commands**: `setToken { kind, id, value }` creates or replaces a token, `removeToken { kind, id }` deletes it.
   Deleting a referenced token is refused with the number of references.

## Alternatives

- **Replacing the values in the nodes** on change: CSS without variables, but changing a token rewrites the whole
  site and the history, and the export loses the notion of token.
- **An `ns-text-<id>` class added by the view**: a more readable selector, but every text view and its export
  contract must change.
- **Free tokens (arbitrary `--var`)**: more flexible, but a door to CSS injection, and the inspector would no longer
  know which values to offer.

## Consequences

- The exported CSS contains a readable `:root` block, which the export documentation repeats.
- Shadows and creating breakpoints are not covered here: there is no shadow property, and the breakpoints remain
  those of the templates. These points are postponed and documented in the limitations.
