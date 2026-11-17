import { cardCategory, standardRarities } from "./categories.mjs";
/**
 * Derive the final round from actual, unique chosen prints.
 * @param {import('./model').Card[]} cards
 * @param {Record<string,string>} [winners]
 * @param {string|null} [absolute]
 * @returns {{groups:{key:string,candidates:import('./model').Card[],champion:import('./model').Card|null,automatic:boolean}[],champions:import('./model').Card[],unresolved:number,ready:boolean,ultimate:import('./model').Card|null,total:number,resolved:number}}
 */
export function getFinale(cards, winners = {}, absolute = null) {
  const unique = [...new Map(cards.map((c) => [c.id, c])).values()],
    byCategory = new Map();
  for (const c of unique) {
    const key = cardCategory(c);
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(c);
  }
  const order = [
    ...standardRarities,
    ...[...byCategory.keys()]
      .filter((k) => !standardRarities.includes(k))
      .sort(),
  ];
  const groups = order
    .filter((key) => byCategory.has(key))
    .map((key) => {
      const candidates = byCategory
        .get(key)
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      const explicit =
        candidates.find((c) => c.id === winners[`rarity|${key}`]) || null;
      const champion =
        explicit || (candidates.length === 1 ? candidates[0] : null);
      return {
        key,
        candidates,
        champion,
        automatic: !explicit && candidates.length === 1,
      };
    });
  const champions = groups.map((g) => g.champion).filter(Boolean),
    unresolved = groups.filter((g) => !g.champion).length,
    ready = groups.length > 0 && unresolved === 0;
  const ultimate = ready
    ? champions.find((c) => c.id === absolute) || null
    : null;
  return {
    groups,
    champions,
    unresolved,
    ready,
    ultimate,
    total: groups.length,
    resolved: groups.length - unresolved,
  };
}
