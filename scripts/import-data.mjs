import { isEligibleCard } from "../src/eligibility.mjs";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const base =
  "https://raw.githubusercontent.com/PocketDecks/pokemon-tcg-pocket-cards/main/";
const get = (url) =>
  execFileSync(
    "curl",
    ["--fail", "--silent", "--show-error", "--location", "--retry", "2", url],
    { maxBuffer: 40 * 1024 * 1024 },
  ).toString();
const [raw, expansionRaw, namesRaw, speciesRaw] = [
  get(base + "data/v5/cards.min.json"),
  get(base + "data/v5/expansions.json"),
  get(
    "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv",
  ),
  get(
    "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv",
  ),
];
const names = new Map();
for (const line of namesRaw.trim().split("\n").slice(1)) {
  const [id, lang, name] = line.split(",");
  if (!names.has(id)) names.set(id, {});
  if (lang === "5" || lang === "9") names.get(id)[lang] = name;
}
const french = new Map(
  [...names.values()]
    .filter((n) => n["9"] && n["5"])
    .map((n) => [n["9"].toLowerCase(), n["5"]]),
);
const speciesLines = speciesRaw
  .trim()
  .split("\n")
  .map((line) => line.split(","));
const speciesHeader = speciesLines.shift();
const speciesFlags = new Map(
  speciesLines.map((row) => [
    row[0],
    Object.fromEntries(speciesHeader.map((key, i) => [key, row[i]])),
  ]),
);
function speciesFor(name) {
  const root = name
    .replace(/ ex$/, "")
    .replace(/^Mega /, "")
    .replace(/^(Alolan|Galarian|Hisuian|Paldean) /, "")
    .replace(
      / (Origin Forme|Sky Forme|Therian Forme|Incarnate Forme|Altered Forme|X|Y)$/,
      "",
    )
    .toLowerCase();
  const entry = [...names.entries()].find(
    ([, n]) => n["9"]?.toLowerCase() === root,
  );
  const flags = entry && speciesFlags.get(entry[0]);
  return flags
    ? {
        id: Number(entry[0]),
        baby: flags.is_baby === "1",
        legendary: flags.is_legendary === "1",
        mythical: flags.is_mythical === "1",
      }
    : null;
}
function translate(name) {
  if (french.has(name.toLowerCase())) return french.get(name.toLowerCase());
  const match = name.match(/^(Mega )?(Alolan )?(.+?)( ex)?$/);
  if (!match) return name;
  const translated = french.get(match[3].toLowerCase());
  return translated
    ? `${match[1] ? "Méga-" : ""}${translated}${match[2] ? " d’Alola" : ""}${match[4] || ""}`
    : name;
}
const sourceCards = JSON.parse(raw),
  expansions = JSON.parse(expansionRaw);
const ids = new Set();
const cards = sourceCards.filter(isEligibleCard).map((c) => {
  if (!c.id || ids.has(c.id)) throw Error("ID absent ou dupliqué : " + c.id);
  ids.add(c.id);
  const number = c.id.slice(c.set_code.length + 1);
  const expected = `/cards/${c.set_code}/${number}.webp`;
  if (
    c.image !==
    "https://raw.githubusercontent.com/PocketDecks/pokemon-tcg-pocket-cards/refs/heads/main/images/webp" +
      expected
  )
    throw Error(`Illustration incompatible : ${c.id}`);
  return {
    id: c.id,
    name: translate(c.name),
    englishName: c.name,
    set: c.set_code,
    number,
    rarity: c.rarity || "Promo",
    type: c.type === "Trainer" ? "Trainer" : c.subtype,
    category: c.type,
    artist: c.artist,
    ex: c.ex,
    stage: c.stage,
    artStyle: c.art_style,
    species: speciesFor(c.name),
    image: c.image,
    variants: c.alternate_versions || [],
  };
});
const setNames = {
  a1: "Puissance Génétique",
  a1a: "L’Île Fabuleuse",
  a2: "Choc Spatio-Temporel",
  a2a: "Lumière Triomphale",
  a2b: "Réjouissances Rayonnantes",
  a3: "Gardiens Astraux",
  a3a: "Crise Interdimensionnelle",
  a3b: "La Clairière d’Évoli",
  a4: "Sagesse entre Ciel et Mer",
  a4a: "Sources Reculées",
  a4b: "Booster de Luxe : ex",
  b1: "Méga-Ascension",
};
const sets = expansions.map((e) => ({
  id: e.id,
  name: setNames[e.id] || e.name,
  englishName: e.name,
  date: e.release_date,
  series: e.id.startsWith("p")
    ? e.id.slice(1).toUpperCase()
    : e.id[0].toUpperCase(),
  promo: e.id.startsWith("p"),
  count: cards.filter((c) => c.set === e.id).length,
}));
for (const c of cards)
  if (!sets.some((s) => s.id === c.set))
    throw Error("Extension absente : " + c.set);
const meta = {
  updated: new Date().toISOString(),
  source: base + "data/v5/cards.min.json",
  sha256: createHash("sha256").update(raw).digest("hex"),
  cards: cards.length,
  sourceCards: sourceCards.length,
  selectionPolicy: "four-diamonds-and-above-plus-promos",
  sets: sets.length,
  frenchNames: cards.filter((c) => c.name !== c.englishName).length,
  license: "AGPL-3.0-or-later",
};
await mkdir("public/data", { recursive: true });
await writeFile(
  "public/data/catalog.json",
  JSON.stringify({ cards, sets, meta }),
);
await writeFile("LICENSE", get(base + "LICENSE"));
console.log(JSON.stringify(meta, null, 2));
