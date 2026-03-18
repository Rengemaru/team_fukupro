import type {
  SessionResponse,
  UpdateSessionRequest,
  WeatherResponse,
  BattleRequest,
  BattleResponse,
} from './types';

export type { BattleRequest, BattleResponse, PlayerAttackResult, EnemyAttackResult } from './types';

// ── エラー型 ───────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ── クライアント本体 ───────────────────────────────────────────────

/**
 * ベースURLは環境変数 VITE_API_BASE_URL で切り替える。
 *   未設定（空文字）: 同一オリジン（開発時は Vite proxy / 本番はそのまま）
 *   'http://localhost:3000': バックエンド直接アクセス
 *   モックサーバーURL: テスト用モック環境
 */
class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = import.meta.env.VITE_API_BASE_URL ?? '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      throw new ApiError(res.status, `API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Sessions ─────────────────────────────────────────────────────

  getSession(token: string): Promise<SessionResponse> {
    return this.request<SessionResponse>(`/api/sessions/${token}`);
  }

  createSession(): Promise<SessionResponse> {
    return this.request<SessionResponse>('/api/sessions', { method: 'POST' });
  }

  updateSession(token: string, body: UpdateSessionRequest): Promise<SessionResponse> {
    return this.request<SessionResponse>(`/api/sessions/${token}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // ── Weather ───────────────────────────────────────────────────────

  postWeather(frames: number[][]): Promise<WeatherResponse> {
    return this.request<WeatherResponse>('/api/weather', {
      method: 'POST',
      body: JSON.stringify({ frames }),
    });
  }

  // ── Battle ────────────────────────────────────────────────────────

  postBattle(body: BattleRequest): Promise<BattleResponse> {
    return this.request<BattleResponse>('/api/battles', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

export const apiClient = new ApiClient();
