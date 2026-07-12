import { ranks, rankValue, suits, type Card, type Rank } from "./cards";
import type { TableRules } from "./rules";

export type DrillCategory = "soft" | "pair" | "surrender";

export type DrillSettings = {
  enabled: boolean;
  weights: Record<DrillCategory, number>;
};

export const drillCategories: DrillCategory[] = ["soft", "pair", "surrender"];

export const defaultDrillSettings: DrillSettings = {
  enabled: false,
  weights: { soft: 25, pair: 25, surrender: 25 }
};

export type DrilledHand = {
  playerCards: Card[];
  dealerCards: Card[];
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomCard(rank: Rank): Card {
  return { rank, suit: pickRandom(suits) };
}

function ranksForValue(value: number): Rank[] {
  if (value === 10) return ["10", "J", "Q", "K"];
  return [String(value) as Rank];
}

function nonPairHardTotal(total: number): [Rank, Rank] {
  const decompositions: [number, number][] = [];
  for (let a = 2; a <= 10; a += 1) {
    const b = total - a;
    if (b >= 2 && b <= 10 && a !== b) {
      decompositions.push([a, b]);
    }
  }
  const [valueA, valueB] = pickRandom(decompositions);
  return [pickRandom(ranksForValue(valueA)), pickRandom(ranksForValue(valueB))];
}

function dealerHoleCardAvoidingBlackjack(upcard: Rank): Rank {
  const upcardValue = rankValue(upcard);
  if (upcardValue !== 11 && upcardValue !== 10) {
    return pickRandom(ranks);
  }
  const forbidden = upcardValue === 11 ? ["10", "J", "Q", "K"] : ["A"];
  const pool = ranks.filter((rank) => !forbidden.includes(rank));
  return pickRandom(pool);
}

function dealerHandFor(upcard: Rank): Card[] {
  return [randomCard(upcard), randomCard(dealerHoleCardAvoidingBlackjack(upcard))];
}

function dealSoftHand(): Card[] {
  const total = 13 + Math.floor(Math.random() * 8); // soft 13 through soft 20
  const otherRank = String(total - 11) as Rank;
  return [randomCard("A"), randomCard(otherRank)];
}

function dealPairHand(): Card[] {
  const rank = pickRandom(ranks);
  return [randomCard(rank), randomCard(rank)];
}

function dealSurrenderHand(rules: TableRules): { playerCards: Card[]; dealerUpcard: Rank } {
  const options: { total: number; upcards: Rank[] }[] = [
    { total: 16, upcards: ["9", "10", "A"] },
    { total: 15, upcards: rules.dealerHitsSoft17 ? ["10", "A"] : ["10"] }
  ];
  const chosen = pickRandom(options);
  const dealerUpcard = pickRandom(chosen.upcards);
  const [rankA, rankB] = nonPairHardTotal(chosen.total);
  return { playerCards: [randomCard(rankA), randomCard(rankB)], dealerUpcard };
}

export function dealDrillHand(category: DrillCategory, rules: TableRules): DrilledHand | null {
  if (category === "surrender") {
    if (!rules.surrenderAllowed) return null;
    const { playerCards, dealerUpcard } = dealSurrenderHand(rules);
    return { playerCards, dealerCards: dealerHandFor(dealerUpcard) };
  }

  const playerCards = category === "soft" ? dealSoftHand() : dealPairHand();
  const dealerUpcard = pickRandom(ranks);
  return { playerCards, dealerCards: dealerHandFor(dealerUpcard) };
}

export function pickDrillCategory(settings: DrillSettings, rules: TableRules): DrillCategory | null {
  if (!settings.enabled) return null;

  const eligible = drillCategories.filter((category) => category !== "surrender" || rules.surrenderAllowed);
  const rawWeights = eligible.map((category) => Math.max(settings.weights[category], 0));
  const totalWeight = rawWeights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return null;

  const scale = totalWeight > 100 ? 100 / totalWeight : 1;
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < eligible.length; i += 1) {
    cumulative += rawWeights[i] * scale;
    if (roll < cumulative) return eligible[i];
  }
  return null;
}
