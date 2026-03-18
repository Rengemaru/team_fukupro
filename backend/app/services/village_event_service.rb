class VillageEventService
  def self.call(village_event:, weather:, player_hp:, player_max_hp:)
    new(village_event: village_event, weather: weather,
        player_hp: player_hp, player_max_hp: player_max_hp).execute
  end

  def initialize(village_event:, weather:, player_hp:, player_max_hp:)
    @event        = VILLAGE_EVENT_TYPES[village_event]
    raise ArgumentError, "Unknown village_event: #{village_event}" unless @event

    @weather      = weather
    @player_hp    = player_hp
    @player_max_hp = player_max_hp
  end

  def execute
    if @event[:correct_weathers].include?(@weather)
      outcome  = "success"
      hp_delta = @event[:hp_reward]
      new_hp   = [ @player_hp + hp_delta, @player_max_hp ].min
      message  = @event[:success_message]
    elsif @event[:penalty_weathers].include?(@weather)
      outcome  = "penalty"
      hp_delta = -@event[:hp_penalty]
      new_hp   = [ @player_hp + hp_delta, 0 ].max
      message  = @event[:penalty_message]
    else
      outcome  = "neutral"
      hp_delta = 0
      new_hp   = @player_hp
      message  = "天候の影響はなかった"
    end

    { outcome: outcome, hp_delta: hp_delta, player_current_hp: new_hp, message: message }
  end
end
