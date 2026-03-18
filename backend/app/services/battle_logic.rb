class BattleLogic
  def self.call(weather:, enemy:, enemy_current_hp:, player_hp:, player_max_hp:, completed_count:)
    new(
      weather:          weather,
      enemy:            enemy,
      enemy_current_hp: enemy_current_hp,
      player_hp:        player_hp,
      player_max_hp:    player_max_hp,
      completed_count:  completed_count
    ).execute
  end

  def initialize(weather:, enemy:, enemy_current_hp:, player_hp:, player_max_hp:, completed_count:)
    @weather          = weather
    @enemy            = enemy
    @enemy_current_hp = enemy_current_hp
    @player_hp        = player_hp
    @player_max_hp    = player_max_hp
    @completed_count  = completed_count
  end

  def execute
    player_dmg, player_result = calc_player_attack
    new_enemy_hp = [ @enemy_current_hp - player_dmg, 0 ].max

    # 敵HP が 0 以下 → win（敵反撃なし）
    if new_enemy_hp <= 0
      return build_result(
        player_dmg:      player_dmg,
        player_result:   player_result,
        enemy_dmg:       0,
        enemy_result:    "miss",
        hit_probability: enemy_hit_probability,
        enemy_hp:        0,
        player_hp:       @player_hp,
        battle_result:   "win"
      )
    end

    # 敵反撃
    enemy_dmg, enemy_result = calc_enemy_attack
    new_player_hp = [ @player_hp - enemy_dmg, 0 ].max
    battle_result = new_player_hp <= 0 ? "game_over" : "ongoing"

    build_result(
      player_dmg:      player_dmg,
      player_result:   player_result,
      enemy_dmg:       enemy_dmg,
      enemy_result:    enemy_result,
      hit_probability: enemy_hit_probability,
      enemy_hp:        new_enemy_hp,
      player_hp:       new_player_hp,
      battle_result:   battle_result
    )
  end

  private

  def calc_player_attack
    if @enemy.immune_weathers.include?(@weather)
      [ 0, "immune" ]
    elsif @enemy.weakness_weathers.include?(@weather)
      [ 10, "weakness" ]
    else
      [ 5, "hit" ]
    end
  end

  def calc_enemy_attack
    prob = enemy_hit_probability
    hit  = rand < prob
    [ hit ? 1 : 0, hit ? "hit" : "miss" ]
  end

  def enemy_hit_probability
    case @completed_count
    when 0..2 then 0.2
    when 3..5 then 0.4
    when 6..8 then 0.6
    else           0.8
    end
  end

  def build_result(player_dmg:, player_result:, enemy_dmg:, enemy_result:, hit_probability:, enemy_hp:, player_hp:, battle_result:)
    {
      player_attack:     { damage: player_dmg,  result: player_result },
      enemy_attack:      { damage: enemy_dmg,   result: enemy_result, hit_probability: hit_probability },
      enemy_current_hp:  enemy_hp,
      player_current_hp: player_hp,
      battle_result:     battle_result
    }
  end
end
