import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isEligibleCard } from "../src/eligibility.mjs";
import { parseCollection } from "../src/storage.mjs";
import {
  AXES,
  PROFILES,
  computeProfile,
  scoreCard,
  visualFeatures,
} from "../src/personality.mjs";
const catalog = JSON.parse(readFileSync("public/data/catalog.json"));
const styles = JSON.parse(readFileSync("public/data/profiles.json"));
const cards = catalog.cards.map((c) => ({ ...c, style: styles.cards[c.id] }));
test("EX threshold includes four diamonds, illustrated rarities, crowns and promos only", () => {
  for (const rarity of ["◊◊◊◊", "☆", "☆☆", "☆☆☆", "Crown Rare", "Promo"])
    assert.equal(isEligibleCard({ rarity }), true, rarity);
  for (const rarity of ["◊", "◊◊", "◊◊◊", "", null, "unknown"])
    assert.equal(isEligibleCard({ rarity, ex: true }), false, String(rarity));
  assert.ok(catalog.meta.sourceCards > cards.length);
  assert.ok(cards.every(isEligibleCard));
  assert.ok(!cards.some((c) => ["◊", "◊◊", "◊◊◊"].includes(c.rarity)));
});
test("every eligible print has four bounded integer scores and a verified image signature", () => {
  assert.equal(Object.keys(styles.cards).length, cards.length);
  assert.equal(styles.sourceSha256, catalog.meta.sha256);
  for (const c of cards) {
    assert.match(c.style.imageSha256, /^[a-f0-9]{64}$/);
    for (const axis of AXES) {
      const score = c.style.scores[axis.id];
      assert.ok(Number.isInteger(score) && score >= 0 && score <= 100, c.id);
    }
  }
});
test("visual measurements respond to actual image light, saturation and details", () => {
  const gray = visualFeatures(Buffer.alloc(32 * 32 * 3, 128)),
    black = visualFeatures(Buffer.alloc(32 * 32 * 3)),
    white = visualFeatures(Buffer.alloc(32 * 32 * 3, 255));
  assert.equal(gray.saturation, 0);
  assert.equal(gray.detail, 0);
  assert.equal(black.brightness, 0);
  assert.equal(white.brightness, 1);
  const red = Buffer.alloc(32 * 32 * 3);
  for (let i = 0; i < red.length; i += 3) red[i] = 255;
  assert.equal(visualFeatures(red).saturation, 1);
  const neutral = { type: "Trainer", category: "Trainer" };
  assert.ok(
    scoreCard(neutral, white).softness > scoreCard(neutral, black).softness,
  );
  assert.ok(
    scoreCard(neutral, black).mystery > scoreCard(neutral, white).mystery,
  );
  assert.ok(
    scoreCard(neutral, visualFeatures(red)).energy >
      scoreCard(neutral, gray).energy,
  );
});
test("different actual Bulbasaur illustrations receive their own visual features", () => {
  const versions = cards.filter((c) => c.englishName === "Bulbasaur");
  assert.ok(versions.length >= 2);
  assert.equal(
    new Set(versions.map((c) => c.style.imageSha256)).size,
    versions.length,
  );
  assert.ok(
    new Set(versions.map((c) => JSON.stringify(c.style.features))).size > 1,
  );
});
test("arithmetic mean gives equal weight to unique prints, independent of order or matrix duplicates", () => {
  const chosen = cards.slice(0, 3),
    result = computeProfile(chosen);
  for (const a of AXES)
    assert.equal(
      result.scores[a.id],
      Math.round(
        (chosen.reduce((sum, c) => sum + c.style.scores[a.id], 0) / 3) * 10,
      ) / 10,
    );
  assert.deepEqual(computeProfile([...chosen].reverse()), result);
  assert.deepEqual(computeProfile([...chosen, ...chosen]), result);
  assert.equal(result.provisional, false);
  assert.equal(computeProfile(chosen.slice(0, 1)).provisional, true);
  assert.equal(computeProfile([]), null);
});
test("all twelve ordered dominant pairs map to exactly one profile, with stable ties", () => {
  assert.equal(PROFILES.length, 12);
  assert.equal(new Set(PROFILES.map((p) => p.key)).size, 12);
  for (const a of AXES)
    for (const b of AXES)
      if (a !== b) {
        const scores = Object.fromEntries(
          AXES.map((x) => [x.id, x === a ? 90 : x === b ? 70 : 10]),
        );
        assert.equal(
          computeProfile([{ id: "fixture", style: { scores } }]).profile.key,
          `${a.id}-${b.id}`,
        );
      }
  const tie = computeProfile([
    {
      id: "tie",
      style: { scores: Object.fromEntries(AXES.map((a) => [a.id, 50])) },
    },
  ]);
  assert.equal(tie.profile.key, "softness-energy");
  assert.equal(tie.balanced, true);
});
test("legacy common selections are excluded while eligible favorites and ranking survive", () => {
  const result = parseCollection(
    {
      version: 1,
      selections: { "set|a1|◊": "a1-001", "set|a1|☆": "a1-227" },
      top: ["a1-001", "a1-227"],
      absolute: "a1-001",
      winners: {},
    },
    cards,
  );
  assert.equal(result.removed, 1);
  assert.deepEqual(result.value.selections, { "set|a1|☆": "a1-227" });
  assert.deepEqual(result.value.top, ["a1-227"]);
  assert.equal(result.value.absolute, null);
});
