import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import HPHeart from "./components/HPHeart"
import MikeAccess from "./components/MikeAccess"
import { useWeatherStore } from './store/weatherStore'
import './App.css'
import WeatherIcon from "./component/wether_icon"

type WeatherType = "sunny" | "rain" | "thunder" | "wind" | "hail"

const weatherOptions: WeatherType[] = ["sunny", "rain", "thunder", "wind", "hail"]

function App() {
  const maxHP = 3
  const [hp, setHP] = useState(3)
  const dealDamage = () => setHP((prev) => Math.max(0, prev - 1))
  const heal = () => setHP((prev) => Math.min(maxHP, prev + 1))

  const [count, setCount] = useState(0)
  const { weather, setWeather } = useWeatherStore()

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#eef6ff", position: "relative" }}>
      <div style={{ position: "fixed", top: 12, left: 12, zIndex: 10 }}>
        <WeatherIcon weather={(weather ?? "sunny") as WeatherType} />
      </div>

      <div
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 8px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.85)",
          border: "1px solid #ddd",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <HPHeart currentHP={hp} maxHP={maxHP} hearts={3} />
      </div>

      <div style={{ position: "fixed", left: 16, bottom: 88, display: "flex", gap: "8px" }}>
        <button onClick={dealDamage}>ダメージ -1</button>
        <button onClick={heal}>回復 +1</button>
      </div>

      <div style={{ position: "fixed", top: 16, right: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {weatherOptions.map((w) => (
          <button
            key={w}
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: "8px 12px",
              background: weather === w ? "#4f46e5" : "white",
              color: weather === w ? "white" : "#333",
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={() => setWeather(w)}
          >
            {w}
          </button>
        ))}
      </div>

      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <MikeAccess />
    </div>
  )
}

export default App
