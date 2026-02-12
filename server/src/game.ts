import type { Card, GameView, HandResult, Seat, ServerEvent } from "@poker/shared/dist/types.js";
import { createInitialState, type GameState } from "./state.js";
import { makeDeck, shuffle } from "./utils.js";

// 单房间全局状态
export const state: GameState = createInitialState();

// ===== 牌型评估占位：你后面接真实库（输出 bestFive + name + rankValue）=====
function evalHoldem(_hole: Card[], _community: Card[]): HandResult {
  // MVP：先返回占位，bestFive先随便取（不用于胜负真实判断）
  const all = [..._hole, ..._community];
  return {
    name: "TBD",
    bestFive: all.slice(0, 5),
    rankValue: 0
  };
}

function compareHands(a: HandResult, b: HandResult): "A" | "B" | "TIE" {
  if (a.rankValue > b.rankValue) return "A";
  if (b.rankValue > a.rankValue) return "B";
  return "TIE";
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

  // SHOWDOWN 时公开双方牌 + 最佳五张（占位评估）
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

  // 小提示
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

  // 第一手随便定庄（也可轮换）
  state.dealer = state.dealer ?? "A";
  resetHand();
  dealHole();
  state.stage = "PREFLOP";
}

export function nextStage() {
  switch (state.stage) {
    case "WAITING":
      return;
    case "PREFLOP":
      dealFlop();
      state.stage = "FLOP";
      return;
    case "FLOP":
      dealTurn();
      state.stage = "TURN";
      return;
    case "TURN":
      dealRiver();
      state.stage = "RIVER";
      return;
    case "RIVER":
      state.stage = "SHOWDOWN";
      return;
    case "SHOWDOWN":
      // 下一手：轮换庄家
      state.dealer = state.dealer === "A" ? "B" : "A";
      resetHand();
      dealHole();
      state.stage = "PREFLOP";
      return;
  }
}

// ===== 客户端动作（MVP）=====
export function handleAction(seat: Seat | null, action: { type: string; [k: string]: any }) {
  if (!seat) return { type: "ERROR", message: "观战者不能操作" } as const;

  if (action.type === "READY") {
    state.players[seat].ready = true;
    tryStartGame();
    return null;
  }

  if (action.type === "NEXT") {
    // MVP：任何入座者都可点 NEXT 推进阶段（你后面可改为下注轮结束自动推进）
    if (state.stage === "WAITING") return { type: "ERROR", message: "游戏未开始" } as const;
    nextStage();
    return null;
  }

  // TODO：下注动作校验入口（你后面加）
  if (["FOLD","CHECK","CALL","BET","RAISE"].includes(action.type)) {
    return { type: "ERROR", message: "下注系统未启用：当前用 NEXT 演示阶段推进" } as const;
  }

  return { type: "ERROR", message: "未知动作" } as const;
}
