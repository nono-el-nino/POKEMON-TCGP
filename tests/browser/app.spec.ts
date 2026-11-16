import { test, expect } from "@playwright/test";
const first = "Choisir Puissance Génétique, 1 diamant";
async function selectBulbasaur(page: any) {
  await page.getByRole("button", { name: first, exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rechercher dans la galerie" })
    .fill("a1-001");
  await expect(
    page
      .getByRole("button", { name: "Choisir Bulbizarre a1-001", exact: true })
      .locator("img"),
  ).toBeVisible();
  await page.waitForFunction(() => {
    const img = document.querySelector(
      ".gallery-select img",
    ) as HTMLImageElement;
    return img?.complete && img.naturalWidth > 0;
  });
  await page
    .getByRole("button", { name: "Choisir Bulbizarre a1-001", exact: true })
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
      name: "Modifier Puissance Génétique, 1 diamant, Bulbizarre",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Type × Rareté", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Choisir Plante, 1 diamant",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Extension × Rareté", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Modifier Puissance Génétique, 1 diamant, Bulbizarre",
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
      name: "Ajouter Bulbizarre a1-001 au Top 10",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Désigner Bulbizarre a1-001 favori absolu",
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
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-favorites:v1")!),
  );
  expect(saved.top).toEqual(["a1-001"]);
  expect(saved.absolute).toBe("a1-001");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Supprimer Bulbizarre a1-001 de tous les favoris",
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
  await page.route("**/images/cards/a1/001.webp", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: first, exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rechercher dans la galerie" })
    .fill("a1-001");
  const card = page.getByRole("button", {
    name: "Choisir Bulbizarre a1-001",
    exact: true,
  });
  await expect(card).toContainText("Illustration indisponible");
  await expect(card.locator("img")).toHaveCount(0);
  await expect(card).toContainText("A1-001");
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
          selections: { "set|a1|◊": "a1-001", "set|a1|☆": "a1-227" },
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
      name: "Modifier la sélection Bulbizarre a1-001",
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
      name: "Modifier la sélection Bulbizarre a1-001",
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
