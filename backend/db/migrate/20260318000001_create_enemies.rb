class CreateEnemies < ActiveRecord::Migration[8.1]
  def change
    create_table :enemies do |t|
      t.string  :name,             null: false
      t.string  :weakness_weather, null: false
      t.integer :max_hp,           null: false, default: 30
      t.integer :attack_power,     null: false, default: 10

      t.timestamps
    end
  end
end
