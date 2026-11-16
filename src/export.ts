import {
  type Card,
  type Expansion,
  type Mode,
  cardImageUrl,
  cardCategory,
  rarityShortName,
  rarityLabel,
  rarityName,
  standardRarities,
  typeNames,
} from "./model";
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    const t = setTimeout(() => reject(Error("Image indisponible")), 15000);
    i.crossOrigin = "anonymous";
    i.onload = () => {
      clearTimeout(t);
      resolve(i);
    };
    i.onerror = () => {
      clearTimeout(t);
      reject(Error("Image indisponible"));
    };
    i.src = url;
  });
type Entry = { key: string; card: Card };
export async function exportPNG(
  selections: Record<string, string>,
  cards: Card[],
  sets: Expansion[],
  mode: Mode,
  format: "landscape" | "story",
) {
  await document.fonts.ready;
  const byId = new Map(cards.map((c) => [c.id, c]));
  const entries = Object.entries(selections)
    .filter(([key]) => key.startsWith(mode + "|"))
    .map(([key, id]) => ({ key, card: byId.get(id)! }))
    .filter((e) => e.card);
  if (!entries.length)
    throw Error("Sélectionnez au moins une carte dans ce mode avant l’export.");
  const rowName = (row: string) =>
    mode === "set"
      ? sets.find((s) => s.id === row)?.name || row
      : typeNames[row] || row;
  const rows = [...new Set(entries.map((e) => e.key.split("|")[1]))];
  const rarities = [
    ...standardRarities.filter((r) => cards.some((c) => cardCategory(c) === r)),
    ...new Set(
      cards.map(cardCategory).filter((r) => !standardRarities.includes(r)),
    ),
  ];
  let missing = 0;
  const makeCanvas = (w: number, h: number, page: number, total: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Export indisponible dans ce navigateur.");
    ctx.fillStyle = "#F8F9F6";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#202625";
    ctx.font = 'bold 60px "Bricolage Grotesque"';
    ctx.fillText("Mes coups de cœur.", 60, 100);
    ctx.font = '24px "Instrument Sans"';
    ctx.fillText(
      `POCKET FAVORITES  /  ${mode === "set" ? "Extensions × Raretés" : "Types × Raretés"}  /  ${page + 1} de ${total}`,
      60,
      152,
    );
    return { canvas, ctx };
  };
  const drawCard = async (
    ctx: CanvasRenderingContext2D,
    entry: Entry,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    try {
      ctx.drawImage(await loadImage(cardImageUrl(entry.card)), x, y, w, h);
    } catch {
      missing++;
      ctx.fillStyle = "#e6e9e3";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#536057";
      ctx.font = '16px "Instrument Sans"';
      ctx.fillText("Image indisponible", x + 8, y + h / 2, w - 16);
    }
  };
  const finish = async (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    page: number,
  ) => {
    ctx.fillStyle = "#647168";
    ctx.font = '18px "Instrument Sans"';
    ctx.fillText(
      "Projet de fans non officiel. Illustrations © Pokémon / Nintendo / Creatures / GAME FREAK / DeNA.",
      60,
      canvas.height - 35,
      canvas.width - 120,
    );
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/png"),
    );
    if (!blob) throw Error("La création du PNG a échoué.");
    download(blob, `pocket-favorites-${format}-${page + 1}.png`);
  };
  if (format === "landscape") {
    const perPage = 5,
      total = Math.ceil(rows.length / perPage);
    const w = 2400,
      pad = 60,
      labelW = 270,
      gap = 18,
      cw =
        (w - pad * 2 - labelW - gap * (rarities.length - 1)) / rarities.length,
      ih = cw * 1.395,
      rowH = ih + 86;
    for (let page = 0; page < total; page++) {
      const pageRows = rows.slice(page * perPage, (page + 1) * perPage);
      const { canvas, ctx } = makeCanvas(
        w,
        Math.max(1100, 310 + pageRows.length * rowH + 90),
        page,
        total,
      );
      rarities.forEach((r, col) => {
        const x = pad + labelW + col * (cw + gap);
        ctx.textAlign = "center";
        ctx.fillStyle = "#63785a";
        ctx.font = '26px "Instrument Sans"';
        ctx.fillText(rarityLabel(r), x + cw / 2, 220, cw);
        ctx.font = '16px "Instrument Sans"';
        ctx.fillText(rarityShortName(r), x + cw / 2, 248, cw);
      });
      ctx.textAlign = "left";
      for (let rowIndex = 0; rowIndex < pageRows.length; rowIndex++) {
        const row = pageRows[rowIndex],
          y = 285 + rowIndex * rowH;
        ctx.fillStyle = "#202625";
        ctx.font = 'bold 23px "Bricolage Grotesque"';
        const words = rowName(row).split(" ");
        let line = "",
          dy = 0;
        for (const word of words) {
          if (ctx.measureText(line + word).width > labelW - 35 && line) {
            ctx.fillText(line.trim(), pad, y + 75 + dy);
            line = "";
            dy += 30;
          }
          line += word + " ";
        }
        ctx.fillText(line.trim(), pad, y + 75 + dy);
        ctx.fillStyle = "#89977f";
        ctx.font = '18px "Instrument Sans"';
        ctx.fillText(row.toUpperCase(), pad, y + 115 + dy);
        await Promise.all(
          rarities.map(async (r, col) => {
            const x = pad + labelW + col * (cw + gap);
            const e = entries.find((e) => e.key === `${mode}|${row}|${r}`);
            if (e) {
              await drawCard(ctx, e, x, y, cw, ih);
              ctx.fillStyle = "#202625";
              ctx.font = 'bold 17px "Instrument Sans"';
              ctx.fillText(e.card.name, x, y + ih + 27, cw);
              ctx.font = '15px "Instrument Sans"';
              ctx.fillStyle = "#7b8b70";
              ctx.fillText(e.card.id.toUpperCase(), x, y + ih + 49, cw);
            } else {
              ctx.fillStyle = "#edf0e7";
              ctx.fillRect(x, y, cw, ih);
              ctx.fillStyle = "#a8b39f";
              ctx.font = '24px "Instrument Sans"';
              ctx.fillText("—", x + cw / 2 - 8, y + ih / 2);
            }
          }),
        );
      }
      await finish(canvas, ctx, page);
    }
    return { pages: total, missing };
  }
  const perPage = 12,
    total = Math.ceil(entries.length / perPage),
    w = 1080,
    pad = 60,
    gap = 24,
    cw = (w - pad * 2 - gap * 2) / 3,
    ih = cw * 1.395,
    ch = ih + 100;
  for (let page = 0; page < total; page++) {
    const group = entries.slice(page * perPage, (page + 1) * perPage);
    const { canvas, ctx } = makeCanvas(
      w,
      Math.max(1920, 240 + Math.ceil(group.length / 3) * ch + 90),
      page,
      total,
    );
    await Promise.all(
      group.map(async (e, i) => {
        const x = pad + (i % 3) * (cw + gap),
          y = 225 + Math.floor(i / 3) * ch;
        await drawCard(ctx, e, x, y, cw, ih);
        ctx.fillStyle = "#202625";
        ctx.font = 'bold 22px "Instrument Sans"';
        ctx.fillText(e.card.name, x, y + ih + 30, cw);
        ctx.font = '18px "Instrument Sans"';
        ctx.fillText(
          `${e.card.id.toUpperCase()} · ${rarityLabel(cardCategory(e.card))} ${e.card.rarity === "☆☆" ? rarityShortName(cardCategory(e.card)) : ""}`,
          x,
          y + ih + 58,
          cw,
        );
        ctx.fillStyle = "#718365";
        ctx.font = '17px "Instrument Sans"';
        ctx.fillText(rowName(e.key.split("|")[1]), x, y + ih + 83, cw);
      }),
    );
    await finish(canvas, ctx, page);
  }
  return { pages: total, missing };
}
