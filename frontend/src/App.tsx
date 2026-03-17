import { useState, useRef } from 'react'
import Meyda from 'meyda'
import type { MeydaAnalyzer } from 'meyda/dist/node/esm/meyda-wa'
import type { MeydaFeaturesObject } from 'meyda/dist/node/esm/main'
import { useWeatherStore } from './store/weatherStore'
import "./App.css"
import WeatherIcon from "./component/wether_icon"

type WeatherType = "sunny" | "rain" | "thunder" | "wind" | "hail"

const weatherOptions: WeatherType[] = ["sunny", "rain", "thunder", "wind", "hail"]

const FRAME_BUFFER_SIZE = 10

type MicStatus = 'idle' | 'active' | 'denied' | 'error'

type FeatureFrame = {
  rms: number | null
  zcr: number | null
  spectralCentroid: number | null
  spectralRolloff: number | null
}

function App() {
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const meydaAnalyzerRef = useRef<MeydaAnalyzer | null>(null)
  const frameBufferRef = useRef<FeatureFrame[]>([])
  const { weather, setWeather } = useWeatherStore()

  const sendToWeatherApi = async (frames: FeatureFrame[]) => {
    const res = await fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames, weather }),
    })
    const data = await res.json()
    if (data.weather) {
      setWeather(data.weather)
    }
  }

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      const sourceNode = audioContext.createMediaStreamSource(stream)

      const analyzer = Meyda.createMeydaAnalyzer({
        audioContext,
        source: sourceNode,
        bufferSize: 512,
        featureExtractors: ['rms', 'zcr', 'spectralCentroid', 'spectralRolloff'],
        callback: (features: Partial<MeydaFeaturesObject>) => {
          const frame: FeatureFrame = {
            rms: features.rms ?? null,
            zcr: features.zcr ?? null,
            spectralCentroid: features.spectralCentroid ?? null,
            spectralRolloff: features.spectralRolloff ?? null,
          }
          frameBufferRef.current.push(frame)

          if (frameBufferRef.current.length >= FRAME_BUFFER_SIZE) {
            sendToWeatherApi(frameBufferRef.current)
            frameBufferRef.current = []
          }
        },
      })
      analyzer.start()

      audioContextRef.current = audioContext
      sourceNodeRef.current = sourceNode
      meydaAnalyzerRef.current = analyzer

      setMicStatus('active')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setMicStatus('denied')
      } else {
        setMicStatus('error')
      }
    }
  }

  const stopMic = () => {
    meydaAnalyzerRef.current?.stop()
    meydaAnalyzerRef.current = null
    sourceNodeRef.current?.disconnect()
    sourceNodeRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setMicStatus('idle')
  }

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#eef6ff", position: "relative" }}>
      <div style={{ position: "fixed", top: 12, left: 12, zIndex: 10 }}>
        <WeatherIcon weather={(weather ?? "sunny") as WeatherType} />
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

      <h1>マイクアクセス</h1>
      <div className="card">
        {micStatus === 'idle' && (
          <button onClick={requestMic}>マイクへのアクセスを許可</button>
        )}
        {micStatus === 'active' && (
          <>
            <p>マイクが使用中です</p>
            <button onClick={stopMic}>停止</button>
          </>
        )}
        {micStatus === 'denied' && (
          <div className="error-box">
            <p>マイクへのアクセスが拒否されました</p>
            <p>ブラウザのアドレスバー横にある鍵アイコンをクリックし、マイクを「許可」に変更してからページを再読み込みしてください。</p>
            <button onClick={() => setMicStatus('idle')}>再試行</button>
          </div>
        )}
        {micStatus === 'error' && (
          <div className="error-box">
            <p>マイクへのアクセス中にエラーが発生しました。</p>
            <p>マイクが接続されているか確認してください。</p>
            <button onClick={() => setMicStatus('idle')}>再試行</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
