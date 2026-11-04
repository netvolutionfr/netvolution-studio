# Evolution — Direct editing in the canvas

**Document:** `docs/specifications/04-direct-editing.md`
**Version:** 1.0
**Depends on:** `01-visual-editor.md` (§7, batch VE-E), `03-creative-studio.md` (CS-04), ADR-0002, ADR-0003, ADR-0020
**Decision:** ADR-0025 (accepted) · **Batches ED-A to ED-E delivered**

## 1. Starting point

Before this evolution, in the canvas:

- double-clicking a text did nothing: it could only be edited in the inspector;
- an element could not be grabbed to move it: moves went through the layers or the library.

For a designer used to Tatsu or Figma, these are the first two expected gestures (CLAUDE §7: "direct selection, drag and drop, inline editing where relevant").

What already existed and is reused:

| Need | Existing |
|---|---|
| Find the node under the pointer | `nodeIdAt()` in `apps/studio/src/canvas/main.tsx` (`ns-<id>` classes) |
| Validated shell ↔ canvas protocol | `shellMessageSchema` / `canvasMessageSchema` (`packages/core/src/protocol/messages.ts`) |
| Drop target computation | `computeDropTarget`, `isNoopMove` (`packages/core/src/editor/drop.ts`) |
| Drag session, transparent layer over the iframe | `dragHandlers` (`apps/studio/src/shell/drag.ts`), `.drag-layer` in `App.tsx` |
| Rich text DOM ↔ runs (`Inline[]`, `Inline[][]`) | `RichTextField.tsx` (`renderRuns`, reading the editable DOM, `execCommand`) |
| Transaction = one history entry | `store.begin()` / `store.commit()` (CS-04 resizing) |

## 2. Scope

### ED-01 — Editing a text on the page

**Entering edit mode:**
- double-click a text element in the canvas;
- or press Enter / F2 while a text element is selected (see ED-03).

The element is selected first if it was not. Double-clicking a non-text element keeps the current behavior (selection).

**Elements concerned.** The components whose registry definition declares a field editable in place (`inline`, ADR-0025):

| Component | Prop | Shape | Batch |
|---|---|---|---|
| Text | `content` | rich text, several paragraphs | ED-A |
| Heading | `text` | rich text, one paragraph | ED-A |
| Button | `label` | plain text, one line | ED-A |
| List | `items` | rich text, the whole list at once (one item per `<li>`) | ED-C |
| Accordion item and tab titles | title | plain text | ED-C |

**While editing:**
- the text is edited **in the real rendering**, with its fonts, size and color;
- the selection frame stays visible, marked "editing";
- Text: Enter starts a paragraph and Shift+Enter inserts a line break (ADR-0019, ADR-0020);
- Heading and Button: Enter validates;
- Cmd/Ctrl+B and Cmd/Ctrl+I toggle bold and italic (rich text only);
- a floating toolbar offers Bold, Italic, Color, Link, Remove link and Clear formatting, like the inspector (ED-B);
- **pasting inserts plain text.** Pasted HTML is never interpreted (CLAUDE §8).

**Leaving edit mode:**
- **validate**: press or focus elsewhere (in the page or in the Studio), Enter (Heading, Button, titles), or a change of page, breakpoint or preview mode;
- **cancel**: Escape. The text returns to its state before editing, and nothing is added to the history.

**History.** An editing session produces **a single** command, hence a single history entry ("Edit text"):
- `updateNodeProps` in the general case;
- `setOverride` in an instance (see below).

It is absent when the text did not change.

**Instances of reusable components (ADR-0011).** A text inside an instance is edited in place **if its prop is an exposed parameter**:
- the parameter is the one of the component whose `path` (from the instance root) leads to the edited element and whose `prop` is the editable prop;
- validation sends `setOverride` on the instance root. The value therefore stays the instance's own and survives updates of the component;
- the instance inspector shows the updated parameter.

A non-exposed text of an instance is not edited in place. A notice says: "Text of the component “Name”: edit the component or expose this text as a parameter".

**Studio shortcuts.** While editing, keys keep their word-processing meaning. The canvas no longer forwards to the shell:
- Delete and Backspace, which would delete the element;
- Cmd+C, Cmd+X and Cmd+V, which would go through the internal clipboard;
- Cmd+Z and Cmd+Y: while editing, they act in the text (browser undo). After validation, Cmd+Z undoes the whole session;
- Cmd+D.

Only Cmd+S is still forwarded: it validates the edit, then saves.

**Inspector.** It shows the validated value. The field of the text being edited is replaced by the note "Being edited on the page".

**Refused cases.** No edit mode in these cases:
- preview mode;
- a text inside a reusable component instance whose prop is not an exposed parameter (with the notice above);
- a text displayed by an island that rewrites its DOM (marquee, carousel), on its duplicated copies.

The shared header and footer stay editable: the first click already opens their layout (existing behavior).

### ED-02 — Moving an element by grabbing it on the page

**Gesture:**
- press on an element of the canvas, then move beyond 4 px (same threshold as `drag.ts`);
- the moved element is the **selected** one if the pointer is inside it; otherwise, the deepest element under the pointer, which becomes selected;
- to move a parent container, select it first in the layers;
- an element inside a reusable component instance does not move alone: the gesture moves the whole instance, as in the layers.

**While dragging:**
- the existing drop indicator (`drop-marker`) and the nesting rules of `computeDropTarget` apply. There is no second drop logic;
- the original element is dimmed;
- a label follows the pointer with the element's name;
- **autoscroll**: near the top or bottom edge of the visible canvas (48 px zone), the page scrolls, faster closer to the edge. This applies to drags from the layers and the library as well as from the canvas;
- Escape cancels.

**Drop:** a `moveNode` command ("Move"), i.e. one history entry, unless the move changes nothing (`isNoopMove`). A drop refused by the constraints has no effect.

**Gesture conflicts:**
- while editing a text (ED-01), pressing and dragging selects text and never moves the element;
- the resize handles (CS-04) keep priority on their area;
- a drag never triggers a click, hence no selection and no header or footer opening.

**Out of reach:** the root of the page, and elements of the header or footer seen from a page (and the other way around). The move stays inside the open tree, as in the layers.

### ED-03 — Keyboard alternatives

Drag and drop must have a pointer-free equivalent (WCAG 2.5.7):
- **Alt+↑ / Alt+↓**: moves the selected element one rank among its siblings (`moveNode`); nothing happens at the first or last rank;
- **Enter / F2**: enters text edit mode (ED-01). F2 anywhere outside a field; Enter from the canvas or on the already selected row of the layers, so as not to hijack the activation of a Studio button;
- **Escape** keeps its behavior: it deselects everything. While editing a text, a first press cancels the edit, the second deselects.

These shortcuts work from the canvas as from the layers.

## 3. Constraints

1. **Fidelity (ADR-0002).** Edit mode must leave no trace in the rendered DOM:
   - `contenteditable` and the editing marks are set on the element during the session;
   - the next render rebuilds the DOM from the document (new React key);
   - the bench `npm run test:fidelity` is unchanged.
2. **Trust boundary.**
   - The canvas returns a structured value (runs), never HTML.
   - The shell validates it with the component's schema, through the command, like any inspector input.
   - Links stay validated by `hrefSchema`.
3. **No rendering while typing.** During a session, the canvas keeps the `render` messages it receives aside and applies the last one on exit. Otherwise React would overwrite the DOM being edited and the caret.
4. **A single move logic.** Dragging from the canvas reuses the `drag.ts` session and `computeDropTarget`. The canvas only forwards the gesture.
5. **Studio accessibility.** The element being edited is announced ("Editing the text on the page. Escape to cancel."), keyboard focus goes to the canvas, and pointer gestures have their keyboard equivalent (ED-03).

## 4. Out of scope

- In-place editing of images (replacing by dropping a file), videos, icons and button links: they stay in the inspector.
- Free pixel positioning: a move changes the order and the parent, never coordinates (CLAUDE §7).
- Multiple selection and moving several elements.
- Dragging an element from one page to another.
- A spell checker of the Studio: the browser's is kept.

## 5. Development plan (delivered)

### Batch ED-A — Plain and rich text, without toolbar

- In-place editing contract in the registry (ADR-0025), `inlineTarget` in the core.
- Messages `edit`, `editEnd`, `editCommit`, `editCancel` and `pointer` / `dblclick` in the protocol.
- The DOM ↔ runs conversion moved from `RichTextField.tsx` to a module shared by the inspector and the canvas (`apps/studio/src/rich.ts`).
- Text, Heading, Button; plain-text paste; Cmd+B/I; filtering of forwarded shortcuts.

### Batch ED-B — Floating formatting toolbar

- Toolbar in the shell, placed from the element's rect and the canvas scale (like `canvas-tools`), shared with the inspector (`RichFormat.tsx`).
- Actions reach the canvas by message (`editFormat`).
- Link and Color reuse the inspector's pickers; the link form (site page, file, checked address) replaces `prompt()`.

### Batch ED-C — Lists, accordions, tabs

- The registry gives the element holding the text (`inline.selector`): the `summary` of the accordion item, the tab button rendered by the parent Tabs.
- A list is edited **whole** (revised during implementation, instead of one item at a time): Enter starts the next item and Backspace at the start of an item merges it, as in a word processor. An emptied item is removed, and the session stays a single command.
- Space in an accordion or tab title inserts a space, without toggling the accordion or activating the tab.

### Batch ED-D — Grab and move

- Message `drag` (`start`, `move`, `end`, `cancel`, canvas coordinates): the frame keeps the pointer and forwards the gesture.
- `canvasDragSource` (core) chooses the moved node; the shell runs the shared `drag.ts` drop logic.
- Dimmed original element and label.

### Batch ED-E — Autoscroll and keyboard

- Message `scrollBy` from the shell to the canvas during a drag.
- Alt+↑/↓, Enter/F2.

## 6. Acceptance tests

- **Unit (core / components):** `inlineTarget` (own prop, exposed parameter, refused text), `canvasDragSource` (selection, pressed node, whole instance, never the root), messages validated by the protocol schemas.
- **E2E (Playwright):**
  1. double-click a Heading, type, Enter: the value is in the document and the inspector, one history entry, no trace in the DOM;
  2. Escape while editing: no change, no entry;
  3. Backspace while editing: the element is not deleted;
  4. Text: Enter creates a second paragraph, rendered as `<div class="ns-text"><p>…`;
  5. floating toolbar: bold and link on one word, one undo;
  6. reusable component instance: an exposed text is edited in place as the instance's value;
  7. tab title, accordion title (not toggled), list items (Enter creates the next one);
  8. grab an element in the canvas: dimmed, one `moveNode`, one undo; Escape cancels;
  9. Alt+↓ / Alt+↑, Enter from the canvas, F2 from the layers;
  10. autoscroll near the bottom edge of the canvas.
- **Non-regression:** `npm run test:fidelity`, `npm run demo`, `demo:site`, `demo:creative`.

## 7. Risks

| Risk | Mitigation |
|---|---|
| `execCommand` deprecated (already used by the inspector) | Same dependency as before, isolated in the shared module, replaceable at once |
| Unpredictable DOM produced by `contenteditable` (spans, pasted styles) | Only what the run reader recognizes is kept; paste is plain text |
| Text transformed by CSS (`text-transform`, `background-clip` gradient) confusing while editing | Accepted: the real value is edited; the gradient stays visible (ADR-0020) |
| Double-click mistaken for two selection clicks (parent then child) | The double-click always targets the innermost editable text under the pointer |
| Accidental drag while selecting | 4 px threshold, Escape and Cmd+Z |
