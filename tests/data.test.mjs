import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCollection, cleanCollection } from "../src/storage.mjs";
const { cards, sets, meta } = JSON.parse(
  readFileSync(new URL("../public/data/catalog.json", import.meta.url)),
);
const card = cards.find((c) => c.id === "a1-001");
const saved = {
  version: 1,
  selections: { "set|a1|◊": card.id },
  top: [card.id],
  absolute: card.id,
  winners: { "type|Grass": card.id },
};
test("full import retains every impression with unique ID and matching artwork", () => {
  assert.equal(cards.length, meta.cards);
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
  for (const c of cards) {
    assert.ok(sets.some((s) => s.id === c.set));
    assert.equal(c.id, `${c.set}-${c.number}`);
    assert.ok(c.image.endsWith(`/cards/${c.set}/${c.number}.webp`));
    assert.ok(c.name);
    assert.ok(c.rarity);
    assert.ok(c.type);
  }
  for (const s of sets)
    assert.equal(s.count, cards.filter((c) => c.set === s.id).length);
});
test("alternate arts of the same Pokémon remain distinct", () => {
  const arts = cards.filter((c) => c.englishName === "Bulbasaur");
  assert.ok(arts.length > 2);
  assert.equal(new Set(arts.map((c) => c.image)).size, arts.length);
  assert.ok(arts.some((c) => c.rarity === "☆"));
  assert.ok(arts.some((c) => c.set === "pa"));
});
test("promotions and latest expansion are represented, no unsupported crown promo cells", () => {
  assert.ok(sets.some((s) => s.id === "pc"));
  assert.ok(cards.some((c) => c.set === "c1"));
  assert.ok(cards.some((c) => c.rarity === "Crown Rare"));
  assert.ok(!cards.some((c) => c.set === "pa" && c.rarity === "Crown Rare"));
});
test("French names and English fallback are both searchable data", () => {
  assert.equal(card.name, "Bulbizarre");
  assert.equal(card.englishName, "Bulbasaur");
  assert.ok(cards.every((c) => c.name && c.englishName));
});
test("valid JSON roundtrip preserves all explicit decisions", () =>
  assert.deepEqual(
    parseCollection(JSON.parse(JSON.stringify(saved)), cards).value,
    saved,
  ));
test("import rejects wrong schema and removes foreign IDs, mismatched slots and forged winner", () => {
  assert.throws(() => parseCollection({ version: 2 }, cards));
  assert.throws(() => parseCollection(null, cards));
  const result = parseCollection(
    {
      ...saved,
      selections: {
        ...saved.selections,
        "set|a2|◊": card.id,
        "type|Water|◊": card.id,
        "set|a1|☆☆": "unknown",
      },
      top: [card.id, card.id, "unknown"],
      winners: { "type|Water": card.id },
      absolute: "unknown",
    },
    cards,
  );
  assert.equal(result.removed, 3);
  assert.deepEqual(result.value.selections, saved.selections);
  assert.deepEqual(result.value.top, [card.id]);
  assert.equal(result.value.absolute, null);
  assert.deepEqual(result.value.winners, {});
});
test("removing a card also clears its ranking, absolute favorite and category winner", () => {
  const cleaned = cleanCollection({ ...saved, selections: {} }, cards);
  assert.deepEqual(cleaned.top, []);
  assert.equal(cleaned.absolute, null);
  assert.deepEqual(cleaned.winners, {});
});
test("same card can occupy two modes; deleting only one slot keeps ranking", () => {
  const both = {
    ...saved,
    selections: { ...saved.selections, "type|Grass|◊": card.id },
  };
  const roundtrip = parseCollection(both, cards).value;
  assert.equal(Object.keys(roundtrip.selections).length, 2);
  delete roundtrip.selections["set|a1|◊"];
  assert.deepEqual(cleanCollection(roundtrip, cards).top, [card.id]);
});
test("category arbiters cannot smuggle extra segments into a saved winner key", () => {
  const result = parseCollection(
    { ...saved, winners: { "type|Grass|invalid": card.id } },
    cards,
  );
  assert.deepEqual(result.value.winners, {});
});
