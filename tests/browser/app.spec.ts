import { cardCategory } from "../../src/categories.mjs";
import { test, expect } from "@playwright/test";
const first = "Choisir Puissance Génétique, 1 étoile";
async function selectBulbasaur(page: any) {
  await page.getByRole("button", { name: first, exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rechercher dans la galerie" })
    .fill("a1-227");
  await expect(
    page
      .getByRole("button", { name: "Choisir Bulbizarre a1-227", exact: true })
      .locator("img"),
  ).toBeVisible();
  await page.waitForFunction(() => {
    const img = document.querySelector(
      ".gallery-select img",
    ) as HTMLImageElement;
    return img?.complete && img.naturalWidth > 0;
  });
  await page
    .getByRole("button", { name: "Choisir Bulbizarre a1-227", exact: true })
    .click();
}
test("desktop selection, independent modes, persistence, ranking and JSON export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "La matrice de vos envies." }),
  ).toBeVisible();
  await selectBulbasaur(page);
  await expect(
    page.getByRole("button", {
      name: "Modifier Puissance Génétique, 1 étoile, Bulbizarre",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Type × Rareté", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Choisir Plante, 1 étoile",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Extension × Rareté", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Modifier Puissance Génétique, 1 étoile, Bulbizarre",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Mes favoris/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bulbizarre", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Ajouter Bulbizarre a1-227 au Top 10",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Désigner Bulbizarre a1-227 favori absolu",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Exporter mes choix", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toBe("pocket-favorites.json");
  const { readFile } = await import("node:fs/promises");
  const payload = JSON.parse(await readFile((await dl.path())!, "utf8"));
  expect(payload.signature.version).toBe(1);
  expect(payload.signature.artwork["a1-227"].imageSha256).toMatch(
    /^[a-f0-9]{64}$/,
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-favorites:v1")!),
  );
  expect(saved.top).toEqual(["a1-227"]);
  expect(saved.absolute).toBe("a1-227");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Supprimer Bulbizarre a1-227 de tous les favoris",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Les belles rencontres commencent ici.",
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("gallery respects exact impressions, empty categories, keyboard and assisted selection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Filtrer par extension", exact: true })
    .selectOption("pa");
  await expect(
    page.getByLabel("Aucune carte : Promo-A, Couronne", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filtrer par extension", exact: true })
    .selectOption("a1");
  await page
    .getByRole("button", {
      name: "Choisir Puissance Génétique, 1 étoile",
      exact: true,
    })
    .click();
  await page
    .getByRole("textbox", { name: "Rechercher dans la galerie" })
    .fill("Bulbizarre");
  await expect(
    page.getByRole("button", {
      name: "Choisir Bulbizarre a1-227",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Agrandir Bulbizarre a1-227", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Bulbizarre", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Puissance Génétique", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher dans la galerie" })
    .fill("");
  await page
    .getByRole("button", { name: "Aidez-moi à choisir", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Laquelle vous fait le plus sourire ?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Je préfère celle-ci", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /Choisir .* maintenant/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("PNG export contains real image pixels and has expected dimensions", async ({
  page,
}) => {
  await page.goto("/");
  await selectBulbasaur(page);
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  const dlPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Paysage/ }).click();
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toBe("pocket-favorites-landscape-1.png");
  const path = await dl.path();
  const { readFile } = await import("node:fs/promises");
  const png = await readFile(path!);
  expect(png.readUInt32BE(16)).toBe(2400);
  expect(png.length).toBeGreaterThan(30000);
  await expect(page.getByRole("status")).toHaveText(
    /1 image\(s\) exportée\(s\)\./,
  );
  await expect(page.getByRole("status")).not.toContainText("indisponible");
});
test("JSON import merges and invalid files show a useful error", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "La matrice de vos envies." }),
  ).toBeVisible();
  const input = page.getByLabel("Importer une sauvegarde JSON", {
    exact: true,
  });
  await input.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":9}'),
  });
  await expect(page.getByRole("status")).toContainText("pas une sauvegarde");
  await input.setInputFiles({
    name: "ok.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        selections: { "set|a1|☆": "a1-227" },
        top: ["a1-227"],
        absolute: "a1-227",
        winners: {},
      }),
    ),
  });
  await expect(
    page.getByRole("button", {
      name: "Modifier Puissance Génétique, 1 étoile, Bulbizarre",
      exact: true,
    }),
  ).toBeVisible();
});
test("mobile uses compact matrix without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Vos cartes/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await selectBulbasaur(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Mes favoris/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bulbizarre", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("all phone widths fit and images work with external network blocked", async ({
  page,
}) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".hero-card img")).toHaveCount(3);
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>(".hero-card img")].every(
      (i) => i.complete && i.naturalWidth > 0,
    ),
  );
  for (const width of [320, 360, 390, 600, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}px`,
    ).toBe(true);
  }
});
test("missing illustration is labelled and never substituted", async ({
  page,
}) => {
  await page.route("**/images/cards/a1/227.webp", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: first, exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rechercher dans la galerie" })
    .fill("a1-227");
  const card = page.getByRole("button", {
    name: "Choisir Bulbizarre a1-227",
    exact: true,
  });
  await expect(card).toContainText("Illustration indisponible");
  await expect(card.locator("img")).toHaveCount(0);
  await expect(card).toContainText("A1-227");
});
test("multiple candidates require explicit arbitration and favorites can be edited", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "La matrice de vos envies." }),
  ).toBeVisible();
  await page
    .getByLabel("Importer une sauvegarde JSON", { exact: true })
    .setInputFiles({
      name: "two.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          selections: { "set|a1|☆": "a1-227", "set|a1|◊◊◊◊": "a1-004" },
          top: [],
          absolute: null,
          winners: {},
        }),
      ),
    });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Mes favoris/ })
    .click();
  await expect(
    page.getByText("2 coups de cœur à départager", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", {
      name: "Choisir le favori : Puissance Génétique",
      exact: true,
    })
    .selectOption("a1-227");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-favorites:v1")!),
  );
  expect(saved.winners["set|a1"]).toBe("a1-227");
  await page
    .getByRole("button", {
      name: "Modifier la sélection Bulbizarre a1-227",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Puissance Génétique", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Vider cette case", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Modifier la sélection Bulbizarre a1-227",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("story export is a real 1080px PNG", async ({ page }) => {
  await page.goto("/");
  await selectBulbasaur(page);
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Story/ }).click();
  const dl = await promise;
  const { readFile } = await import("node:fs/promises");
  const png = await readFile((await dl.path())!);
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(1920);
  await expect(page.getByRole("status")).not.toContainText("indisponible");
});
test("rarity filter excludes common cards and migrates legacy choices with a downloadable backup", async ({
  page,
}) => {
  const legacy = {
    version: 1,
    selections: { "set|a1|◊": "a1-001", "set|a1|☆": "a1-227" },
    top: ["a1-001", "a1-227"],
    absolute: "a1-001",
    winners: {},
  };
  await page.addInitScript(
    (value) =>
      localStorage.setItem("pocket-favorites:v1", JSON.stringify(value)),
    legacy,
  );
  await page.goto("/");
  await expect(
    page
      .getByRole("combobox", { name: "Filtrer par rareté", exact: true })
      .locator("option"),
  ).toHaveCount(9);
  await expect(
    page.getByRole("button", {
      name: "Choisir Puissance Génétique, 1 diamant",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Modifier Puissance Génétique, 1 étoile, Bulbizarre",
      exact: true,
    }),
  ).toBeVisible();
  const state = await page.evaluate(() => ({
    active: JSON.parse(localStorage.getItem("pocket-favorites:v1")!),
    backup: JSON.parse(
      localStorage.getItem("pocket-favorites:v1:before-rarity-filter")!,
    ),
  }));
  expect(state.active.selections).toEqual({ "set|a1|☆": "a1-227" });
  expect(state.active.top).toEqual(["a1-227"]);
  expect(state.active.absolute).toBeNull();
  expect(state.backup).toEqual(legacy);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Mes favoris/ })
    .click();
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /Télécharger mes anciens choix JSON/ })
    .click();
  expect((await dl).suggestedFilename()).toBe(
    "pocket-favorites-anciens-choix.json",
  );
});
test("profile uses unique cards across modes and downloads an illustrated result PNG", async ({
  page,
}) => {
  const value = {
    version: 1,
    selections: {
      "set|a1|☆": "a1-227",
      "type|Grass|☆": "a1-227",
      "set|a1|◊◊◊◊": "a1-004",
      "type|Fire|☆☆☆": "a1-280",
    },
    top: ["a1-004"],
    absolute: "a1-280",
    winners: {},
  };
  await page.addInitScript(
    (value) =>
      localStorage.setItem("pocket-favorites:v1", JSON.stringify(value)),
    value,
  );
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Mes favoris/ })
    .click();
  await expect(page.locator(".profile-count")).toContainText(
    "3 illustrations distinctes",
  );
  await expect(page.locator(".profile-count")).not.toContainText(
    "Première tendance",
  );
  const { readFile } = await import("node:fs/promises");
  const { computeProfile } = await import("../../src/personality.mjs");
  const catalog = JSON.parse(
      await readFile("public/data/catalog.json", "utf8"),
    ),
    styles = JSON.parse(await readFile("public/data/profiles.json", "utf8"));
  const selected = catalog.cards
    .filter((c: any) => ["a1-004", "a1-227", "a1-280"].includes(c.id))
    .map((c: any) => ({ ...c, style: styles.cards[c.id] }));
  const result = computeProfile(selected)!;
  await expect(page.locator("#collector-profile-title")).toHaveText(
    result.profile!.name,
  );
  for (const axis of ["softness", "energy", "mystery", "radiance"]) {
    const names: any = {
      softness: "Douceur",
      energy: "Énergie",
      mystery: "Mystère",
      radiance: "Éclat",
    };
    await expect(
      page
        .locator(".collector-profile")
        .getByRole("meter", { name: names[axis], exact: true }),
    ).toHaveAttribute("aria-valuenow", String(result.scores[axis]));
  }
  await page
    .getByText("Comment mon profil est-il calculé ?", { exact: true })
    .click();
  await expect(page.locator(".profile-types>div")).toHaveCount(12);
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Télécharger mon résultat PNG", exact: true })
    .click();
  const dl = await promise;
  expect(dl.suggestedFilename()).toBe("pocket-favorites-resultat-1.png");
  const png = await readFile((await dl.path())!);
  expect(png.readUInt32BE(16)).toBe(2400);
  expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(1500);
  expect(png.length).toBeGreaterThan(100000);
  await expect(page.getByRole("status")).toContainText("Prêt à partager");
  await expect(page.getByRole("status")).not.toContainText("indisponible");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("large result exports every chosen print across multiple HD PNG pages", async ({
  page,
}) => {
  const { readFile } = await import("node:fs/promises");
  const { cards } = JSON.parse(
    await readFile("public/data/catalog.json", "utf8"),
  );
  const selections: Record<string, string> = {};
  for (const c of cards) {
    const key = `set|${c.set}|${cardCategory(c)}`;
    if (!selections[key]) selections[key] = c.id;
    if (Object.keys(selections).length === 25) break;
  }
  await page.addInitScript(
    (selections) =>
      localStorage.setItem(
        "pocket-favorites:v1",
        JSON.stringify({
          version: 1,
          selections,
          top: [],
          absolute: null,
          winners: {},
        }),
      ),
    selections,
  );
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Mes favoris/ })
    .click();
  const downloads: any[] = [];
  page.on("download", (d) => downloads.push(d));
  await page
    .getByRole("button", { name: "Télécharger mon résultat PNG", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "2 PNG HD téléchargé(s)",
  );
  expect(downloads.map((d) => d.suggestedFilename())).toEqual([
    "pocket-favorites-resultat-1.png",
    "pocket-favorites-resultat-2.png",
  ]);
  for (const dl of downloads) {
    const png = await readFile((await dl.path())!);
    expect(png.readUInt32BE(16)).toBe(2400);
    expect(png.length).toBeGreaterThan(100000);
  }
  await expect(page.getByRole("status")).not.toContainText("indisponible");
});
test("three separate 2-star cells contain disjoint galleries and preserve all selections", async ({
  page,
}) => {
  await page.goto("/");
  const rows = [
    {
      label: "2 étoiles · autres Pokémon",
      id: "a1-251",
      name: "Florizarre ex",
      key: "☆☆",
    },
    {
      label: "2 étoiles · arc-en-ciel",
      id: "a1-274",
      name: "Sulfura ex",
      key: "☆☆:rainbow",
    },
    {
      label: "2 étoiles · Dresseurs",
      id: "a1-266",
      name: "Erika",
      key: "☆☆:trainer",
    },
  ];
  for (const row of rows) {
    await page
      .getByRole("button", {
        name: `Choisir Puissance Génétique, ${row.label}`,
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", {
        name: `Choisir ${row.name} ${row.id}`,
        exact: true,
      }),
    ).toBeVisible();
    for (const other of rows.filter((r) => r !== row))
      await expect(
        dialog.getByRole("button", {
          name: `Choisir ${other.name} ${other.id}`,
          exact: true,
        }),
      ).toHaveCount(0);
    await dialog
      .getByRole("button", {
        name: `Choisir ${row.name} ${row.id}`,
        exact: true,
      })
      .click();
  }
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-favorites:v1")!),
  );
  expect(saved.selections).toEqual({
    "set|a1|☆☆": "a1-251",
    "set|a1|☆☆:rainbow": "a1-274",
    "set|a1|☆☆:trainer": "a1-266",
  });
  await page.reload();
  for (const row of rows)
    await expect(
      page.getByRole("button", {
        name: `Modifier Puissance Génétique, ${row.label}, ${row.name}`,
        exact: true,
      }),
    ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Mes favoris/ })
    .click();
  await page
    .getByRole("combobox", { name: "Rareté des favoris", exact: true })
    .selectOption("☆☆:rainbow");
  await expect(page.locator(".favorite-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Sulfura ex", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Rareté des favoris", exact: true })
    .selectOption("☆☆:trainer");
  await expect(page.locator(".favorite-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Erika", exact: true }),
  ).toBeVisible();
});
test("legacy rainbow choices move to the rainbow cell without losing top 10 or absolute favorite", async ({
  page,
}) => {
  const old = {
    version: 1,
    selections: { "set|a1|☆☆": "a1-274", "type|Fire|☆☆": "a1-274" },
    top: ["a1-274"],
    absolute: "a1-274",
    winners: { "rarity|☆☆": "a1-274" },
  };
  await page.addInitScript(
    (value) =>
      localStorage.setItem("pocket-favorites:v1", JSON.stringify(value)),
    old,
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Modifier Puissance Génétique, 2 étoiles · arc-en-ciel, Sulfura ex",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Choisir Puissance Génétique, 2 étoiles · autres Pokémon",
      exact: true,
    }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-favorites:v1")!),
  );
  expect(saved.selections["set|a1|☆☆:rainbow"]).toBe("a1-274");
  expect(saved.top).toEqual(old.top);
  expect(saved.absolute).toBe(old.absolute);
  await page
    .getByRole("button", { name: "Type × Rareté", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Modifier Feu, 2 étoiles · arc-en-ciel, Sulfura ex",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  const dlPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Paysage/ }).click();
  const dl = await dlPromise;
  const { readFile } = await import("node:fs/promises");
  const png = await readFile((await dl.path())!);
  expect(png.readUInt32BE(16)).toBe(2400);
  await expect(page.getByRole("status")).not.toContainText("indisponible");
});
