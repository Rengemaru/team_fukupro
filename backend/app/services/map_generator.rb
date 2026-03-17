class MapGenerator
  CANVAS_W    = 800
  CANVAS_H    = 600
  MARGIN_X    = 100
  MARGIN_Y    =  60
  ENEMY_RATIO = 0.6

  # @param size [Integer] マップの行数（start/goal 含む、最小 3）
  def initialize(size = 5)
    @size = [ size, 3 ].max
  end

  # マスの配列を生成して返す
  # @return [Array<Hash>] 各マスは id / x / y / type / connections / completed を持つ
  def generate
    rows      = build_row_sizes
    nodes     = build_nodes(rows)
    assign_connections(nodes, rows)
    nodes
  end

  private

  # 各行のノード数を決める
  # 例: size=5 → [1, 3, 4, 4, 1]（フロントの既存レイアウトに近い構成）
  def build_row_sizes
    mid_count = @size - 2
    mid = mid_count.times.map { |i| mid_node_count(i, mid_count) }
    [ 1, *mid, 1 ]
  end

  def mid_node_count(index, total)
    max = 4
    # 行番号が中央に近いほど多くなる
    half  = (total - 1) / 2.0
    ratio = total == 1 ? 1.0 : 1.0 - (index - half).abs / half
    [ 1, (ratio * max).ceil ].max
  end

  def build_nodes(rows)
    id    = 0
    nodes = []
    @row_start_ids = []

    rows.each_with_index do |count, row_index|
      @row_start_ids << id
      y = y_position(row_index, rows.size)

      count.times do |col_index|
        x    = x_position(col_index, count)
        type = resolve_type(row_index, rows.size)

        nodes << {
          id:          id,
          x:           x,
          y:           y,
          type:        type,
          connections: [],
          completed:   false
        }
        id += 1
      end
    end

    nodes
  end

  # 各ノードに次の行のノードを接続する
  def assign_connections(nodes, rows)
    rows.each_with_index do |count, row_index|
      break if row_index >= rows.size - 1

      next_start = @row_start_ids[row_index + 1]
      next_count = rows[row_index + 1]

      count.times do |col_index|
        curr_id     = @row_start_ids[row_index] + col_index
        connections = adjacent_ids(col_index, count, next_start, next_count)
        nodes[curr_id][:connections] = connections
      end
    end
  end

  # 現在行 col_index のノードが接続する次行のノード ID 一覧
  def adjacent_ids(col_index, curr_count, next_start, next_count)
    ratio  = curr_count == 1 ? 0.5 : col_index.to_f / (curr_count - 1)
    center = ratio * (next_count - 1)
    lo     = [ center.floor - 1, 0 ].max
    hi     = [ center.ceil  + 1, next_count - 1 ].min
    (lo..hi).map { |i| next_start + i }
  end

  def resolve_type(row_index, total_rows)
    return Constants::MapNode::START    if row_index == 0
    return Constants::MapNode::GOAL     if row_index == total_rows - 1

    rand < ENEMY_RATIO ? Constants::MapNode::ENEMY : Constants::MapNode::VILLAGER
  end

  def x_position(col_index, col_count)
    return CANVAS_W / 2 if col_count == 1

    usable = CANVAS_W - MARGIN_X * 2
    (MARGIN_X + col_index.to_f / (col_count - 1) * usable).round
  end

  def y_position(row_index, total_rows)
    usable    = CANVAS_H - MARGIN_Y * 2
    bottom_y  = CANVAS_H - MARGIN_Y
    step      = usable.to_f / (total_rows - 1)
    (bottom_y - row_index * step).round
  end
end
