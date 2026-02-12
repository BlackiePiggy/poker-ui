import type { Card, Seat, Stage } from "@poker/shared/dist/types.js";

export type PlayerState = {
  seat: Seat;
  connected: boolean;
  token: string | null; // seat绑定 token，用于重连
  stack: number;
  folded: boolean;
  hole: Card[];
  ready: boolean;
};

export type GameState = {
  stage: Stage;
  dealer: Seat | null;

  deck: Card[];         // server-only
  community: Card[];
  pot: number;

  players: Record<Seat, PlayerState>;
};

export const INITIAL_STACK = 1000;

export function createInitialState(): GameState {
  return {
    stage: "WAITING",
    dealer: null,
    deck: [],
    community: [],
    pot: 0,
    players: {
      A: {
        seat: "A",
        connected: false,
        token: null,
        stack: INITIAL_STACK,
        folded: false,
        hole: [],
        ready: false
      },
      B: {
        seat: "B",
        connected: false,
        token: null,
        stack: INITIAL_STACK,
        folded: false,
        hole: [],
        ready: false
      }
    }
  };
}
