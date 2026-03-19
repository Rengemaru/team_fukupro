FROM ruby:3.3-slim

WORKDIR /app

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
  build-essential libpq-dev libvips-dev pkg-config && \
  rm -rf /var/lib/apt/lists/*

COPY backend/Gemfile backend/Gemfile.lock ./
RUN bundle config set --local without 'development test' && bundle install

COPY backend/ .

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

ENV RAILS_ENV=production
ENV RAILS_LOG_TO_STDOUT=true

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
