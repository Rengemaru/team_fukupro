import { ApiError } from './apiClient';

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

export async function postVillage(body: VillageRequest): Promise<VillageResponse> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const res = await fetch(`${baseUrl}/api/villages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<VillageResponse>;
}
