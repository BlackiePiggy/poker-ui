import type { Card, Seat, Stage } from "@poker/shared/dist/types.js";

export type PlayerState = {
  seat: Seat;
  connected: boolean;
  token: string | null;
  stack: number;
  folded: boolean;
  hole: Card[];
  ready: boolean;

  // 👇 新增
  streetBet: number; // 本街投入
  allIn: boolean;
};

export type GameState = {
  stage: Stage;
  dealer: Seat | null;

  deck: Card[];
  community: Card[];
  pot: number;

  players: Record<Seat, PlayerState>;

  // 👇 新增下注系统字段
  sb: number;
  bb: number;

  currentBet: number;
  minRaiseTo: number;

  acting: Seat | null;
  lastAggressor: Seat | null;

  actedThisStreet: Record<Seat, boolean>;
  lastRaiseSize: number;
};


export const INITIAL_STACK = 1000;

export function createInitialState(): GameState {
  return {
    stage: "WAITING",
    dealer: null,
    deck: [],
    community: [],
    pot: 0,

    // 👇 新增
    sb: 5,
    bb: 10,
    currentBet: 0,
    minRaiseTo: 0,
    acting: null,
    lastAggressor: null,
    actedThisStreet: { A: false, B: false },
    lastRaiseSize: 0,

    players: {
        A: {
        seat: "A",
        connected: false,
        token: null,
        stack: INITIAL_STACK,
        folded: false,
        hole: [],
        ready: false,
        streetBet: 0,
        allIn: false
        },
        B: {
        seat: "B",
        connected: false,
        token: null,
        stack: INITIAL_STACK,
        folded: false,
        hole: [],
        ready: false,
        streetBet: 0,
        allIn: false
        }
    }
  };
}
