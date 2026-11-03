# History

How Netvolution Studio was built, milestone by milestone. These documents are **kept in French**, as they were written (ADR-0024): they record past decisions and measurements and are not maintained. The current state is in the [specifications](../specifications/), the [ADRs](../architecture/adr/) and the [known limitations](../limitations.md). They are translated on request.

## Architecture studies

Written before each milestone, to choose the architecture; the ADRs record the decisions that came out of them.

- [Milestone 1 — visual editor](studies/etude-architecture-jalon-1.md)
- [Milestone 2 — site builder](studies/etude-architecture-jalon-2.md)
- [Milestone 3 — creative studio](studies/etude-architecture-jalon-3.md)

## Slice reports

Each milestone was delivered in vertical slices ("tranches"); each report lists what was done, the tests run, the limitations and the open points. The last report of a milestone is its review.

| Milestone 1 | Milestone 2 | Milestone 3 |
|---|---|---|
| [1 — JSON → canvas and export, measured fidelity](reports/tranche-1.md) | [1 — site model v2](reports/jalon-2-tranche-1.md) | [1 — reusable sections and components](reports/jalon-3-tranche-1.md) |
| [2 — commands, history and editor shell](reports/tranche-2.md) | [2 — projects and pages](reports/jalon-2-tranche-2.md) | [2 — site templates](reports/jalon-3-tranche-2.md) |
| [3 — generated inspector, components, library, drag and drop](reports/tranche-3.md) | [3 — design tokens](reports/jalon-2-tranche-3.md) | [3 — declarative animations](reports/jalon-3-tranche-3.md) |
| [4 — persistence, media, image, export from the interface](reports/tranche-4.md) | [4 — menus, header/footer, site preview](reports/jalon-2-tranche-4.md) | [4 — advanced composition](reports/jalon-3-tranche-4.md) |
| [5 — finalization and **milestone review**](reports/tranche-5.md) | [5 — media library](reports/jalon-2-tranche-5.md) | [5 — services layer](reports/jalon-3-tranche-5.md) |
| | [6 — richer components and JavaScript islands](reports/jalon-2-tranche-6.md) | [6 — AI providers](reports/jalon-3-tranche-6.md) |
| | [7 — SEO, checks and complete export](reports/jalon-2-tranche-7.md) | [7 — editorial and design AI assistance](reports/jalon-3-tranche-7.md) |
| | [8 — demonstration and **milestone review**](reports/jalon-2-tranche-8.md) | [8 — demonstration and **milestone review**](reports/jalon-3-tranche-8.md) |

## Research

Non-normative.

- [Tatsu: functional and technical analysis](research/TATSU-ANALYSE.md) — the page builder used as an ergonomic reference.
- [Standalone Tatsu: feasibility study](tatsu/standalone-feasibility.md)
- [Trial import of a Tatsu site](research/essai-import-tatsu.md) (11/01/2026) — a throwaway trial to measure the gaps; not a migration feature.
