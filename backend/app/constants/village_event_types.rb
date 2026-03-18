VILLAGE_EVENT_TYPES = {
  "drought" => {
    label:            "村の干ばつ",
    correct_weathers: [ "water", "hail" ],
    penalty_weathers: [ "fire" ],
    hp_reward:        1,
    hp_penalty:       1,
    success_message:  "恵みの雨が大地を潤した！",
    penalty_message:  "強い日差しが大地を乾かし、干ばつが悪化した..."
  },
  "heavy_rain" => {
    label:            "大雨",
    correct_weathers: [ "fire" ],
    penalty_weathers: [ "water", "thunder" ],
    hp_reward:        1,
    hp_penalty:       1,
    success_message:  "晴れ間が大雨を和らげた！",
    penalty_message:  "さらなる雨が大雨の被害を広げた..."
  },
  "sailing" => {
    label:            "帆船が動かない",
    correct_weathers: [ "wind" ],
    penalty_weathers: [ "thunder" ],
    hp_reward:        1,
    hp_penalty:       1,
    success_message:  "強風が帆船を力強く動かした！",
    penalty_message:  "嵐が帆船を危険にさらした..."
  },
  "beast" => {
    label:            "獣の群れ",
    correct_weathers: [ "thunder" ],
    penalty_weathers: [ "fire" ],
    hp_reward:        1,
    hp_penalty:       1,
    success_message:  "雷鳴が獣の群れを追い払った！",
    penalty_message:  "穏やかな天気に獣が活発になった..."
  }
}.freeze
