# ADR-0025 — Direct editing in the canvas: text in place and moving with the pointer

**Status:** Accepted on 11/04/2026 · **Date:** 11/04/2026 · **Ref.:** `docs/specifications/04-direct-editing.md`, ADR-0002, ADR-0003, ADR-0011, ADR-0020, ADR-0024

## Context

The canvas is an iframe showing the export rendering. The shell draws the selection frames and handles over it, from the rects the iframe reports (ADR-0002). Texts could only be edited in the inspector, and drags only started from the layers or the library.

Two gestures must be added without breaking three properties:
- canvas ↔ export fidelity;
- validation at the iframe boundary;
- one logical action per history entry (ADR-0003).

## Decision

1. **Text is edited in the iframe, on the rendered element.**
   - The canvas sets `contenteditable` on the element for the session.
   - It only returns structured runs to the shell (`Inline[]` / `Inline[][]`, or a string).
   - The shell sends them through `updateNodeProps` (or `setOverride` in an instance), hence through the component's schema.
2. **The registry declares what is edited in place.**
   - An optional `inline` field of the component definition gives the prop and, when it is not held by the node's own element, the selector of the element holding it (`.ns-{id} > summary` for an accordion item, `#{id}-tab` for a tab, rendered by its parent Tabs).
   - Without this field, there is no in-place editing.
   - The contract stays declarative: no editing code per component. The field kind (`text`, `richText`, `richTextList`) gives the editor.
3. **DOM ↔ runs conversion in one place.** The logic of `RichTextField.tsx` moves to `apps/studio/src/rich.ts`, shared by the inspector and the canvas. Both editors therefore produce the same value. The formatting toolbar (`RichFormat.tsx`) is shared the same way.
4. **One editing session = one transaction.**
   - The value is sent on validation (`editCommit`), not on each keystroke.
   - During the session, the canvas keeps the `render` messages aside and applies only the last one, on exit, with a new React key: the DOM is rebuilt from the document.
5. **Dragging from the canvas reuses `drag.ts`.**
   - A press in the iframe keeps the pointer there: the canvas detects the threshold and forwards the gesture (`drag` message, canvas coordinates).
   - The shell converts the coordinates and runs the same target computation and drop as for the layers (`computeDropTarget`, `moveNode`). `canvasDragSource` (core) chooses the moved node.
   - Autoscroll goes through a `scrollBy` message from the shell to the canvas.
6. **Protocol extensions** (`packages/core/src/protocol/messages.ts`), all `strictObject`:

   | Message | Direction |
   |---|---|
   | `pointer.kind: 'dblclick'`, `editCommit`, `editCancel`, `drag` | canvas → shell |
   | `edit` (start), `editEnd` (forced end, text kept), `editFormat`, `scrollBy` | shell → canvas |

   The shell decides what is editable (`inlineTarget`, `packages/core/src/editor/inline.ts`); the canvas always answers with `editCommit` or `editCancel`, then receives a render that rebuilds its DOM.

## Rejected alternatives

- **An editor in the shell, laid over the element's rect.**
  - Benefit: no editing logic in the iframe.
  - Drawback: fonts, sizes, line height, gradients and line breaks would have to be reproduced outside the iframe. This is exactly the divergence ADR-0002 avoids, and the text would "jump" when entering edit mode.
- **Sending the value on each keystroke.** The inspector would update live, but rendering the whole document on each message (R9) would overwrite the DOM being edited. It would need incremental rendering, which does not exist today.
- **Dragging entirely inside the iframe.** The target computation and the drop indicator would be duplicated on both sides of the boundary. The iframe only forwards the gesture.
- **An editing library (ProseMirror, Lexical, TipTap).** More robust than `execCommand`, but a heavy dependency for a deliberately small model (bold, italic, color, link, paragraphs). To be reconsidered if `execCommand` disappears or if the text model grows.

## Consequences

- The iframe DOM carries a temporary editing state. The E2E tests check that nothing remains after exit, and the fidelity bench is unchanged.
- Shortcut forwarding in `canvas/main.tsx` depends on the mode: while editing, only Cmd+S is forwarded.
- In a reusable component instance (ADR-0011), only texts exposed as parameters are edited in place:
  - the shell finds the parameter by its `path` and `prop`, then sends `setOverride` on the instance root;
  - a non-exposed text is refused: otherwise it would differ from the component without being a value of the instance. The refusal is a core `Message` (ADR-0024), translated by the shell.
- The `execCommand` debt is shared, but concentrated in one module.
- **End of editing.** The text's `blur` is not used to validate: a click in the shell's formatting toolbar takes the focus away from the iframe, even with `preventDefault`. The canvas validates on a press or focus elsewhere in the page; the shell sends `editEnd` on a press or focus elsewhere in the Studio, except in the formatting toolbar.
- **Bold and italic in place.** They stay marks of the text, independent of the element's style: a heading is already bold, and `execCommand('bold')` would remove its weight. The element's weight (or style) is neutralized for the duration of the command.
