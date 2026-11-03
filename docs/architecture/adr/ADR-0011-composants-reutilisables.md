# ADR-0011 — Sections et composants réutilisables

**Statut :** Accepté le 30/10/2026 · **Date :** 30/10/2026 · **Réf. :** CS-01, CS-03, ADR-0007 ; étude jalon 3 §4.1

## Contexte

CS-01 demande une bibliothèque de sections (hero, features, témoignages, tarifs, équipe, galerie, CTA, contact…). Chaque section a un identifiant, un nom, une catégorie, une description, une vignette, une définition documentaire, des paramètres et une version, et l'insertion crée une copie indépendante par défaut.

CS-03 ajoute des instances liées à une définition partagée :
- propagation contrôlée des modifications ;
- incompatibilités signalées ;
- aucune dépendance circulaire.

Le jalon 2 possède déjà deux mécanismes proches :
- les préréglages, arbres statiques copiés à l'insertion ;
- les layouts partagés, racines de la table de nœuds réutilisées par plusieurs pages.

## Décision

1. **Définitions** : `site.symbols?: Symbol[]`, un champ optionnel de la v2 (pas de migration).
   - Forme : `Symbol = { id, name, category, description, version, rootId, params: Param[] }`.
   - La définition est une racine de la table de nœuds, comme un layout, éditable comme une page.
   - `Param = { id, label, nodePath, prop }` expose une propriété d'un nœud de la définition, repéré par son chemin d'indices depuis la racine (stable entre copies).
2. **Instances développées.** Une instance est une copie ordinaire du sous-arbre, avec de nouveaux identifiants. Sa racine porte `instance: { symbolId, version, overrides: Record<paramId, valeur> }`. Le rendu, le canvas, le CSS, les îlots, l'export et le banc ne changent pas.
3. **Versions et propagation contrôlée.**
   - **Nouvelle version** : modifier la définition incrémente `version`.
   - **Signalement** : `checkSite` signale les instances en retard.
   - **Mise à jour** : `updateInstances { symbolId, instances? }` reconstruit chaque instance depuis la définition et réapplique ses surcharges. Le diff est prévisualisé, et la mise à jour forme une transaction annulable.
   - **Incompatibilités** : un paramètre surchargé qui a disparu, ou dont la valeur n'est plus valide pour le composant, n'est pas appliqué. Il est signalé, et l'instance garde sa version tant que l'utilisateur n'a pas confirmé.
4. **Détacher** : `detachInstance` retire `instance` ; la copie devient libre. Modifier une instance hors de ses paramètres reste possible, mais `checkSite` le signale (« modifiée localement, sera écrasée à la mise à jour »).
5. **Absence de cycle.** `loadSite` refuse :
   - une définition qui contient, directement ou indirectement, une instance d'elle-même (graphe des symboles) ;
   - une instance dont la définition est absente.
6. **Sections de la bibliothèque** : ce sont des symboles hors projet, avec la même forme et des nœuds en `NodeTemplate`.
   - **Origine** : soit intégrées au registre (`components/src/sections.ts`, qui remplace et étend les presets), soit enregistrées depuis un projet (« Enregistrer comme section » sur une sélection).
   - **Insertion** : copie indépendante par défaut ; « insérer liée » crée d'abord la définition dans le site si elle n'y est pas, puis une instance.
7. **Vignettes : rendu réel réduit.** La section est rendue dans une iframe miniature avec les vues, le CSS et les tokens du site courant, puis mise à l'échelle par CSS. Aucune image n'est stockée.

## Alternatives

- **Références vivantes** (nœud `instance` résolu au rendu) : rejeté.
  - Toute la chaîne de rendu devrait gérer l'indirection : CSS par nœud, ids HTML uniques (onglets), îlots, export.
  - La propagation serait implicite et immédiate, donc non « contrôlée ».
- **Vignettes en images stockées** : rejeté. Elles devraient être régénérées à chaque modification de la section ou des tokens, et stockées avec elle.

## Conséquences

- Le document grossit d'une copie par instance ; la mesure sur le site démonstrateur se fera en tranche 8.
- Les presets du jalon 2 deviennent des sections intégrées : la bibliothèque n'a plus qu'un mécanisme.
- Les surcharges sont limitées aux paramètres déclarés. Rendre paramétrable une autre propriété impose une nouvelle version de la définition.
