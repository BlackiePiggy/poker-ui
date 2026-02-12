import { create } from "zustand";
import type { GameView } from "@poker/shared/dist/types.js";

type Store = {
  view: GameView | null;
  setView: (v: GameView) => void;
};

export const useStore = create<Store>((set) => ({
  view: null,
  setView: (v) => set({ view: v })
}));
