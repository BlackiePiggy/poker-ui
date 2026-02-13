import type { Card, GameView, HandResult, Seat, ServerEvent } from "@poker/shared/dist/types.js";
import { createInitialState, type GameState } from "./state.js";
import { makeDeck, shuffle } from "./utils.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Hand } = require("pokersolver");

// 单房间全局状态
export const state: GameState = createInitialState();

function other(seat: Seat): Seat {
  return seat === "A" ? "B" : "A";
}

function streetIsBetting(stage: string) {
  return stage === "PREFLOP" || stage === "FLOP" || stage === "TURN" || stage === "RIVER";
}

function resetStreetFlags() {
  state.actedThisStreet = { A: false, B: false };
  state.players.A.streetBet = 0;
  state.players.B.streetBet = 0;
  state.players.A.allIn = false;
  state.players.B.allIn = false;
  state.currentBet = 0;
  state.minRaiseTo = 0;
  state.lastAggressor = null;
}

function commitStreetBetsToPot() {
  state.pot += state.players.A.streetBet + state.players.B.streetBet;
  state.players.A.streetBet = 0;
  state.players.B.streetBet = 0;
  state.currentBet = 0;
  state.minRaiseTo = 0;
  state.lastAggressor = null;
  state.actedThisStreet = { A: false, B: false };
}

function postBlinds() {
  // heads-up：dealer=SB
  const sbSeat = state.dealer!;
  const bbSeat = other(sbSeat);

  const sbAmt = Math.min(state.sb, state.players[sbSeat].stack);
  const bbAmt = Math.min(state.bb, state.players[bbSeat].stack);

  state.players[sbSeat].stack -= sbAmt;
  state.players[bbSeat].stack -= bbAmt;

  state.players[sbSeat].streetBet = sbAmt;
  state.players[bbSeat].streetBet = bbAmt;

  state.currentBet = bbAmt;
  // 最小加注到：bb + (bb - sb) 在 HU preflop 也可简化为 bb*2
  state.minRaiseTo = bbAmt + (bbAmt - sbAmt);
  if (state.minRaiseTo < bbAmt * 2) state.minRaiseTo = bbAmt * 2;

  state.actedThisStreet = { A: false, B: false };
  state.lastAggressor = bbSeat; // 大盲视为已“建立当前Bet”
}

function firstToAct(stage: string): Seat {
  // HU 规则：preflop SB先行动；postflop BB先行动
  const sbSeat = state.dealer!;
  const bbSeat = other(sbSeat);
  return stage === "PREFLOP" ? sbSeat : bbSeat;
}

function bettingRoundComplete(): boolean {
  // 若有人弃牌，立即结束整手
  if (state.players.A.folded || state.players.B.folded) return true;

  // 若两人都 all-in，下注轮也结束（后面直接自动 runout）
  if (state.players.A.allIn && state.players.B.allIn) return true;

  // 两人本街投入相等，并且两人都至少行动过一次
  const equal = state.players.A.streetBet === state.players.B.streetBet;
  const acted = state.actedThisStreet.A && state.actedThisStreet.B;
  return equal && acted;
}

function toSolverCard(c: Card): string {
  // 假设你的 Card 形如 "AS" "TD" "7H"（rank + suit）
  const r = c[0];              // A K Q J T 9..2
  const s = c[1].toLowerCase(); // s h d c
  return `${r}${s}`;
}

function fromSolverCard(cardObj: any): Card {
  // pokersolver 的 hand.cards 里通常是对象：{ value: "A", suit: "s" } 之类
  const r = String(cardObj.value).toUpperCase();
  const s = String(cardObj.suit).toUpperCase(); // S H D C
  return `${r}${s}` as Card;
}


// ===== 牌型评估占位：你后面接真实库（输出 bestFive + name + rankValue）=====
function evalHoldem(hole: Card[], community: Card[]): HandResult {
  const all = [...hole, ...community].map(toSolverCard);
  const solved = Hand.solve(all);

  const bestFive: Card[] = (solved.cards ?? []).map(fromSolverCard);

  // 把 solved 挂在结果上，给 compareHands 用（只在 server 内部用）
  return {
    name: solved.descr ?? "Unknown",
    bestFive,
    rankValue: Number(solved.rank ?? 0),
    ...( { __solved: solved } as any )
  } as any;
}

function compareHands(a: HandResult, b: HandResult): "A" | "B" | "TIE" {
  const ha = (a as any).__solved;
  const hb = (b as any).__solved;

  const winners = Hand.winners([ha, hb]);
  if (winners.length === 2) return "TIE";
  return winners[0] === ha ? "A" : "B";
}

// ===== 连接入座逻辑 =====
export function assignSeat(token: string): Seat | null {
  // token 已占 seat：重连
  for (const seat of ["A","B"] as Seat[]) {
    if (state.players[seat].token === token) return seat;
  }
  // 空位分配
  for (const seat of ["A","B"] as Seat[]) {
    if (!state.players[seat].token) {
      state.players[seat].token = token;
      return seat;
    }
  }
  // 满了：第三人
  return null;
}

export function setConnected(seat: Seat | null, connected: boolean) {
  if (!seat) return;
  state.players[seat].connected = connected;
}

// ===== 视角化裁剪：只给自己真实手牌 =====
export function makeView(forSeat: Seat | null): GameView {
  const youHole = forSeat ? state.players[forSeat].hole : [];

  // 1) 先构造基础 view 对象（这里必须是纯 JSON 结构）
  const view: GameView = {
    you: { seat: forSeat },
    stage: state.stage,
    dealer: state.dealer,
    community: state.community,
    pot: state.pot,
    players: {
      A: {
        seat: "A",
        connected: state.players.A.connected,
        stack: state.players.A.stack,
        folded: state.players.A.folded
      },
      B: {
        seat: "B",
        connected: state.players.B.connected,
        stack: state.players.B.stack,
        folded: state.players.B.folded
      }
    },
    yourHole: youHole,
    oppHoleMask: ["XX", "XX"]
  };

  // 2) 再在对象外面计算下注视图，并挂到 view.betting 上
  const acting = state.acting;
  const sb = state.sb;
  const bb = state.bb;

  let yourInvested = 0;
  let oppInvested = 0;
  let toCall = 0;

  const allowed = {
    canFold: false,
    canCheck: false,
    canCall: false,
    canBet: false,
    canRaise: false,
    toCall: 0,
    minBet: bb,
    minRaiseTo: state.minRaiseTo || (state.currentBet * 2),
  };

  if (forSeat && streetIsBetting(state.stage) && acting) {
    yourInvested = state.players[forSeat].streetBet;
    oppInvested = state.players[other(forSeat)].streetBet;
    toCall = Math.max(0, state.currentBet - yourInvested);

    const isYourTurn = acting === forSeat;
    if (isYourTurn) {
      allowed.canFold = toCall > 0;
      allowed.canCheck = toCall === 0;
      allowed.canCall = toCall > 0;
      allowed.canBet = state.currentBet === 0;
      allowed.canRaise = state.currentBet > 0;
      allowed.toCall = toCall;
      allowed.minBet = bb;
      allowed.minRaiseTo = state.minRaiseTo || (state.currentBet * 2);
    }
  }

  // 注意：这里要求 shared/types.ts 里 GameView 已经加了 betting 字段
  (view as any).betting = {
    street: state.stage,
    pot: state.pot,
    currentBet: state.currentBet,
    yourInvested,
    oppInvested,
    actingSeat: acting,
    allowed,
    sb,
    bb,
  };

  // 3) SHOWDOWN 信息（保留你原来的）
  if (state.stage === "SHOWDOWN" && state.players.A.hole.length === 2 && state.players.B.hole.length === 2) {
    const aRes = evalHoldem(state.players.A.hole, state.community);
    const bRes = evalHoldem(state.players.B.hole, state.community);
    const winner = compareHands(aRes, bRes);
    view.showdown = {
      aHole: state.players.A.hole,
      bHole: state.players.B.hole,
      aResult: aRes,
      bResult: bRes,
      winner
    };
  }

  if (state.stage === "WAITING") {
    const readyCount = (state.players.A.ready ? 1 : 0) + (state.players.B.ready ? 1 : 0);
    view.message = `等待两人READY（当前 ${readyCount}/2）`;
  }

  return view;
}

export function broadcast(io: { emit: (event: string, payload: ServerEvent) => void }) {
  io.emit("server:event", { type: "VIEW", view: makeView(null) }); // 给观战/第三人也能看
}

// ===== 发牌/阶段推进 =====
function resetHand() {
  state.deck = shuffle(makeDeck());
  state.community = [];
  state.pot = 0;
  state.players.A.folded = false;
  state.players.B.folded = false;
  state.players.A.hole = [];
  state.players.B.hole = [];
}

function dealHole() {
  state.players.A.hole = [state.deck.pop()!, state.deck.pop()!];
  state.players.B.hole = [state.deck.pop()!, state.deck.pop()!];
}

function dealFlop() {
  state.community.push(state.deck.pop()!, state.deck.pop()!, state.deck.pop()!);
}
function dealTurn() {
  state.community.push(state.deck.pop()!);
}
function dealRiver() {
  state.community.push(state.deck.pop()!);
}

export function tryStartGame() {
  if (state.stage !== "WAITING") return;
  if (!(state.players.A.ready && state.players.B.ready)) return;

  state.dealer = state.dealer ?? "A";

  resetHand();
  resetStreetFlags();
  dealHole();

  state.stage = "PREFLOP";

  // 扣盲注并设置行动者
  postBlinds();
  state.acting = firstToAct("PREFLOP");
}

function settleShowdown() {
  const aRes = evalHoldem(state.players.A.hole, state.community);
  const bRes = evalHoldem(state.players.B.hole, state.community);
  const winner = compareHands(aRes, bRes);

  if (winner === "A") state.players.A.stack += state.pot;
  else if (winner === "B") state.players.B.stack += state.pot;
  else {
    // 平分，奇数筹码给 B（或按按钮位规则，你也可改）
    const half = Math.floor(state.pot / 2);
    state.players.A.stack += half;
    state.players.B.stack += (state.pot - half);
  }

  state.pot = 0;
}

function finishHand() {
  // 一局结束：准备下一局（但不自动开，回到 WAITING）
  state.stage = "WAITING";
  state.acting = null;

  // 按钮轮换
  state.dealer = state.dealer ? other(state.dealer) : "A";

  // 下一局需要两人重新 READY（更清晰）
  state.players.A.ready = false;
  state.players.B.ready = false;

  // 清理牌局，但不要动 stack
  resetHand();
  resetStreetFlags();
}



function advanceStreet() {
  // 把本街投入推入底池
  commitStreetBetsToPot();

  switch (state.stage) {
    case "PREFLOP":
      dealFlop();
      state.stage = "FLOP";
      break;
    case "FLOP":
      dealTurn();
      state.stage = "TURN";
      break;
    case "TURN":
      dealRiver();
      state.stage = "RIVER";
      break;
    case "RIVER":
      state.stage = "SHOWDOWN";
      state.acting = null;
      // ✅ 结算筹码
      settleShowdown();

      return;
  }

  // 新街开始：行动者按规则
  state.acting = firstToAct(state.stage);
  state.actedThisStreet = { A: false, B: false };
  state.currentBet = 0;
  state.minRaiseTo = state.bb; // postflop 最小 bet = bb（简化）
  state.lastAggressor = null;
}

// ===== 客户端动作（MVP）=====
export function handleAction(seat: Seat | null, action: { type: string; [k: string]: any }) {
  if (!seat) return { type: "ERROR", message: "观战者不能操作" } as const;

  if (action.type === "READY") {
    state.players[seat].ready = true;
    // 如果刚才停在 SHOWDOWN，先收尾再等两人 READY
    if (state.stage === "SHOWDOWN") {
        finishHand();
    }
    tryStartGame();
    return null;
  }

  if (!streetIsBetting(state.stage)) {
    return { type: "ERROR", message: "当前不在下注阶段" } as const;
  }

  if (state.acting !== seat) {
    return { type: "ERROR", message: "还没轮到你行动" } as const;
  }

  const me = state.players[seat];
  const opp = state.players[other(seat)];

  const toCall = Math.max(0, state.currentBet - me.streetBet);

  const markActed = () => { state.actedThisStreet[seat] = true; };

  if (action.type === "FOLD") {
    me.folded = true;
    markActed();

    commitStreetBetsToPot();
    opp.stack += state.pot;
    state.pot = 0;

    finishHand(); // ✅ 统一
    return null;
  }

  if (action.type === "CHECK") {
    if (toCall !== 0) return { type: "ERROR", message: "不能Check：需要Call或Fold" } as const;
    markActed();
    state.acting = other(seat);

    if (bettingRoundComplete()) {
      // 两人都 check（或对齐且都行动过）
      advanceStreet();
      // 若 SHOWDOWN 则停
      if (state.stage === "SHOWDOWN") {
        // 结算（暂时用占位评估：先平均分或按 winner）
        // 你后面接真实 evalHoldem 后再改
        // 这里先简单平分底池：
        // （更正确：根据 compareHands 决定）
        return null;
      }
    }
    return null;
  }

  if (action.type === "CALL") {
    if (toCall === 0) return { type: "ERROR", message: "无需Call：可以Check" } as const;

    const pay = Math.min(toCall, me.stack);
    me.stack -= pay;
    me.streetBet += pay;
    if (me.stack === 0) me.allIn = true;

    markActed();
    state.acting = other(seat);

    if (bettingRoundComplete()) {
      // 如果两人都all-in，自动跑到摊牌
      if (state.players.A.allIn && state.players.B.allIn) {
        while (state.stage !== "SHOWDOWN") advanceStreet();
      } else {
        advanceStreet();
      }
    }
    return null;
  }

  if (action.type === "BET") {
    if (state.currentBet !== 0) return { type: "ERROR", message: "当前已有下注：应RAISE或CALL" } as const;

    const amt = Number(action.amount);
    const minBet = state.bb;
    const betTo = Math.max(amt, minBet);
    const pay = Math.min(betTo, me.stack);

    me.stack -= pay;
    me.streetBet += pay;
    if (me.stack === 0) me.allIn = true;

    state.currentBet = me.streetBet;
    state.minRaiseTo = state.currentBet + state.currentBet; // 简化：最小加注到 2x
    state.lastAggressor = seat;

    markActed();
    // 对手需要回应，重置对手 acted 标记（很关键）
    state.actedThisStreet[other(seat)] = false;

    state.acting = other(seat);
    return null;
  }

  if (action.type === "RAISE") {
    if (state.currentBet === 0) return { type: "ERROR", message: "当前无人下注：应BET或CHECK" } as const;

    const raiseTo = Number(action.amount); // “加注到多少”
    const minRaiseTo = state.minRaiseTo || (state.currentBet * 2);

    if (raiseTo < minRaiseTo) {
      return { type: "ERROR", message: `最小加注到 ${minRaiseTo}` } as const;
    }

    // 需要把自己本街投入补到 raiseTo
    const need = raiseTo - me.streetBet;
    const pay = Math.min(need, me.stack);

    me.stack -= pay;
    me.streetBet += pay;
    if (me.stack === 0) me.allIn = true;

    // 如果因为 all-in 导致没达到 raiseTo，这里简化为“加注不足视为call”（严谨规则更复杂）
    state.currentBet = Math.max(state.currentBet, me.streetBet);
    state.minRaiseTo = state.currentBet + (state.currentBet - opp.streetBet); // 简化
    state.lastAggressor = seat;

    markActed();
    state.actedThisStreet[other(seat)] = false;
    state.acting = other(seat);
    return null;
  }

  if (action.type === "ALL_IN") {
    // 直接把剩余 stack 全部投入本街
    const all = me.stack;
    if (all <= 0) return { type: "ERROR", message: "你没有筹码了" } as const;

    me.stack = 0;
    me.streetBet += all;
    me.allIn = true;

    // 现在判断这是：call / bet / raise
    if (state.currentBet === 0) {
        // 等价于 BET 到 me.streetBet
        state.currentBet = me.streetBet;
        state.minRaiseTo = state.currentBet * 2; // 简化
        state.lastAggressor = seat;

        state.actedThisStreet[seat] = true;
        state.actedThisStreet[other(seat)] = false;
        state.acting = other(seat);
        return null;
    } else {
        const prev = state.currentBet;

        if (me.streetBet > prev) {
        // 等价于 RAISE 到 me.streetBet（可能是加注不足的全下）
        state.currentBet = me.streetBet;
        state.minRaiseTo = state.currentBet + (state.currentBet - opp.streetBet); // 简化
        state.lastAggressor = seat;

        state.actedThisStreet[seat] = true;
        state.actedThisStreet[other(seat)] = false;
        state.acting = other(seat);
        return null;
        } else {
        // 等价于 CALL（投入不足也算 all-in call）
        state.actedThisStreet[seat] = true;
        state.acting = other(seat);

        if (bettingRoundComplete()) {
            // 两人 all-in 就自动跑完公共牌到 SHOWDOWN
            if (state.players.A.allIn && state.players.B.allIn) {
            while (state.stage !== "SHOWDOWN") advanceStreet();
            } else {
            advanceStreet();
            }
        }
        return null;
        }
    }
  }


  return { type: "ERROR", message: "未知动作" } as const;
}
