module Api
  class VillagesController < ApplicationController
    ALL_WEATHERS = %w[thunder sunny rain wind hail].freeze

    # POST /api/villages
    def create
      session = GameSession.find_by(session_token: params[:session_token])
      return render json: { error: "not found" }, status: :not_found unless session

      node = session.map_nodes.find { |n| n["id"] == params[:node_id].to_i }
      unless node&.dig("type") == "villager"
        return render json: { error: "invalid node" }, status: :unprocessable_entity
      end

      weather = normalized_weather
      unless weather
        return render json: { error: "invalid weather" }, status: :unprocessable_entity
      end

      unless spell_owned?(session, weather)
        return render json: { error: "spell not unlocked" }, status: :unprocessable_entity
      end

      result = VillageEventService.call(
        village_event: node["village_event"],
        weather:       weather,
        player_hp:     session.player_hp,
        player_max_hp: session.player_max_hp
      )

      update_session(session, node, result)

      render json: result
    end

    private

    def update_session(session, node, result)
      completed = result[:outcome] != "neutral"

      updated_nodes = session.map_nodes.map do |n|
        next n unless n["id"] == node["id"]

        n.merge("completed" => completed)
      end

      session.update!(
        map_nodes:  updated_nodes,
        player_hp:  result[:player_current_hp],
        finished:   result[:player_current_hp] <= 0
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
