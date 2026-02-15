import React, { useEffect, useRef, useState } from "react";
import { connectSocket, sendAction, type ServerEvent } from "./socket";
import { useStore } from "./store";
import { Table } from "./poker-ui/Table";

type ChipAnim = { id: string; x: number; y: number; dx: number; dy: number };

export default function App() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  const [chips, setChips] = useState<ChipAnim[]>([]);
  const prevBetRef = useRef<{ oppInvested: number; yourInvested: number } | null>(null);

  // 1) socket 连接（hook 必须始终执行）
  useEffect(() => {
    const s = connectSocket();
    s.on("server:event", (evt: ServerEvent) => {
      if (evt.type === "VIEW") setView(evt.view);
      if (evt.type === "ERROR") alert(evt.message);
    });
    return () => {
      s.disconnect();
    };
  }, [setView]);

  // 2) 生成筹码动画（hook 必须始终执行）
  const spawnChipsFromSeat = (seat: "A" | "B", count = 6) => {
    if (!view) return;

    const potEl = document.getElementById("pot-anchor");
    const stackEl = document.getElementById(
      seat === view.you.seat ? "chips-you" : "chips-opp"
    );

    if (!potEl || !stackEl) return;

    const s = stackEl.getBoundingClientRect();
    const p = potEl.getBoundingClientRect();

    const startX = s.left + s.width / 2;
    const startY = s.top + s.height / 2;

    const endX = p.left + p.width / 2;
    const endY = p.top + p.height / 2;

    const baseDx = endX - startX;
    const baseDy = endY - startY;

    const now = Date.now();
    const newChips: ChipAnim[] = Array.from({ length: count }).map((_, i) => {
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
    if (!view) return;

    const betting = view.betting as any;
    if (!betting) return;

    const youSeat = view.you.seat;
    if (!youSeat) return; // 观战不播（也可以播，你自己改）

    const oppSeat = (youSeat === "A" ? "B" : "A") as "A" | "B";

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
  if (!view) return <div style={{ padding: 24 }}>Connecting...</div>;

  const betting = view.betting as any;
  const youSeat = view.you.seat as ("A" | "B" | null);
  const youReady = youSeat ? (view.players as any)[youSeat]?.ready : false;

  const act = (action: any, chipCount = 6) => {
    if (!view.you.seat) return;
    if (chipCount > 0) spawnChipsFromSeat(view.you.seat, chipCount);
    sendAction(action);
  };

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
              ["--dx" as any]: `${c.dx}px`,
              ["--dy" as any]: `${c.dy}px`,
            }}
          />
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto 30px", display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
        <button
            onClick={() => {
                if (!youSeat) return;
                act({ type: youReady ? "UNREADY" : "READY" }, 0); // READY/UNREADY 都不需要飞筹码
            }}
            className={`pbtn ${youReady ? "pbtn-ready" : ""}`}
        >
            {youReady ? "READY ✓" : "READY"}
        </button>

        {betting?.allowed?.canFold && (
          <button onClick={() => act({ type: "FOLD" }, 2)} className="pbtn">FOLD</button>
        )}

        {betting?.allowed?.canCheck && (
          <button onClick={() => act({ type: "CHECK" }, 0)} className="pbtn">CHECK</button>
        )}

        {betting?.allowed?.canCall && (
          <button onClick={() => act({ type: "CALL" }, 7)} className="pbtn">
            CALL ({betting.allowed.toCall})
          </button>
        )}

        {betting?.actingSeat === view.you.seat && (
          <button onClick={() => act({ type: "ALL_IN" }, 20)} className="pbtn">ALL IN</button>
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
                onClick={() => {
                  const v = Number((document.getElementById("amt") as HTMLInputElement).value);
                  act({ type: "BET", amount: v }, 10);
                }}
                className="pbtn"
              >
                BET
              </button>
            )}
            <button
              onClick={() => {
                const v = Number((document.getElementById("amt") as HTMLInputElement).value);
                act({ type: "RAISE", amount: v }, 14);
              }}
              className="pbtn"
            >
              RAISE TO
            </button>
          </>
        )}
      </div>
    </>
  );
}
