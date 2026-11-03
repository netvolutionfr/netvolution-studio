# ADR-0012 — Animations déclaratives

**Statut :** Accepté le 30/10/2026 · **Date :** 30/10/2026 · **Réf. :** CS-05, CS-06, CS-07, CS-12, ADR-0002 (îlots) ; étude jalon 3 §4.4

## Contexte

CS-05 demande :
- des **déclencheurs** : chargement, entrée dans le viewport, survol, focus, clic ;
- des **effets** : opacité, translation, échelle, rotation et leurs combinaisons ;
- des **paramètres** : durée, délai, easing, direction, répétition, stagger.

Les contraintes associées :
- **Modèle** : il ne doit dépendre d'aucune bibliothèque (CS-06).
- **Export** : il n'embarque que le runtime nécessaire.
- **Accessibilité** : `prefers-reduced-motion` est respecté (CS-12).
- **Éditeur** : il permet de rejouer un effet, sans animer ses propres contrôles (CS-07).
- **Licences** : GSAP n'est utilisable qu'après vérification de sa licence.

## Décision

1. **Modèle** : `node.animations?: Animation[]`, un champ optionnel des nœuds, typé et sans référence à une bibliothèque.
   - `trigger` : `load` | `inView` | `hover` | `focus` | `click` ;
   - `effect` : `{ opacity?, x?, y? (px), scale?, rotate? (deg) }` :
     - pour une entrée (`load`, `inView`, `click`), c'est l'état de départ, et l'élément revient à son état normal ;
     - pour `hover` et `focus`, c'est l'état cible ;
   - `duration`, `delay` (ms, bornés) ; `easing` dans une liste fermée, ou `cubic-bezier` à 4 nombres bornés ;
   - `iterations` : 1 à 10, ou `infinite` pour `load` uniquement ; `direction` : `normal` | `alternate` ;
   - `stagger` (ms) : décale l'animation des enfants directs plutôt que celle de l'élément.
2. **Runtime : CSS natif et Web Animations API, sans dépendance.**
   - **`hover` et `focus`** : CSS uniquement. Des transitions sont générées dans la règle du nœud (`:hover`, `:focus-visible`, `:focus-within`).
   - **`load`, `inView`, `click`, `stagger`** : un îlot `animate` (Web Animations API + IntersectionObserver), ajouté seulement aux pages qui contiennent une animation de ce type. Les paramètres sont lus dans un attribut `data-ns-animate` produit par la vue à partir du modèle validé.
3. **Contenu toujours accessible.**
   - Le CSS ne masque jamais un élément.
   - C'est l'îlot qui applique l'état de départ juste avant d'animer. Sans JavaScript, ou si l'îlot échoue, le contenu reste visible dans son état final.
   - En `prefers-reduced-motion: reduce`, le CSS neutralise les transitions et l'îlot n'anime rien.
4. **Éditeur.**
   - Le runtime ne vit que dans le canvas, l'aperçu du site et l'export ; les contrôles du Studio ne sont jamais animés par lui.
   - Le canvas propose un interrupteur « animations », une simulation du mouvement réduit et un bouton « Rejouer » sur l'élément sélectionné.
   - Le scroll de l'aperçu déclenche `inView` comme sur le site.
5. **Fidélité.**
   - Le banc compare l'état final, avec `reduced-motion` émulé.
   - Un contrôle dédié vérifie, sur le site construit, le déclenchement des animations et leur absence en mouvement réduit.
6. **Moteurs tiers.** Motion n'est ajouté que si un effet nécessaire ne peut pas être couvert par la Web Animations API. GSAP est exclu tant que sa licence n'a pas été vérifiée.

## Alternatives

- **Motion dès le départ** : plus d'effets disponibles, mais une dépendance livrée aux pages animées pour des effets que la Web Animations API couvre.
- **CSS pur avec `animation-timeline: view()`** : pas de JavaScript pour `inView`, mais un support navigateur incomplet. Le contenu risquerait de rester masqué là où la fonctionnalité manque.

## Conséquences

- Un îlot de plus (quelques dizaines de lignes), sur le même modèle que les onglets.
- Le banc doit émuler le mouvement réduit : la fidélité des états intermédiaires n'est pas comparée pixel à pixel, seulement leur déclenchement.
