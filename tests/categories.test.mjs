import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cardCategory,
  standardRarities,
  rarityName,
  TWO_STAR_OTHER,
  TWO_STAR_RAINBOW,
  TWO_STAR_TRAINER,
} from "../src/categories.mjs";
import { parseCollection } from "../src/storage.mjs";
const { cards } = JSON.parse(readFileSync("public/data/catalog.json"));
const byId = new Map(cards.map((c) => [c.id, c]));
test("authentic 2-star treatments map to independent categories without changing official rarity", () => {
  assert.equal(cardCategory(byId.get("a1-251")), TWO_STAR_OTHER);
  assert.equal(cardCategory(byId.get("a1-274")), TWO_STAR_RAINBOW);
  assert.equal(cardCategory(byId.get("a1-266")), TWO_STAR_TRAINER);
  for (const c of cards.filter((c) => c.artStyle === "Shiny Full Art"))
    assert.equal(cardCategory(c), TWO_STAR_OTHER);
  for (const id of ["a1-251", "a1-274", "a1-266"])
    assert.equal(byId.get(id).rarity, "☆☆");
  assert.equal(new Set(standardRarities).size, standardRarities.length);
  assert.ok(rarityName(TWO_STAR_RAINBOW).includes("arc-en-ciel"));
});
test("every 2-star print belongs to exactly one exhaustive group, with trainers taking precedence", () => {
  const two = cards.filter((c) => c.rarity === "☆☆"),
    groups = new Map(
      [TWO_STAR_OTHER, TWO_STAR_RAINBOW, TWO_STAR_TRAINER].map((k) => [k, []]),
    );
  for (const c of two) {
    assert.ok(groups.has(cardCategory(c)));
    groups.get(cardCategory(c)).push(c);
  }
  assert.equal(
    [...groups.values()].reduce((n, c) => n + c.length, 0),
    two.length,
  );
  assert.ok(
    groups
      .get(TWO_STAR_RAINBOW)
      .every(
        (c) =>
          c.category !== "Trainer" && c.artStyle === "Special Illustration Art",
      ),
  );
  assert.ok(
    groups.get(TWO_STAR_TRAINER).every((c) => c.category === "Trainer"),
  );
  assert.equal(
    cardCategory({
      rarity: "☆☆",
      category: "Trainer",
      artStyle: "Special Illustration Art",
    }),
    TWO_STAR_TRAINER,
  );
  for (const c of cards.filter((c) => c.rarity !== "☆☆"))
    assert.equal(cardCategory(c), c.rarity);
});
test("legacy slots in both modes and category winners migrate while rankings remain intact", () => {
  const old = {
    version: 1,
    selections: { "set|a1|☆☆": "a1-274", "type|Fire|☆☆": "a1-274" },
    top: ["a1-274"],
    absolute: "a1-274",
    winners: { "rarity|☆☆": "a1-274" },
  };
  const { value, removed, migrated } = parseCollection(old, cards);
  assert.equal(removed, 0);
  assert.equal(migrated, 3);
  assert.deepEqual(value.selections, {
    "set|a1|☆☆:rainbow": "a1-274",
    "type|Fire|☆☆:rainbow": "a1-274",
  });
  assert.deepEqual(value.winners, { "rarity|☆☆:rainbow": "a1-274" });
  assert.deepEqual(value.top, old.top);
  assert.equal(value.absolute, old.absolute);
  assert.deepEqual(
    parseCollection(JSON.parse(JSON.stringify(value)), cards).value,
    value,
  );
  assert.equal(parseCollection(value, cards).migrated, 0);
  const trainer = parseCollection(
    {
      ...old,
      selections: { "set|a1|☆☆": "a1-266" },
      top: ["a1-266"],
      absolute: "a1-266",
      winners: {},
    },
    cards,
  );
  assert.deepEqual(trainer.value.selections, { "set|a1|☆☆:trainer": "a1-266" });
});
test("three explicit 2-star choices coexist and cross-category imports are rejected", () => {
  const save = {
    version: 1,
    selections: {
      "set|a1|☆☆": "a1-251",
      "set|a1|☆☆:rainbow": "a1-274",
      "set|a1|☆☆:trainer": "a1-266",
    },
    top: [],
    absolute: null,
    winners: {},
  };
  assert.deepEqual(parseCollection(save, cards).value, save);
  const bad = parseCollection(
    {
      ...save,
      selections: {
        "set|a1|☆☆:rainbow": "a1-251",
        "set|a1|☆☆:trainer": "a1-274",
      },
    },
    cards,
  );
  assert.equal(bad.removed, 2);
  assert.deepEqual(bad.value.selections, {});
});
test("an explicit new slot wins over a conflicting legacy slot regardless of JSON entry order", () => {
  const entries = [
    ["set|a1|☆☆", "a1-274"],
    ["set|a1|☆☆:rainbow", "a1-275"],
  ];
  for (const pairs of [entries, [...entries].reverse()]) {
    const result = parseCollection(
      {
        version: 1,
        selections: Object.fromEntries(pairs),
        top: [],
        absolute: null,
        winners: {},
      },
      cards,
    );
    assert.equal(result.value.selections["set|a1|☆☆:rainbow"], "a1-275");
  }
});
