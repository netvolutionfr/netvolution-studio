# ADR-0018 — Polices importées et catalogue de polices libres

**Statut :** Accepté le 31/10/2026 · **Date :** 31/10/2026 · **Réf. :** CLAUDE §6, §8 et §9, ADR-0009, ADR-0010

## Contexte

Le design system (ADR-0009) ne connaissait que des listes de familles : seules s'affichaient les polices installées chez le visiteur. Les graphistes ont besoin des polices de la charte.

On écarte la solution habituelle des page builders, qui chargent les polices depuis Google Fonts. Ce chargement transmet l'adresse IP de chaque visiteur à Google, aux États-Unis. Depuis l'arrêt Schrems II (CJUE, 2020) et la décision du tribunal de Munich (LG München, 20/01/2022), c'est un risque RGPD pour les clients. Le site doit aussi rester autonome (CLAUDE §6) : aucun service tiers au moment de l'exécution.

Décisions de l'utilisateur, le 31/10/2026 : **polices importées plutôt que polices web**, **woff2 seulement**, et un **catalogue des polices les plus répandues** proposé dans le Studio.

## Décision

1. **Un nouveau type de média : `font`.** Fichier woff2 uniquement, 2 Mo maximum. Le serveur vérifie la signature `wOF2`. Chaque police décrit :
   - sa `family` (même règle de nom que les piles du design system, donc sans risque dans une chaîne CSS) ;
   - sa `weight`, une graisse `{ min, max }` : une seule valeur, ou une plage pour une police variable ;
   - son `style`, `normal` ou `italic` ;
   - une `license` facultative.

   À l'import, la description est déduite du nom de fichier (`Inter-SemiBoldItalic.woff2`) et se corrige dans la médiathèque.
2. **Déclaration.** `toCss` émet un `@font-face` par fichier, avec `font-display: swap`, sous le préfixe des médias. Le canvas et l'aperçu servent les fichiers depuis le projet ; l'export les copie dans `public/media/`. Les miniatures n'en émettent pas.
3. **Utilisation.** Une police importée s'utilise en plaçant sa famille en tête d'une pile du design system (`Inter, sans-serif`). Le modèle ne lie pas une pile à un média : un nom de famille suffit, et une famille absente retombe sur la police suivante de la pile.
4. **Catalogue.** 25 polices libres et répandues, sous licence SIL OFL 1.1 (Apache 2.0 pour Roboto Slab), sont versionnées dans `fonts/` :
   - le jeu de caractères latin seulement, qui couvre le français ;
   - 23 polices variables (un fichier par style), plus Lato et Poppins en graisses fixes ;
   - leur licence complète ;
   - au total, 49 fichiers et 1,9 Mo.

   Elles sont produites par `npm run fonts:catalog` à partir des paquets Fontsource, en versions figées. Le Studio n'appelle aucun service de polices, ni pendant l'édition, ni dans le site produit.
5. **Ajout depuis le catalogue.** Un clic copie les fichiers dans les médias du projet (`POST /api/projects/:id/fonts`) et crée une police du design system, `Famille, serif` ou `Famille, sans-serif`. Le tout s'annule en une seule étape.
6. **Licences.** La licence d'une police du catalogue est enregistrée sur le média et reprise dans le `MEDIA.md` de l'export. Pour une police importée à la main, c'est l'utilisateur qui garantit que sa licence autorise l'usage web : le guide le rappelle.

## Alternatives écartées

- **Google Fonts ou Adobe Fonts en ligne** : transfert de données personnelles hors de l'UE, et dépendance à un service tiers au moment de l'exécution.
- **TTF, OTF et WOFF** : plus lourds, ou dépassés. Les fichiers TTF et OTF sont souvent vendus sous licence « bureau », qui exclut l'usage web. Le woff2 est lu par tous les navigateurs actuels.
- **Un catalogue téléchargé à la demande** : le Studio dépendrait d'un registre à chaque ajout. Une copie versionnée est plus stable et vérifiable.
- **Lier une pile du design system à un média** : un couplage plus fort, sans bénéfice. Le nom de famille suffit, et l'utilisateur garde la main sur les polices de repli.

## Conséquences

- Le banc de fidélité couvre une police importée : la fixture `tokens` utilise Lora, et le banc vérifie que la police est réellement chargée côté canvas comme côté export, pas remplacée par une police système.
- Le contrôle avant export signale en erreur un fichier de police manquant.
- L'image Docker embarque le catalogue (`fonts/catalog.json`, `fonts/files/`).
- Le guide (chapitres 5 et 7) explique le catalogue, l'import et la question des licences.
