# ADR-0006 — Design system de l'interface du Studio

**Statut :** Accepté le 29/10/2026 · **Réf. :** mission « Modernisation visuelle » ; `docs/ui/README.md`

## Contexte

L'éditeur fonctionnait avec des contrôles natifs peu stylés. L'objectif est une interface dense et professionnelle (références : Tatsu, Figma, Linear, shadcn/ui), sans refonte, sans toucher au modèle, au rendu ni à l'export, et avec un design system léger.

## Décision

1. **Tokens CSS** sémantiques (`apps/studio/src/ui/tokens.css`) : thème sombre par défaut, thème clair par override de bloc.
2. **Primitives maison** minimales (`Button`, `IconButton`, `Tip`, `Segmented`, `Menu`, `Section`, `Field`) en CSS simple (`ui.css`).
3. **`lucide-react`** (ISC) pour une iconographie cohérente, importée icône par icône.
4. **Radix UI, ponctuellement** (MIT), uniquement là où le comportement accessible est coûteux à refaire :
   - Tooltip : survol, focus et Échap ;
   - ToggleGroup : radios et focus itinérant ;
   - DropdownMenu : navigation clavier, recherche par frappe, retour du focus.
5. **Isolation stricte.** Ces dépendances vivent dans `@ns/studio` seulement. Le canvas, les composants exportés et le gabarit Astro n'en dépendent pas ; un test unitaire le vérifie.

## Alternatives écartées

- **shadcn/ui** : il impose Tailwind et un style de génération de code. Les quelques primitives utiles sont couvertes par Radix et environ 300 lignes maison.
- **Tailwind ou un autre framework CSS** : nouvel outil de build et nouvelle syntaxe pour un besoin couvert par des tokens et du CSS simple, déjà en place.
- **Tout en natif** : `<details>` et les boutons suffisent, mais l'infobulle accessible au clavier, le groupe radio à focus itinérant et le menu accessible seraient à réécrire et à tester nous-mêmes.
- **Radix Select / Popover / Dialog** : non nécessaires. Le select natif et le `<dialog>` natif sont accessibles.

## Conséquences

- Bundle du shell : +130 Ko (≈ +45 Ko gzip). Bundle du canvas inchangé.
- **Règle :** une nouvelle dépendance UI exige un besoin d'accessibilité ou de comportement démontré.
- Risque identifié et documenté : une infobulle Radix ne doit pas envelopper un élément portant déjà un `data-state` Radix.
