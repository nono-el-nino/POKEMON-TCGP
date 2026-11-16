# Pocket Favorites

Application de fans responsive pour composer ses favoris Pokémon TCG Pocket. React 19, TypeScript, Vite. Hébergement statique, sans compte ni serveur applicatif.

## Développement

Node **22.14+** (Node 24.22.1 vérifié) et npm. Le catalogue préparé est versionné ; aucun import réseau n’est nécessaire pour démarrer.

```sh
npm ci --cache /workspace/.npm-cache
npm run images:sync
npm run dev -- --port 5173
```

Dans un environnement local classique, le paramètre `--cache` est facultatif. Les polices sont servies localement. Les illustrations exactes sont préparées localement par `images:sync`, puis servies avec le site. Les URL originales restent dans le catalogue. Aucun accès externe n’est nécessaire pour afficher les cartes une fois le site construit.

```sh
npm run build         # TypeScript + bundle statique dans dist/
npm test              # Intégrité, variantes, import et stockage
npm run test:e2e      # Parcours navigateur desktop/mobile, PNG, JSON
npm run preview -- --port 4173
```

Les tests navigateur utilisent `/usr/bin/chromium`. Pour une autre machine, adapter `executablePath` dans `playwright.config.ts` ou installer Chromium avec Playwright. Aucun secret, compte ou service externe authentifié n’est requis. `vite.config.ts` utilise `base: './'` pour les hébergements en sous-dossier.

## Données et mises à jour

```sh
npm run data:update   # Télécharge v5 FULL + index des extensions + noms PokéAPI
npm run images:sync   # Prépare les nouveaux WebP exacts dans public/images/
npm run data:verify   # Revérifie aussi les URL sources avec 12 requêtes simultanées
npm test
npm run build
```

L’import utilise `curl` avec validation TLS conservée et échoue sur un téléchargement incomplet. Les nouvelles extensions et raretés sont découvertes sans modification de l’interface. `public/data/catalog.json` contient les données préparées ; la date et le SHA-256 du payload complet figurent dans `meta`. Les impressions restent séparées par leur ID extension-numéro. Le chemin de chaque image doit correspondre exactement à cet ID. Les champs de variantes sont conservés. Les traductions sont enrichies avec les noms PokéAPI lorsqu’une correspondance est disponible ; sinon le nom anglais de la source est conservé. Les extensions connues sont traduites, les nouvelles gardent leur nom source.

Le rapport source `public/data/image-report.json` résulte d’une vérification réseau complète et datée. Le rapport du cache local est dans `.local/image-cache-report.json`. Les images préparées sont conservées dans le snapshot cloud et copiées dans `dist/`. Elles sont ignorées par Git ; la compilation récupère automatiquement les images absentes avec vérification TLS et en-tête WebP. Leur disponibilité upstream n’est nécessaire que pour les télécharger ou les mettre à jour. Les noms anglais, français et les IDs sont recherchables. Le site de vérification Limitless est accessible depuis la fiche de chaque impression. Le dataset complémentaire flibustier a été consulté pour vérifier la structure set + numéro et les conventions ; il ne remplace pas le dataset v5 full.

La CI vérifie chaque changement. Sur `main`, le workflow publie aussi `dist/` sur GitHub Pages après validation. Chaque lundi, il prépare le catalogue à jour, vérifie les illustrations et republie le site. Les données actualisées sont disponibles dans les artifacts de la CI ; aucun commit automatique n’est créé. Les pull requests et les autres branches sont vérifiées sans publication.

## Accéder au site avec GitHub Pages

1. Ouvrir [Settings → Pages](https://github.com/nono-el-nino/POKEMON-TCGP/settings/pages), puis choisir **GitHub Actions** dans **Build and deployment → Source** (nécessite les droits de gestion du dépôt).
2. Dans [Actions](https://github.com/nono-el-nino/POKEMON-TCGP/actions/workflows/validate.yml), attendre le succès de **Validate, refresh and publish**. Si la première tentative a échoué avant l’activation de Pages, utiliser **Re-run all jobs**, ou **Run workflow** sur `main`.
3. L’adresse attendue est **https://nono-el-nino.github.io/POKEMON-TCGP/**. Le lien exact de publication apparaît aussi dans le job `deploy` et dans Settings → Pages. La première publication peut prendre quelques minutes.

Aucune clé ni aucun secret à ajouter : le déploiement utilise le jeton temporaire de GitHub Actions avec les permissions `pages: write` et `id-token: write`. La publication ne peut aboutir tant que GitHub Pages n’est pas activé dans les paramètres du dépôt. Si Pages est indisponible pour la visibilité du dépôt et votre offre GitHub, utiliser un hébergeur statique compatible avec `dist/`.

## Choix explicites et sauvegarde

- Une case est identifiée par `set|extension|rareté` ou `type|type|rareté`. Les deux matrices conservent leurs propres choix, sans inventer une préférence dans l’autre mode.
- La liste réunit les cartes uniques choisies dans les deux matrices. Retirer une case ne supprime pas les autres occurrences ; supprimer depuis les favoris retire la carte de toutes les cases.
- Les résumés par catégorie proposent un gagnant s’il existe un seul candidat. Plusieurs candidats demandent un arbitrage explicite.
- Top 10 ordonné et favori absolu sont choisis manuellement. Une suppression nettoie les références obsolètes.
- Comparaison assistée : tournoi séquentiel parmi les candidats filtrés, avec choix final toujours confirmé par l’utilisateur.
- Sauvegarde `localStorage` version 1 ; JSON exportable et importable. L’import fusionne les cases ; les cases du fichier remplacent les collisions. Les IDs inconnus et cases incompatibles sont rejetés et signalés. Aucun secret dans les sauvegardes.
- PNG paysage 2400 px et story 1080 px, répartis en planches lisibles pour les grandes collections. Les images absentes sont signalées, jamais remplacées par une autre illustration. Les restrictions de téléchargements multiples du navigateur peuvent demander une autorisation.

## Architecture

`src/model.ts` : schéma et catégories. `src/storage.mjs` : validation et nettoyage de sauvegarde. `src/App.tsx` : matrices, galerie, résumés et interactions. `src/export.ts` : rendu PNG. `scripts/` : import et intégrité. Les données sont chargées une fois depuis le bundle statique, jamais recherchées sur une API pendant une sélection. Les galeries affichent 60 cartes à la fois, avec chargement progressif des images.

## Licences et publication

Code de cette première version et données v5 : **AGPL-3.0-or-later** (voir `LICENSE`). Pour toute mise à disposition en réseau, fournir les sources correspondantes et respecter les obligations AGPL. Le build génère une archive source correspondante téléchargeable depuis le pied de page, contenant le code, le catalogue préparé, les scripts et les notices. Conserver ce lien, les licences et les notices lors du déploiement. Les illustrations sont récupérées séparément depuis leur source exacte par le script de préparation.

Les données v5 de PocketDecks sont sous AGPL ; la référence flibustier est MIT, les noms PokéAPI BSD-3-Clause. Les notices complètes et licences des polices/icônes sont dans `public/licenses/`, également inclus dans `dist/`.

**La licence du dataset ne couvre pas les illustrations Pokémon.** Elles restent la propriété de Nintendo, Creatures Inc., GAME FREAK Inc. et DeNA. Le dépôt source les reproduit à titre de référence, sans licence générale de redistribution ou d’exploitation commerciale. Cette application n’est ni affiliée ni approuvée par les ayants droit. Avant une diffusion publique ou commerciale, vérifier les conditions applicables aux illustrations et aux exports. Le workflow de publication est fourni ; la mise en ligne dépend de l’activation de GitHub Pages dans les paramètres du dépôt.
