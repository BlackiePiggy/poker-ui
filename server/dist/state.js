export const INITIAL_STACK = 1000;
export function createInitialState() {
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
