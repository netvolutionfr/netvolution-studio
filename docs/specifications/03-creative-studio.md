# Milestone 3 — Creative Studio

**Document:** `docs/specifications/03-creative-studio.md`  
**Version:** 0.1  
**Depends on:** `00-foundations.md`, `01-visual-editor.md`, `02-site-builder.md`

## 1. Goal

Improve the productivity and creative freedom of the Studio, without sacrificing the quality, simplicity or portability of the generated sites.

The milestone introduces:

- Libraries of sections and compositions.
- Site templates.
- Reusable components.
- Advanced composition controls.
- Declarative animations and interactions.
- First AI assistance.
- Automation of creation operations.

The system must remain accessible to a designer who does not want to program.

## 2. Functional scope

### CS-01 — Section library

Make it possible to create and save reusable compositions:

- Hero.
- About.
- Features.
- Grids.
- Testimonials.
- Pricing.
- Team.
- Gallery.
- Call to action.
- Visual contact.

Each composition must have:

- An id.
- A name.
- A category.
- A description.
- A thumbnail.
- A document definition.
- Customizable parameters.
- A version.

Inserting a composition must create an independent instance by default.

### CS-02 — Site templates

Make it possible to create a site from a template including:

- Pages.
- Navigation.
- Header/footer.
- Design tokens.
- Compositions.
- Redistributable demo media.

The user must be able to replace the content and the design gradually.

Templates must not depend on a WordPress theme or an external Netvolution service.

### CS-03 — Reusable components

Introduce reusable components with configurable properties.

Distinguish:

- Independent copy.
- Instance linked to a shared definition.

A change to a shared component must be propagatable to its instances in a controlled way.

Incompatible changes must be signaled.

References between components must never produce circular dependencies.

### CS-04 — Advanced composition tools

Take inspiration from the useful capabilities of modern design environments:

- Alignment.
- Distribution.
- Guides.
- Visual markers.
- Direct adjustments.
- Resizing.
- Constraint management.
- Relative positioning and, when justified, absolute.
- Overflow management.
- Overlapping elements.
- Visual transforms.

Operations must translate into understandable, responsive web rules.

Do not adopt a model where every element is absolutely positioned, at the risk of producing fragile pages.

Structured composition remains the normal mode.

### CS-05 — Declarative animations

Create an animation model independent of any particular library.

Initial triggers:

- Page load.
- Entering the viewport.
- Hover.
- Focus.
- Click when relevant.

Initial effects:

- Opacity.
- Translation.
- Scale.
- Rotation.
- Simple combinations.

Parameters:

- Duration.
- Delay.
- Easing.
- Direction.
- Repetition.
- Stagger for groups.

Animations must be editable from the inspector.

### CS-06 — Animation engine

Prefer:

1. Native CSS and the Web Animations API when sufficient.
2. Motion for the effects that need a library.
3. Other engines only after technical and legal validation.

Using GSAP must be preceded by an explicit check of the license applicable to a visual website builder product.

The document model must not depend on the function names of an animation library.

The export must include only the runtime it needs.

### CS-07 — Animation preview

Allow:

- Turning on and off.
- Replaying an effect.
- Changing the parameters.
- Observing the responsive behavior.
- Disabling or adapting when the user prefers reduced motion.

Scroll-triggered animations must be reproducible in the preview.

The editor's controls must not be animated by the site's animation engine.

### CS-08 — Editorial AI assistance

First features:

- Suggest a heading.
- Rephrase a text.
- Summarize content.
- Adapt the tone.
- Suggest SEO metadata.
- Suggest a page structure from a brief.

The system must make the proposed changes visible before they are applied.

The AI does not publish automatically.

Generated content must be approved by the user.

### CS-09 — Design AI assistance

Make it possible to submit requests such as:

- "Add a testimonials section."
- "Turn this grid into two columns on tablet."
- "Make the spacing consistent."
- "Suggest a more sober variant of the hero."
- "Apply the site palette to this composition."

The AI must produce structured operations validated by the document engine.

Do not let a model change the source files or the internal data directly in an uncontrolled way.

Plan:

- Preview of the proposals.
- Readable diff.
- Acceptance or rejection.
- Undo.
- Logging of the operations.

### CS-10 — Automation interface

Expose the business commands through an internal services layer.

Plan contracts compatible with a future MCP server.

Commands must define:

- Parameters.
- Validation.
- Required permissions.
- Effects.
- Result.
- Errors.
- Possible undo capability.

The first AI milestone does not require a public MCP server reachable on the Internet.

### CS-11 — Abstraction of AI providers

The integration must not depend on a single provider.

Plan:

- Provider interface.
- Model configuration.
- Error handling.
- Consumption limits.
- Technical logging without needless exposure of sensitive content.
- Ability to disable AI.

API keys must stay on the server.

Content sent to external models must be explicitly delimited and subject to a confidentiality policy.

### CS-12 — Quality and accessibility

Creative features must preserve:

- Semantic HTML.
- Keyboard navigation.
- Visible focus.
- Responsive behavior.
- Respect of `prefers-reduced-motion`.
- Acceptable performance.
- No needless dependencies.

Effects must not prevent access to content.

Automated checks do not replace a human accessibility review.

## 3. Out of scope

- Free generation of executable JavaScript.
- Public marketplace.
- Simultaneous collaboration.
- Two-way Figma synchronization.
- Universal import of Figma mockups.
- Automatic generation of complex sites without human approval.
- Creating a proprietary graphics rendering engine.
- Hosting AI models.
- Complete multi-user editorial management.
- Automatic publishing by agents.

## 4. Agentic development plan

### Batch CS-A — Library

Section library, templates and thumbnails.

### Batch CS-B — Reusable Components

Linked instances, parameters, versions, propagation.

### Batch CS-C — Advanced Layout

Guides, constraints, alignment and transforms.

### Batch CS-D — Animation Model

Schemas, triggers, effects, validation.

### Batch CS-E — Animation Runtime

Rendering, preview, export and accessibility.

### Batch CS-F — AI Commands

Command API, validation, transactions and preview.

### Batch CS-G — AI Provider

Integration of a configurable provider, handling of secrets and errors.

### Batch CS-H — AI Features

Editorial assistance and composition transformations.

### Batch CS-I — Quality & Export

Regression, performance and security tests, standalone export.

## 5. Demonstration scenario

Start from a site created in milestone 2.

1. Insert a hero section from the library.
2. Change its parameters and colors.
3. Save a custom composition.
4. Reuse this composition on another page.
5. Add an entrance animation.
6. Check the mobile behavior.
7. Ask the AI to suggest a variant.
8. Review the proposed changes.
9. Accept the proposal.
10. Undo then redo the operation.
11. Export the Astro site.
12. Check that the exported site works and performs well.

## 6. Definition of Done

- Working section libraries and templates.
- Reusable, versioned components.
- Advanced composition without breaking responsive behavior.
- Working declarative animations.
- Reduced motion respected.
- AI assistance working on structured commands.
- Human approval of AI changes.
- Standalone Astro export.
- No secret in the exports.
- Tests and documentation.
- Complete reproducible demonstration.
