import { create } from "zustand";
export const useStore = create((set) => ({
    view: null,
    setView: (v) => set({ view: v })
}));
