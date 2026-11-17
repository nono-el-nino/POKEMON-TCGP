// Keep the upstream rarity unchanged. These keys describe independent favorite slots.
export const ONE_STAR_SHINY = "☆:shiny";
export const TWO_STAR_OTHER = "☆☆";
export const TWO_STAR_RAINBOW = "☆☆:rainbow";
export const TWO_STAR_TRAINER = "☆☆:trainer";
export function cardCategory(card) {
  if (card.rarity === "☆" && card.artStyle === "Shiny") return ONE_STAR_SHINY;
  if (card.rarity !== "☆☆") return card.rarity;
  if (card.category === "Trainer" || card.type === "Trainer")
    return TWO_STAR_TRAINER;
  return card.artStyle === "Special Illustration Art"
    ? TWO_STAR_RAINBOW
    : TWO_STAR_OTHER;
}
export const standardRarities = [
  "◊◊◊◊",
  "☆",
  ONE_STAR_SHINY,
  TWO_STAR_OTHER,
  TWO_STAR_RAINBOW,
  TWO_STAR_TRAINER,
  "☆☆☆",
  "Crown Rare",
  "Promo",
];
export function rarityLabel(category) {
  if (category === "Crown Rare") return "♛";
  if (category === "Promo") return "P";
  if (category === ONE_STAR_SHINY) return "☆";
  return category.startsWith("☆☆:") ? "☆☆" : category;
}
export function rarityName(category) {
  if (category === ONE_STAR_SHINY) return "1 étoile · chromatiques";
  if (category === TWO_STAR_OTHER) return "2 étoiles · autres Pokémon";
  if (category === TWO_STAR_RAINBOW) return "2 étoiles · arc-en-ciel";
  if (category === TWO_STAR_TRAINER) return "2 étoiles · Dresseurs";
  if (category === "Crown Rare") return "Couronne";
  if (category === "Promo") return "Promotion";
  return `${category.length} ${category.startsWith("◊") ? "diamant" : "étoile"}${category.length > 1 ? "s" : ""}`;
}
export function rarityShortName(category) {
  if (category === ONE_STAR_SHINY) return "Chromatiques";
  if (category === "☆") return "Illustrations";
  if (category === TWO_STAR_OTHER) return "Autres Pokémon";
  if (category === TWO_STAR_RAINBOW) return "Arc-en-ciel";
  if (category === TWO_STAR_TRAINER) return "Dresseurs";
  return rarityName(category);
}
