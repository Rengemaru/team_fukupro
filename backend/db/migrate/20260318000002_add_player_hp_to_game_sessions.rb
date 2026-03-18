class AddPlayerHpToGameSessions < ActiveRecord::Migration[8.1]
  def change
    add_column :game_sessions, :player_hp,     :integer, null: false, default: 3
    add_column :game_sessions, :player_max_hp, :integer, null: false, default: 3
  end
end
