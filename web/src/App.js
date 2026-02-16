import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { connectSocket, sendAction } from "./socket";
import { useStore } from "./store";
import { Table } from "./poker-ui/Table";
export default function App() {
    const view = useStore((s) => s.view);
    const setView = useStore((s) => s.setView);
    const [chips, setChips] = useState([]);
    const prevBetRef = useRef(null);
    // 1) socket 连接（hook 必须始终执行）
    useEffect(() => {
        const s = connectSocket();
        s.on("server:event", (evt) => {
            if (evt.type === "VIEW")
                setView(evt.view);
            if (evt.type === "ERROR")
                alert(evt.message);
        });
        return () => {
            s.disconnect();
        };
    }, [setView]);
    // 2) 生成筹码动画（hook 必须始终执行）
    const spawnChipsFromSeat = (seat, count = 6) => {
        if (!view)
            return;
        const potEl = document.getElementById("pot-anchor");
        const stackEl = document.getElementById(seat === view.you.seat ? "chips-you" : "chips-opp");
        if (!potEl || !stackEl)
            return;
        const s = stackEl.getBoundingClientRect();
        const p = potEl.getBoundingClientRect();
        const startX = s.left + s.width / 2;
        const startY = s.top + s.height / 2;
        const endX = p.left + p.width / 2;
        const endY = p.top + p.height / 2;
        const baseDx = endX - startX;
        const baseDy = endY - startY;
        const now = Date.now();
        const newChips = Array.from({ length: count }).map((_, i) => {
            const jitterX = (Math.random() - 0.5) * 20;
            const jitterY = (Math.random() - 0.5) * 20;
            return {
                id: `${now}-${seat}-${i}-${Math.random().toString(16).slice(2)}`,
                x: startX,
                y: startY,
                dx: baseDx + jitterX,
                dy: baseDy + jitterY,
            };
        });
        setChips((prev) => [...prev, ...newChips]);
        window.setTimeout(() => {
            setChips((prev) => prev.filter((c) => !newChips.some((n) => n.id === c.id)));
        }, 520);
    };
    // 3) 监听“对手下注” => 从对手筹码堆飞入 pot（hook 必须始终执行）
    useEffect(() => {
        if (!view)
            return;
        const betting = view.betting;
        if (!betting)
            return;
        const youSeat = view.you.seat;
        if (!youSeat)
            return; // 观战不播（也可以播，你自己改）
        const oppSeat = (youSeat === "A" ? "B" : "A");
        const curr = {
            oppInvested: betting.oppInvested ?? 0,
            yourInvested: betting.yourInvested ?? 0,
        };
        const prev = prevBetRef.current;
        if (prev) {
            const oppDelta = curr.oppInvested - prev.oppInvested;
            if (oppDelta > 0) {
                // 下注越大飞得越多（你可以调）
                const count = Math.min(18, Math.max(4, Math.ceil(oppDelta / 10)));
                spawnChipsFromSeat(oppSeat, count);
            }
        }
        prevBetRef.current = curr;
    }, [view]); // view 每次刷新都会触发对比
    // ✅ 注意：hook 都写完了，才允许 return
    if (!view)
        return _jsx("div", { style: { padding: 24 }, children: "Connecting..." });
    const betting = view.betting;
    const youSeat = view.you.seat;
    const youReady = youSeat ? view.players[youSeat]?.ready : false;
    const act = (action, chipCount = 6) => {
        if (!view.you.seat)
            return;
        if (chipCount > 0)
            spawnChipsFromSeat(view.you.seat, chipCount);
        sendAction(action);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Table, { view: view }), _jsx("div", { style: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }, children: chips.map((c) => (_jsx("div", { className: "chip-fly", style: {
                        left: c.x,
                        top: c.y,
                        transform: `translate(-50%, -50%)`,
                        ["--dx"]: `${c.dx}px`,
                        ["--dy"]: `${c.dy}px`,
                    } }, c.id))) }), _jsxs("div", { style: { maxWidth: 900, margin: "0 auto 30px", display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }, children: [_jsx("button", { onClick: () => {
                            if (!youSeat)
                                return;
                            act({ type: youReady ? "UNREADY" : "READY" }, 0); // READY/UNREADY 都不需要飞筹码
                        }, className: `pbtn ${youReady ? "pbtn-ready" : ""}`, children: youReady ? "READY ✓" : "READY" }), betting?.allowed?.canFold && (_jsx("button", { onClick: () => act({ type: "FOLD" }, 2), className: "pbtn", children: "FOLD" })), betting?.allowed?.canCheck && (_jsx("button", { onClick: () => act({ type: "CHECK" }, 0), className: "pbtn", children: "CHECK" })), betting?.allowed?.canCall && (_jsxs("button", { onClick: () => act({ type: "CALL" }, 7), className: "pbtn", children: ["CALL (", betting.allowed.toCall, ")"] })), betting?.actingSeat === view.you.seat && (_jsx("button", { onClick: () => act({ type: "ALL_IN" }, 20), className: "pbtn", children: "ALL IN" })), (betting?.allowed?.canBet || betting?.allowed?.canRaise) && (_jsxs(_Fragment, { children: [_jsx("input", { id: "amt", defaultValue: betting.allowed.canBet ? betting.allowed.minBet : betting.allowed.minRaiseTo, style: { width: 110, padding: "10px 10px", borderRadius: 10, border: "1px solid #333" } }), betting.allowed.canBet && (_jsx("button", { onClick: () => {
                                    const v = Number(document.getElementById("amt").value);
                                    act({ type: "BET", amount: v }, 10);
                                }, className: "pbtn", children: "BET" })), _jsx("button", { onClick: () => {
                                    const v = Number(document.getElementById("amt").value);
                                    act({ type: "RAISE", amount: v }, 14);
                                }, className: "pbtn", children: "RAISE TO" })] }))] })] }));
}
