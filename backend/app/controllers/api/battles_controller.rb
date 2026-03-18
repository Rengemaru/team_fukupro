module Api
  class BattlesController < ApplicationController
    ALL_WEATHERS = %w[thunder sunny rain wind hail].freeze

    # POST /api/battles
    def create
      session = GameSession.find_by(session_token: params[:session_token])
      return render json: { error: "not found" }, status: :not_found unless session

      node = session.map_nodes.find { |n| n["id"] == params[:node_id].to_i }
      unless node&.dig("type") == "enemy"
        return render json: { error: "invalid node" }, status: :unprocessable_entity
      end

      weather = normalized_weather
      unless weather
        return render json: { error: "invalid weather" }, status: :unprocessable_entity
      end

      unless spell_owned?(session, weather)
        return render json: { error: "spell not unlocked" }, status: :unprocessable_entity
      end

      enemy = Enemy.find(node["enemy_id"])

      result = BattleLogic.call(
        weather:          weather,
        enemy:            enemy,
        enemy_current_hp: node["current_hp"].to_i,
        player_hp:        session.player_hp,
        player_max_hp:    session.player_max_hp,
        completed_count:  session.completed_nodes.length
      )

      update_session(session, node, result)

      render json: result
    end

    private

    def update_session(session, node, result)
      updated_nodes = session.map_nodes.map do |n|
        next n unless n["id"] == node["id"]

        n.merge(
          "current_hp" => result[:enemy_current_hp],
          "completed"  => result[:battle_result] == "win"
        )
      end

      new_spell = nil
      if result[:battle_result] == "win"
        current_spells = session.player_spells || []
        remaining = ALL_WEATHERS - current_spells
        if remaining.any?
          new_spell = remaining.sample
          result[:new_spell] = new_spell
        end
      end

      session.update!(
        map_nodes:     updated_nodes,
        player_hp:     result[:player_current_hp],
        finished:      result[:battle_result] == "game_over",
        player_spells: new_spell ? ((session.player_spells || []) + [ new_spell ]) : session.player_spells
      )
    end

    def normalized_weather
      weather = params[:weather].to_s
      ALL_WEATHERS.include?(weather) ? weather : nil
    end

    def spell_owned?(session, weather)
      Array(session.player_spells).include?(weather)
    end
  end
end
