// ─── GameScene で使う敵の表示設定 ────────────────────────────────────
export type EnemyType = "slime" | "zombie" | "sand_golem" | "fire_fairy" | "armored_ghost";

// バックエンドの enemies.id → EnemyType のマッピング
export const ENEMY_ID_TO_TYPE: Record<number, EnemyType> = {
  1: 'slime',
  2: 'zombie',
  3: 'sand_golem',
  4: 'fire_fairy',
  5: 'armored_ghost',
};

export const ENEMY_TYPES: EnemyType[] = [
  "slime",
  "zombie",
  "sand_golem",
  "fire_fairy",
  "armored_ghost",
];

export const ENEMY_CONFIG: Record<
  EnemyType,
  {
    name: string;
    hp: number;
    color: number;
    // null = プロシージャル生成（スライム）、[frame1key, frame2key] = 画像使用
    imageKeys: [string, string] | null;
    // 画像の表示サイズ [width, height]（スライムは未使用）
    displaySize: [number, number];
  }
> = {
  slime:         { name: "スライム",   hp: 30, color: 0x22dd22, imageKeys: null,                              displaySize: [0,   0  ] },
  zombie:        { name: "ゾンビ",     hp: 40, color: 0x55aa66, imageKeys: ["zonbi1",       "zonbi2"      ],  displaySize: [130, 265] },
  sand_golem:    { name: "砂の魔人",   hp: 50, color: 0xddbb55, imageKeys: ["sunanomazin1", "sunanomazin2"],  displaySize: [175, 210] },
  fire_fairy:    { name: "炎の精霊",   hp: 35, color: 0xff6622, imageKeys: ["yousei1",      "yousei2"     ],  displaySize: [100, 100] },
  armored_ghost: { name: "鎧のお化け", hp: 45, color: 0x7788aa, imageKeys: ["yoroi1",       "yoroi2"      ],  displaySize: [145, 230] },
};

// ─── バックエンド enemies.id をキーにした表示データ ───────────────────
export type EnemyDisplayData = {
  name: string;
  imagePath: string | null; // null の場合は画像を表示しない
};

// キーはバックエンドの enemies.id に対応する
// seeds.rb の挿入順と一致させること（スライム=1, ゾンビ=2, 砂の魔人=3, 炎の精霊=4, 鎧のお化け=5）
export const ENEMY_DISPLAY_DATA: Record<number, EnemyDisplayData> = {
  1: { name: "スライム",   imagePath: "/assets/enemies/slime.png" },
  2: { name: "ゾンビ",     imagePath: null },
  3: { name: "砂の魔人",   imagePath: null },
  4: { name: "炎の精霊",   imagePath: null },
  5: { name: "鎧のお化け", imagePath: null },
};
