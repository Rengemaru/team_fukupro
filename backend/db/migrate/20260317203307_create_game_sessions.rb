class CreateGameSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :game_sessions do |t|
      t.string   :session_token,   null: false
      t.integer  :player_node_id,  null: false, default: 0
      t.boolean  :finished,        null: false, default: false
      t.datetime :expires_at,      null: false
      t.jsonb    :map_nodes,       null: false, default: []
      t.integer  :completed_nodes, null: false, default: [], array: true

      t.timestamps
    end

    add_index :game_sessions, :session_token, unique: true
  end
end
