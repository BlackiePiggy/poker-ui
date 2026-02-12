import React from "react";
import type { Card as CardT } from "@poker/shared/dist/types.js";
import cardBack from "../assets/card-back.png";

function suitSymbol(s: string) {
  if (s === "S") return "♠";
  if (s === "H") return "♥";
  if (s === "D") return "♦";
  return "♣";
}

export function Card({ value, highlight }: { value: CardT | "XX"; highlight?: boolean }) {
  if (value === "XX") {
    return (
        <div
        style={{
            width: 56,
            height: 80,
            borderRadius: 10,
            border: "2px solid #333",
            backgroundImage: `url(${cardBack})`,
            backgroundSize: "cover",       // 铺满
            backgroundPosition: "center",  // 居中裁切
            backgroundRepeat: "no-repeat",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
        }}
        />
    );
  }

  const rank = value.slice(0, 1);
  const suit = value.slice(1, 2);
  const red = suit === "H" || suit === "D";

  return (
    <div style={{
      width: 56, height: 80, borderRadius: 10,
      border: highlight ? "3px solid gold" : "2px solid #333",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: 6,
      boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
    }}>
      <div style={{ color: red ? "#c00" : "#111", fontWeight: 800 }}>
        {rank}{suitSymbol(suit)}
      </div>
      <div style={{ textAlign: "right", color: red ? "#c00" : "#111", fontSize: 22 }}>
        {suitSymbol(suit)}
      </div>
    </div>
  );
}
