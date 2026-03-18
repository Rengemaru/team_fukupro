class Enemy < ApplicationRecord
  validates :name,         presence: true, uniqueness: true
  validates :max_hp,       presence: true, numericality: { greater_than: 0 }
  validates :attack_power, presence: true, numericality: { greater_than: 0 }
end
