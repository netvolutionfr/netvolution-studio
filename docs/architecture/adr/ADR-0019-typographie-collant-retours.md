# ADR-0019 — Typographie fine, éléments collants et retours à la ligne

**Statut :** Accepté le 01/11/2026 · **Date :** 01/11/2026 · **Réf. :** CLAUDE §5 et §8, ADR-0009, ADR-0017, `docs/research/essai-import-tatsu.md`

## Contexte

Un essai d'import d'un site réel construit avec Tatsu a mesuré l'écart avec le Studio (`docs/research/essai-import-tatsu.md`). Trois manques ressortent, très fréquents et peu coûteux à combler :
- **la typographie fine** : 241 réglages d'espacement des lettres et de casse sur onze pages ;
- **les éléments collants** : les colonnes « sticky » et un header qui reste en haut de page ;
- **les retours à la ligne** dans un texte ou un titre.

## Décision

1. **Trois propriétés de style** rejoignent le groupe `typography` :
   - `letterSpacing` : une longueur, les valeurs négatives sont admises ;
   - `textTransform` : `none`, `uppercase`, `lowercase` ou `capitalize` ;
   - `fontStyle` : `normal` ou `italic`.

   Elles entrent aussi dans les **styles de texte** du design system (ADR-0009), avec un espacement des lettres réglable par breakpoint, émis en variables CSS comme la taille. La casse ne touche que l'affichage : le texte saisi reste lisible par les lecteurs d'écran et les moteurs.
2. **La position `sticky`** (« Collante ») s'ajoute à `position`. Comme une épaisseur de bordure sans style ne dessine rien (ADR-0017), une position collante sans décalage ne colle pas : l'inspecteur règle donc aussi `top: 0` quand aucun décalage ne s'applique.
3. **Les retours à la ligne** s'écrivent `\n` dans le texte : les morceaux d'un Texte et d'un élément de Liste, et le texte d'un Titre. Les vues les rendent en `<br>`. Comme le canvas et l'export partagent ces vues, la fidélité est garantie. Dans le texte enrichi, Entrée insère un `<br>`, converti en `\n` à la lecture. Un Titre se saisit dans un champ multiligne.
4. **Conteneur, pile et grille** acceptent le groupe `typography` depuis les modèles de site du 31/10/2026 : une couleur ou une police réglée sur une boîte s'hérite par son contenu. Ce point est consigné ici.

Les documents existants restent valides : les propriétés sont facultatives, et un texte sans `\n` est inchangé.

## Alternatives écartées

- **Un texte enrichi en blocs** (plusieurs paragraphes, intertitres, couleur sur une partie du texte) : c'est le vrai besoin mesuré, avec 183 blocs de texte riches. Mais c'est un changement de modèle avec conversion des textes existants. Il est laissé à une décision séparée.
- **Un composant « header collant »** : la position collante, générale, couvre ce cas sans composant de plus.

## Conséquences

- Banc de fidélité : la fixture `elements` a un titre en capitales espacées, un texte avec un retour à la ligne et de l'italique ; la fixture `tokens` a un style de texte avec un espacement des lettres responsive et un style en italique.
- Le guide documente ces réglages (chapitres 3, 4 et 5, annexes A et B).
