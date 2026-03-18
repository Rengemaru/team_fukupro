import type { MapNode } from '../store/gameStore';

// ── Sessions ──────────────────────────────────────────────────────

export interface SessionResponse {
  session_token: string;
  nodes: MapNode[];
  player_node_id: number;
  completed_nodes: number[];
  finished: boolean;
  player_spells: string[];
  player_hp: number;
  player_max_hp: number;
}

export interface UpdateSessionRequest {
  player_node_id: number;
  completed_nodes: number[];
}

// ── Weather ───────────────────────────────────────────────────────

export interface WeatherResponse {
  weather: string;
}

// ── Village ───────────────────────────────────────────────────────

export interface VillageRequest {
  session_token: string;
  node_id: number;
  weather: string;
}

export interface VillageResponse {
  outcome: 'success' | 'penalty' | 'neutral';
  hp_delta: number;
  player_current_hp: number;
  message: string;
}

// ── Battle ────────────────────────────────────────────────────────

export interface BattleRequest {
  session_token: string;
  node_id: number;
  weather: string;
}

export interface PlayerAttackResult {
  damage: number;
  result: 'weakness' | 'hit' | 'immune';
}

export interface EnemyAttackResult {
  damage: number;
  result: 'hit' | 'miss';
  hit_probability: number;
}

export interface BattleResponse {
  player_attack: PlayerAttackResult;
  enemy_attack: EnemyAttackResult;
  enemy_current_hp: number;
  player_current_hp: number;
  battle_result: 'win' | 'game_over' | 'ongoing';
  new_spell?: string;
}
