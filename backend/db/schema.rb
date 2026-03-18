# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_18_000003) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "enemies", force: :cascade do |t|
    t.integer "attack_power", default: 10, null: false
    t.datetime "created_at", null: false
    t.string "immune_weathers", default: [], null: false, array: true
    t.integer "max_hp", default: 30, null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.string "weakness_weathers", default: [], null: false, array: true
  end

  create_table "game_sessions", force: :cascade do |t|
    t.integer "completed_nodes", default: [], null: false, array: true
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.boolean "finished", default: false, null: false
    t.jsonb "map_nodes", default: [], null: false
    t.integer "player_hp", default: 3, null: false
    t.integer "player_max_hp", default: 3, null: false
    t.integer "player_node_id", default: 0, null: false
    t.string "session_token", null: false
    t.datetime "updated_at", null: false
    t.index ["session_token"], name: "index_game_sessions_on_session_token", unique: true
  end

  create_table "scores", force: :cascade do |t|
    t.datetime "cleared_at", null: false
    t.datetime "created_at", null: false
    t.string "player_name", null: false
    t.integer "turn_count", null: false
    t.datetime "updated_at", null: false
  end
end
