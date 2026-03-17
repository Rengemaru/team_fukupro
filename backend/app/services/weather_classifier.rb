class WeatherClassifier
  # 閾値定数
  RMS_HIGH               = 0.6
  RMS_MID                = 0.4
  RMS_LOW                = 0.2
  SPECTRAL_CENTROID_HIGH = 3000.0
  ZCR_HIGH               = 0.35

  # @param frames [Array<Hash>] 特徴量フレームの配列
  #   例: [{ rms: 0.6, zcr: 0.3, spectral_centroid: 3200.0, spectral_rolloff: 4800.0 }, ...]
  def initialize(frames)
    @frames = frames
  end

  # 各フレームの平均値をもとに天候を分類して返す
  # 天候種別: sunny / rain / wind / thunderstorm / hail
  # @return [String] 天候種別
  def classify
    return Constants::Weather::SUNNY if @frames.empty?

    avg = average_features

    case
    when avg[:rms] > RMS_HIGH && avg[:zcr] > ZCR_HIGH && avg[:spectral_centroid] > SPECTRAL_CENTROID_HIGH
      Constants::Weather::HAIL          # 雹: 非常に激しい・高音域・高ZCR
    when avg[:rms] > RMS_HIGH && avg[:spectral_centroid] > SPECTRAL_CENTROID_HIGH
      Constants::Weather::THUNDERSTORM  # 雷: 激しい・高音域
    when avg[:rms] > RMS_MID && avg[:zcr] > ZCR_HIGH
      Constants::Weather::WIND          # 強風: 中程度・高ZCR（風のざわめき）
    when avg[:rms] > RMS_LOW
      Constants::Weather::RAIN          # 雨: 弱〜中程度の音
    else
      Constants::Weather::SUNNY         # 晴: ほぼ無音
    end
  end

  private

  # 全フレームの各特徴量の平均値を計算する
  # @return [Hash] { rms:, zcr:, spectral_centroid:, spectral_rolloff: }
  def average_features
    count = @frames.size.to_f
    {
      rms:               @frames.sum { |f| f[:rms].to_f } / count,
      zcr:               @frames.sum { |f| f[:zcr].to_f } / count,
      spectral_centroid: @frames.sum { |f| (f[:spectral_centroid] || f[:spectralCentroid]).to_f } / count,
      spectral_rolloff:  @frames.sum { |f| (f[:spectral_rolloff]  || f[:spectralRolloff]).to_f  } / count
    }
  end
end
