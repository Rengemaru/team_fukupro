MAP_CONSTANTS = {
  # キャンバスサイズ
  canvas_width:  800,
  canvas_height: 600,

  # スタート・ゴールの固定座標
  start_x: 400,
  start_y: 540,
  goal_x:  400,
  goal_y:   60,

  # 中間ノードの生成パラメータ
  mid_node_count_range: (8..16),  # 中間ノードの総数
  node_x_margin:        80,       # X座標の左右マージン（端に寄りすぎない）
  node_y_margin:        80,       # Y座標のマージン（スタート・ゴールに近づきすぎない）
  min_node_distance:    80,       # ノード間の最小距離（重なり防止）

  # タイプ確率（中間ノード全体に対して）
  villager_probability: 0.4,      # 中間ノードがvillagerになる確率（残り0.6がenemy）

  # 村イベントの種類（完全ランダムで割り当て・重複あり）
  village_event_types: %w[drought heavy_rain sailing beast].freeze,

  # 複数ルート保証のための最低独立経路数
  min_route_count: 2
}.freeze
