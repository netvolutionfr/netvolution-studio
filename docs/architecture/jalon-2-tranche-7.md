# Jalon 2 — Tranche 7 : SEO, contrôles et export complet

**Date :** 30/10/2026 · **Périmètre :** SB-08, SB-10, SB-11, SB-12 (étude jalon 2 §4.8, §9) · **Statut :** livré

## Livré

| Élément | Emplacement | Vérification |
|---|---|---|
| `page.seo` (titre, description, canonical, indexation, image de partage) et `site.redirects` (ancienne adresse → page, média ou URL ; 301/302) : champs optionnels de la v2, validés (image existante, redirection en double ou sur une page existante, cibles) | `core/src/document/schema.ts`, `load.ts` | `export.test.ts`, `api.test.ts` |
| Commandes `updatePage { seo }` et `setRedirects` ; sections « Référencement et partage » et « Redirections » dans l'inspecteur | `editor/commands.ts`, `shell/Pages.tsx` | e2e |
| `checkSite` : validation du modèle, liens internes cassés (page non publiée), fichiers de médias manquants, accueil non publié (erreurs) ; URL du site absente, titre ou description manquants ou trop longs, nombre de `h1`, niveaux de titres sautés, liens non renseignés (avertissements) | `core/src/document/check.ts` | `components.test.ts` |
| Dialogue « Exporter le site » : contrôles, accès direct à la page ou à l'élément en cause, export bloqué en cas d'erreur, option « construire aussi le site statique » ; le serveur relance les contrôles | `shell/ExportDialog.tsx`, `dev-server/api.ts` | e2e, `api.test.ts` |
| Pages exportées : titre SEO, meta description, canonical, `noindex`, Open Graph (titre, description, URL, nom du site, image si l'URL du site est connue) | `export-astro/src/generate.ts` (`headTags`) | `export.test.ts` (échappement compris) |
| Page 404 (header et footer du site, lien vers l'accueil, `noindex`), `robots.txt`, `sitemap.xml` (pages publiées et indexables, si l'URL du site est définie) | `withNotFound`, `siteFiles` | `export.test.ts`, build réel |
| Redirections : `astro.config.mjs` (internes, pages `meta refresh` en statique) + `redirects/` (`_redirects`, `nginx.conf`, `.htaccess`) documenté | `siteFiles` | `export.test.ts`, build réel |
| Deux livrables : sources Astro, et site statique construit par le Studio (`npm ci` + build) copié dans `<export>-statique/` | `dev-server/api.ts` | démo (build lancé depuis le Studio, servi par un serveur statique) |
| `MEDIA.md` (inventaire des médias) ; README de l'export : déploiement, page 404, redirections | `generate.ts` | `export.test.ts` |
| Archive du projet (`site.json` + médias en base64, un fichier JSON) et réimport depuis l'écran Projets, chaque fichier vérifié comme un envoi | `GET /archive`, `POST /api/projects/import` | `api.test.ts` (aller-retour, média piégé écarté), e2e |

## Choix faits pendant la tranche

- **Archive en JSON**, sans dépendance ZIP. Cela tranche le point ouvert d'ADR-0008.
- **URL du site absente : avertissement, pas erreur.** Sans elle, ni sitemap, ni canonical, ni image Open Graph absolus. L'export de travail reste possible.
- **Header et footer toujours intégrés à chaque page générée** (étude §4.8 : `src/parts/`) : le DOM reste celui que le banc compare. Un fichier par layout partagé est reporté.
- **Contrôles d'accessibilité limités à ce qui est calculable sur le modèle** : titres, textes alternatifs (par la validation), liens. Le contraste et le reste passent par axe dans le banc et les e2e, pas dans le Studio (étude §4.8).
- **Redirections externes** : uniquement dans les fichiers de configuration d'hébergeur, pas dans `astro.config.mjs`.

## Vérifications

| Commande | Résultat |
|---|---|
| `npm run typecheck`, `npm run lint` | sans erreur |
| `npm test` | 132/132 |
| `npm run test:e2e` | 33/33, dont « SEO, contrôles bloquants avant export, archive du projet » et le réimport de l'archive |
| `npm run test:fidelity` | 32/32 identiques, interactions conformes, aucune violation grave |
| `npm run demo` | réussie : contrôles et build statique lancés depuis le Studio, site servi hors dépôt, `404.html` et `robots.txt` présents |
| Build manuel de `layouts.json` avec URL du site et redirections | 5 pages + page de redirection, `sitemap.xml`, `robots.txt` |

## Limites

- **Build statique** : il exige le réseau pour `npm ci`. Il s'exécute dans la requête HTTP (une à quelques minutes), sans progression affichée.
- **Pas de ZIP** des livrables ni de l'archive.
- **Pas de contrôle automatique du contraste** dans le Studio, et pas de contrôle des dépendances au-delà du lockfile figé du gabarit.
- **Changement de slug** : il ne propose pas encore de créer une redirection.
- **Open Graph** : pas de dimensions d'image ni de `og:locale`.
