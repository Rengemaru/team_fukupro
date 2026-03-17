import { useState } from 'react'
import { PhaserGame } from './components/PhaserGame'
import HPHeart from './components/HPHeart'
import MikeAccess from './components/MikeAccess'
import WeatherIcon from './component/wether_icon'
import type { WeatherType } from './component/wether_icon'
import { useWeatherStore } from './store/weatherStore'
import './App.css'

const VALID_WEATHER: WeatherType[] = ['sunny', 'rain', 'thunder', 'wind', 'hail']

function App() {
  const maxHP = 3
  const [hp] = useState(maxHP)
  const { weather } = useWeatherStore()

  const currentWeather = VALID_WEATHER.includes(weather as WeatherType)
    ? (weather as WeatherType)
    : null

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0d0820' }}>
      {/* Phaser ゲームキャンバス */}
      <PhaserGame />

      {/* HUD オーバーレイ */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* 左上: HP */}
        <div style={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'auto' }}>
          <HPHeart currentHP={hp} maxHP={maxHP} />
        </div>

        {/* 右上: 天候アイコン */}
        {currentWeather && (
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <WeatherIcon weather={currentWeather} />
          </div>
        )}

        {/* 左下: マイク */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, pointerEvents: 'auto' }}>
          <MikeAccess />
        </div>
      </div>
    </div>
  )
}

export default App
