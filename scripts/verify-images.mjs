import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const { cards } = JSON.parse(
  await readFile("public/data/catalog.json", "utf8"),
);
const queue = [...cards],
  failures = [];
let checked = 0;
await Promise.all(
  Array.from({ length: 12 }, async () => {
    while (queue.length) {
      const c = queue.pop();
      try {
        const { stdout } = await exec(
          "curl",
          ["-fLsS", "--retry", "2", "--max-time", "30", c.image],
          { encoding: "buffer", maxBuffer: 4 * 1024 * 1024 },
        );
        if (
          stdout.subarray(0, 4).toString() !== "RIFF" ||
          stdout.subarray(8, 12).toString() !== "WEBP"
        )
          throw Error("Invalid WebP");
      } catch {
        failures.push(c.id);
      }
      checked++;
      if (checked % 500 === 0) console.log(`${checked}/${cards.length}`);
    }
  }),
);
const report = { checked, failures, at: new Date().toISOString() };
await writeFile("public/data/image-report.json", JSON.stringify(report));
console.log(report);
if (failures.length) process.exitCode = 1;
