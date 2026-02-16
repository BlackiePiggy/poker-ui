import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "./Card";
import { sendAction } from "../socket";
export function Table({ view }) {
    const showdown = view.showdown;
    const betting = view.betting;
    // 高亮：示例仍然高亮胜者 bestFive（你可改成双方都高亮）
    const bestSet = new Set();
    if (showdown) {
        const winnerRes = showdown.winner === "A"
            ? showdown.aResult
            : showdown.winner === "B"
                ? showdown.bResult
                : showdown.aResult;
        for (const c of winnerRes.bestFive)
            bestSet.add(c);
    }
    const youSeat = view.you.seat;
    const oppSeat = (youSeat === "A" ? "B" : "A");
    return (_jsx("div", { style: { maxWidth: 980, margin: "24px auto", padding: "0 12px" }, children: _jsxs("div", { style: {
                position: "relative",
                width: "100%",
                height: 620,
                borderRadius: 28,
                overflow: "hidden",
                boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
                background: `
            radial-gradient(ellipse at center, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%),
            radial-gradient(ellipse at center, #0b7a4a 0%, #075a38 55%, #06462c 100%)
          `,
            }, children: [_jsx("div", { style: {
                        position: "absolute",
                        inset: 18,
                        borderRadius: 999,
                        border: "14px solid rgba(40, 24, 10, 0.92)",
                        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
                        pointerEvents: "none",
                    } }), _jsx("div", { style: {
                        position: "absolute",
                        inset: 42,
                        borderRadius: 999,
                        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
                        pointerEvents: "none",
                    } }), _jsxs("div", { style: {
                        position: "absolute",
                        top: 140,
                        right: 28,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        pointerEvents: "none",
                    }, children: [_jsx("div", { id: "chips-opp", className: "chip-stack-grid", children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "chip-stack" }, i))) }), _jsxs("div", { className: "stack-info", children: [_jsxs("div", { children: ["Stack: ", view.players[oppSeat].stack] }), _jsxs("div", { children: ["In: ", betting?.oppInvested ?? 0] })] })] }), _jsxs("div", { style: {
                        position: "absolute",
                        bottom: 120,
                        left: 28,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        pointerEvents: "none",
                    }, children: [_jsx("div", { id: "chips-you", className: "chip-stack-grid", children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "chip-stack" }, i))) }), _jsxs("div", { className: "stack-info", children: [_jsxs("div", { children: ["Stack: ", youSeat ? view.players[youSeat].stack : "-"] }), _jsxs("div", { children: ["In: ", betting?.yourInvested ?? 0] }), betting && betting.actingSeat === youSeat && (_jsxs("div", { style: { marginTop: 4, opacity: 0.95 }, children: ["To Call: ", betting.allowed?.toCall ?? 0, " / Bet: ", betting.currentBet] }))] })] }), _jsxs("div", { style: {
                        position: "absolute",
                        top: 14,
                        left: 18,
                        right: 18,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "#fff",
                        textShadow: "0 2px 8px rgba(0,0,0,0.35)",
                        pointerEvents: "none",
                    }, children: [_jsx("div", { style: { fontWeight: 900, letterSpacing: 0.3 }, children: "Heads-Up \u5FB7\u5DDE\uFF08\u5355\u623F\u95F4\uFF09" }), _jsxs("div", { style: { opacity: 0.95, display: "flex", gap: 10, alignItems: "center" }, children: [_jsxs("div", { children: ["Stage: ", _jsx("b", { children: view.stage })] }), view.you.seat && (_jsx("button", { style: {
                                        pointerEvents: "auto", // ✅ 必须，否则点不到（因为父级是 none）
                                        padding: "6px 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(255,255,255,0.25)",
                                        background: "rgba(0,0,0,0.35)",
                                        color: "#fff",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                    }, onClick: () => sendAction({ type: "RESTART_HAND" }), children: "\u91CD\u65B0\u5F00\u59CB" }))] })] }), view.message && (_jsx("div", { style: {
                        position: "absolute",
                        top: 46,
                        left: 18,
                        right: 18,
                        textAlign: "center",
                        color: "rgba(255,255,255,0.92)",
                        fontSize: 14,
                        textShadow: "0 2px 8px rgba(0,0,0,0.35)",
                        pointerEvents: "none",
                    }, children: view.message })), _jsxs(Zone, { label: `对手区（Seat ${oppSeat}）`, style: {
                        position: "absolute",
                        left: "30%",
                        right: "30%",
                        top: 90,
                        height: 120,
                    }, children: [_jsxs("div", { style: { position: "absolute", left: 16, top: 14, color: "#fff" }, children: [_jsx("div", { style: { fontWeight: 800 }, children: "Opponent" }), _jsxs("div", { style: { fontSize: 13, opacity: 0.9 }, children: ["A: ", view.players.A.connected ? "在线" : "离线", " | B:", " ", view.players.B.connected ? "在线" : "离线"] })] }), _jsxs("div", { style: {
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                justifyContent: "center",
                            }, children: [_jsx(Card, { value: "XX" }), _jsx(Card, { value: "XX" })] })] }), _jsxs(Zone, { label: "\u516C\u5171\u724C\u533A\uFF08Board\uFF09", style: {
                        position: "absolute",
                        left: "8%",
                        right: "8%",
                        top: 220,
                        height: 180,
                    }, children: [_jsx("div", { style: {
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                display: "flex",
                                gap: 14,
                                alignItems: "center",
                                justifyContent: "center",
                            }, children: Array.from({ length: 5 }).map((_, i) => {
                                const c = view.community[i];
                                const v = c ?? "XX";
                                const highlight = c ? bestSet.has(c) : false;
                                return _jsx(Card, { value: v, highlight: highlight }, i);
                            }) }), _jsxs("div", { id: "pot-anchor", style: {
                                position: "absolute",
                                top: 12,
                                left: "50%",
                                transform: "translateX(-50%)",
                                color: "#fff",
                                fontWeight: 900,
                                letterSpacing: 0.3,
                            }, children: ["Pot: ", view.pot] })] }), _jsxs(Zone, { label: `自己区（Seat ${youSeat ?? "观战"}）`, style: {
                        position: "absolute",
                        left: "30%",
                        right: "30%",
                        bottom: 80,
                        height: 120,
                    }, children: [_jsxs("div", { style: { position: "absolute", left: 16, top: 14, color: "#fff" }, children: [_jsx("div", { style: { fontWeight: 800 }, children: "You" }), _jsxs("div", { style: { fontSize: 13, opacity: 0.9 }, children: ["Dealer: ", view.dealer ?? "-"] })] }), _jsx("div", { style: {
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                justifyContent: "center",
                            }, children: view.yourHole.map((c, idx) => (_jsx(Card, { value: c, highlight: bestSet.has(c) }, idx))) })] }), showdown && (_jsxs("div", { style: {
                        position: "absolute",
                        right: 18,
                        bottom: 18,
                        width: 200,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(0,0,0,0.35)",
                        color: "#fff",
                        backdropFilter: "blur(6px)",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                    }, children: [_jsx("div", { style: { fontWeight: 900 }, children: "\u644A\u724C\u7ED3\u679C" }), _jsxs("div", { style: { marginTop: 6, fontSize: 13, opacity: 0.95 }, children: ["A: ", showdown.aResult.name, " ", _jsx("br", {}), "B: ", showdown.bResult.name, " ", _jsx("br", {}), "Winner: ", _jsx("b", { children: showdown.winner })] })] }))] }) }));
}
function Zone({ label, style, children, }) {
    return (_jsxs("div", { style: style, children: [_jsx("div", { style: {
                    position: "absolute",
                    inset: 0,
                    borderRadius: 18,
                    border: "2px dashed rgba(255,255,255,0.35)",
                    background: "rgba(0,0,0,0.08)",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
                    pointerEvents: "none",
                } }), _jsx("div", { style: {
                    position: "absolute",
                    top: -10,
                    left: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.45)",
                    color: "rgba(255,255,255,0.92)",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    pointerEvents: "none",
                }, children: label }), _jsx("div", { style: { position: "relative", height: "100%", padding: 0 }, children: children })] }));
}
