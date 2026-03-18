class ChangePlayerHpDefaultToFive < ActiveRecord::Migration[8.1]
  def change
    change_column_default :game_sessions, :player_hp,     from: 3, to: 5
    change_column_default :game_sessions, :player_max_hp, from: 3, to: 5
    # 既存レコードも5に更新
    GameSession.where(player_hp: 3, player_max_hp: 3).update_all(player_hp: 5, player_max_hp: 5)
  end
end
