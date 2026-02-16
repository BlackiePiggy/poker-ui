import { createInitialState } from "./state.js";
import { makeDeck, shuffle } from "./utils.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Hand } = require("pokersolver");
// 单房间全局状态
export const state = createInitialState();
function other(seat) {
    return seat === "A" ? "B" : "A";
}
function streetIsBetting(stage) {
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
    state.lastRaiseSize = 0; // ✅ 添加
}
function commitStreetBetsToPot() {
    state.pot += state.players.A.streetBet + state.players.B.streetBet;
    state.players.A.streetBet = 0;
    state.players.B.streetBet = 0;
    state.currentBet = 0;
    state.minRaiseTo = 0;
    state.lastAggressor = null;
    state.lastRaiseSize = 0; // ✅ 添加
    state.actedThisStreet = { A: false, B: false };
}
function postBlinds() {
    // heads-up：dealer=SB
    const sbSeat = state.dealer;
    const bbSeat = other(sbSeat);
    const sbAmt = Math.min(state.sb, state.players[sbSeat].stack);
    const bbAmt = Math.min(state.bb, state.players[bbSeat].stack);
    state.players[sbSeat].stack -= sbAmt;
    state.players[bbSeat].stack -= bbAmt;
    state.players[sbSeat].streetBet = sbAmt;
    state.players[bbSeat].streetBet = bbAmt;
    // ✅ 修复：处理筹码不足的情况
    if (sbAmt === 0 || bbAmt === 0) {
        // 有人无法支付盲注，直接全下
        state.players[sbSeat].allIn = sbAmt > 0 && state.players[sbSeat].stack === 0;
        state.players[bbSeat].allIn = bbAmt > 0 && state.players[bbSeat].stack === 0;
    }
    state.currentBet = bbAmt;
    // ✅ 修复：minRaiseTo 应该基于实际的加注差额
    state.lastRaiseSize = bbAmt - sbAmt;
    state.minRaiseTo = bbAmt + state.lastRaiseSize; // bb + (bb - sb)
    state.actedThisStreet = { A: false, B: false };
    state.lastAggressor = bbSeat; // 大盲视为已"建立当前Bet"
}
function firstToAct(stage) {
    // HU 规则：preflop SB先行动；postflop BB先行动
    const sbSeat = state.dealer;
    const bbSeat = other(sbSeat);
    return stage === "PREFLOP" ? sbSeat : bbSeat;
}
function bettingRoundComplete() {
    // 若有人弃牌，立即结束整手
    if (state.players.A.folded || state.players.B.folded)
        return true;
    // 若两人都 all-in，下注轮也结束（后面直接自动 runout）
    if (state.players.A.allIn && state.players.B.allIn)
        return true;
    // ✅ 添加：单人 all-in 且对手已匹配投入
    if (state.players.A.allIn || state.players.B.allIn) {
        const equal = state.players.A.streetBet === state.players.B.streetBet;
        const bothActed = state.actedThisStreet.A && state.actedThisStreet.B;
        if (equal && bothActed)
            return true;
    }
    // 两人本街投入相等，并且两人都至少行动过一次
    const equal = state.players.A.streetBet === state.players.B.streetBet;
    const acted = state.actedThisStreet.A && state.actedThisStreet.B;
    return equal && acted;
}
function toSolverCard(c) {
    // 假设你的 Card 形如 "AS" "TD" "7H"（rank + suit）
    const r = c[0]; // A K Q J T 9..2
    const s = c[1].toLowerCase(); // s h d c
    return `${r}${s}`;
}
function fromSolverCard(cardObj) {
    // pokersolver 的 hand.cards 里通常是对象：{ value: "A", suit: "s" } 之类
    const r = String(cardObj.value).toUpperCase();
    const s = String(cardObj.suit).toUpperCase(); // S H D C
    return `${r}${s}`;
}
// ===== 牌型评估占位：你后面接真实库（输出 bestFive + name + rankValue）=====
function evalHoldem(hole, community) {
    const all = [...hole, ...community].map(toSolverCard);
    const solved = Hand.solve(all);
    const bestFive = (solved.cards ?? []).map(fromSolverCard);
    return {
        name: solved.descr ?? "Unknown",
        bestFive,
        rankValue: Number(solved.rank ?? 0),
    };
}
function compareHands(a, b) {
    if (a.rankValue > b.rankValue)
        return "A";
    if (b.rankValue > a.rankValue)
        return "B";
    return "TIE";
}
// ===== 连接入座逻辑 =====
export function assignSeat(token) {
    // token 已占 seat：重连
    for (const seat of ["A", "B"]) {
        if (state.players[seat].token === token)
            return seat;
    }
    // 空位分配
    for (const seat of ["A", "B"]) {
        if (!state.players[seat].token) {
            state.players[seat].token = token;
            return seat;
        }
    }
    // 满了：第三人
    return null;
}
export function setConnected(seat, connected) {
    if (!seat)
        return;
    state.players[seat].connected = connected;
}
// ===== 视角化裁剪：只给自己真实手牌 =====
export function makeView(forSeat) {
    const youHole = forSeat ? state.players[forSeat].hole : [];
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
    // 先构造除 betting 外的字段
    const view = {
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
                folded: state.players.A.folded,
                ready: state.players.A.ready,
            },
            B: {
                seat: "B",
                connected: state.players.B.connected,
                stack: state.players.B.stack,
                folded: state.players.B.folded,
                ready: state.players.B.ready,
            },
        },
        yourHole: youHole,
        oppHoleMask: ["XX", "XX"],
    };
    // SHOWDOWN 信息（保留你原来的）
    if (state.stage === "SHOWDOWN" &&
        state.players.A.hole.length === 2 &&
        state.players.B.hole.length === 2) {
        const aRes = evalHoldem(state.players.A.hole, state.community);
        const bRes = evalHoldem(state.players.B.hole, state.community);
        const winner = compareHands(aRes, bRes);
        view.showdown = {
            aHole: state.players.A.hole,
            bHole: state.players.B.hole,
            aResult: aRes,
            bResult: bRes,
            winner,
        };
    }
    if (state.stage === "WAITING") {
        const readyCount = (state.players.A.ready ? 1 : 0) + (state.players.B.ready ? 1 : 0);
        view.message = `等待两人READY（当前 ${readyCount}/2）`;
    }
    // 最后一次性返回完整 GameView（补上 betting）
    return {
        ...view,
        betting: {
            street: state.stage,
            pot: state.pot,
            currentBet: state.currentBet,
            yourInvested,
            oppInvested,
            actingSeat: acting,
            allowed,
            sb,
            bb,
        },
    };
}
export function broadcast(io) {
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
    state.players.A.hole = [state.deck.pop(), state.deck.pop()];
    state.players.B.hole = [state.deck.pop(), state.deck.pop()];
}
function dealFlop() {
    state.community.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
}
function dealTurn() {
    state.community.push(state.deck.pop());
}
function dealRiver() {
    state.community.push(state.deck.pop());
}
export function tryStartGame() {
    if (state.stage !== "WAITING")
        return;
    if (!(state.players.A.ready && state.players.B.ready))
        return;
    state.dealer = state.dealer ?? "A";
    resetHand();
    resetStreetFlags();
    dealHole();
    state.stage = "PREFLOP";
    state.players.A.ready = false;
    state.players.B.ready = false;
    // 扣盲注并设置行动者
    postBlinds();
    state.acting = firstToAct("PREFLOP");
}
function settleShowdown() {
    const aRes = evalHoldem(state.players.A.hole, state.community);
    const bRes = evalHoldem(state.players.B.hole, state.community);
    const winner = compareHands(aRes, bRes);
    // ✅ 修复：平分底池时奇数筹码给 BB（dealer 的对手）
    if (winner === "A") {
        state.players.A.stack += state.pot;
    }
    else if (winner === "B") {
        state.players.B.stack += state.pot;
    }
    else {
        // 平分，奇数筹码给 BB（非 dealer 位）
        const bbSeat = other(state.dealer);
        const half = Math.floor(state.pot / 2);
        const odd = state.pot - half * 2;
        state.players.A.stack += (state.dealer === "A" ? half : half + odd);
        state.players.B.stack += (state.dealer === "B" ? half : half + odd);
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
            settleShowdown();
            // ✅ 不立即调用 finishHand()，让玩家看到结果后通过 READY 触发
            return;
    }
    // 新街开始：行动者按规则
    state.acting = firstToAct(state.stage);
    state.actedThisStreet = { A: false, B: false };
    state.currentBet = 0;
    state.minRaiseTo = state.bb; // postflop 最小 bet = bb（简化）
    state.lastAggressor = null;
    state.lastRaiseSize = 0; // ✅ 添加
}
// ===== 客户端动作（MVP）=====
export function handleAction(seat, action) {
    if (!seat)
        return { type: "ERROR", message: "观战者不能操作" };
    // ✅ 先处理 READY / UNREADY（不受下注阶段限制）
    if (action.type === "READY") {
        // 如果还停在上一局 SHOWDOWN，先收尾（会重置 ready）
        if (state.stage === "SHOWDOWN") {
            finishHand();
        }
        // 本次点击作为"下一局准备"
        state.players[seat].ready = true;
        tryStartGame();
        return null;
    }
    if (action.type === "UNREADY") {
        if (state.stage !== "WAITING") {
            return { type: "ERROR", message: "已经开局，不能取消READY" };
        }
        state.players[seat].ready = false;
        return null;
    }
    // ✅ 再处理下注动作（这些才需要下注阶段校验）
    if (!streetIsBetting(state.stage)) {
        return { type: "ERROR", message: "当前不在下注阶段" };
    }
    if (state.acting !== seat) {
        return { type: "ERROR", message: "还没轮到你行动" };
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
        finishHand();
        return null;
    }
    if (action.type === "CHECK") {
        if (toCall !== 0)
            return { type: "ERROR", message: "不能Check：需要Call或Fold" };
        markActed();
        state.acting = other(seat);
        if (bettingRoundComplete()) {
            advanceStreet();
        }
        return null;
    }
    if (action.type === "CALL") {
        if (toCall === 0)
            return { type: "ERROR", message: "无需Call：可以Check" };
        const pay = Math.min(toCall, me.stack);
        me.stack -= pay;
        me.streetBet += pay;
        if (me.stack === 0)
            me.allIn = true;
        markActed();
        state.acting = other(seat);
        if (bettingRoundComplete()) {
            // 如果两人都all-in，自动跑到摊牌
            if (state.players.A.allIn && state.players.B.allIn) {
                while (state.stage !== "SHOWDOWN") {
                    advanceStreet();
                }
            }
            else {
                advanceStreet();
            }
        }
        return null;
    }
    if (action.type === "BET") {
        if (state.currentBet !== 0)
            return { type: "ERROR", message: "当前已有下注：应RAISE或CALL" };
        const amt = Number(action.amount);
        const minBet = state.bb;
        const betTo = Math.max(amt, minBet);
        const pay = Math.min(betTo, me.stack);
        me.stack -= pay;
        me.streetBet += pay;
        if (me.stack === 0)
            me.allIn = true;
        const prevBet = state.currentBet; // 之前是 0
        state.currentBet = me.streetBet;
        // ✅ 修复：记录加注大小
        state.lastRaiseSize = state.currentBet - prevBet;
        state.minRaiseTo = state.currentBet + state.lastRaiseSize;
        state.lastAggressor = seat;
        markActed();
        // 对手需要回应，重置对手 acted 标记（很关键）
        state.actedThisStreet[other(seat)] = false;
        state.acting = other(seat);
        return null;
    }
    if (action.type === "RAISE") {
        if (state.currentBet === 0)
            return { type: "ERROR", message: "当前无人下注：应BET或CHECK" };
        const raiseTo = Number(action.amount); // "加注到多少"
        const minRaiseTo = state.minRaiseTo || (state.currentBet + state.bb);
        if (raiseTo < minRaiseTo) {
            return { type: "ERROR", message: `最小加注到 ${minRaiseTo}` };
        }
        // 需要把自己本街投入补到 raiseTo
        const need = raiseTo - me.streetBet;
        const pay = Math.min(need, me.stack);
        me.stack -= pay;
        me.streetBet += pay;
        if (me.stack === 0)
            me.allIn = true;
        const prevBet = state.currentBet;
        state.currentBet = Math.max(state.currentBet, me.streetBet);
        // ✅ 修复：正确计算加注大小和下次最小加注
        if (me.streetBet >= minRaiseTo) {
            // 完整加注
            state.lastRaiseSize = state.currentBet - prevBet;
            state.minRaiseTo = state.currentBet + state.lastRaiseSize;
            state.lastAggressor = seat;
        }
        else {
            // 加注不足（all-in 但未达到 minRaiseTo）
            // minRaiseTo 保持不变，对手可以继续加注
        }
        markActed();
        state.actedThisStreet[other(seat)] = false;
        state.acting = other(seat);
        return null;
    }
    if (action.type === "ALL_IN") {
        // 直接把剩余 stack 全部投入本街
        const all = me.stack;
        if (all <= 0)
            return { type: "ERROR", message: "你没有筹码了" };
        me.stack = 0;
        me.streetBet += all;
        me.allIn = true;
        // 现在判断这是：call / bet / raise
        if (state.currentBet === 0) {
            // 等价于 BET 到 me.streetBet
            const prevBet = state.currentBet;
            state.currentBet = me.streetBet;
            state.lastRaiseSize = state.currentBet - prevBet;
            state.minRaiseTo = state.currentBet + state.lastRaiseSize;
            state.lastAggressor = seat;
            state.actedThisStreet[seat] = true;
            state.actedThisStreet[other(seat)] = false;
            state.acting = other(seat);
            return null;
        }
        else {
            const prevBet = state.currentBet;
            const minRaiseTo = state.minRaiseTo || (state.currentBet + state.bb);
            if (me.streetBet >= minRaiseTo) {
                // ✅ 完整加注（全下金额达到最小加注）
                state.currentBet = me.streetBet;
                state.lastRaiseSize = state.currentBet - prevBet;
                state.minRaiseTo = state.currentBet + state.lastRaiseSize;
                state.lastAggressor = seat;
                state.actedThisStreet[seat] = true;
                state.actedThisStreet[other(seat)] = false;
                state.acting = other(seat);
                return null;
            }
            else if (me.streetBet > prevBet) {
                // ✅ 加注不足（全下但未达到 minRaiseTo）
                state.currentBet = me.streetBet;
                // minRaiseTo 保持不变，对手仍可以按原规则加注
                // 不更新 lastAggressor
                state.actedThisStreet[seat] = true;
                state.actedThisStreet[other(seat)] = false;
                state.acting = other(seat);
                return null;
            }
            else {
                // ✅ 等价于 CALL（投入不足也算 all-in call）
                state.actedThisStreet[seat] = true;
                state.acting = other(seat);
                if (bettingRoundComplete()) {
                    // 两人 all-in 就自动跑完公共牌到 SHOWDOWN
                    if (state.players.A.allIn && state.players.B.allIn) {
                        while (state.stage !== "SHOWDOWN") {
                            advanceStreet();
                        }
                    }
                    else {
                        advanceStreet();
                    }
                }
                return null;
            }
        }
    }
    return { type: "ERROR", message: "未知动作" };
}
