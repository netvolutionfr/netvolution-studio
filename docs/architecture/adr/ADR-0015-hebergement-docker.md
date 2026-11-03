# ADR-0015 — Hébergement du Studio : Docker, nginx et protection d'accès externe

**Statut :** Accepté le 30/10/2026 · **Date :** 30/10/2026 · **Réf. :** CLAUDE §3 et §8, ADR-0004, ADR-0008, ADR-0014, ADR-0016

## Contexte

Le Studio n'était utilisable qu'en local. Son API (ADR-0004, ADR-0008) tournait dans le serveur de développement Vite, sur 127.0.0.1. On veut le rendre disponible sur `https://studio.netvolution.fr`, sur le serveur web4 (Debian 13), avec ces contraintes :
- **accès par mot de passe** ;
- aucune dépendance Node installée sur le serveur ;
- un déploiement automatique depuis GitHub, comme pour les autres applications Netvolution.

Le Studio n'a pas d'authentification, et CLAUDE §8 interdit d'en inventer une : « pour un déploiement Internet avant l'authentification du produit, utiliser une protection d'accès externe éprouvée ».

## Décision

1. **Serveur de production** (`apps/studio/server.ts`) :
   - il sert l'application compilée et la même API (`createApi`) sur un seul port, sans Vite ;
   - les données sont dans `NS_DATA_DIR`, les exports dans `<données>/exports` ;
   - il n'a pas d'authentification et ne doit jamais être exposé directement.
2. **Image Docker** en trois étapes :
   - build ;
   - dépendances d'exécution seulement ;
   - image finale `node` Alpine, avec la version figée.

   L'image s'exécute avec un utilisateur non privilégié. Elle contient npm et tar, nécessaires à l'export (build Astro, archive), et un healthcheck. Les données sont dans le volume `/data`.
3. **Conteneur publié sur `127.0.0.1` uniquement**, géré par `compose.yaml`.
4. **nginx devant** :
   - HTTPS (Let's Encrypt) ;
   - **authentification HTTP Basic** sur tout le site, avec des mots de passe hachés en bcrypt ;
   - limitation de débit, et fail2ban conseillé ;
   - `noindex` ;
   - délais longs pour l'export.
5. **Téléchargement des exports** : `GET /api/exports/:nom.tar.gz` (sources ou site statique, sans `node_modules`). Les chemins sur le serveur ne servent à rien depuis un navigateur distant.
6. **CI/CD GitHub Actions** :
   - vérifications (typecheck, lint, tests), aussi sur chaque pull request ;
   - image poussée sur GHCR, étiquetée par commit ;
   - déploiement par SSH : `docker compose pull && up -d` avec l'image du commit, puis attente d'un état sain.

   Les secrets (SSH, jeton GHCR) sont dans GitHub. Les clés d'IA sont dans le `.env` du serveur, en 600, jamais dans l'image.
7. **Versions et chaîne d'approvisionnement** : le détail est dans `deploy/README.md`.
   - Node 26 LTS dans l'image, avec la version et l'empreinte figées, et les correctifs Alpine à chaque build.
   - CI sur Node 26 et 24, au dernier correctif, avec un audit npm bloquant (failles hautes et critiques).
   - Actions épinglées par commit et mises à jour par Dependabot (actions, image, npm).
   - Image publiée avec provenance et SBOM ; clé d'hôte SSH vérifiée au déploiement.

## Alternatives

- **Node installé sur le serveur, avec systemd** : plus simple, mais refusé (dépendance de version sur un serveur partagé avec d'autres sites).
- **Authentification dans le Studio** : hors périmètre et contraire à CLAUDE §8 tant qu'elle n'est pas conçue (rôles, passkeys, audit).
- **Portail d'identité (Authelia, Cloudflare Access, oauth2-proxy)** : double authentification et comptes nominatifs, mais une brique de plus à exploiter. Recommandé si le nombre d'utilisateurs augmente. Il se place devant le même conteneur, sans changer le Studio.
- **Builder les exports dans un conteneur séparé** : meilleure isolation des dépendances npm des sites exportés, mais plus complexe. À reconsidérer si l'export devient un service partagé.

## Conséquences

- Toute personne qui connaît un mot de passe a **tous les droits** : il n'y a ni rôles ni journal par utilisateur.
- Utilisation pensée pour un utilisateur à la fois par projet : un enregistrement concurrent est refusé (conflit).
- **L'export exécute `npm ci` et `astro build`** dans le conteneur, avec un accès au registre npm. Les dépendances viennent du lockfile figé de l'export, généré par le Studio et non par l'utilisateur. Le build tourne sans privilèges, dans le conteneur.
- Les sauvegardes du dossier `data/` relèvent de l'exploitation du serveur.
