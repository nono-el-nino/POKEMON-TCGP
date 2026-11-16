import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  PROFILE_VERSION,
  scoreCard,
  visualFeatures,
} from "../src/personality.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const { cards, meta } = JSON.parse(
  await readFile("public/data/catalog.json", "utf8"),
);
const algorithmSha256 = sha(
  Buffer.concat([
    await readFile("src/personality.mjs"),
    await readFile("scripts/build-profiles.mjs"),
    Buffer.from(sharp.versions.vips + ":" + sharp.versions.sharp),
  ]),
);
let previous;
try {
  previous = JSON.parse(await readFile("public/data/profiles.json", "utf8"));
} catch {}
const queue = [...cards],
  results = new Map();
let analyzed = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const c = queue.pop();
      if (!/^[a-z0-9]+$/.test(c.set) || !/^\d+$/.test(c.number))
        throw Error("Invalid card path");
      const buffer = await readFile(
          `public/images/cards/${c.set}/${c.number}.webp`,
        ),
        imageSha256 = sha(buffer),
        metadataSha256 = sha(
          JSON.stringify({
            type: c.type,
            category: c.category,
            stage: c.stage,
            ex: c.ex,
            species: c.species,
            artStyle: c.artStyle,
          }),
        );
      const old = previous?.cards?.[c.id];
      if (
        previous?.algorithmSha256 === algorithmSha256 &&
        old?.imageSha256 === imageSha256 &&
        old?.metadataSha256 === metadataSha256
      ) {
        results.set(c.id, old);
        continue;
      }
      const { width, height } = await sharp(buffer).metadata();
      const full =
        c.artStyle &&
        [
          "Illustration Art",
          "Full Art",
          "Special Illustration Art",
          "Immersive Art",
          "Shiny Full Art",
        ].includes(c.artStyle);
      const crop = {
        left: Math.round(width * 0.08),
        top: Math.round(height * 0.15),
        width: Math.round(width * 0.84),
        height: Math.round(height * (full ? 0.6 : 0.36)),
      };
      const rgb = await sharp(buffer)
        .extract(crop)
        .resize(32, 32, { fit: "fill" })
        .removeAlpha()
        .toColourspace("srgb")
        .raw()
        .toBuffer();
      const measured = visualFeatures(rgb),
        scores = scoreCard(c, measured),
        features = Object.fromEntries(
          Object.entries(measured).map(([k, v]) => [
            k,
            Math.round(v * 10000) / 10000,
          ]),
        );
      results.set(c.id, { scores, features, imageSha256, metadataSha256 });
      analyzed++;
    }
  }),
);
const result = {
  version: PROFILE_VERSION,
  algorithmSha256,
  sourceSha256: meta.sha256,
  cards: Object.fromEntries(cards.map((c) => [c.id, results.get(c.id)])),
};
const json = JSON.stringify(result);
let existing = "";
try {
  existing = await readFile("public/data/profiles.json", "utf8");
} catch {}
if (json !== existing) await writeFile("public/data/profiles.json", json);
console.log(
  `${cards.length} cartes classées, ${analyzed} illustrations analysées. Signature v${PROFILE_VERSION}.`,
);
