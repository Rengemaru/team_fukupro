module Api
  class WeatherController < ApplicationController
    ALL_WEATHERS = %w[thunder sunny rain wind hail].freeze

    def create
      frames = params.require(:frames).map do |f|
        f.permit(:rms, :zcr, :spectral_centroid, :spectral_rolloff,
                 :spectralCentroid, :spectralRolloff).to_h.symbolize_keys
      end

      classifier = WeatherClassifier.new(frames)
      weather = classifier.classify
      unless ALL_WEATHERS.include?(weather)
        return render json: { weather: nil }, status: :unprocessable_entity
      end

      if (session = GameSession.find_by(session_token: params[:session_token])) && !Array(session.player_spells).include?(weather)
        return render json: { weather: nil, blocked: true }
      end

      Rails.logger.debug("WeatherClassifier avg: #{classifier.debug_avg}")
      render json: { weather: }
    end
  end
end
