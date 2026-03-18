export type EnemyDisplayData = {
  name: string;
  imagePath: string | null; // null の場合は画像を表示しない
};

// キーはバックエンドの enemies.id に対応する
// seeds.rb の挿入順と一致させること（スライム=1, 森の精霊=2, 砂の魔人=3, 雷鳥=4, まこも=5）
export const ENEMY_DISPLAY_DATA: Record<number, EnemyDisplayData> = {
  1: { name: "スライム", imagePath: "/assets/enemies/slime.png" },
  2: { name: "森の精霊", imagePath: null },
  3: { name: "砂の魔人", imagePath: null },
  4: { name: "盗賊",     imagePath: null },
  5: { name: "ゾンビ",   imagePath: null },
};
