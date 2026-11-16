import { isEligibleCard } from "./eligibility.mjs";
import { cardCategory } from "./categories.mjs";
export const STORAGE_KEY = "pocket-favorites:v1";
export function parseCollection(input, cards) {
  if (
    !input ||
    typeof input !== "object" ||
    input.version !== 1 ||
    !input.selections ||
    typeof input.selections !== "object" ||
    Array.isArray(input.selections) ||
    !Array.isArray(input.top)
  )
    throw Error("Ce fichier n’est pas une sauvegarde Pocket Favorites v1.");
  const byId = new Map(cards.filter(isEligibleCard).map((c) => [c.id, c]));
  const selections = {};
  let removed = 0,
    migrated = 0;
  const entries = [];
  for (const [key, id] of Object.entries(input.selections)) {
    const c = byId.get(id),
      [mode, row, rarity, ...extra] = key.split("|");
    if (
      c &&
      !extra.length &&
      (mode === "set" ? c.set === row : mode === "type" && c.type === row) &&
      (cardCategory(c) === rarity || (rarity === "☆☆" && c.rarity === "☆☆"))
    ) {
      const canonical = `${mode}|${row}|${cardCategory(c)}`;
      entries.push({ key, canonical, id });
      if (canonical !== key) migrated++;
    } else removed++;
  }
  // An explicit new-category choice takes precedence over a colliding legacy slot.
  entries.sort(
    (a, b) => Number(a.key === a.canonical) - Number(b.key === b.canonical),
  );
  for (const e of entries) selections[e.canonical] = e.id;
  const selected = new Set(Object.values(selections));
  const top = [...new Set(input.top)]
    .filter((id) => selected.has(id))
    .slice(0, 10);
  const absolute = selected.has(input.absolute) ? input.absolute : null;
  const winners = {},
    winnerEntries = [];
  if (input.winners && typeof input.winners === "object")
    for (const [key, id] of Object.entries(input.winners)) {
      const c = byId.get(id),
        [kind, value, ...extra] = key.split("|");
      if (
        !extra.length &&
        selected.has(id) &&
        c &&
        (kind === "set"
          ? c.set === value
          : kind === "type"
            ? c.type === value
            : kind === "rarity" &&
              (cardCategory(c) === value ||
                (value === "☆☆" && c.rarity === "☆☆")))
      ) {
        const canonical = kind === "rarity" ? `rarity|${cardCategory(c)}` : key;
        winnerEntries.push({ key, canonical, id });
        if (canonical !== key) migrated++;
      }
    }
  winnerEntries.sort(
    (a, b) => Number(a.key === a.canonical) - Number(b.key === b.canonical),
  );
  for (const e of winnerEntries) winners[e.canonical] = e.id;
  return {
    value: { version: 1, selections, top, absolute, winners },
    removed,
    migrated,
  };
}
export function cleanCollection(collection, cards) {
  return parseCollection(collection, cards).value;
}
