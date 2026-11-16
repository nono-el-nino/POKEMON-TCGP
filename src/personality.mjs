// Signature v1: a transparent, playful classification of collection tastes.
export const PROFILE_VERSION = 1;
export const AXES = [
  {
    id: "softness",
    name: "Douceur",
    color: "#82ae8e",
    description:
      "Ambiances lumineuses et apaisées, Pokémon tendres ou familiers.",
  },
  {
    id: "energy",
    name: "Énergie",
    color: "#d98c60",
    description: "Couleurs vives, textures marquées et Pokémon dynamiques.",
  },
  {
    id: "mystery",
    name: "Mystère",
    color: "#978bb8",
    description: "Tons profonds, contrastes et Pokémon énigmatiques.",
  },
  {
    id: "radiance",
    name: "Éclat",
    color: "#bc9b53",
    description: "Lumière, couleurs intenses et Pokémon majestueux.",
  },
];
export const PROFILES = [
  {
    key: "softness-energy",
    name: "L’Enthousiaste",
    description:
      "Vous collectionnez les petites joies qui débordent d’énergie.",
  },
  {
    key: "softness-mystery",
    name: "Le Rêveur",
    description:
      "Vous aimez les illustrations tendres avec une part de merveilleux.",
  },
  {
    key: "softness-radiance",
    name: "Le Gardien",
    description:
      "Les présences attachantes et les belles lumières trouvent leur place chez vous.",
  },
  {
    key: "energy-softness",
    name: "L’Aventurier",
    description:
      "Vous cherchez le mouvement, avec un faible pour les compagnons attachants.",
  },
  {
    key: "energy-mystery",
    name: "L’Intrépide",
    description:
      "Les images vibrantes et les rencontres énigmatiques vous attirent.",
  },
  {
    key: "energy-radiance",
    name: "Le Conquérant",
    description:
      "Votre collection aime les couleurs franches et les grandes présences.",
  },
  {
    key: "mystery-softness",
    name: "Le Poète",
    description:
      "Vous choisissez le mystère, adouci par des images sensibles et lumineuses.",
  },
  {
    key: "mystery-energy",
    name: "L’Explorateur",
    description:
      "Vous aimez les univers intrigants qui donnent envie de partir à l’aventure.",
  },
  {
    key: "mystery-radiance",
    name: "L’Alchimiste",
    description:
      "Les atmosphères profondes et les apparitions majestueuses vous fascinent.",
  },
  {
    key: "radiance-softness",
    name: "L’Esthète",
    description:
      "Vous aimez les belles lumières, les images soignées et les présences rassurantes.",
  },
  {
    key: "radiance-energy",
    name: "Le Flamboyant",
    description:
      "Vos favoris mêlent éclat, mouvement et couleurs qui s’assument.",
  },
  {
    key: "radiance-mystery",
    name: "Le Visionnaire",
    description:
      "Vous recherchez les illustrations spectaculaires qui gardent leur secret.",
  },
];
const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));
// RGB pixels are sampled from the illustration, excluding most text and borders.
export function visualFeatures(rgb, width = 32) {
  const n = rgb.length / 3;
  let brightness = 0,
    squares = 0,
    saturation = 0,
    coolness = 0,
    edge = 0,
    edges = 0;
  const luminance = [];
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3] / 255,
      g = rgb[i * 3 + 1] / 255,
      b = rgb[i * 3 + 2] / 255,
      max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luminance.push(l);
    brightness += l;
    squares += l * l;
    saturation += max ? (max - min) / max : 0;
    coolness += clamp((b - r + 1) / 2, 0, 1);
    if (i % width) {
      edge += Math.abs(l - luminance[i - 1]);
      edges++;
    }
    if (i >= width) {
      edge += Math.abs(l - luminance[i - width]);
      edges++;
    }
  }
  brightness /= n;
  return {
    brightness,
    saturation: saturation / n,
    contrast: clamp(
      Math.sqrt(Math.max(0, squares / n - brightness ** 2)) * 3,
      0,
      1,
    ),
    detail: clamp(edges ? (edge / edges) * 5 : 0, 0, 1),
    coolness: coolness / n,
  };
}
export function scoreCard(card, f) {
  const priors = {
    Grass: [80, 35, 45, 55],
    Fire: [25, 90, 30, 70],
    Water: [65, 50, 60, 60],
    Lightning: [45, 95, 35, 70],
    Psychic: [55, 40, 95, 65],
    Fighting: [25, 95, 30, 45],
    Darkness: [20, 60, 95, 55],
    Metal: [25, 50, 65, 90],
    Dragon: [25, 80, 75, 95],
    Colorless: [85, 45, 35, 50],
    Trainer: [50, 50, 50, 50],
  };
  const p = [...(priors[card.type] || [50, 50, 50, 50])];
  if (card.category !== "Trainer") {
    if (card.stage === "Basic") {
      p[0] += 12;
      p[1] -= 4;
    }
    if (card.stage === "Stage 1") p[1] += 6;
    if (card.stage === "Stage 2") {
      p[0] -= 10;
      p[1] += 10;
      p[3] += 8;
    }
    if (card.species?.baby) p[0] += 18;
    if (card.species?.legendary || card.species?.mythical) {
      p[2] += 12;
      p[3] += 18;
    }
    if (card.ex) {
      p[1] += 8;
      p[3] += 8;
    }
  }
  const {
    brightness: b,
    saturation: s,
    contrast: c,
    detail: d,
    coolness: k,
  } = f;
  const image = [
    100 * (0.55 * b + 0.3 * (1 - c) + 0.15 * (1 - d)),
    100 * (0.55 * s + 0.3 * d + 0.15 * c),
    100 * (0.65 * (1 - b) + 0.2 * c + 0.15 * k),
    100 * (0.45 * b + 0.35 * s + 0.2 * c),
  ];
  return Object.fromEntries(
    AXES.map((a, i) => [
      a.id,
      Math.round(clamp(0.6 * image[i] + 0.4 * clamp(p[i]))),
    ]),
  );
}
export function computeProfile(cards) {
  const unique = [...new Map(cards.map((c) => [c.id, c])).values()];
  if (!unique.length) return null;
  const totals = Object.fromEntries(AXES.map((a) => [a.id, 0]));
  for (const card of unique)
    for (const axis of AXES) {
      const score = card.style?.scores[axis.id];
      if (!Number.isFinite(score) || score < 0 || score > 100)
        throw Error("Scores de carte absents ou invalides : " + card.id);
      totals[axis.id] += score;
    }
  const scores = Object.fromEntries(
    AXES.map((a) => [
      a.id,
      Math.round((totals[a.id] / unique.length) * 10) / 10,
    ]),
  );
  const ordered = AXES.map((axis, index) => ({
    ...axis,
    index,
    total: totals[axis.id],
  })).sort((a, b) => b.total - a.total || a.index - b.index);
  const key = `${ordered[0].id}-${ordered[1].id}`;
  return {
    profile: PROFILES.find((p) => p.key === key),
    scores,
    count: unique.length,
    provisional: unique.length < 3,
    balanced: ordered[0].total - ordered[1].total < 5 * unique.length,
    dominant: ordered[0].id,
    secondary: ordered[1].id,
    version: PROFILE_VERSION,
  };
}
