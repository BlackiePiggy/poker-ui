import React from "react";
import type { Card as CardT } from "@poker/shared/dist/types.js";

function toFileName(code: string): string {
  if (code === "XX") return "card-back.png";

  const rankMap: Record<string, string> = {
    A: "ace",
    K: "king",
    Q: "queen",
    J: "jack",
    T: "10",
    "9": "9",
    "8": "8",
    "7": "7",
    "6": "6",
    "5": "5",
    "4": "4",
    "3": "3",
    "2": "2",
  };

  const suitMap: Record<string, string> = {
    S: "spades",
    H: "hearts",
    D: "diamonds",
    C: "clubs",
  };

  const rank = rankMap[code[0]];
  const suit = suitMap[code[1]];

  return `${rank}_of_${suit}.png`;
}

export function Card({ value, highlight }: { value: string; highlight?: boolean }) {
  const fileName = toFileName(value);
  const src = `/cards/${fileName}`;

  return (
    <img
      src={src}
      alt={value}
      style={{
        width: 64,
        height: 96,
        borderRadius: 6,
        border: highlight ? "2px solid gold" : "2px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        background: "#fff",
      }}
      draggable={false}
    />
  );
}
