# ADR-0020 — Texte enrichi : paragraphes, couleur, titres enrichis, texte en dégradé

**Statut :** Accepté le 01/11/2026 · **Date :** 01/11/2026 · **Réf. :** CLAUDE §5 et §8, ADR-0001, ADR-0019, `docs/research/essai-import-tatsu.md`

## Contexte

L'essai d'import d'un site Tatsu a mesuré, sur deux pages :
- 18 titres en partie en gras ou en italique ;
- 12 textes en dégradé ;
- des blocs de texte faits de plusieurs paragraphes en couleur.

Un Texte n'avait qu'un paragraphe, un Titre n'était qu'une chaîne, et aucun morceau de texte ne pouvait être coloré.

Le Studio n'a pas de migration par composant : la version d'un composant n'est pas enregistrée dans les nœuds. Changer la forme de ces props demanderait donc une migration du document entier (`schemaVersion`), qui toucherait les modèles, la bibliothèque de sections, les démonstrations, l'IA simulée et le convertisseur.

## Décision

**Une extension rétrocompatible : les anciennes formes restent valides, l'éditeur écrit les nouvelles.**

1. **Morceaux enrichis** (`packages/components/src/rich.ts`, partagés par Texte, Titre et Liste) : gras, italique, lien validé, et désormais **couleur**.
   - La couleur est une valeur hexadécimale validée par `colorSchema`, rendue en `style="color:…"`. Ce n'est jamais du CSS libre.
   - L'éditeur la propose à partir des couleurs du design system ou d'un nuancier, mais l'enregistre en valeur littérale. Changer ensuite une couleur du design system ne la modifie donc pas.
2. **Texte** : `content` accepte un paragraphe (`Inline[]`, la forme d'origine) ou plusieurs (`Inline[][]`, de 1 à 50). Le rendu dépend du nombre :
   - un seul paragraphe donne toujours un `<p>`, comme avant : le DOM des textes existants ne change pas ;
   - plusieurs donnent une `<div class="… ns-text">` qui contient des `<p>`.
3. **Titre** : `text` accepte une chaîne (la forme d'origine) ou des morceaux enrichis. Le niveau reste porté par le composant, et le contrôle des niveaux de titre est inchangé.
4. **Texte en dégradé** : la propriété de style `textGradient` (groupe `typography`) reprend le format des dégradés d'ADR-0017. Elle s'émet en `background-clip: text` et `-webkit-text-fill-color: transparent` ; `none` retire un dégradé hérité. Elle s'applique à tout l'élément, ce qui correspond au cas mesuré : 12 titres entiers.
5. **Éditeur** :
   - avec `paragraphs`, Entrée crée un paragraphe et Maj+Entrée insère un retour à la ligne (ADR-0019) ;
   - un bouton Couleur, avec la palette et un nuancier ;
   - un bouton Effacer la mise en forme ;
   - le Titre utilise le même éditeur, sur un seul paragraphe.

## Alternatives écartées

- **Une migration `schemaVersion` 3** vers une forme unique : plus propre sur le papier, mais elle change tous les documents, les modèles et les outils, pour un gain nul à la lecture. L'extension garde un seul sens par forme : un tableau de morceaux est un paragraphe, un tableau de tableaux en est plusieurs.
- **Des intertitres et des listes dans un Texte** : les composants Titre et Liste existent déjà, et un intertitre dans un texte échapperait au contrôle des niveaux de titre.
- **Une taille ou un fond sur une partie d'un texte** (8 occurrences) : c'est un risque de typographie incohérente pour un usage rare. On découpe plutôt en plusieurs éléments.
- **Une couleur de morceau sous forme de token** : il faudrait suivre ces références dans les props, pour les vérifier et pour refuser la suppression d'un token utilisé. C'est remis à plus tard si le besoin se confirme.

## Conséquences

- Banc de fidélité : la fixture `elements` contient un texte de deux paragraphes avec un passage en couleur, un titre enrichi et un titre en dégradé (retiré sur mobile). Le banc compare les attributs `style` sous leur forme normalisée par le navigateur.
- Les tests vérifient le rendu des nouvelles formes, la validité des anciennes et le refus des couleurs malformées.
- Le guide documente l'éditeur (chapitre 3) et le texte en dégradé (chapitre 4).
