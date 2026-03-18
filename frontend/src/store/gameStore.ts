import { create } from 'zustand'

export interface MapNode {
  id: number
  x: number
  y: number
  type: 'start' | 'enemy' | 'villager' | 'goal'
  connections: number[]
  completed: boolean
  village_event?: string | null
  // enemy ノード専用フィールド
  enemy_id?: number | null
  enemy_name?: string | null
  current_hp?: number | null
}

type GameStore = {
  nodes: MapNode[]
  playerNodeId: number
  completedNodes: number[]
  setNodes: (nodes: MapNode[]) => void
  setPlayerNodeId: (id: number) => void
  setCompletedNodes: (ids: number[]) => void
  updateNodeHp: (nodeId: number, hp: number) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  nodes: [],
  playerNodeId: 0,
  completedNodes: [],
  setNodes: (nodes) => set({ nodes }),
  setPlayerNodeId: (playerNodeId) => set({ playerNodeId }),
  setCompletedNodes: (completedNodes) => set({ completedNodes }),
  updateNodeHp: (nodeId, hp) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, current_hp: hp } : n)),
    })),
  reset: () => set({ nodes: [], playerNodeId: 0, completedNodes: [] }),
}))
