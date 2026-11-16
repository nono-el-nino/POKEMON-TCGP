# Pocket Favorites

Application de fans responsive pour composer ses favoris Pokémon TCG Pocket parmi les cartes à **4 losanges inclus (EX), étoiles, couronnes et promotions**. Les raretés inférieures sont exclues. React 19, TypeScript, Vite. Hébergement statique, sans compte ni serveur applicatif.

## Développement

Node **22.14+** (Node 24.22.1 vérifié) et npm. Le catalogue préparé est versionné ; aucun import réseau n’est nécessaire pour démarrer.

```sh
npm ci --cache /workspace/.npm-cache
npm run images:sync
npm run dev -- --port 5173
```

Dans un environnement local classique, le paramètre `--cache` est facultatif. Les polices sont servies localement. Les illustrations exactes sont préparées localement par `images:sync`, puis servies avec le site. Les URL originales restent dans le catalogue. Aucun accès externe n’est nécessaire pour afficher les cartes une fois le site construit.

```sh
npm run build         # Illustrations + scores de profil + TypeScript + bundle dans dist/
npm test              # Intégrité, variantes, import et stockage
npm run test:e2e      # Parcours navigateur desktop/mobile, PNG, JSON
npm run preview -- --port 4173
```

Les tests navigateur utilisent `/usr/bin/chromium`. Pour une autre machine, adapter `executablePath` dans `playwright.config.ts` ou installer Chromium avec Playwright. Aucun secret, compte ou service externe authentifié n’est requis. `vite.config.ts` utilise `base: './'` pour les hébergements en sous-dossier.

## Données et mises à jour

```sh
npm run data:update   # Télécharge v5 FULL + index des extensions + noms PokéAPI
npm run images:sync   # Prépare les WebP éligibles et retire les anciennes images exclues
npm run profiles:build # Mesure les illustrations et classe chaque impression sur 4 axes
npm run data:verify   # Revérifie aussi les URL sources avec 12 requêtes simultanées
npm test
npm run build
```

La sélection actuelle compte **1 716 impressions** issues des 4 547 entrées v5. Le seuil est centralisé dans `src/eligibility.mjs` ; le champ EX seul ne peut pas réintroduire une carte de rareté inférieure.

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
- Les anciennes sauvegardes sont migrées : les choix exclus sont retirés de la sélection active, et une copie JSON antérieure reste téléchargeable dans Mes favoris.
- Sauvegarde `localStorage` version 1 ; JSON exportable et importable. L’import fusionne les cases ; les cases du fichier remplacent les collisions. Les IDs inconnus et cases incompatibles sont rejetés et signalés. Aucun secret dans les sauvegardes.
- PNG paysage 2400 px et story 1080 px, répartis en planches lisibles pour les grandes collections. Les images absentes sont signalées, jamais remplacées par une autre illustration. Les restrictions de téléchargements multiples du navigateur peuvent demander une autorisation.

## Profil de collectionneur et partage PNG HD

Dans **Mes favoris**, quatre moyennes (Douceur, Énergie, Mystère, Éclat) déterminent une signature parmi 12. Les scores de chaque carte combinent 60 % de mesures de l’illustration réelle et 40 % d’attributs Pokémon. Chaque impression compte une fois, quel que soit le nombre de cases occupées. Aucun score n’est tiré au hasard. Les règles complètes, coefficients, égalités et limites sont documentés dans [docs/profiles.md](docs/profiles.md), ainsi que dans l’interface.

Le bouton **Télécharger mon résultat PNG** crée une image de 2400 px de large avec le profil, les quatre notes et tous les favoris uniques, y compris ceux de l’autre matrice. Le Top 10 et le favori absolu sont signalés. Au-delà de 24 cartes, l’export est réparti en plusieurs images. Les exports de matrices paysage et story et le JSON complet restent disponibles via Exporter. Ce profil est une lecture ludique des goûts visuels.

La compilation génère `public/data/profiles.json` via Sharp/libvips (dépendance de développement uniquement). Le cache est réutilisé lorsque les images, métadonnées et règles sont identiques. Aucun traitement des images ni appel de classification externe n’est nécessaire dans le navigateur.

## Architecture

`src/model.ts` : schéma et catégories. `src/storage.mjs` : validation et nettoyage de sauvegarde. `src/App.tsx` : matrices, galerie, résumés et interactions. `src/export.ts` : rendu PNG. `scripts/` : import et intégrité. Les données sont chargées une fois depuis le bundle statique, jamais recherchées sur une API pendant une sélection. Les galeries affichent 60 cartes à la fois, avec chargement progressif des images.

## Licences et publication

Code de cette première version et données v5 : **AGPL-3.0-or-later** (voir `LICENSE`). Pour toute mise à disposition en réseau, fournir les sources correspondantes et respecter les obligations AGPL. Le build génère une archive source correspondante téléchargeable depuis le pied de page, contenant le code, le catalogue préparé, les scripts et les notices. Conserver ce lien, les licences et les notices lors du déploiement. Les illustrations sont récupérées séparément depuis leur source exacte par le script de préparation.

Les données v5 de PocketDecks sont sous AGPL ; la référence flibustier est MIT, les noms PokéAPI BSD-3-Clause. Les notices complètes et licences des polices/icônes sont dans `public/licenses/`, également inclus dans `dist/`.

**La licence du dataset ne couvre pas les illustrations Pokémon.** Elles restent la propriété de Nintendo, Creatures Inc., GAME FREAK Inc. et DeNA. Le dépôt source les reproduit à titre de référence, sans licence générale de redistribution ou d’exploitation commerciale. Cette application n’est ni affiliée ni approuvée par les ayants droit. Avant une diffusion publique ou commerciale, vérifier les conditions applicables aux illustrations et aux exports. Le workflow de publication est fourni ; la mise en ligne dépend de l’activation de GitHub Pages dans les paramètres du dépôt.

## Catégories deux étoiles

Les 524 impressions deux étoiles ont désormais trois cases indépendantes dans chaque matrice : **autres Pokémon** (Full Art et Shiny Full Art), **arc-en-ciel** (Special Illustration Art / SAR) et **Dresseurs** (prioritaires sur le style d’illustration). Le classement utilise les métadonnées de chaque impression, jamais son seul nom ou une estimation des couleurs. La rareté officielle `☆☆` reste intacte dans le catalogue ; `src/categories.mjs` fournit les clés de sélection `☆☆`, `☆☆:rainbow` et `☆☆:trainer`.

La distinction s’applique aux galeries, aux filtres, aux résumés et aux PNG. Les sauvegardes et imports v1 sont migrés selon la carte réellement choisie : une ancienne case `☆☆` contenant un arc-en-ciel ou un Dresseur est déplacée vers sa nouvelle catégorie, ainsi que le favori de rareté correspondant. Top 10, favori absolu et scores de profil sont conservés. Une case déjà enregistrée avec sa nouvelle clé est prioritaire en cas de collision avec une ancienne clé dans un fichier importé.
