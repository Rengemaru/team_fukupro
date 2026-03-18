FROM ruby:3.3-slim

RUN apt-get update -qq && apt-get install -y \
    build-essential \
    libpq-dev \
    libvips-dev \
    libyaml-dev \
    nodejs \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN gem install rails -v '~> 8.1' --no-document

WORKDIR /app

COPY Gemfile Gemfile.lock* ./
RUN bundle install

COPY entrypoint.sh /usr/bin/entrypoint.sh
RUN sed -i 's/\r//' /usr/bin/entrypoint.sh && chmod +x /usr/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
EXPOSE 3000
CMD ["rails", "server", "-b", "0.0.0.0"]
