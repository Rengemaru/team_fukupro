import { create } from 'zustand'

const MAX_HP = 5

type PlayerStore = {
  hp: number
  maxHP: number
  dealDamage: () => void
  heal: () => void
  setHp: (hp: number) => void
  reset: () => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  hp: MAX_HP,
  maxHP: MAX_HP,
  dealDamage: () => set((s) => ({ hp: Math.max(0, s.hp - 1) })),
  heal: () => set((s) => ({ hp: Math.min(s.maxHP, s.hp + 1) })),
  setHp: (hp) => set({ hp }),
  reset: () => set({ hp: MAX_HP }),
}))
