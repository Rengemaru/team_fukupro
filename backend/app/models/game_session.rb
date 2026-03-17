class GameSession < ApplicationRecord
  validates :session_token,  presence: true, uniqueness: true
  validates :player_node_id, presence: true
end
