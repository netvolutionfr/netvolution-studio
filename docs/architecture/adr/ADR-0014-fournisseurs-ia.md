# ADR-0014 — Fournisseurs d'IA et confidentialité

**Statut :** Accepté le 30/10/2026 · **Date :** 30/10/2026 · **Réf. :** CS-08, CS-09, CS-11, CLAUDE §8, ADR-0013 ; étude jalon 3 §10.3

## Contexte

L'assistance IA (tranche 7) doit proposer des transformations sous forme de **lots de commandes** (ADR-0013), toujours prévisualisées et validées par l'utilisateur. Plusieurs contraintes s'appliquent :
- le fournisseur ne doit pas être imposé ;
- les clés restent côté serveur (CS-11) ;
- les coûts doivent être bornés ;
- le contenu envoyé doit être explicite ;
- les tests et la démonstration ne doivent dépendre ni d'un réseau ni d'une clé.

## Décision

1. **Contrat neutre** (`core/src/ai/contract.ts`) : `AiProvider.complete({ system, messages, tools?, maxTokens })` renvoie `{ text, toolCalls, usage, model, truncated }`, ou lève une `AiError` typée :
   - `disabled`, `too-large`, `rate-limit`, `budget`, `auth`, `refused` ;
   - `timeout`, `unavailable`, `bad-request`, `invalid-response`.

   Les outils sont décrits par leur JSON Schema, celui du catalogue des commandes. La requête est validée par `aiRequestSchema`, avec des tailles bornées par `AI_LIMITS`.
2. **Trois fournisseurs**, choisis par `NS_AI_PROVIDER` :
   - `anthropic` : SDK officiel `@anthropic-ai/sdk` (version figée), modèle par défaut `claude-opus-5-5`.
     - Choix de l'outil laissé au modèle (`tool_choice: auto`) et effort `medium`.
     - **Repli côté serveur activé par défaut** (`fallbacks: "default"`) : en cas de refus du modèle principal, l'API rejoue la requête sur un modèle de repli. Un refus persistant devient l'erreur `refused`.
   - `openai` : adaptateur `fetch` vers `/chat/completions`, pour OpenAI, Mistral, Ollama, LM Studio… `NS_AI_BASE_URL` et `NS_AI_MODEL` sont configurables, la clé facultative pour un modèle local.
   - `simulated` : déterministe, sans réseau, pour les tests, le banc et la démonstration.
3. **Service serveur** (`dev-server/ai/service.ts`), seul point d'appel, qui :
   - lit la configuration et les clés depuis l'environnement (`.env` non versionné, modèle `.env.example`) ;
   - **plafonne** les jetons par réponse (`NS_AI_MAX_TOKENS`), les requêtes par minute (`NS_AI_REQUESTS_PER_MINUTE`) et le budget quotidien (`NS_AI_DAILY_TOKENS`) ;
   - consigne chaque appel dans `data/ai-log.jsonl` : fournisseur, modèle, durée, jetons, nombre d'appels d'outils, statut ou code d'erreur, **jamais de contenu**.
4. **Routes** :
   - `GET /api/ai/status` : état, fournisseur, modèle, limites et consommation du jour, **sans clé** ;
   - `POST /api/ai/complete`. Erreurs : désactivé → 503, quota → 429, refus → 422, délai dépassé → 504, sinon 502.

   Le navigateur n'a ni clé ni accès direct au fournisseur.
5. **Sans configuration, l'assistant est désactivé.** Le Studio reste entièrement utilisable ; le panneau « Assistant IA » explique comment l'activer.

## Confidentialité : ce qui est envoyé

- **Rien sans action explicite** : aucun appel en arrière-plan, aucune analyse automatique du site.
- **Le strict nécessaire à la demande** (tranche 7) : la consigne de l'utilisateur, la description des outils autorisés et l'extrait du site concerné (élément ou page sélectionnés), pas le projet entier ni la médiathèque. Les fichiers médias ne sont jamais envoyés.
- **Fournisseur tiers** : les données sont traitées selon les conditions du fournisseur choisi. Un point d'accès local (Ollama, LM Studio) permet de ne rien faire sortir de la machine.
- **Journal local sans contenu** (voir ci-dessus) ; les exports ne contiennent ni clé ni configuration IA (vérifié par test).

## Alternatives

- **Appel direct depuis le navigateur** : il exposerait les clés (CS-11).
- **Un seul fournisseur** : enfermement et aucun modèle local possible.
- **Bibliothèque d'abstraction multi-fournisseurs** : une dépendance lourde pour deux adaptateurs de quelques dizaines de lignes.
- **`fetch` brut pour Anthropic** : le SDK officiel gère les en-têtes, les reprises, les erreurs typées et les évolutions de l'API.

## Conséquences

- Une nouvelle dépendance serveur (`@anthropic-ai/sdk`), absente du bundle du Studio et des exports.
- Les limites sont globales au serveur de développement, sans comptes (hors périmètre). Le compteur quotidien vit en mémoire et repart à zéro au redémarrage.
- Le serveur reste local et sans authentification (CLAUDE §8) : un déploiement Internet exigerait une protection d'accès externe, d'autant plus que l'assistant engage des coûts.
