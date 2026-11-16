import {
  readFile,
  writeFile,
  mkdir,
  rename,
  rm,
  readdir,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const { cards, meta } = JSON.parse(
  await readFile("public/data/catalog.json", "utf8"),
);
const queue = [...cards],
  failures = [];
let downloaded = 0,
  cached = 0;
const valid = (b) =>
  b.subarray(0, 4).toString() === "RIFF" &&
  b.subarray(8, 12).toString() === "WEBP";
await Promise.all(
  Array.from({ length: 12 }, async () => {
    while (queue.length) {
      const c = queue.pop();
      if (
        !/^[a-z0-9]+$/.test(c.set) ||
        !/^\d+$/.test(c.number) ||
        c.image !==
          `https://raw.githubusercontent.com/PocketDecks/pokemon-tcg-pocket-cards/refs/heads/main/images/webp/cards/${c.set}/${c.number}.webp`
      )
        throw Error("Invalid image path");
      const dir = `public/images/cards/${c.set}`,
        path = `${dir}/${c.number}.webp`;
      try {
        if (valid(await readFile(path))) {
          cached++;
          await rm(path + ".tmp", { force: true });
          continue;
        }
      } catch {}
      try {
        const { stdout } = await exec(
          "curl",
          ["-fLsS", "--retry", "2", "--max-time", "45", c.image],
          { encoding: "buffer", maxBuffer: 4 * 1024 * 1024 },
        );
        if (!valid(stdout)) throw Error("Invalid WebP");
        await mkdir(dir, { recursive: true });
        const temp = `${path}.${process.pid}.tmp`;
        await writeFile(temp, stdout);
        await rename(temp, path);
        downloaded++;
        if (downloaded % 500 === 0)
          console.log(`${downloaded} illustrations préparées`);
      } catch {
        failures.push(c.id);
      }
    }
  }),
);
// This directory only contains generated card assets. Remove retired prints so
// a build after changing the rarity policy does not ship the old images.
let retired = 0;
if (!failures.length) {
  const wanted = new Set(cards.map((c) => `${c.set}/${c.number}.webp`));
  for (const dir of await readdir("public/images/cards", {
    withFileTypes: true,
  })) {
    if (!dir.isDirectory() || !/^[a-z0-9]+$/.test(dir.name)) continue;
    for (const file of await readdir(`public/images/cards/${dir.name}`, {
      withFileTypes: true,
    })) {
      if (
        file.isFile() &&
        /^\d+\.webp$/.test(file.name) &&
        !wanted.has(`${dir.name}/${file.name}`)
      ) {
        await rm(`public/images/cards/${dir.name}/${file.name}`);
        retired++;
      }
    }
  }
}
const report = {
  retired,
  checked: cards.length,
  cached,
  downloaded,
  failures,
  sourceSha256: meta.sha256,
  at: new Date().toISOString(),
};
await mkdir(".local", { recursive: true });
await writeFile(".local/image-cache-report.json", JSON.stringify(report));
console.log(report);
if (failures.length) process.exitCode = 1;
