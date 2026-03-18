class UpdateEnemiesForWeatherArrays < ActiveRecord::Migration[8.1]
  def change
    remove_column :enemies, :weakness_weather, :string if column_exists?(:enemies, :weakness_weather)

    add_column :enemies, :weakness_weathers, :string, null: false, default: [], array: true
    add_column :enemies, :immune_weathers,   :string, null: false, default: [], array: true
  end
end
