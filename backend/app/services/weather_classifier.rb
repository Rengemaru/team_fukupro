class WeatherClassifier
  # 表示dB = 20*log10(rms) + 60 の逆算
  RMS_WIND      = 10 ** ((10 - 60) / 20.0)   #  10dB → ~0.00316
  RMS_SUNNY     = 10 ** ((20 - 60) / 20.0)   #  20dB → 0.01
  RMS_RAIN      = 10 ** ((30 - 60) / 20.0)   #  30dB → ~0.0316
  RMS_THUNDER   = 10 ** ((40 - 60) / 20.0)   #  40dB → 0.1
  # 41dB以上 → 雹

  def initialize(frames)
    @frames = frames
  end

  # 平均RMSをdBスケールで分類
  # 天候種別: sunny / rain / wind / thunderstorm / hail
  def classify
    return Weather::SUNNY if @frames.empty?

    avg_rms = average_rms

    case
    when avg_rms >= RMS_THUNDER
      Weather::HAIL          # 41dB以上 → 雹
    when avg_rms >= RMS_RAIN
      Weather::THUNDERSTORM  # 31〜40dB → 雷
    when avg_rms >= RMS_SUNNY
      Weather::RAIN          # 21〜30dB → 雨
    when avg_rms >= RMS_WIND
      Weather::SUNNY         # 11〜20dB → 晴れ
    else
      Weather::WIND          # 0〜10dB → 風
    end
  end

  def debug_avg
    { avg_rms: average_rms, display_db: (20 * Math.log10([ average_rms, 1e-10 ].max) + 60).round(1) }
  end

  private

  def average_rms
    @frames.sum { |f| f[:rms].to_f } / @frames.size.to_f
  end
end
