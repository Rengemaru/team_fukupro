Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    post "weather", to: "weather#create"
    resources :sessions, param: :token, only: [:create, :show, :update]
  end
end
