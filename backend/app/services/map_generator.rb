class MapGenerator
  def self.call
    new.generate
  end

  def generate
    nodes = place_nodes
    assign_connections(nodes)
    ensure_connectivity(nodes)
    ensure_multiple_routes(nodes)
    assign_types(nodes)
    nodes
  end

  private

  # ── ノード配置 ────────────────────────────────────────

  def place_nodes
    mid_count = rand(MAP_CONSTANTS[:mid_node_count_range])
    nodes     = []

    nodes << new_node(0, MAP_CONSTANTS[:start_x], MAP_CONSTANTS[:start_y])

    mid_count.times do |i|
      x, y = random_position(nodes)
      nodes << new_node(i + 1, x, y)
    end

    goal_id = nodes.size
    nodes << new_node(goal_id, MAP_CONSTANTS[:goal_x], MAP_CONSTANTS[:goal_y])

    nodes
  end

  def new_node(id, x, y)
    { id: id, x: x, y: y, type: nil, connections: [], completed: false, village_event: nil,
      enemy_id: nil, enemy_name: nil, current_hp: nil }
  end

  # min_node_distance を満たす座標をランダムに決める（最大 50 回リトライ）
  def random_position(existing_nodes)
    x_min = MAP_CONSTANTS[:node_x_margin]
    x_max = MAP_CONSTANTS[:canvas_width]  - MAP_CONSTANTS[:node_x_margin]
    y_min = MAP_CONSTANTS[:goal_y]  + MAP_CONSTANTS[:node_y_margin]
    y_max = MAP_CONSTANTS[:start_y] - MAP_CONSTANTS[:node_y_margin]
    min_d = MAP_CONSTANTS[:min_node_distance]

    50.times do
      x = rand(x_min..x_max)
      y = rand(y_min..y_max)
      return [ x, y ] unless existing_nodes.any? { |n| distance(n[:x], n[:y], x, y) < min_d }
    end

    # フォールバック: 距離条件を無視して配置
    [ rand(x_min..x_max), rand(y_min..y_max) ]
  end

  def distance(x1, y1, x2, y2)
    Math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
  end

  # ── 接続生成 ─────────────────────────────────────────
  # y が小さい（ゴール側）ノードへの一方向接続のみ生成

  def assign_connections(nodes)
    goal_id = nodes.last[:id]

    nodes.each do |node|
      next if node[:id] == goal_id

      candidates = nodes.select { |n| n[:y] < node[:y] }
      next if candidates.empty?

      sorted = candidates.sort_by { |n| distance(node[:x], node[:y], n[:x], n[:y]) }
      pool   = sorted.first([ 6, sorted.size ].min)
      lo     = [ 2, pool.size ].min
      hi     = [ 4, pool.size ].min
      count  = rand(lo..hi)
      node[:connections] = pool.sample(count).map { |n| n[:id] }
    end
  end

  # ── 到達可能性の保証 ──────────────────────────────────
  # BFS でスタートから到達できないノードに接続を追加して解消

  def ensure_connectivity(nodes)
    goal_id = nodes.last[:id]

    10.times do
      reachable   = bfs_reachable(nodes, 0)
      unreachable = nodes.map { |n| n[:id] } - reachable
      break if unreachable.empty?

      unreachable.each do |iso_id|
        iso     = nodes.find { |n| n[:id] == iso_id }
        # 到達済みノードのうち、孤立ノードより y が大きい（スタート側）ものを優先
        sources = nodes.select { |n| reachable.include?(n[:id]) && n[:y] > iso[:y] }
        sources = nodes.select { |n| reachable.include?(n[:id]) && n[:id] != goal_id } if sources.empty?
        next if sources.empty?

        nearest = sources.min_by { |n| distance(n[:x], n[:y], iso[:x], iso[:y]) }
        nearest[:connections] << iso_id unless nearest[:connections].include?(iso_id)
      end
    end
  end

  def bfs_reachable(nodes, start_id)
    node_map = nodes.each_with_object({}) { |n, h| h[n[:id]] = n }
    visited  = []
    queue    = [ start_id ]

    until queue.empty?
      current = queue.shift
      next if visited.include?(current)

      visited << current
      node_map[current][:connections].each { |conn| queue << conn }
    end

    visited
  end

  # ── 複数ルート保証 ────────────────────────────────────
  # スタートからゴールへのエッジ非共有の独立経路が min_route_count 本未満なら補完

  def ensure_multiple_routes(nodes)
    return if independent_path_count(nodes) >= MAP_CONSTANTS[:min_route_count]

    goal_id   = nodes.last[:id]
    mid_nodes = nodes.reject { |n| n[:id] == 0 || n[:id] == goal_id }

    mid_nodes.each do |node|
      candidates = mid_nodes.select { |n| n[:y] < node[:y] && !node[:connections].include?(n[:id]) }
      next if candidates.empty?

      target = candidates.min_by { |n| distance(node[:x], node[:y], n[:x], n[:y]) }
      node[:connections] << target[:id]
      break if independent_path_count(nodes) >= MAP_CONSTANTS[:min_route_count]
    end
  end

  # エッジ非共有の独立経路数をカウント（最大 min_route_count まで）
  def independent_path_count(nodes)
    goal_id    = nodes.last[:id]
    node_map   = nodes.each_with_object({}) { |n, h| h[n[:id]] = n }
    used_edges = []
    count      = 0

    MAP_CONSTANTS[:min_route_count].times do
      path = dfs_path(node_map, 0, goal_id, used_edges)
      break unless path

      path.each_cons(2) { |a, b| used_edges << [ a, b ] }
      count += 1
    end

    count
  end

  def dfs_path(node_map, start_id, goal_id, used_edges)
    stack   = [ [ start_id, [ start_id ] ] ]
    visited = []

    until stack.empty?
      current, path = stack.pop
      next if visited.include?(current)

      visited << current
      return path if current == goal_id

      node_map[current][:connections].each do |next_id|
        next if used_edges.include?([ current, next_id ])

        stack.push([ next_id, path + [ next_id ] ])
      end
    end

    nil
  end

  # ── タイプ・village_event 割り当て ────────────────────

  def assign_types(nodes)
    goal_id = nodes.last[:id]

    # タイプだけ先に決定
    nodes.each do |node|
      case node[:id]
      when 0
        node[:type] = MapNode::START
      when goal_id
        node[:type] = MapNode::GOAL
      else
        if rand < MAP_CONSTANTS[:villager_probability]
          node[:type]          = MapNode::VILLAGER
          node[:village_event] = MAP_CONSTANTS[:village_event_types].sample
        else
          node[:type] = MapNode::ENEMY
        end
      end
    end

    # 敵ノードにすべての敵をシャッフルして割り当て（全種類が確実に登場）
    enemy_nodes = nodes.select { |n| n[:type] == MapNode::ENEMY }
    enemies     = Enemy.all.to_a.shuffle

    return if enemies.empty?

    enemy_nodes.each_with_index do |node, i|
      enemy             = enemies[i % enemies.size]
      node[:enemy_id]   = enemy.id
      node[:enemy_name] = enemy.name
      node[:current_hp] = enemy.max_hp
    end
  end
end
