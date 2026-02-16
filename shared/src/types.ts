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
  ready: boolean;
};

export type AllowedActions = {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;

  toCall: number;      // 需要跟注多少（0 表示可 check）
  minBet: number;      // 最小 bet
  minRaiseTo: number;  // 最小加注到多少（raise-to）
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

  betting: {
    street: Stage;          // PREFLOP/FLOP/TURN/RIVER
    pot: number;            // 你已有 pot 也可保留一个，这里统一用 view.pot
    currentBet: number;     // 本街最高投入（raise-to）
    yourInvested: number;   // 你本街已投入
    oppInvested: number;    // 对手本街已投入
    actingSeat: Seat | null;// 轮到谁
    allowed: AllowedActions;// 你能按哪些按钮
    sb: number;
    bb: number;
  };
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
  | { type: "RESTART_HAND" } // ✅ 新增：重新开始一把（筹码不变）
  | { type: "NEXT" } // MVP：手动推进阶段（你可以换成服务器自动）
  | { type: "FOLD" }
  | { type: "CHECK" }
  | { type: "CALL" }
  | { type: "BET"; amount: number }
  | { type: "RAISE"; amount: number };

export type ServerEvent =
  | { type: "VIEW"; view: GameView }
  | { type: "ERROR"; message: string };
