import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getFinale } from "../src/finale.mjs";
import {
  cardCategory,
  ONE_STAR_SHINY,
  rarityLabel,
} from "../src/categories.mjs";
import { parseCollection, cleanCollection } from "../src/storage.mjs";
const { cards } = JSON.parse(readFileSync("public/data/catalog.json"));
const byId = new Map(cards.map((c) => [c.id, c]));
const chosen = ["a1-227", "a1-228", "a2b-097", "a1-274"].map((id) =>
  byId.get(id),
);
const selections = {
  "set|a1|☆": "a1-227",
  "type|Grass|☆": "a1-228",
  "set|a2b|☆:shiny": "a2b-097",
  "set|a1|☆☆:rainbow": "a1-274",
};
const save = { version: 1, selections, top: [], absolute: null, winners: {} };
test("one-star shiny prints have an exhaustive independent category while original rarity stays unchanged", () => {
  const one = cards.filter((c) => c.rarity === "☆");
  const shiny = one.filter((c) => cardCategory(c) === ONE_STAR_SHINY),
    regular = one.filter((c) => cardCategory(c) === "☆");
  assert.equal(shiny.length + regular.length, one.length);
  assert.ok(shiny.length > 0);
  assert.ok(regular.length > 0);
  assert.ok(shiny.every((c) => c.artStyle === "Shiny"));
  assert.ok(regular.every((c) => c.artStyle !== "Shiny"));
  assert.equal(cardCategory(byId.get("a2b-097")), ONE_STAR_SHINY);
  assert.equal(cardCategory(byId.get("a1-227")), "☆");
  assert.equal(byId.get("a2b-097").rarity, "☆");
  assert.equal(rarityLabel(ONE_STAR_SHINY), "☆");
});
test("old one-star shiny slots, rarity winner and overall favorite migrate without losing rankings", () => {
  const old = {
    version: 1,
    selections: { "set|a2b|☆": "a2b-097", "type|Grass|☆": "a2b-097" },
    top: ["a2b-097"],
    absolute: "a2b-097",
    winners: { "rarity|☆": "a2b-097" },
  };
  const parsed = parseCollection(old, cards);
  assert.equal(parsed.removed, 0);
  assert.equal(parsed.migrated, 3);
  assert.deepEqual(parsed.value.selections, {
    "set|a2b|☆:shiny": "a2b-097",
    "type|Grass|☆:shiny": "a2b-097",
  });
  assert.equal(parsed.value.absolute, old.absolute);
  assert.deepEqual(parsed.value.top, old.top);
  assert.deepEqual(parsed.value.winners, { "rarity|☆:shiny": "a2b-097" });
  assert.equal(parseCollection(parsed.value, cards).migrated, 0);
});
test("only unique actual favorites enter the per-rarity pools; empty rarities and foreign winners add no candidates", () => {
  const finale = getFinale([...chosen, chosen[0]], {
    "rarity|Promo": "pa-001",
  });
  assert.equal(finale.total, 3);
  assert.equal(finale.groups.find((g) => g.key === "☆").candidates.length, 2);
  assert.equal(
    finale.groups.find((g) => g.key === ONE_STAR_SHINY).candidates.length,
    1,
  );
  assert.equal(finale.resolved, 2);
  assert.equal(finale.ready, false);
  assert.ok(!finale.champions.some((c) => c.id === "pa-001"));
});
test("a final round requires one champion for every represented rarity and accepts only those champions", () => {
  assert.equal(getFinale(chosen, {}, "a2b-097").ultimate, null);
  const winners = { "rarity|☆": "a1-228" };
  const ready = getFinale(chosen, winners, "a1-228");
  assert.equal(ready.ready, true);
  assert.equal(ready.champions.length, 3);
  assert.equal(ready.ultimate.id, "a1-228");
  assert.equal(getFinale(chosen, winners, "a1-227").ultimate, null);
  assert.equal(getFinale(chosen, { "rarity|☆": "a2b-097" }).ready, false);
});
test("empty collections have no finale, single candidates qualify directly but never become ultimate automatically", () => {
  const empty = getFinale([]);
  assert.equal(empty.ready, false);
  assert.equal(empty.ultimate, null);
  const one = getFinale([chosen[0]]);
  assert.equal(one.ready, true);
  assert.equal(one.groups[0].automatic, true);
  assert.equal(one.ultimate, null);
  assert.equal(
    getFinale([chosen[0]], {}, chosen[0].id).ultimate.id,
    chosen[0].id,
  );
});
test("a contradictory old ultimate is kept as a previous choice while new qualifiers decide the final round", () => {
  const parsed = cleanCollection(
    { ...save, winners: { "rarity|☆": "a1-227" }, absolute: "a1-228" },
    cards,
  );
  assert.equal(parsed.absolute, null);
  assert.equal(parsed.previousAbsolute, "a1-228");
  assert.deepEqual(parsed.winners, { "rarity|☆": "a1-227" });
  const confirmed = cleanCollection(
    { ...parsed, absolute: "a1-227", previousAbsolute: null },
    cards,
  );
  assert.equal(confirmed.absolute, "a1-227");
  assert.equal(confirmed.previousAbsolute, undefined);
});
test("legacy explicit overall preferences can qualify in their own rarity without overriding a rarity winner", () => {
  const migrated = cleanCollection({ ...save, absolute: "a1-228" }, cards);
  assert.equal(migrated.winners["rarity|☆"], "a1-228");
  assert.equal(migrated.absolute, "a1-228");
  const conflicting = cleanCollection(
    { ...save, absolute: "a1-228", winners: { "rarity|☆": "a1-227" } },
    cards,
  );
  assert.equal(conflicting.absolute, null);
  assert.equal(conflicting.winners["rarity|☆"], "a1-227");
});
test("removing a rarity champion removes dangling titles and requires a fresh explicit ultimate", () => {
  const before = cleanCollection(
    {
      ...save,
      winners: { "rarity|☆": "a1-227" },
      absolute: "a1-227",
      top: ["a1-227"],
    },
    cards,
  );
  const after = cleanCollection(
    {
      ...before,
      selections: Object.fromEntries(
        Object.entries(selections).filter(([, id]) => id !== "a1-227"),
      ),
    },
    cards,
  );
  assert.equal(after.absolute, null);
  assert.equal(after.previousAbsolute, undefined);
  assert.equal(after.winners["rarity|☆"], undefined);
  assert.deepEqual(after.top, []);
  assert.equal(
    getFinale(
      chosen.filter((c) => c.id !== "a1-227"),
      after.winners,
    ).ready,
    true,
  );
});
