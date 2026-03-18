module Api
  class SessionsController < ApplicationController
    ALL_WEATHERS = %w[thunder fire water wind hail].freeze

    # POST /api/sessions
    def create
      nodes   = MapGenerator.call
      session = GameSession.create!(
        session_token:   SecureRandom.uuid,
        player_node_id:  0,
        finished:        false,
        expires_at:      Time.current + 24.hours,
        map_nodes:       nodes,
        completed_nodes: [],
        player_spells:   ALL_WEATHERS.sample(2)
      )

      render json: session_json(session, nodes), status: :created
    end

    # GET /api/sessions/:token
    def show
      session = find_active_session
      return render json: { error: "not found" }, status: :not_found unless session

      if session.player_spells.blank?
        session.update!(player_spells: ALL_WEATHERS.sample(2))
      end

      render json: session_json(session, session.map_nodes)
    end

    # PATCH /api/sessions/:token
    def update
      session = find_active_session
      return render json: { error: "not found" }, status: :not_found unless session

      completed = Array(params[:completed_nodes]).map(&:to_i)
      goal_id   = session.map_nodes.last&.dig("id")
      finished  = completed.include?(goal_id)

      session.update!(
        player_node_id:  params[:player_node_id].to_i,
        completed_nodes: completed,
        finished:        finished
      )

      render json: session_json(session, session.map_nodes)
    end

    private

    def find_active_session
      session = GameSession.find_by(session_token: params[:token])
      return nil unless session
      return nil if session.finished? || session.expires_at < Time.current

      session
    end

    def session_json(session, nodes)
      {
        session_token:   session.session_token,
        nodes:           nodes,
        player_node_id:  session.player_node_id,
        completed_nodes: session.completed_nodes,
        finished:        session.finished,
        player_spells:   session.player_spells || []
        player_hp:       session.player_hp,
        player_max_hp:   session.player_max_hp
      }
    end
  end
end
