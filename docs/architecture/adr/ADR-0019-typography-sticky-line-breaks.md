# ADR-0019 — Fine typography, sticky elements and line breaks

**Status:** Accepted on 11/01/2026 · **Date:** 11/01/2026 · **Ref.:** CLAUDE §5 and §8, ADR-0009, ADR-0017, `docs/history/research/essai-import-tatsu.md`

## Context

A trial import of a real site built with Tatsu measured the gap with the Studio (`docs/history/research/essai-import-tatsu.md`). Three gaps stand out, very frequent and cheap to fill:
- **fine typography**: 241 letter-spacing and case settings over eleven pages;
- **sticky elements**: "sticky" columns and a header that stays at the top of the page;
- **line breaks** in a text or a heading.

## Decision

1. **Three style properties** join the `typography` group:
   - `letterSpacing`: a length, negative values allowed;
   - `textTransform`: `none`, `uppercase`, `lowercase` or `capitalize`;
   - `fontStyle`: `normal` or `italic`.

   They also enter the **text styles** of the design system (ADR-0009), with letter spacing adjustable per breakpoint, emitted as CSS variables like the size. Case only affects display: the typed text stays readable by screen readers and search engines.
2. **The `sticky` position** ("Sticky") is added to `position`. Just as a border width without a style draws nothing (ADR-0017), a sticky position without an offset does not stick: the inspector therefore also sets `top: 0` when no offset applies.
3. **Line breaks** are written `\n` in the text: the runs of a Text and of a List item, and the text of a Heading. The views render them as `<br>`. As the canvas and the export share these views, fidelity is guaranteed. In rich text, Enter inserts a `<br>`, converted to `\n` when read. A Heading is typed in a multi-line field.
4. **Container, stack and grid** accept the `typography` group since the site templates of 10/31/2026: a color or a font set on a box is inherited by its content. This point is recorded here.

Existing documents stay valid: the properties are optional, and a text without `\n` is unchanged.

## Rejected alternatives

- **Block-based rich text** (several paragraphs, subheadings, color on part of the text): the real measured need, with 183 rich text blocks. But it is a model change with a conversion of existing texts. Left to a separate decision (ADR-0020).
- **A "sticky header" component**: the general sticky position covers this case without one more component.

## Consequences

- Fidelity bench: the `elements` fixture has a heading in spaced capitals, a text with a line break and italics; the `tokens` fixture has a text style with responsive letter spacing and an italic style.
- The guide documents these settings (chapters 3, 4 and 5, appendices A and B).
