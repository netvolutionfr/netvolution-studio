# Netvolution Studio

CMS visuel pour concevoir des sites vitrines professionnels et les publier en **sites Astro statiques et autonomes**, sans WordPress et sans dépendance à Netvolution à l'exécution.

> **Jalon 3 (Creative Studio) livré et validé (30/10/2026).** Sections et composants réutilisables versionnés, modèles de site, animations déclaratives accessibles, composition avancée, couche de services (catalogue de commandes, lots, diff, journal), assistance IA par commandes structurées avec validation humaine (Anthropic, compatible OpenAI, simulé). Démonstration : `npm run demo:creative`. Bilan : [tranche 8](docs/architecture/jalon-3-tranche-8.md) · [étude](docs/architecture/etude-architecture-jalon-3.md) · limites : [docs/limitations.md](docs/limitations.md).
>
> **Jalon 2 (Site Builder) livré et validé (30/10/2026).** Projets et pages, menus, header/footer partagés, design tokens, médiathèque, composants enrichis et îlots JavaScript, aperçu du site, SEO, contrôles avant export, export Astro multipage et build statique, archive. Démonstration : `npm run demo:site` (site vitrine de 5 pages construit dans le Studio, exporté, servi sans le Studio). Bilan : [tranche 8](docs/architecture/jalon-2-tranche-8.md) · limites : [docs/limitations.md](docs/limitations.md).
>
> **Jalon 1 (Visual Editor) livré et validé (30/10/2026).** Éditeur visuel complet (bibliothèque, glisser-déposer, arborescence au clavier, inspecteur généré, aperçu, undo/redo, copier-coller), neuf composants, enregistrement local, médias, export Astro autonome, banc de fidélité et contrôles d'accessibilité. Démonstration : `npm run demo`. Bilan : [tranche 5](docs/architecture/tranche-5.md) · limites : [docs/limitations.md](docs/limitations.md).

## Principes

- **Document JSON versionné** comme source de vérité, indépendant de React, d'Astro et de tout CMS.
- **Rendu fidèle** : l'aperçu de l'éditeur et l'export Astro utilisent les mêmes composants et la même feuille CSS ; l'écart est mesuré automatiquement.
- **Sites statiques par défaut** : HTML pré-rendu, aucun JavaScript livré sans besoin, aucun back-office exposé.
- **Sécurité par conception** : documents validés, styles typés, aucun HTML/JS arbitraire ; le CSS personnalisé du projet est analysé et republié par le Studio, jamais inséré tel quel (ADR-0023).
- **Réversibilité** : l'export est un projet Astro standard, documenté, compilable hors du Studio.

Tatsu (page builder WordPress) sert de référence ergonomique uniquement ; son code n'est ni repris ni versionné.

## Feuille de route

| Jalon | Contenu | État |
|---|---|---|
| 1 — Visual Editor | Éditeur d'une page, canvas, inspecteur, undo/redo, sauvegarde, export Astro fidèle | Livré, validé le 30/10/2026 |
| 2 — Site Builder | Pages, menus, header/footer, design tokens, médiathèque, SEO, export multipage | Livré, validé le 30/10/2026 |
| 3 — Creative Studio | Sections réutilisables, animations déclaratives, assistance IA par commandes | Livré, validé le 30/10/2026 |
| Évolutions | Bordures, ombres, dégradés, images de fond (ADR-0017) ; polices importées et catalogue (ADR-0018) ; composant Liste ; guide d'utilisation (Starlight) ; modèles Studio Orbe et Cabinet Valéor | Livré le 31/10/2026, à valider |
| Évolutions | Typographie fine, éléments collants, retours à la ligne (ADR-0019) ; texte enrichi (ADR-0020) ; Galerie (ADR-0021) ; Bandeau défilant et Carrousel (ADR-0022) ; CSS personnalisé : feuille du projet et classes (ADR-0023) | Livré du 01 au 02/11/2026, à valider |

## Structure du dépôt

```text
apps/studio/            application web (Vite + React) : shell d'édition (index.html), canvas (canvas.html) et aperçu du site (preview.html)
apps/guide/             guide d'utilisation (Astro Starlight), servi par le Studio à /guide/ ; sources dans docs/guide/
packages/core/          modèle documentaire, validation, registre, styles et CSS, protocole — sans React
packages/components/    composants : définitions (schémas) + vues React pures, partagées aperçu/export
packages/export-astro/  générateur de projet Astro autonome, gabarit avec lockfile, CLI
fixtures/               documents de référence (pages de départ, banc de fidélité)
templates/              modèles de site intégrés (archives de projet)
tests/fidelity/         banc de fidélité canvas ↔ export (Playwright)
docs/                   guide d'utilisation (docs/guide/), spécifications, architecture et ADR, recherche Tatsu (non normative)
prototypes/             prototypes jetables
```

## Prérequis

- Node.js 26 LTS (recommandé, version de production) ou 24 LTS, au dernier correctif, et npm 11 (npm workspaces). Node exécute directement le TypeScript des scripts. La CI teste les deux versions.
- Pour le banc de fidélité et les tests e2e : `npx playwright install chromium-headless-shell` (une fois).

## Commandes

```sh
npm ci                     # installation
npm run check              # typecheck + lint + tests unitaires
npm run test:fidelity      # banc de fidélité ; rapport dans test-results/fidelity-report.md
npm run test:e2e           # contrôles de bout en bout du shell
npm run demo               # démonstration du jalon 1 ; rapport dans test-results/demo-report.md
npm run demo:site          # démonstration du jalon 2 (site vitrine) ; rapport dans test-results/demo-site-report.md
npm run demo:creative      # démonstration du jalon 3 (IA simulée) ; rapport dans test-results/demo-creative-report.md
npm run fonts:catalog      # régénère le catalogue de polices libres (fonts/, ADR-0018)
npm run guide:screenshots  # rejoue le tutoriel du guide et régénère ses captures (docs/guide/images/)
npm run templates:build    # régénère les modèles de site écrits en code (templates/*.ts → templates/<id>.json)
npm run templates:check    # crée, exporte et construit chaque modèle, puis le vérifie (axe, mobile, polices) ; captures dans test-results/templates/
npm run templates:atelier  # régénère le modèle Atelier Nord en rejouant la démonstration du jalon 2
npm run dev -w @ns/guide   # guide d'utilisation (Starlight) sur http://127.0.0.1:4321/guide/, relayé par le Studio
npm run dev                # Studio sur http://127.0.0.1:5173/ (projets dans data/projects/, exports dans exports/)
npm run export -- fixtures/grid.json ../site-grid   # exporte un document en projet Astro
cd ../site-grid && npm ci && npm run build          # build du site exporté, hors du dépôt
```

## Hébergement

> **Le Studio n'a pas d'authentification.** Toute personne qui atteint son adresse a tous les droits sur les projets. Ne l'exposez jamais tel quel sur Internet : placez-le derrière un proxy qui fournit HTTPS et une authentification éprouvée (mot de passe nginx, Authelia, Cloudflare Access…).

Le Studio peut être hébergé dans un conteneur Docker derrière nginx (HTTPS et mot de passe), déployé par GitHub Actions à chaque tag de version (`v*`), après approbation : voir [deploy/README.md](deploy/README.md) et l'[ADR-0015](docs/architecture/adr/ADR-0015-hebergement-docker.md). En local : `docker build -t netvolution-studio . && docker run -p 127.0.0.1:8080:8080 -v "$PWD/data:/data" netvolution-studio`.

## Documentation

- **[Guide d'utilisation](docs/guide/index.md)** (graphistes et intégrateurs) : Markdown dans `docs/guide/`, site [Astro Starlight](https://starlight.astro.build) (`apps/guide/`, recherche Pagefind intégrée) construit avec le Studio et servi à `/guide/` (bouton « ? »). En développement : `npm run dev -w @ns/guide` (le Studio y renvoie `/guide/`). Les captures sont produites par `npm run guide:screenshots`, qui échoue si le tutoriel ne correspond plus à l'interface ; `npm run check` vérifie les liens, les images et le sommaire.
- [Guide d'utilisation](docs/guide/index.md) (servi par le Studio à `/guide/`) · [Limites connues](docs/limitations.md)
- [Fondations](docs/specifications/00-foundations.md) · [Jalon 1](docs/specifications/01-visual-editor.md) · [Jalon 2](docs/specifications/02-site-builder.md) · [Jalon 3](docs/specifications/03-creative-studio.md)
- [Étude d'architecture du jalon 1](docs/architecture/etude-architecture-jalon-1.md) · [Tranche 1](docs/architecture/tranche-1.md) · [Tranche 2](docs/architecture/tranche-2.md) · [Tranche 3](docs/architecture/tranche-3.md) · [Tranche 4](docs/architecture/tranche-4.md) · [Tranche 5 et bilan du jalon 1](docs/architecture/tranche-5.md) · [Limites connues](docs/limitations.md) · [Design system du Studio](docs/ui/README.md)
- [Étude d'architecture du jalon 2](docs/architecture/etude-architecture-jalon-2.md) · [Tranche 1](docs/architecture/jalon-2-tranche-1.md) · [Tranche 2](docs/architecture/jalon-2-tranche-2.md) · [Tranche 3](docs/architecture/jalon-2-tranche-3.md) · [Tranche 4](docs/architecture/jalon-2-tranche-4.md) · [Tranche 5](docs/architecture/jalon-2-tranche-5.md) · [Tranche 6](docs/architecture/jalon-2-tranche-6.md) · [Tranche 7](docs/architecture/jalon-2-tranche-7.md) · [Tranche 8 et bilan du jalon 2](docs/architecture/jalon-2-tranche-8.md)
- [Étude d'architecture du jalon 3](docs/architecture/etude-architecture-jalon-3.md) · [Tranche 1](docs/architecture/jalon-3-tranche-1.md) · [Tranche 2](docs/architecture/jalon-3-tranche-2.md) · [Tranche 3](docs/architecture/jalon-3-tranche-3.md) · [Tranche 4](docs/architecture/jalon-3-tranche-4.md) · [Tranche 5](docs/architecture/jalon-3-tranche-5.md) · [Tranche 6](docs/architecture/jalon-3-tranche-6.md) · [Tranche 7](docs/architecture/jalon-3-tranche-7.md) · [Tranche 8 et bilan du jalon 3](docs/architecture/jalon-3-tranche-8.md)
- ADR : [0001 Document](docs/architecture/adr/ADR-0001-document-et-composants-versionnes.md) · [0002 Rendu fidèle](docs/architecture/adr/ADR-0002-rendu-fidele-preview-astro.md) · [0003 Commandes](docs/architecture/adr/ADR-0003-commandes-transactions-historique.md) · [0004 Persistance](docs/architecture/adr/ADR-0004-persistance-mvp.md) · [0005 Monorepo](docs/architecture/adr/ADR-0005-organisation-monorepo.md) · [0006 Design system](docs/architecture/adr/ADR-0006-design-system-studio.md) · [0007 Modèle de site v2](docs/architecture/adr/ADR-0007-modele-de-site-v2.md) · [0008 Persistance par projet](docs/architecture/adr/ADR-0008-persistance-par-projet.md) · [0009 Design tokens](docs/architecture/adr/ADR-0009-design-tokens.md) · [0010 Médiathèque](docs/architecture/adr/ADR-0010-mediatheque-et-images.md) · [0011 Composants réutilisables](docs/architecture/adr/ADR-0011-composants-reutilisables.md) · [0012 Animations](docs/architecture/adr/ADR-0012-animations-declaratives.md) · [0013 Services](docs/architecture/adr/ADR-0013-services-et-lots-de-commandes.md) · [0014 Fournisseurs d'IA](docs/architecture/adr/ADR-0014-fournisseurs-ia.md) · [0015 Hébergement Docker](docs/architecture/adr/ADR-0015-hebergement-docker.md) · [0016 Distribution](docs/architecture/adr/ADR-0016-mode-de-distribution.md) · [0017 Styles décoratifs](docs/architecture/adr/ADR-0017-styles-decoratifs.md) · [0018 Polices importées](docs/architecture/adr/ADR-0018-polices-importees.md) · [0019 Typographie fine](docs/architecture/adr/ADR-0019-typographie-collant-retours.md) · [0020 Texte enrichi](docs/architecture/adr/ADR-0020-texte-enrichi.md) · [0021 Galerie](docs/architecture/adr/ADR-0021-galerie.md) · [0022 Bandeau et carrousel](docs/architecture/adr/ADR-0022-bandeau-carrousel.md) · [0023 CSS personnalisé](docs/architecture/adr/ADR-0023-css-personnalise.md)

## Licence

[Apache License 2.0](LICENSE) — voir aussi [NOTICE](NOTICE). Les polices de `fonts/files/` gardent chacune leur licence (SIL OFL 1.1, ou Apache 2.0 pour Roboto), dont le texte est dans `fonts/licenses/`. La licence ne donne pas le droit d'utiliser le nom « Netvolution ».

Pour signaler une faille de sécurité, voir [SECURITY.md](SECURITY.md).
