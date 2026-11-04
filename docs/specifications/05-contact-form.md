# Evolution — Contact form

**Document:** `docs/specifications/05-contact-form.md`
**Version:** 1.0
**Depends on:** `02-site-builder.md` (look of a form without backend), ADR-0001, ADR-0002, ADR-0009, ADR-0024
**Decision:** ADR-0026 (accepted) · **Batches FO-A to FO-C delivered**

## 1. Starting point

An exported site is static: it cannot send an email by itself. WordPress does it on the server, in PHP; a static Astro site has no equivalent without a server.

The Studio had no Form component. A Contact page needed a `mailto:` link or a button to an external service.

## 2. Principle

**The Studio produces a standard HTML `<form>` and sends it to an address chosen by the user.** It sends no email itself. The address can point to:

- a form service (Formspree, Web3Forms, Basin…);
- a script of the host or the agency (PHP, serverless function…).

Consequences:
- the export stays **purely static**, without depending on Netvolution or an imposed provider;
- the form works **without JavaScript**: native submission, then whatever the destination decides (thank-you page, redirection);
- data processing (sending, storage, spam protection, server-side GDPR) belongs to the destination, not to the Studio.

## 3. Scope

### FO-01 — Form component (`form`)

A container rendered as `<form method="post" action="…">`.

| Prop | Type | Role |
|---|---|---|
| `action` | URL | Sending address. **HTTPS required**, validated (`https:` only, 2,000 characters at most). Empty on insertion |
| `submitLabel` | text | Label of the send button (`<button type="submit">`). "Send" by default, in the site language |
| `hidden` | list of `{ name, value }`, 10 at most | Hidden fields required by some services (Web3Forms access key, subject, redirection page) |

- **Allowed children:** `form-field`, `text`, `heading`, `stack`, `grid`. Two fields can sit side by side, and an information notice can be added.
- **Inspector:** under the address, a hint says that the address and the hidden fields **are visible in the page's code** and must contain no secret.
- **Styles:** the usual groups of a container (spacing, size, flex, background, visibility). The send button looks like a primary Button, with its own CSS.
- **Method and encoding:** `method="post"` and the default encoding (`application/x-www-form-urlencoded`). No file upload.

### FO-02 — Field component (`form-field`)

A field, with its label and its native control.

| Prop | Type | Role |
|---|---|---|
| `label` | text | Visible label (`<label for>`) |
| `name` | identifier | Name sent to the destination (`[a-zA-Z][a-zA-Z0-9_-]{0,63}`). Follows the label while not changed by hand (`follows` in the registry) |
| `type` | enum | `text`, `email`, `tel`, `textarea`, `checkbox`, `select` |
| `required` | boolean | Rendered as `required` (announced by the control); a visual star follows the label |
| `placeholder` | text, optional | Hint in the field (not for checkboxes); first line of a list ("Choose…" by default, in the site language) |
| `options` | list of texts, up to 30 | Choices of a list (`select` only; shown in the inspector for that type only) |

**Rendering:**
- `autocomplete` is derived from the type and the name (`email`, `tel`, `name`);
- the field's `id` derives from the node id (`ns-<id>-input`): unique and stable;
- validation is the browser's (`required`, `type="email"`). No script is added.

**Consent checkbox.** A required `checkbox`, whose label can be completed by a neighboring Text linking to the privacy policy. The "Contact" section of the library provides it.

### FO-03 — "Contact" section of the library

The existing section (version 2) gets a ready-to-use Form, in the site language:
- Name, Email and Message, required;
- a consent checkbox;
- an information notice.

Its address is empty: the check before export reports it (FO-05).

### FO-04 — Canvas and preview

- The form is displayed identically, but sends nothing: the iframe sandbox does not allow `allow-forms`, and clicks are already neutralized.
- Fields do not take the typing focus in the canvas: a click selects the node, as elsewhere.
- In-place editing (ADR-0025): a double-click edits the label of a field or of the send button.
- In the site preview, the browser checks the fields, but sending is blocked with the notice "Sending is disabled in the Studio".

### FO-05 — Checks before export

Added to the existing checks (`checkSite`, `packages/core/src/document/check.ts`), as message codes (ADR-0024):

| Code | Level | Case |
|---|---|---|
| `form-no-action` | error | Form without a sending address |
| `form-no-field` | error | Form without fields |
| `form-field-outside` | error | Field outside a form (e.g. dropped into a container accepting anything) |
| `form-nested` | error | Form inside a form |
| `form-duplicate-name` | error | Several fields (or hidden fields) of the same form with the same `name` |
| `form-select-empty` | error | Choice list without options (added during implementation: the schema accepts it, so a field can be switched to "list" before its choices are entered) |
| `form-no-consent` | warning | Form with an email field, without a required checkbox |

### FO-06 — Export

- The form is exported as in the canvas: `<form>`, `<label>`, `<input>`, `<textarea>`, `<select>`, `<button>`, and the hidden fields as `<input type="hidden">`.
- No script is added.
- The export README has a "Forms" section: the address, fields and hidden fields of each form, how to change the address without the Studio, two examples (Formspree, Web3Forms), and a reminder that the address and the hidden fields are public.

## 4. Out of scope

- Sending email from the Studio, a bundled PHP script, a Netvolution relay, host-specific functions (Netlify Forms…).
- Background submission (`fetch`) with an in-place message. It would be an optional JavaScript island, later (ADR-0002 addendum).
- Spam protection of the Studio (honeypot, captcha): services provide it, and a hidden field covers a service's honeypot.
- File upload, multi-step forms, conditional fields, storing or browsing answers.
- Radio buttons and date, number or URL fields: to add when needed, on the same model.

## 5. Development plan (delivered)

### Batch FO-A — Components and rendering

- `form` and `form-field` in the registry; views shared by the canvas and the export.
- Prop validation, including the HTTPS address.
- Fidelity fixture.

### Batch FO-B — Inspector and checks

- Declarative inspector: `hint`, `follows`, `stringList` (with `when`) and `keyValues` fields.
- FO-05 checks.

### Batch FO-C — Section, guide and README

- Updated "Contact" section; guide chapter (both languages); export README.

## 6. Acceptance tests (delivered)

- **Unit:**
  - an `http:`, `javascript:` or relative address is refused; an invalid `name` is refused;
  - each FO-05 check fires, and only in its case;
  - the rendering has `method="post"`, the `action`, the hidden fields, `label for` tied to the `id`, `required` and the expected `autocomplete`;
  - the defaults are valid once translated into English and French;
  - the export README documents the forms.
- **Fidelity:** the `elements` fixture contains a form with five fields (text, email, text area, list, checkbox) and a hidden field. `npm run test:fidelity` passes, without scripts or accessibility violations.
- **E2E:** insert the Contact section; a click in a field selects it without the typing focus; the name follows the label; the export is blocked while the address is empty; `http:` is refused.
- **Not automated:** a real submission to a test server receiving the fields.
- **Non-regression:** `npm run demo`, `demo:site`, `demo:creative`, `templates:check`.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Third-party service outside the EU (GDPR) | Outside the Studio: the guide and the README remind the points to check (processor, data location). The agency chooses |
| A secret typed in a hidden field | Hint in the inspector and in the README; the Studio cannot detect it reliably |
| Different conventions between services (`_next`, `redirect`, `access_key`) | Generic hidden fields cover these cases without code per service |
| Field dropped outside a form | `form-field-outside` check. An ancestor rule in the registry can be considered if this case becomes frequent |
