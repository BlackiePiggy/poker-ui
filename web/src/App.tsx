import React, { useEffect, useState } from "react";
import { connectSocket, sendAction, type ServerEvent } from "./socket";
import { useStore } from "./store";
import { Table } from "./poker-ui/Table";

export default function App() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  type ChipAnim = { id: string; x: number; y: number; dx: number; dy: number };
  const [chips, setChips] = useState<ChipAnim[]>([]);

  useEffect(() => {
    const s = connectSocket();
    s.on("server:event", (evt: ServerEvent) => {
      if (evt.type === "VIEW") setView(evt.view);
      if (evt.type === "ERROR") alert(evt.message);
    });
    return () => { s.disconnect(); };
  }, [setView]);

  if (!view) return <div style={{ padding: 24 }}>Connecting...</div>;
    const betting = view.betting;

    function spawnChipsFromButton(btnEl: HTMLElement, count = 6) {
        const potEl = document.getElementById("pot-anchor");
        if (!potEl) return;

        const b = btnEl.getBoundingClientRect();
        const p = potEl.getBoundingClientRect();

        const startX = b.left + b.width / 2;
        const startY = b.top + b.height / 2;

        const endX = p.left + p.width / 2;
        const endY = p.top + p.height / 2;

        const baseDx = endX - startX;
        const baseDy = endY - startY;

        const now = Date.now();

        const newChips: ChipAnim[] = Array.from({ length: count }).map((_, i) => {
            // 让筹码有一点散射感
            const jitterX = (Math.random() - 0.5) * 18;
            const jitterY = (Math.random() - 0.5) * 18;
            return {
            id: `${now}-${i}-${Math.random().toString(16).slice(2)}`,
            x: startX,
            y: startY,
            dx: baseDx + jitterX,
            dy: baseDy + jitterY,
            };
        });

        setChips((prev) => [...prev, ...newChips]);

        // 动画结束后清理
        window.setTimeout(() => {
            setChips((prev) => prev.filter((c) => !newChips.some((n) => n.id === c.id)));
        }, 520);
    }

    function act(
        e: React.MouseEvent<HTMLButtonElement>,
        action: any,
        chipCount = 6
    ) {
        if (chipCount > 0) {
            spawnChipsFromButton(e.currentTarget, chipCount);
        }
        sendAction(action);
    }


    return (
    <>
        <Table view={view} />
        {/* 筹码飞行动画层（覆盖全屏，不挡点击） */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
        {chips.map((c) => (
            <div
            key={c.id}
            className="chip-fly"
            style={{
                left: c.x,
                top: c.y,
                transform: `translate(-50%, -50%)`,
                // 通过 CSS 变量传位移
                ["--dx" as any]: `${c.dx}px`,
                ["--dy" as any]: `${c.dy}px`,
            }}
            />
        ))}
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto 30px", display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
            
        <button
            onClick={(e) => act(e, { type: "READY" }, 3)}
            className="pbtn"
        >
            READY
        </button>

        {betting?.allowed?.canFold && (
            <button
                onClick={(e) => act(e, { type: "FOLD" }, 2)}
                className="pbtn"
            >
                FOLD
            </button>
        )}

        {betting?.allowed?.canCheck && (
            <button
                onClick={(e) => act(e, { type: "CHECK" }, 0)}
                className="pbtn"
            >
                CHECK
            </button>
        )}

        {betting?.allowed?.canCall && (
            <button 
            onClick={(e) => act(e, { type: "CALL" }, 7)} 
            className="pbtn"
            >
            CALL ({betting.allowed.toCall})
            </button>
        )}

        {betting?.actingSeat === view.you.seat && (
            <button
                onClick={(e) => act(e, { type: "ALL_IN" }, 20)}
                className="pbtn"
            >
                ALL IN
            </button>
        )}

        {(betting?.allowed?.canBet || betting?.allowed?.canRaise) && (
            <>
            <input
                id="amt"
                defaultValue={betting.allowed.canBet ? betting.allowed.minBet : betting.allowed.minRaiseTo}
                style={{ width: 110, padding: "10px 10px", borderRadius: 10, border: "1px solid #333" }}
            />
            {betting.allowed.canBet && (
                <button
                    onClick={(e) => {
                        const v = Number((document.getElementById("amt") as HTMLInputElement).value);
                        act(e, { type: "BET", amount: v }, 10);
                    }}
                    className="pbtn"
                >
                    BET
                </button>
            )}
            {betting.allowed.canRaise && (
                <button
                    onClick={(e) => {
                        const v = Number((document.getElementById("amt") as HTMLInputElement).value);
                        act(e, { type: "RAISE", amount: v }, 14);
                    }}
                    className="pbtn"
                >
                    RAISE TO
                </button>
            )}
            </>
        )}
        </div>
    </>
    );
}
