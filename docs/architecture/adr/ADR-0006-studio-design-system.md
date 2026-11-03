# ADR-0006 — Design system of the Studio interface

**Status:** Accepted on 10/29/2026 · **Ref.:** "Visual modernization" assignment; `docs/ui/README.md`

## Context

The editor worked with barely styled native controls. The goal is a dense, professional interface (references: Tatsu, Figma, Linear, shadcn/ui), without a redesign, without touching the model, the rendering or the export, and with a light design system.

## Decision

1. Semantic **CSS tokens** (`apps/studio/src/ui/tokens.css`): dark theme by default, light theme as a block override.
2. Minimal **home-made primitives** (`Button`, `IconButton`, `Tip`, `Segmented`, `Menu`, `Section`, `Field`) in plain CSS (`ui.css`).
3. **`lucide-react`** (ISC) for consistent iconography, imported icon by icon.
4. **Radix UI, occasionally** (MIT), only where accessible behavior is costly to rebuild:
   - Tooltip: hover, focus and Escape;
   - ToggleGroup: radios and roving focus;
   - DropdownMenu: keyboard navigation, type-ahead, focus return.
5. **Strict isolation.** These dependencies live in `@ns/studio` only. The canvas, the exported components and the Astro template do not depend on them; a unit test checks it.

## Rejected alternatives

- **shadcn/ui**: it imposes Tailwind and a code-generation style. The few useful primitives are covered by Radix and about 300 home-made lines.
- **Tailwind or another CSS framework**: a new build tool and a new syntax for a need covered by tokens and plain CSS, already in place.
- **Everything native**: `<details>` and buttons are enough, but the keyboard-accessible tooltip, the radio group with roving focus and the accessible menu would have to be rewritten and tested by us.
- **Radix Select / Popover / Dialog**: not needed. The native select and the native `<dialog>` are accessible.

## Consequences

- Shell bundle: +130 KB (≈ +45 KB gzip). Canvas bundle unchanged.
- **Rule:** a new UI dependency requires a demonstrated accessibility or behavior need.
- Identified and documented risk: a Radix tooltip must not wrap an element that already carries a Radix `data-state`.
