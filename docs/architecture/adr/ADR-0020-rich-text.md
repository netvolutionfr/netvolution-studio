# ADR-0020 — Rich text: paragraphs, color, rich headings, gradient text

**Status:** Accepted on 11/01/2026 · **Date:** 11/01/2026 · **Ref.:** CLAUDE §5 and §8, ADR-0001, ADR-0019, `docs/history/research/essai-import-tatsu.md`

## Context

The trial import of a Tatsu site measured, on two pages:
- 18 headings partly in bold or italics;
- 12 gradient texts;
- text blocks made of several colored paragraphs.

A Text had only one paragraph, a Heading was only a string, and no part of a text could be colored.

The Studio has no per-component migration: a component's version is not recorded in the nodes. Changing the shape of these props would therefore need a migration of the whole document (`schemaVersion`), touching the templates, the section library, the demonstrations, the simulated AI and the converter.

## Decision

**A backward-compatible extension: the old shapes stay valid, the editor writes the new ones.**

1. **Rich runs** (`packages/components/src/rich.ts`, shared by Text, Heading and List): bold, italic, validated link, and now **color**.
   - The color is a hexadecimal value validated by `colorSchema`, rendered as `style="color:…"`. Never free CSS.
   - The editor offers it from the colors of the design system or a swatch picker, but records it as a literal value. Changing a design system color afterwards therefore does not change it.
2. **Text**: `content` accepts one paragraph (`Inline[]`, the original shape) or several (`Inline[][]`, 1 to 50). The rendering depends on the number:
   - a single paragraph always gives a `<p>`, as before: the DOM of existing texts does not change;
   - several give a `<div class="… ns-text">` containing `<p>`s.
3. **Heading**: `text` accepts a string (the original shape) or rich runs. The level is still carried by the component, and the heading level check is unchanged.
4. **Gradient text**: the `textGradient` style property (`typography` group) reuses the gradient format of ADR-0017. It is emitted as `background-clip: text` and `-webkit-text-fill-color: transparent`; `none` removes an inherited gradient. It applies to the whole element, which matches the measured case: 12 whole headings.
5. **Editor**:
   - with `paragraphs`, Enter creates a paragraph and Shift+Enter inserts a line break (ADR-0019);
   - a Color button, with the palette and a swatch picker;
   - a Clear formatting button;
   - the Heading uses the same editor, on a single paragraph.

## Rejected alternatives

- **A `schemaVersion` 3 migration** to a single shape: cleaner on paper, but it changes every document, template and tool, for no gain when reading. The extension keeps one meaning per shape: an array of runs is one paragraph, an array of arrays is several.
- **Subheadings and lists inside a Text**: the Heading and List components already exist, and a subheading inside a text would escape the heading level check.
- **A size or background on part of a text** (8 occurrences): a risk of inconsistent typography for a rare use. Splitting into several elements is preferred.
- **A run color as a token**: these references would have to be tracked in the props, to check them and to refuse deleting a used token. Postponed until the need is confirmed.

## Consequences

- Fidelity bench: the `elements` fixture contains a two-paragraph text with a colored passage, a rich heading and a gradient heading (removed on mobile). The bench compares `style` attributes in the form normalized by the browser.
- The tests check the rendering of the new shapes, the validity of the old ones and the refusal of malformed colors.
- The guide documents the editor (chapter 3) and gradient text (chapter 4).
