# ADR-0026 — Contact form: a native `<form>` sent to a configurable address

**Status:** Accepted on 11/04/2026 · **Date:** 11/04/2026 · **Ref.:** `docs/specifications/05-contact-form.md`, CLAUDE §1, §8, §12, ADR-0002, ADR-0024

## Context

Exported sites are static. A contact form still needs server-side processing to send an email, which WordPress does in PHP. Options studied:
- a third-party service;
- a PHP script shipped with the export;
- a host-specific function;
- a Netvolution relay;
- Astro server rendering.

## Decision

**The Studio produces a standard `<form method="post">` whose `action` is an HTTPS address entered by the user.** Processing belongs to the destination: a form service, or the script of the host or the agency.

- Two components:
  - `form`, a container holding the address, the send label and the hidden fields;
  - `form-field`, a native field with its label.

  Fields are nodes of the tree, not a list in a prop. The layout (grid, stack), selection, drag and drop and existing styles are kept.
- No JavaScript added; validation by the browser.
- Generic hidden fields (`name`/`value`) for the conventions of services (access key, redirection, honeypot), without code per service.
- The constraints the registry cannot express go through `checkSite`: field outside a form, nested form, duplicate names, missing address, empty list.
- The texts written into the site (send label, default label, list prompt, Contact section) follow the site language (`content.*` keys, ADR-0024).

## Rejected alternatives

- **A PHP script shipped with the export.** It works on shared hosting, but not on static hosts. Netvolution would also maintain server code exposed to the Internet: header injection, spam relay, rate limiting. It stays possible as one destination among others, without being shipped by the Studio.
- **A Netvolution relay.** Sites would depend on Netvolution to work, against the reversibility principles.
- **Astro server rendering.** The site would no longer be static by default.
- **Host-specific functions.** One implementation per host, and multi-host publishing is out of scope.
- **A list of fields in a prop of the form.** It avoids the "field outside a form" check, but needs a dedicated list editor and prevents laying fields out freely.

## Consequences

- The export stays static and contains no secret. The address and the hidden fields are public, as the inspector and the README remind.
- GDPR compliance of the processing depends on the chosen destination. The Studio only provides the consent checkbox and the information notice.
- No in-place feedback without JavaScript: the destination decides the page shown after sending. A background submission island can be added later without changing the model.
- The inspector contract grows (`hint`, `follows`, `stringList`, `keyValues`), declaratively: no form-specific code in the inspector.
