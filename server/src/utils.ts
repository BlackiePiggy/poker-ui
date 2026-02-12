import type { Card, Rank, Suit } from "@poker/shared/dist/types.js";

const SUITS: Suit[] = ["S", "H", "D", "C"];
const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const r of RANKS) for (const s of SUITS) deck.push(`${r}${s}`);
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  // Fisher–Yates
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
