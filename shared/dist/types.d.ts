export type Suit = "S" | "H" | "D" | "C";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
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
    hole: Card[];
};
export type HandResult = {
    name: string;
    bestFive: Card[];
    rankValue: number;
};
export type GameView = {
    you: {
        seat: Seat | null;
    };
    stage: Stage;
    players: Record<Seat, PlayerPublic>;
    dealer: Seat | null;
    community: Card[];
    pot: number;
    yourHole: Card[];
    oppHoleMask: ("XX")[];
    showdown?: {
        aHole: Card[];
        bHole: Card[];
        aResult: HandResult;
        bResult: HandResult;
        winner: "A" | "B" | "TIE";
    };
    message?: string;
};
export type ClientHello = {
    type: "HELLO";
    token?: string;
};
export type ServerWelcome = {
    type: "WELCOME";
    token: string;
    seat: Seat | null;
};
export type ClientAction = {
    type: "READY";
} | {
    type: "NEXT";
} | {
    type: "FOLD";
} | {
    type: "CHECK";
} | {
    type: "CALL";
} | {
    type: "BET";
    amount: number;
} | {
    type: "RAISE";
    amount: number;
};
export type ServerEvent = {
    type: "VIEW";
    view: GameView;
} | {
    type: "ERROR";
    message: string;
};
