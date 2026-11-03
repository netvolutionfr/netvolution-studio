# ADR-0009 — Design tokens

**Statut :** Accepté le 30/10/2026 (mise en œuvre de l'étude jalon 2 §4.3, tranche 3) · **Date :** 30/10/2026 · **Réf. :** SB-05, ADR-0007

## Contexte

SB-05 demande des couleurs nommées, une typographie (familles, styles de titres et de texte, graisses, tailles,
interlignes, variantes responsive), une échelle d'espacement, des rayons et des largeurs maximales. Un token modifié
doit se répercuter sur tous les composants qui le référencent, et les valeurs personnalisées doivent rester
possibles. Le rendu doit rester identique entre le canvas et l'export (ADR-0002).

## Décision

1. **Champ optionnel `tokens` de la v2** (pas de migration) :
   - `colors` : `{ label, value: #hex }` ;
   - `sizes` : `{ label, group: spacing | radius | width | font, value: { base, [breakpoint]? } }` ;
   - `fonts` : `{ label, stack: string[] }` ;
   - `textStyles` : `{ label, style: { base?, [breakpoint]? } }`, chacun limité à `fontFamily`, `fontSize`,
     `fontWeight` et `lineHeight`.

   Les ids de tokens suivent `^[a-z][a-z0-9-]{0,31}$` et ne changent pas : renommer un token ne modifie que son
   libellé.
2. **Référence = `{ token: id }`** à la place d'une valeur littérale :
   - les couleurs (`color`, `backgroundColor`) référencent `colors` ;
   - les longueurs référencent `sizes` ;
   - deux nouvelles propriétés de style, `fontFamily` et `textStyle`, référencent `fonts` et `textStyles`.

   `loadSite` refuse une référence vers un token absent (`missing-token`) ou vers un breakpoint inconnu.
3. **Tout passe par des variables CSS.** `toCss` émet `:root { --ns-color-<id>; --ns-size-<id>; --ns-font-<id>;
   --ns-text-<id>-<propriété> }`, puis redéfinit les valeurs responsives dans les mêmes `@media (max-width)` que
   les nœuds. Une référence produit `var(--ns-…)`. Modifier un token change donc une variable, sans réécrire les
   nœuds.
4. **Styles de texte sans classe supplémentaire.** Un nœud dont le style contient `textStyle` reçoit, dans sa
   propre règle et avant ses propriétés locales, les déclarations `font-*: var(--ns-text-<id>-…)`. Les valeurs
   locales l'emportent par l'ordre de la cascade. Les vues React ne changent pas, et l'export non plus.
5. **Styles par défaut des éléments.** Les styles de texte d'id `body` et `h1`…`h6` s'appliquent aussi aux
   éléments correspondants (`body{…}`, `h1{…}`). Une classe de nœud reste prioritaire.
6. **Polices** :
   - le Studio n'accepte que les piles de familles (polices système ou installées) ; chaque nom doit respecter
     `^[A-Za-z0-9 _-]{1,60}$` et est entouré de guillemets à l'émission, sauf les familles génériques ;
   - aucun appel à un service tiers ;
   - les fichiers de police (`@font-face`) arriveront avec la médiathèque (tranche 5).
7. **Commandes** : `setToken { kind, id, value }` crée ou remplace un token, `removeToken { kind, id }` le supprime.
   La suppression d'un token référencé est refusée avec le nombre de références.

## Alternatives

- **Remplacer les valeurs dans les nœuds** à la modification : CSS sans variables, mais modifier un token réécrit
  tout le site et l'historique, et l'export perd la notion de token.
- **Classe `ns-text-<id>` ajoutée par la vue** : sélecteur plus lisible, mais il faut modifier toutes les vues
  textuelles et leur contrat d'export.
- **Tokens libres (`--var` arbitraire)** : plus souple, mais c'est une porte d'injection CSS, et l'inspecteur ne
  saurait plus quelles valeurs proposer.

## Conséquences

- Le CSS exporté contient un bloc `:root` lisible, que reprend la documentation de l'export.
- Ombres et création de breakpoints ne sont pas couvertes ici : il n'existe pas de propriété d'ombre, et les
  breakpoints restent ceux des modèles. Ces points sont reportés et documentés dans les limites.
