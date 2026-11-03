# Netvolution Studio

**Netvolution Studio est un CMS visuel pour concevoir des sites vitrines professionnels et les publier en sites statiques autonomes.** Le graphiste compose ses pages à la souris, comme dans un page builder ; le Studio produit un site Astro standard, rapide et sûr, qui s'héberge n'importe où et ne dépend plus du Studio une fois exporté.

- **Éditeur visuel** : bibliothèque de composants, glisser-déposer, arborescence, inspecteur, aperçu tablette et mobile, annuler/rétablir, copier-coller.
- **Site complet** : pages, menus, header et footer partagés, design system (couleurs, typographie, espacements), médiathèque, SEO, redirections.
- **Création** : sections et composants réutilisables, modèles de site, animations accessibles, texte enrichi, galerie, bandeau défilant, carrousel, CSS personnalisé contrôlé.
- **Assistant IA** (facultatif) : propose des modifications sous forme de commandes, prévisualisées et validées par l'utilisateur (Anthropic ou tout service compatible OpenAI, y compris local).
- **Export** : un projet Astro lisible et documenté, et le site statique prêt à mettre en ligne (HTML, CSS, images optimisées, `sitemap.xml`, `robots.txt`, page 404).

Interface et documentation en français. Le [guide d'utilisation](docs/guide/index.md) accompagne les graphistes pas à pas ; il est aussi servi par le Studio à `/guide/`.

## Principes

- **Document JSON versionné** comme source de vérité, indépendant de React, d'Astro et de tout CMS.
- **Rendu fidèle** : l'aperçu de l'éditeur et l'export utilisent les mêmes composants et la même feuille CSS ; l'écart est mesuré automatiquement.
- **Sites statiques par défaut** : HTML pré-rendu, aucun JavaScript livré sans besoin, aucun back-office exposé avec le site.
- **Sécurité par conception** : documents validés, styles typés, aucun HTML ni JavaScript arbitraire ; le CSS personnalisé est analysé et republié par le Studio, jamais inséré tel quel (ADR-0023).
- **Réversibilité** : l'export est un projet Astro standard, compilable sans le Studio, et les projets s'exportent en archive.

Tatsu (page builder WordPress) sert de référence ergonomique uniquement ; son code n'est ni repris ni versionné.

## État du projet

Les trois jalons prévus sont livrés et validés (30/10/2026) : éditeur visuel d'une page, site vitrine complet, puis créativité et productivité (réutilisation, animations, IA). Des évolutions ont suivi (ADR-0017 à ADR-0023). Limites connues : [docs/limitations.md](docs/limitations.md).

Hors périmètre actuel : comptes et rôles dans le Studio, collaboration en temps réel, administration éditoriale pour le client, e-commerce, migration WordPress.

## Essayer en local

Prérequis : Node.js 26 LTS (ou 24 LTS) et npm 11.

```sh
git clone https://github.com/netvolutionfr/netvolution-studio.git
cd netvolution-studio
npm ci
npm run dev        # http://127.0.0.1:5173/
```

Les projets sont enregistrés dans `data/projects/`, les exports dans `exports/`. Pour activer l'assistant IA, copiez `.env.example` en `.env` et renseignez le fournisseur et sa clé.

## Installer le Studio sur sa machine ou son serveur

Le Studio de production est un seul processus Node : l'application compilée et son API sur un port, avec les données dans un dossier.

> **Le Studio n'a pas d'authentification.** Toute personne qui atteint son port a tous les droits sur les projets. Laissez-le écouter sur `127.0.0.1` et, pour un accès à distance, placez-le derrière un proxy qui fournit HTTPS et une authentification éprouvée (mot de passe nginx, Authelia, Cloudflare Access…).

### Avec Docker (recommandé)

```sh
docker build -t netvolution-studio .
docker run -d --name netvolution-studio --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v "$PWD/data:/data" \
  --env-file .env \
  netvolution-studio
```

Le Studio est sur http://127.0.0.1:8080/. Le dossier `data/` contient les projets, médias, modèles et exports : c'est lui qu'il faut sauvegarder. Le conteneur tourne sous l'utilisateur `node` (uid 1000) : ce dossier doit lui appartenir. Retirez `--env-file .env` si vous n'utilisez pas l'assistant IA.

### Sans Docker

```sh
npm ci
npm run build -w @ns/studio
NS_DATA_DIR=/chemin/vers/data node --env-file-if-exists=.env apps/studio/server.ts
```

| Variable | Rôle | Par défaut |
|---|---|---|
| `HOST` | Adresse d'écoute | `127.0.0.1` |
| `PORT` | Port | `8080` |
| `NS_DATA_DIR` | Projets, médias, modèles, journal de l'IA | `data/` dans le dépôt |
| `NS_EXPORTS_DIR` | Exports générés | `<NS_DATA_DIR>/exports` |
| `NS_AI_*`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | Assistant IA | désactivé (voir `.env.example`) |

### Sur un serveur

Faites tourner le Studio comme ci-dessus, sur `127.0.0.1`, puis exposez-le par un reverse proxy. Exemple nginx :

```nginx
server {
    listen 443 ssl;
    server_name studio.example.org;
    # ssl_certificate … (Let's Encrypt)

    auth_basic "Netvolution Studio";
    auth_basic_user_file /etc/nginx/htpasswd/studio;   # un utilisateur par personne (bcrypt)
    client_max_body_size 200m;                          # import d'archives de projet

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;                        # construction du site statique
    }
}
```

- Avec Docker, gardez le port publié sur `127.0.0.1` : Docker publie ses ports en contournant la plupart des pare-feux.
- La construction du site statique lance `npm ci` dans l'export : le serveur doit pouvoir joindre le registre npm.
- Un seul utilisateur à la fois par projet : un enregistrement concurrent est refusé, pas fusionné.
- Déploiement automatique depuis GitHub (image GHCR, SSH, approbation sur tag de version) : voir [deploy/README.md](deploy/README.md) et l'[ADR-0015](docs/architecture/adr/ADR-0015-hebergement-docker.md).

## Mettre en ligne un site exporté

Le Studio ne publie pas le site lui-même : il exporte des fichiers, que l'on dépose chez n'importe quel hébergeur. Rien ne tourne côté serveur et aucun lien ne subsiste avec le Studio. Le détail, pour les graphistes, est dans le chapitre [Publier et livrer](docs/guide/11-publier-et-livrer.md) du guide.

1. **Exporter** : dans le Studio, menu **⋯** > **Exporter le site (Astro)…**, cochez **Construire aussi le site statique**, puis **Exporter**. Corrigez d'abord les erreurs bloquantes des contrôles avant export.
2. **Télécharger** l'archive **Site statique** (`.tar.gz`) et la décompresser. Elle contient le site prêt à servir : HTML, CSS, images, `sitemap.xml`, `robots.txt`, `404.html`.
3. **Déposer le contenu** du dossier `…-statique` (les fichiers, pas le dossier) **à la racine** d'un domaine ou d'un sous-domaine, pas dans un sous-dossier :

| Hébergement | Mise en ligne | Page 404 |
|---|---|---|
| Hébergeur mutualisé (Apache) | FTP/SFTP dans `www`, `public_html` ou `htdocs` | `.htaccess` : `ErrorDocument 404 /404.html` |
| Netlify, Cloudflare Pages | Glisser le dossier dans l'interface de déploiement | Automatique |
| nginx | Copier dans le `root` du site | `error_page 404 /404.html;` |
| Tout serveur de fichiers statiques | Copier les fichiers | Selon le serveur |

4. **Redirections** : une redirection interne existe déjà dans le site statique sous forme de page de renvoi. Pour une vraie redirection 301, et pour les redirections vers un autre site, ajoutez la configuration fournie dans les **sources Astro**, dossier `redirects/` (`.htaccess`, `_redirects` ou `nginx.conf`).
5. **Mettre à jour** : réexportez, puis remplacez **tous** les fichiers en ligne, après avoir supprimé l'ancien contenu (sinon une page supprimée resterait accessible).

L'archive **Sources Astro** sert à un développeur qui veut reprendre le site sans le Studio : `npm ci && npm run build` produit le même site dans `dist/`. Son `README.md` décrit les pages, les tokens et les médias. Une fois modifiées à la main, ces sources ne se réimportent pas dans le Studio.

Un document peut aussi être exporté en ligne de commande :

```sh
npm run export -- fixtures/grid.json ../site-grid
cd ../site-grid && npm ci && npm run build      # site statique dans dist/
```

## Développement

```sh
npm run check              # typecheck + lint + tests unitaires
npm run test:fidelity      # banc de fidélité aperçu ↔ export ; rapport dans test-results/
npm run test:e2e           # contrôles de bout en bout du shell
npm run demo               # démonstration du jalon 1 (page éditée, exportée)
npm run demo:site          # démonstration du jalon 2 (site vitrine de 5 pages)
npm run demo:creative      # démonstration du jalon 3 (IA simulée)
npm run templates:check    # crée, exporte, construit et vérifie chaque modèle de site
npm run guide:screenshots  # rejoue le tutoriel du guide et régénère ses captures
npm run fonts:catalog      # régénère le catalogue de polices libres (ADR-0018)
npm run templates:build    # régénère les modèles écrits en code (templates/*.ts)
npm run dev -w @ns/guide   # guide d'utilisation seul, sur http://127.0.0.1:4321/guide/
```

Le banc de fidélité et les tests e2e demandent une fois `npx playwright install chromium-headless-shell`. La CI teste Node 26 et 24.

```text
apps/studio/            application web (Vite + React) : shell, canvas, aperçu ; server.ts pour la production
apps/guide/             guide d'utilisation (Astro Starlight) ; sources dans docs/guide/
packages/core/          modèle documentaire, validation, registre, styles et CSS, protocole — sans React
packages/components/    composants : schémas et vues React pures, partagés aperçu/export
packages/export-astro/  générateur de projet Astro autonome, gabarit avec lockfile, CLI
templates/              modèles de site intégrés
fonts/                  catalogue de polices libres, avec leurs licences
fixtures/               documents de référence (pages de départ, banc de fidélité)
tests/                  banc de fidélité et scénarios de bout en bout (Playwright)
deploy/                 déploiement automatisé (GitHub Actions, Docker, nginx)
docs/                   guide, spécifications, architecture et ADR
prototypes/             prototypes jetables
```

## Documentation

- [Guide d'utilisation](docs/guide/index.md) · [Limites connues](docs/limitations.md)
- Spécifications : [Fondations](docs/specifications/00-foundations.md) · [Jalon 1](docs/specifications/01-visual-editor.md) · [Jalon 2](docs/specifications/02-site-builder.md) · [Jalon 3](docs/specifications/03-creative-studio.md)
- Bilans : [jalon 1](docs/architecture/tranche-5.md) · [jalon 2](docs/architecture/jalon-2-tranche-8.md) · [jalon 3](docs/architecture/jalon-3-tranche-8.md) · [Design system du Studio](docs/ui/README.md)
- [Décisions d'architecture (ADR)](docs/architecture/adr/)

## Licence

[Apache License 2.0](LICENSE) — voir aussi [NOTICE](NOTICE). Les polices de `fonts/files/` gardent chacune leur licence (SIL OFL 1.1, ou Apache 2.0 pour Roboto), dont le texte est dans `fonts/licenses/`. La licence ne donne pas le droit d'utiliser le nom « Netvolution ».

Pour signaler une faille de sécurité, voir [SECURITY.md](SECURITY.md).
