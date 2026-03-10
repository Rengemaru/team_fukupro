#!/bin/bash
set -e

# Generate Rails app on first startup
if [ ! -f "config/application.rb" ]; then
  echo "==> Generating Rails API app..."
  rails new . --api --database=postgresql --skip-git --skip-bundle --force

  # Uncomment rack-cors (Rails 8 includes it commented out)
  sed -i 's/# gem "rack-cors"/gem "rack-cors"/' Gemfile

  # Configure CORS to allow frontend dev server
  mkdir -p config/initializers
  cat > config/initializers/cors.rb << 'CORS_EOF'
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:5173"
    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
CORS_EOF

  # Configure weather API endpoint placeholder
  mkdir -p app/controllers/api
  cat > app/controllers/api/weather_controller.rb << 'CTRL_EOF'
module Api
  class WeatherController < ApplicationController
    def create
      # TODO: Implement WeatherClassifier
      # Receives audio features from frontend, returns weather result
      render json: { weather: "sunny", message: "WeatherClassifier not yet implemented" }
    end
  end
end
CTRL_EOF

  echo "==> Rails app initialized."
fi

echo "==> Installing gems..."
bundle install

echo "==> Setting up database..."
bundle exec rails db:prepare 2>/dev/null || bundle exec rails db:create db:migrate 2>/dev/null || true

# Remove stale server pid
rm -f tmp/pids/server.pid

exec "$@"
