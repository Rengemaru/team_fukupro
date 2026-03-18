# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

Enemy.find_or_create_by(name: "スライム").update(
  max_hp:            30,
  attack_power:      8,
  weakness_weathers: [],
  immune_weathers:   []
)
Enemy.find_or_create_by(name: "森の精霊").update(
  max_hp:            40,
  attack_power:      12,
  weakness_weathers: ["rain", "hail"],
  immune_weathers:   ["sunny"]
)
Enemy.find_or_create_by(name: "砂の魔人").update(
  max_hp:            50,
  attack_power:      14,
  weakness_weathers: ["rain", "wind"],
  immune_weathers:   ["sunny", "thunderstorm"]
)
Enemy.find_or_create_by(name: "雷鳥").update(
  max_hp:            35,
  attack_power:      10,
  weakness_weathers: ["thunderstorm"],
  immune_weathers:   ["rain"]
)
Enemy.find_or_create_by(name: "まこも").update(
  max_hp:            45,
  attack_power:      10,
  weakness_weathers: ["sunny"],
  immune_weathers:   ["rain"]
)
