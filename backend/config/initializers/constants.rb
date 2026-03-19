Dir[Rails.root.join("app/constants/**/*.rb")].each { |f| require f }
