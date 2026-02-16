import { jsx as _jsx } from "react/jsx-runtime";
function toFileName(code) {
    if (code === "XX")
        return "card-back.png";
    const rankMap = {
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
    const suitMap = {
        S: "spades",
        H: "hearts",
        D: "diamonds",
        C: "clubs",
    };
    const rank = rankMap[code[0]];
    const suit = suitMap[code[1]];
    return `${rank}_of_${suit}.png`;
}
export function Card({ value, highlight }) {
    const fileName = toFileName(value);
    const src = `/cards/${fileName}`;
    return (_jsx("img", { src: src, alt: value, style: {
            width: 64,
            height: 96,
            borderRadius: 6,
            border: highlight ? "2px solid gold" : "2px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            background: "#fff",
        }, draggable: false }));
}
