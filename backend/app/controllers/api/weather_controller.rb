module Api
  class WeatherController < ApplicationController
    def create
      # TODO: Implement WeatherClassifier
      # Receives audio features from frontend, returns weather result
      render json: {weather: "sunny", message: "WeatherClassifier not yet implemented" }
    end
  end
end
