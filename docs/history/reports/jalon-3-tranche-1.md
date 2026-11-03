# Jalon 3 — Tranche 1 : sections et composants réutilisables

**Date :** 30/10/2026 · **Périmètre :** CS-01, CS-03 (lots CS-A, CS-B ; étude jalon 3 §4.1), ADR-0011 · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| `site.symbols` (définition : id, nom, catégorie, description, version, racine, paramètres) et `node.instance` (définition, version, valeurs propres) ; champs optionnels de la v2 | `core/src/document/schema.ts` | `symbols.test.ts` |
| `loadSite` : racines des définitions parcourues, identifiants distincts des pages et layouts, définition existante, version connue, **refus des cycles** (composant qui se contient, même indirectement) | `document/load.ts` | `symbols.test.ts` |
| Commandes `createSymbol` (la sélection devient la première instance), `importSymbol` (section de la bibliothèque), `insertSymbol` (liée ou copie), `setOverride`, `updateSymbol`, `publishSymbol`, `updateInstances` (reconstruit en conservant les valeurs propres, incompatibilités laissées de côté et signalées), `detachInstance`, `removeSymbol` (refusée s'il reste des instances) ; `instanceStatus`, `defaultParams` | `editor/commands.ts` | `symbols.test.ts` (5 scénarios) |
| Contrôles avant export : instance en retard, modifiée hors de ses paramètres, valeurs incompatibles, paramètre sans cible | `document/check.ts` | e2e |
| Bibliothèque de sections intégrées : les 10 compositions du jalon 2 deviennent des sections (id, catégorie, description, version), plus Présentation, Atouts, Témoignages, Tarifs, Équipe et Contact | `components/src/sections.ts` | `components.test.ts` (chaque section s'insère valide) |
| Onglet **Sections** de la bibliothèque : recherche, catégories, composants du projet, sections intégrées, **vignettes en rendu réel** (Shadow DOM, tokens du site), Insérer (copie) / Insérer liée / Modifier | `shell/SectionLibrary.tsx`, `shell/Thumbnail.tsx`, `Library.tsx` | e2e, capture |
| Inspecteur : « Créer un composant réutilisable » ; panneau de l'instance (paramètres, version, Mettre à jour avec résumé préalable, Détacher, Modifier) ; réglages du composant en édition (métadonnées, Publier la version N+1, Mettre à jour les instances, Supprimer) ; panneau Pages : « Composants partagés » | `shell/Symbols.tsx`, `Inspector.tsx`, `Pages.tsx` | e2e |
| Harnais e2e : capture et sélecteur en cause en cas d'échec | `tests/e2e/shell.ts` | — |

## Choix faits pendant la tranche

- **Publication explicite d'une version** (« Publier la version N+1 »). Éditer la définition ne change ni la version ni les instances : la propagation est toujours un geste volontaire, résumé avant application et annulable.
- **Paramètres proposés automatiquement** : tous les champs de contenu (textes, liens, médias) de l'arbre. Les éléments de même nom sont numérotés.
- **Paramètre sans cible** (après la suppression d'un élément de la définition) : c'est un avertissement, pas une erreur de validation, pour que l'édition reste possible. L'instance concernée est laissée de côté à la mise à jour et signalée.
- **Copier-coller et duplication d'une instance** conservent le lien. « Insérer » depuis la bibliothèque crée une copie indépendante (CS-01).
- **Grille compacte « Compositions »** conservée dans l'onglet Composants, alimentée par la même liste de sections, pour l'insertion rapide et le glisser-déposer.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 143/143 |
| `npm run test:e2e` | 34/34, dont « enregistrer, réutiliser sur 2 pages, propager, incompatibilité signalée » |
| `npm run test:fidelity` | 44/44 identiques |
| `npm run demo`, `npm run demo:site` | réussies |

## Limites

- **Paramètres adressés par chemin d'indices** : réordonner les éléments d'une définition peut déplacer un paramètre vers un autre élément de même type. Le cas est signalé seulement si le type ne correspond plus.
- **Paramètres non modifiables** : la liste se régénère seulement à la création ; on ne peut ni en ajouter ni en retirer dans l'interface.
- **Sections enregistrées hors projet** : elles ne sont pas partagées entre projets. Les modèles de site arrivent en tranche 2.
- **Prévisualisation d'une mise à jour** : c'est un résumé (instances mises à jour ou laissées de côté), pas encore un diff détaillé, prévu avec la couche de services en tranche 5.
- **Vignettes** : celles des composants du projet sont recalculées à chaque modification du site.
