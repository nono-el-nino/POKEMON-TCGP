// Four diamonds are included: they are the standard EX rarity.
export function isEligibleCard(card) {
  return (
    card.rarity === "Promo" ||
    card.rarity === "Crown Rare" ||
    /^◊{4,}$/.test(card.rarity || "") ||
    /^[☆★]+$/.test(card.rarity || "")
  );
}
