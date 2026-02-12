export type Suit = "S" | "H" | "D" | "C"; // spade/heart/diamond/club
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";

export type Card = `${Rank}${Suit}`;

export type Seat = "A" | "B";

export type Stage = "WAITING" | "PREFLOP" | "FLOP" | "TURN" | "RIVER" | "SHOWDOWN";

export type PlayerPublic = {
  seat: Seat;
  connected: boolean;
  stack: number;
  folded: boolean;
};

export type PlayerPrivate = {
  hole: Card[]; // 2
};

export type HandResult = {
  // 这里先做接口占位：你后面接真正牌型库
  name: string;         // e.g. "One Pair"
  bestFive: Card[];     // 最佳5张用于高亮
  rankValue: number;    // 比较用，越大越强（占位）
};

export type GameView = {
  you: { seat: Seat | null };
  stage: Stage;

  players: Record<Seat, PlayerPublic>;
  dealer: Seat | null;

  community: Card[];
  pot: number;

  // 只给自己看到自己的手牌；对手永远是 "XX"
  yourHole: Card[];             // 实牌
  oppHoleMask: ("XX")[];        // 永远两个 XX

  // 到摊牌才会公开双方（可选）
  showdown?: {
    aHole: Card[];
    bHole: Card[];
    aResult: HandResult;
    bResult: HandResult;
    winner: "A" | "B" | "TIE";
  };

  // UI 需要：行动提示/倒计时等可以后加
  message?: string;
};

export type ClientHello = {
  type: "HELLO";
  token?: string; // localStorage token for reconnect
};

export type ServerWelcome = {
  type: "WELCOME";
  token: string;
  seat: Seat | null; // null = 观战/第三人
};

export type ClientAction =
  | { type: "READY" }
  | { type: "NEXT" } // MVP：手动推进阶段（你可以换成服务器自动）
  | { type: "FOLD" }
  | { type: "CHECK" }
  | { type: "CALL" }
  | { type: "BET"; amount: number }
  | { type: "RAISE"; amount: number };

export type ServerEvent =
  | { type: "VIEW"; view: GameView }
  | { type: "ERROR"; message: string };
