# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

ActiveRecord::Base.connection.execute("TRUNCATE enemies RESTART IDENTITY CASCADE")

Enemy.create!(
  name: "スライム", max_hp: 30, attack_power: 8,
  weakness_weathers: [], immune_weathers: []
)
Enemy.create!(
  name: "ゾンビ", max_hp: 40, attack_power: 12,
  weakness_weathers: [ "fire" ], immune_weathers: [ "water" ]
)
Enemy.create!(
  name: "砂の魔人", max_hp: 50, attack_power: 14,
  weakness_weathers: [ "water", "wind" ], immune_weathers: [ "fire", "thunder" ]
)
Enemy.create!(
  name: "炎の精霊", max_hp: 35, attack_power: 10,
  weakness_weathers: [ "water", "hail" ], immune_weathers: [ "fire" ]
)
Enemy.create!(
  name: "鎧のお化け", max_hp: 45, attack_power: 10,
  weakness_weathers: [ "fire", "water" ], immune_weathers: [ "wind" ]
)
