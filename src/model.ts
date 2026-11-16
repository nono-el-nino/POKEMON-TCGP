import { cardCategory } from "./categories.mjs";
export type Card = {
  id: string;
  name: string;
  englishName: string;
  set: string;
  number: string;
  rarity: string;
  type: string;
  category: string;
  artist: string;
  image: string;
  ex: boolean;
  stage: string | null;
  artStyle: string | null;
  species: {
    id: number;
    baby: boolean;
    legendary: boolean;
    mythical: boolean;
  } | null;
  style?: {
    scores: Record<string, number>;
    features: Record<string, number>;
    imageSha256: string;
  };
  variants: { set_code: string; id: number; rarity: string }[];
};
export type Expansion = {
  id: string;
  name: string;
  englishName: string;
  date: string | null;
  series: string;
  promo: boolean;
  count: number;
};
export type Catalog = {
  cards: Card[];
  sets: Expansion[];
  meta: {
    updated: string;
    cards: number;
    sets: number;
    frenchNames: number;
    sha256: string;
  };
};
export type Mode = "set" | "type";
export type Collection = {
  version: 1;
  selections: Record<string, string>;
  top: string[];
  absolute: string | null;
  winners: Record<string, string>;
};
export const EMPTY: Collection = {
  version: 1,
  selections: {},
  top: [],
  absolute: null,
  winners: {},
};
export const typeNames: Record<string, string> = {
  Grass: "Plante",
  Fire: "Feu",
  Water: "Eau",
  Lightning: "Électrique",
  Psychic: "Psy",
  Fighting: "Combat",
  Darkness: "Obscurité",
  Metal: "Métal",
  Dragon: "Dragon",
  Colorless: "Incolore",
  Trainer: "Dresseur",
};
export const typeColors: Record<string, string> = {
  Grass: "#7aa96b",
  Fire: "#e78a65",
  Water: "#70a6d5",
  Lightning: "#d8b84d",
  Psychic: "#af86bd",
  Fighting: "#bc946c",
  Darkness: "#6d8387",
  Metal: "#98a5aa",
  Dragon: "#aa9e6b",
  Colorless: "#b6afa3",
  Trainer: "#809a97",
};
export {
  cardCategory,
  standardRarities,
  rarityLabel,
  rarityName,
  rarityShortName,
} from "./categories.mjs";
export const slotKey = (mode: Mode, row: string, rarity: string) =>
  `${mode}|${row}|${rarity}`;
export const matchesSlot = (card: Card, key: string) => {
  const [mode, row, rarity] = key.split("|");
  return (
    (mode === "set"
      ? card.set === row
      : mode === "type" && card.type === row) && cardCategory(card) === rarity
  );
};

export const cardImageUrl = (card: Card) =>
  `${import.meta.env.BASE_URL}images/cards/${card.set}/${card.number}.webp`;
