# Jalon 3 — Tranche 4 : composition avancée

**Date :** 30/10/2026 · **Périmètre :** CS-04 (lot CS-C ; étude jalon 3 §4.3) · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| Propriétés de style typées et responsives : `position` (dans le flux, relative, absolue), `top` / `right` / `bottom` / `left`, `zIndex`, `overflow`, `translate` (X, Y), `rotate`, `scale`, `aspectRatio` (liste fermée), `objectPosition` (images) ; groupes `position`, `effects`, `media` ouverts aux composants | `core/src/style/schema.ts`, `css.ts`, définitions des composants | `components.test.ts` |
| Transformations en **propriétés CSS indépendantes** (`translate`, `rotate`, `scale`) : elles se composent avec le `transform` des animations de survol (limite notée en tranche 3) | `style/css.ts` | `components.test.ts` |
| Contrôle avant export : élément absolu sans parent positionné (avertissement) | `document/check.ts` | `components.test.ts` |
| Inspecteur : section « Position et effets », décalage X/Y, proportions, cadrage d'image | `shell/StyleFields.tsx` | e2e |
| Canvas : **poignées de redimensionnement** (largeur, hauteur minimale, les deux) au breakpoint édité, **guides magnétiques** (bords du parent et des voisins), largeur bornée à celle du parent ; **barre d'alignement** dans un parent flex ou grid (début, centre, fin, étirer) ; un geste = une annulation ; geste terminé même relâché hors de la fenêtre | `shell/Canvas.tsx` | e2e |
| Banc : fixture `composition.json` (image 16:9 cadrée, badge absolu en superposition qui revient dans le flux sur mobile, carte décalée et agrandie) ; **contrôle général « aucun défilement horizontal »** sur chaque page et chaque largeur | `fixtures/composition.json`, `tests/fidelity/run.ts` | banc 52/52 |

## Choix faits pendant la tranche

- **Le flux reste la règle** : l'absolu n'est qu'une valeur de `position`, prévue pour une superposition dans un parent positionné. `checkSite` signale l'usage hors de ce cadre.
- **Hauteur minimale plutôt que hauteur** pour la poignée du bas : un texte plus long ne déborde jamais d'une boîte agrandie à la main.
- **Distribution** : elle reste le réglage « Distribution » du conteneur (déjà présent). La barre du canvas règle l'alignement propre de l'élément.
- **Absence de défilement horizontal** vérifiée par le banc pour toutes les fixtures, pas seulement la nouvelle.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 152/152 |
| `npm run test:e2e` | 37/37, dont « poignée de redimensionnement (1 annulation, bornée au parent), alignement » |
| `npm run test:fidelity` | 52/52 identiques, aucun défilement horizontal ; animations et interactions conformes |
| `npm run demo`, `npm run demo:site` | réussies |

## Limites

- **Accessibilité des gestes** : poignées et guides se manipulent à la souris. Au clavier, on passe par les champs de l'inspecteur, qui couvrent les mêmes propriétés.
- **Guides** : seulement pendant un redimensionnement (pas de déplacement libre, puisque le flux reste la règle), sur les bords et sans repères de centre.
- **Sélection multiple et répartition d'une sélection** : absentes. La répartition passe par le conteneur.
- **Rotation et échelle** : pas de poignée dans le canvas.
