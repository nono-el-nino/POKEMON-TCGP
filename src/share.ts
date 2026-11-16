import {
  cardCategory,
  rarityShortName,
  cardImageUrl,
  type Card,
  type Collection,
} from "./model";
import { AXES, computeProfile } from "./personality.mjs";
import { download, loadImage } from "./export";
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
) {
  let line = "";
  for (const word of text.split(" ")) {
    if (ctx.measureText(line + word).width > width && line) {
      ctx.fillText(line.trim(), x, y);
      line = "";
      y += lineHeight;
    }
    line += word + " ";
  }
  ctx.fillText(line.trim(), x, y);
  return y + lineHeight;
}
export async function exportResultPNG(cards: Card[], collection: Collection) {
  const result = computeProfile(cards);
  if (!result?.profile)
    throw Error("Choisissez une carte avant de partager votre résultat.");
  await document.fonts.ready;
  const priority = [collection.absolute, ...collection.top].filter(Boolean);
  const ordered = [...new Map(cards.map((c) => [c.id, c])).values()].sort(
    (a, b) => {
      const ai = priority.indexOf(a.id),
        bi = priority.indexOf(b.id);
      return (
        (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi) ||
        a.id.localeCompare(b.id, undefined, { numeric: true })
      );
    },
  );
  const w = 2400,
    pad = 80,
    gap = 28,
    cols = 6,
    cw = (w - pad * 2 - gap * (cols - 1)) / cols,
    ih = (cw * 512) / 367,
    ch = ih + 108,
    perPage = 24,
    pages = Math.ceil(ordered.length / perPage);
  let missing = 0;
  for (let page = 0; page < pages; page++) {
    const group = ordered.slice(page * perPage, (page + 1) * perPage),
      h = Math.max(1500, 850 + Math.ceil(group.length / cols) * ch + 100);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("PNG non disponible dans ce navigateur.");
    ctx.fillStyle = "#F8F9F6";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#dff2e5";
    ctx.fillRect(0, 0, w, 720);
    ctx.fillStyle = "#49634b";
    ctx.font = 'bold 25px "Instrument Sans"';
    ctx.fillText(
      "POCKET FAVORITES  /  MA SIGNATURE DE COLLECTIONNEUR",
      pad,
      85,
    );
    ctx.fillStyle = "#202625";
    ctx.font = 'bold 90px "Bricolage Grotesque"';
    ctx.fillText(result.profile.name, pad, 207);
    ctx.font = '32px "Instrument Sans"';
    wrap(ctx, result.profile.description, pad, 280, w - pad * 2, 44);
    ctx.fillStyle = "#60745e";
    ctx.font = '25px "Instrument Sans"';
    ctx.fillText(
      `${result.count} illustrations distinctes · ${result.provisional ? "Tendance provisoire · " : ""}Méthode v1 · ${page + 1}/${pages}`,
      pad,
      380,
    );
    AXES.forEach((axis, i) => {
      const x = pad + (i % 2) * 1160,
        y = 460 + Math.floor(i / 2) * 105;
      ctx.fillStyle = "#314b36";
      ctx.font = 'bold 29px "Instrument Sans"';
      ctx.fillText(axis.name, x, y);
      ctx.textAlign = "right";
      ctx.fillText(
        `${result.scores[axis.id].toLocaleString("fr-FR")} / 100`,
        x + 1040,
        y,
      );
      ctx.textAlign = "left";
      ctx.fillStyle = "#cbdccc";
      ctx.fillRect(x, y + 20, 1040, 15);
      ctx.fillStyle = axis.color;
      ctx.fillRect(x, y + 20, (1040 * result.scores[axis.id]) / 100, 15);
    });
    ctx.fillStyle = "#202625";
    ctx.font = 'bold 38px "Bricolage Grotesque"';
    ctx.fillText(
      page === 0
        ? "Les cartes qui me ressemblent."
        : "La suite de mes coups de cœur.",
      pad,
      790,
    );
    await Promise.all(
      group.map(async (card, i) => {
        const row = Math.floor(i / cols),
          items = Math.min(cols, group.length - row * cols),
          offset = ((cols - items) * (cw + gap)) / 2,
          x = pad + offset + (i % cols) * (cw + gap),
          y = 850 + row * ch;
        try {
          ctx.drawImage(await loadImage(cardImageUrl(card)), x, y, cw, ih);
        } catch {
          missing++;
          ctx.fillStyle = "#e2e7dc";
          ctx.fillRect(x, y, cw, ih);
          ctx.fillStyle = "#5b7051";
          ctx.font = '20px "Instrument Sans"';
          ctx.fillText(
            "Illustration indisponible",
            x + 10,
            y + ih / 2,
            cw - 20,
          );
        }
        ctx.fillStyle = "#202625";
        ctx.font = 'bold 24px "Instrument Sans"';
        ctx.fillText(card.name, x, y + ih + 35, cw);
        ctx.fillStyle = "#6c7f62";
        ctx.font = '20px "Instrument Sans"';
        ctx.fillText(
          `${card.id.toUpperCase()}${card.rarity === "☆☆" ? " · " + rarityShortName(cardCategory(card)) : ""}`,
          x,
          y + ih + 65,
          cw,
        );
        const rank = collection.top.indexOf(card.id);
        if (card.id === collection.absolute || rank >= 0) {
          ctx.fillStyle = "#56774b";
          ctx.font = 'bold 18px "Instrument Sans"';
          ctx.fillText(
            `${card.id === collection.absolute ? "Favori absolu" : ""}${card.id === collection.absolute && rank >= 0 ? " · " : ""}${rank >= 0 ? "Top 10 · n° " + (rank + 1) : ""}`,
            x,
            y + ih + 92,
            cw,
          );
        }
      }),
    );
    ctx.fillStyle = "#708065";
    ctx.font = '20px "Instrument Sans"';
    ctx.fillText(
      "Profil ludique de collection · Illustrations © Pokémon / Nintendo / Creatures / GAME FREAK / DeNA.",
      pad,
      h - 45,
      w - pad * 2,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw Error("La création du PNG a échoué.");
    download(blob, `pocket-favorites-resultat-${page + 1}.png`);
  }
  return { pages, missing };
}
