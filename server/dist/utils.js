const SUITS = ["S", "H", "D", "C"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
export function makeDeck() {
    const deck = [];
    for (const r of RANKS)
        for (const s of SUITS)
            deck.push(`${r}${s}`);
    return deck;
}
export function shuffle(arr) {
    // Fisher–Yates
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
