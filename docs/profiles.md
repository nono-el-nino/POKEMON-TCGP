# Signature de collectionneur — méthode v1

Les profils décrivent des goûts de collection dans un cadre ludique. Il ne s’agit pas d’un instrument de mesure de la personnalité humaine. Les adjectifs concernent les images et l’univers des cartes.

## Périmètre

Le catalogue conserve les impressions à **4 losanges inclus**, toutes les étoiles, les couronnes et les promotions. Les autres raretés sont exclues même lorsqu’un champ `ex` est présent. Chaque impression est identifiée par extension et numéro ; deux illustrations d’un même Pokémon restent deux cartes différentes. Les Dresseurs éligibles sont conservés.

## Données par illustration

`profiles:build` calcule quatre notes entières sur 100 pour chaque carte, à partir de son WebP exact. Ce traitement a lieu au build, jamais sur un service distant pendant les choix d’un joueur. Aucun nombre aléatoire, hash d’identifiant utilisé comme score, ni réponse générée à la volée.

On découpe la zone illustrée : x = 8 %, y = 15 %, largeur = 84 %, hauteur = 60 % pour Illustration Art, Full Art, Special Illustration Art, Immersive Art et Shiny Full Art, 36 % pour les autres. Il s’agit d’un cadrage géométrique reproductible pour limiter la présence des bordures et du texte, pas d’une reconnaissance du sujet de l’image. La zone est ramenée à 32 × 32 pixels sRGB avec Sharp, sans canal alpha.

Sur les canaux RGB ramenés à [0,1] :

- **B**, clarté : moyenne de `L = 0,2126 R + 0,7152 G + 0,0722 B`.
- **S**, saturation : moyenne de `(max(R,G,B) − min(R,G,B)) / max(R,G,B)`, zéro si le maximum est nul.
- **C**, contraste : `min(1, 3 × écart-type de L)`.
- **D**, détails : `min(1, 5 × moyenne des différences absolues de L entre voisins horizontaux et verticaux)`.
- **K**, froideur chromatique : moyenne de `(Bleu − Rouge + 1) / 2`.

Les quatre notes visuelles sont :

| Dimension | Formule visuelle (sur 100)                 |
| --------- | ------------------------------------------ |
| Douceur   | `100 × (0,55 B + 0,30 (1−C) + 0,15 (1−D))` |
| Énergie   | `100 × (0,55 S + 0,30 D + 0,15 C)`         |
| Mystère   | `100 × (0,65 (1−B) + 0,20 C + 0,15 K)`     |
| Éclat     | `100 × (0,45 B + 0,35 S + 0,20 C)`         |

## Base Pokémon

Les types, stades et statuts EX proviennent du dataset v5 full. Les correspondances exactes de noms PokéAPI fournissent les attributs bébé, légendaire et fabuleux lorsqu’ils sont disponibles ; les formes reconnues retirent leur préfixe/suffixe de forme pour retrouver l’espèce. Une espèce non reconnue n’obtient aucun bonus d’espèce. Cela ne change jamais l’identification ou le choix de l’illustration.

Les bases sont des conventions éditoriales explicites :

| Type                    | Douceur | Énergie | Mystère | Éclat |
| ----------------------- | ------: | ------: | ------: | ----: |
| Plante                  |      80 |      35 |      45 |    55 |
| Feu                     |      25 |      90 |      30 |    70 |
| Eau                     |      65 |      50 |      60 |    60 |
| Électrique              |      45 |      95 |      35 |    70 |
| Psy                     |      55 |      40 |      95 |    65 |
| Combat                  |      25 |      95 |      30 |    45 |
| Obscurité               |      20 |      60 |      95 |    55 |
| Métal                   |      25 |      50 |      65 |    90 |
| Dragon                  |      25 |      80 |      75 |    95 |
| Incolore                |      85 |      45 |      35 |    50 |
| Dresseur / type inconnu |      50 |      50 |      50 |    50 |

Modifications pour les Pokémon, avant de borner chaque base entre 0 et 100 :

- Basic : Douceur +12, Énergie −4.
- Stage 1 : Énergie +6.
- Stage 2 : Douceur −10, Énergie +10, Éclat +8.
- Bébé : Douceur +18.
- Légendaire **ou** fabuleux : Mystère +12 et Éclat +18 (bonus appliqué une seule fois).
- EX : Énergie +8, Éclat +8.

Les Dresseurs gardent une base neutre. La note finale par carte est `arrondi(0,60 × note visuelle + 0,40 × base Pokémon bornée)`, bornée entre 0 et 100. Il n’y a pas de bonus fondé sur la rareté ou le prix d’une carte.

## Moyenne et attribution du profil

1. Réunir les identifiants uniques choisis dans les deux matrices.
2. Faire la moyenne arithmétique de leurs quatre notes entières, avec le même poids par impression.
3. Trier les dimensions sur les sommes exactes, avant arrondi d’affichage. En cas d’égalité, utiliser Douceur, Énergie, Mystère, Éclat dans cet ordre fixe. La moyenne affichée est arrondie à un dixième.
4. Le couple ordonné (première dimension, deuxième dimension) détermine l’un des **4 × 3 = 12** profils. Le Top 10, l’ordre de sélection et le favori absolu ne changent pas la moyenne.
5. Un résultat est indiqué comme provisoire avec moins de 3 impressions. Une différence de moins de 5 points entre les deux premières dimensions est signalée comme proche. Avec zéro carte, aucun profil n’est attribué.

| Première | Deuxième | Signature      |
| -------- | -------- | -------------- |
| Douceur  | Énergie  | L’Enthousiaste |
| Douceur  | Mystère  | Le Rêveur      |
| Douceur  | Éclat    | Le Gardien     |
| Énergie  | Douceur  | L’Aventurier   |
| Énergie  | Mystère  | L’Intrépide    |
| Énergie  | Éclat    | Le Conquérant  |
| Mystère  | Douceur  | Le Poète       |
| Mystère  | Énergie  | L’Explorateur  |
| Mystère  | Éclat    | L’Alchimiste   |
| Éclat    | Douceur  | L’Esthète      |
| Éclat    | Énergie  | Le Flamboyant  |
| Éclat    | Mystère  | Le Visionnaire |

## Reproductibilité et limites

`public/data/profiles.json` contient les notes, les mesures visuelles, le SHA-256 des octets de chaque image et celui des métadonnées utilisées. Il enregistre aussi la version, le SHA-256 de la source v5 et une empreinte du code de calcul et des versions Sharp/libvips. Les images, métadonnées ou règles modifiées invalident les scores mis en cache. Les artefacts sont calculés dans un ordre stable. Une modification des conventions doit augmenter `PROFILE_VERSION` et documenter la migration.

L’export JSON inclut les choix ainsi qu’un instantané du profil, des quatre moyennes, des scores et des empreintes des illustrations retenues. Un import valide uniquement les choix et recalcule le profil avec le catalogue et la méthode courants. Le PNG partagé affiche les quatre scores, le profil, la méthode v1, le nombre d’illustrations et les IDs exacts.

Les mesures visuelles ne comprennent pas le sens d’une scène. Une illustration très claire peut contribuer à Douceur même si son sujet est impressionnant ; le poids Pokémon tempère ce résultat. Les familles de types et les seuils sont des choix de conception, pas des faits scientifiques sur les joueurs. Aucun compte, diagnostic ou donnée personnelle n’est nécessaire.
