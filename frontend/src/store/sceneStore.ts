import { create } from 'zustand'

type SceneStore = {
  currentScene: string
  setCurrentScene: (scene: string) => void
  mikeVisible: boolean
  setMikeVisible: (v: boolean) => void
}

export const useSceneStore = create<SceneStore>((set) => ({
  currentScene: '',
  setCurrentScene: (scene) => set({ currentScene: scene }),
  mikeVisible: false,
  setMikeVisible: (v) => set({ mikeVisible: v }),
}))
