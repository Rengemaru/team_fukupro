import { create } from 'zustand'

const MAX_HP = 5

type PlayerStore = {
  hp: number
  maxHP: number
  score: number
  dealDamage: () => void
  heal: () => void
  setHp: (hp: number) => void
  addScore: (pts: number) => void
  reset: () => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  hp: MAX_HP,
  maxHP: MAX_HP,
  score: 0,
  dealDamage: () => set((s) => ({ hp: Math.max(0, s.hp - 1) })),
  heal: () => set((s) => ({ hp: Math.min(s.maxHP, s.hp + 1) })),
  setHp: (hp) => set((s) => ({ hp: Math.min(s.maxHP, Math.max(0, hp)) })),
  addScore: (pts) => set((s) => ({ score: s.score + pts })),
  reset: () => set({ hp: MAX_HP, score: 0 }),
}))
