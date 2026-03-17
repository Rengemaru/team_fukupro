module Api
  class WeatherController < ApplicationController
    def create
      frames = params.require(:frames).map do |f|
        f.permit(:rms, :zcr, :spectral_centroid, :spectral_rolloff).to_h.symbolize_keys
      end

      weather = WeatherClassifier.new(frames).classify
      render json: { weather: }
    end
  end
end
