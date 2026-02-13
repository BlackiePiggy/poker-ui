import React from "react";
import { Card } from "./Card";
import type { GameView, Card as CardT } from "@poker/shared/dist/types.js";

export function Table({ view }: { view: GameView }) {
  const showdown = view.showdown;

  const betting = (view as any).betting as
  | {
      yourInvested: number;
      oppInvested: number;
      actingSeat: "A" | "B" | null;
      currentBet: number;
      allowed: { toCall: number };
    }
  | undefined;


  // 高亮：示例仍然高亮胜者 bestFive（你可改成双方都高亮）
  const bestSet = new Set<CardT>();
  if (showdown) {
    const winnerRes =
      showdown.winner === "A"
        ? showdown.aResult
        : showdown.winner === "B"
        ? showdown.bResult
        : showdown.aResult;
    for (const c of winnerRes.bestFive) bestSet.add(c);
  }

  const youSeat = view.you.seat;
  const oppSeat = (youSeat === "A" ? "B" : "A") as "A" | "B";

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: "0 12px" }}>
      {/* 牌桌外框 */}
      <div
        style={{
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
        }}
      >
        {/* 桌沿（更像真实桌子） */}
        <div
          style={{
            position: "absolute",
            inset: 18,
            borderRadius: 999,
            border: "14px solid rgba(40, 24, 10, 0.92)",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
            pointerEvents: "none",
          }}
        />
        {/* 桌面内圈 */}
        <div
          style={{
            position: "absolute",
            inset: 42,
            borderRadius: 999,
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
            pointerEvents: "none",
          }}
        />

        {/* 顶部状态栏 */}
        <div
          style={{
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
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>
            Heads-Up 德州（单房间）
          </div>
          <div style={{ opacity: 0.95 }}>
            Stage: <b>{view.stage}</b>
          </div>
        </div>

        {/* 提示信息 */}
        {view.message && (
          <div
            style={{
              position: "absolute",
              top: 46,
              left: 18,
              right: 18,
              textAlign: "center",
              color: "rgba(255,255,255,0.92)",
              fontSize: 14,
              textShadow: "0 2px 8px rgba(0,0,0,0.35)",
              pointerEvents: "none",
            }}
          >
            {view.message}
          </div>
        )}

        {/* ===== Opponent Zone（顶部）===== */}
        <Zone
            label={`对手区（Seat ${oppSeat}）`}
            style={{
                position: "absolute",
                left: "30%",
                right: "30%",
                top: 90,
                height: 120,
            }}
            >
            {/* 信息放左上，不影响居中 */}
            <div style={{ position: "absolute", left: 16, top: 14, color: "#fff" }}>
                <div style={{ fontWeight: 800 }}>Opponent</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                A: {view.players.A.connected ? "在线" : "离线"} | B:{" "}
                {view.players.B.connected ? "在线" : "离线"}
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    left: 16,
                    top: 58, // 在 Opponent 标题下面
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(4px)",
                    textShadow: "0 2px 8px rgba(0,0,0,0.35)",
                    pointerEvents: "none",
                }}
                >
                <div>Stack: {view.players[oppSeat].stack}</div>
                <div>In: {betting?.oppInvested ?? 0}</div>
            </div>


            {/* 两张牌永远居中 */}
            <div
                style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                gap: 12,
                alignItems: "center",
                justifyContent: "center",
                }}
            >
                <Card value={"XX"} />
                <Card value={"XX"} />
            </div>
        </Zone>

        {/* ===== Board Zone（中间公共牌）===== */}
        <Zone
            label="公共牌区（Board）"
            style={{
                position: "absolute",
                left: "8%",
                right: "8%",
                top: 220,
                height: 180,
            }}
            >
            {/* 公共牌 —— 完全几何居中 */}
            <div
                style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                gap: 14,
                alignItems: "center",
                justifyContent: "center",
                }}
            >
                {Array.from({ length: 5 }).map((_, i) => {
                const c = view.community[i];
                const v = c ?? ("XX" as const);
                const highlight = c ? bestSet.has(c) : false;
                return <Card key={i} value={v} highlight={highlight} />;
                })}
            </div>

            {/* Pot 放在正中央上方（不影响居中） */}
            <div
                id="pot-anchor"
                style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                color: "#fff",
                fontWeight: 900,
                letterSpacing: 0.3,
                }}
            >
                Pot: {view.pot}
            </div>
        </Zone>


        {/* ===== Hero Zone（底部）===== */}
        <Zone
            label={`自己区（Seat ${youSeat ?? "观战"}）`}
            style={{
                position: "absolute",
                left: "30%",
                right: "30%",
                bottom: 80,
                height: 120,
            }}
            >
            {/* 信息放左下（更像真实牌桌） */}
            <div style={{ position: "absolute", left: 16, top: 14, color: "#fff" }}>
                <div style={{ fontWeight: 800 }}>You</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                    Dealer: {view.dealer ?? "-"}
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    left: 16,
                    bottom: 14,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(4px)",
                    textShadow: "0 2px 8px rgba(0,0,0,0.35)",
                    pointerEvents: "none",
                }}
                >
                <div>Stack: {youSeat ? view.players[youSeat].stack : "-"}</div>
                <div>In: {betting?.yourInvested ?? 0}</div>

                {betting && betting.actingSeat === youSeat && (
                    <div style={{ marginTop: 4, opacity: 0.95 }}>
                    To Call: {betting.allowed?.toCall ?? 0} / Bet: {betting.currentBet}
                    </div>
                )}
            </div>


            {/* 两张手牌永远居中 */}
            <div
                style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                gap: 12,
                alignItems: "center",
                justifyContent: "center",
                }}
            >
                {view.yourHole.map((c, idx) => (
                <Card key={idx} value={c} highlight={bestSet.has(c)} />
                ))}
            </div>
        </Zone>

        {/* SHOWDOWN 信息浮层（放桌面右下更像真实） */}
        {showdown && (
          <div
            style={{
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
            }}
          >
            <div style={{ fontWeight: 900 }}>摊牌结果</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.95 }}>
              A: {showdown.aResult.name} <br />
              B: {showdown.bResult.name} <br />
              Winner: <b>{showdown.winner}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Zone({
  label,
  style,
  children,
}: {
  label: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div style={style}>
      {/* 分区边框（抽象清晰） */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          border: "2px dashed rgba(255,255,255,0.35)",
          background: "rgba(0,0,0,0.08)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
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
        }}
      >
        {label}
      </div>

      {/* 内容层 */}
      <div style={{ position: "relative", height: "100%", padding: 0 }}>
        {children}
      </div>
    </div>
  );
}
