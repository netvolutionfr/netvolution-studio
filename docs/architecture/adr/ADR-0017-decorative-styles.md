# ADR-0017 — Decorative styles: borders, shadows, gradients, background images

**Status:** Accepted on 10/31/2026 (borders and shadows), completed on 10/31/2026 (gradients and background images) · **Date:** 10/31/2026 · **Ref.:** CLAUDE §5 and §8, ADR-0002, ADR-0009

## Context

The designers who tested the Studio (user guide, chapter 4) had no borders, shadows, gradients or background images. These are basic settings in Tatsu and Elementor. They must be added without questioning two invariants:
- **no raw CSS** in documents: styles are a closed list of properties with structured values (CLAUDE §5 and §8);
- **fidelity** between the preview and the export (ADR-0002), measured by the bench.

## Decision

### 1. Borders and shadows (delivered)

Four optional properties are added to `styleDeclsSchema`, in the `background` group. Every component that already has a background color therefore has them: container, stack, grid, button, image, divider.

| Property | Value | CSS |
|---|---|---|
| `borderWidth` | positive length or size token | `border-width` |
| `borderStyle` | `solid`, `dashed`, `dotted`, `double`, `none` | `border-style` |
| `borderColor` | `#rgb[a]` or `#rrggbb[aa]` color, or color token | `border-color` |
| `shadow` | `none`, or `{ x, y, blur, spread, color, inset? }` | `box-shadow` |

- **One shadow per element.** It is described by lengths and a hexadecimal color, with transparency in the alpha channel. The shadow color accepts no token: the transparency of a shadow belongs to the shadow, and going through a CSS variable would bring nothing.
- **`none` is an explicit value**: it removes, at a breakpoint, a shadow inherited from a wider size.
- **The four sides are set together.** A border on a single side remains to be done: it will need its own properties, not a different value format.
- **A width alone draws nothing in CSS.** The inspector therefore also sets the `solid` style when no style applies yet. The model itself stays a simple list of independent properties.
- **Existing documents stay valid as they are.** The properties are optional: no migration, no change of `schemaVersion`.

### 2. Gradients and background images (delivered)

Two more properties, in the same group:

| Property | Value |
|---|---|
| `gradient` | `none`, or `{ kind: linear \| radial, angle, stops }`: 2 to 4 hexadecimal colors (with alpha), each at a position from 0 to 100% |
| `backgroundImage` | `none`, or `{ asset, size: cover \| contain \| auto, position }`: an **image or SVG media file of the site**, never a free URL |

- **A single `background-image` declaration.** The gradient and the image form one declaration, the gradient on top (a veil over a photo). Each breakpoint emits it from the **effective values** (`resolveStyle`). A breakpoint that only changes the gradient therefore keeps the inherited image, and vice versa. CSS variables were not used, because they are inherited from a parent by its children.
- **Gradient colors accept no token**, like shadows: a gradient plays on transparency, which is not part of the brand guidelines.
- **Image references are checked like those of components.** An unknown image makes the site invalid. An image used as a background cannot be removed from the media library. The export copies the image into `public/media/`, without conversion (decision of 10/31/2026). The check before export warns above **500 KB**, from the file sizes (`GET /api/projects/:id/media?sizes`).
- **The canvas and the export** use the same media prefix as images and fonts, hence the same paths.

## Rejected alternatives

- **A "custom CSS" field**: it contradicts CLAUDE §8, breaks the fidelity guarantee and opens injection. (Revisited by ADR-0023 with a parsed, controlled stylesheet.)
- **Several shadows per element**: rarely useful for a showcase site, and a heavier interface. If the need appears, the model can accept a list of shadows.
- **Shadow tokens**: the inspector's three presets (soft, medium, strong) cover common use. Tokens will only make sense if a client's brand guidelines need them.

## Consequences

- The fidelity bench covers borders and shadows (`elements` fixture: button with a dashed border; image with a border, a shadow, and the shadow removed on mobile), as well as backgrounds (`composition` fixture: image and gradient veil, radial gradient on mobile that keeps the image). It compares image URLs by their path, not their origin.
- The guide (chapter 4) documents these settings, with the contrast of text over an image.
- Deleting a color token used by a border is refused, as for text and background.
