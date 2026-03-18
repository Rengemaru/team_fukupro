module Constants
  module Weather
    SUNNY        = "fire"
    RAIN         = "water"
    WIND         = "wind"
    THUNDERSTORM = "thunder"
    HAIL         = "hail"

    ALL = [ SUNNY, RAIN, WIND, THUNDERSTORM, HAIL ].freeze
  end
end
