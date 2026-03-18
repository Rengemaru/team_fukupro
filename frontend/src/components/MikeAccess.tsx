import { useState, useRef } from 'react'
import Meyda from 'meyda'
import type { MeydaAnalyzer } from 'meyda/dist/node/esm/meyda-wa'
import type { MeydaFeaturesObject } from 'meyda/dist/node/esm/main'
import { useWeatherStore } from '../store/weatherStore'
import { useGameStore } from '../store/gameStore'

const RECORDING_DURATION = 1 // 秒
const WAVEFORM_LENGTH = 120

type MicStatus = 'idle' | 'recording' | 'processing' | 'denied' | 'error'

type FeatureFrame = {
  rms: number | null
  zcr: number | null
  spectralCentroid: number | null
  spectralRolloff: number | null
}

export default function MikeAccess() {
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [countdown, setCountdown] = useState(RECORDING_DURATION)
  const [db, setDb] = useState<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const meydaAnalyzerRef = useRef<MeydaAnalyzer | null>(null)
  const frameBufferRef = useRef<FeatureFrame[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveformRef = useRef<number[]>([])
  const { setWeather } = useWeatherStore()

  const drawWaveform = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // dB閾値の水平線（均等配置: 下端=0dB、60px=60dB）
    const thresholds = [
      { db: 10, color: '#44cc44' },
      { db: 20, color: '#ff4444' },
      { db: 30, color: '#4488ff' },
      { db: 40, color: '#ffcc00' },
    ]
    for (const { db, color } of thresholds) {
      const y = height - (db / 60) * height
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.setLineDash([])

    const data = waveformRef.current
    if (data.length < 2) return

    const waveColor = '#ffffff'

    ctx.beginPath()
    ctx.strokeStyle = waveColor
    ctx.lineWidth = 2

    const step = width / WAVEFORM_LENGTH
    for (let i = 0; i < data.length; i++) {
      const x = i * step
      const y = height - data[i] * height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const cleanupMic = () => {
    meydaAnalyzerRef.current?.stop()
    meydaAnalyzerRef.current = null
    sourceNodeRef.current?.disconnect()
    sourceNodeRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop())
    streamRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    waveformRef.current = []
    drawWaveform()
  }

  const finishRecording = async () => {
    const frames = [...frameBufferRef.current]
    frameBufferRef.current = []
    cleanupMic()
    setMicStatus('processing')

    try {
      const sessionToken = localStorage.getItem('session_token')
      const res = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames, session_token: sessionToken }),
      })
      const data = await res.json()
      const ownedSpells = useGameStore.getState().playerSpells
      if (data.weather && ownedSpells.includes(data.weather)) {
        setWeather(data.weather)
      }
    } finally {
      setMicStatus('idle')
      setCountdown(RECORDING_DURATION)
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
          const rawRms = features.rms ?? 0
          const dbDisplay = Math.max(0, 20 * Math.log10(Math.max(rawRms, 1e-10)) + 60)
          setDb(dbDisplay)
          waveformRef.current.push(dbDisplay / 60)
          if (waveformRef.current.length > WAVEFORM_LENGTH) waveformRef.current.shift()
          drawWaveform()
          frameBufferRef.current.push(frame)
        },
      })
      analyzer.start()

      audioContextRef.current = audioContext
      sourceNodeRef.current = sourceNode
      meydaAnalyzerRef.current = analyzer
      frameBufferRef.current = []

      setMicStatus('recording')
      setCountdown(RECORDING_DURATION)

      // カウントダウン
      let remaining = RECORDING_DURATION
      timerRef.current = setInterval(() => {
        remaining -= 1
        setCountdown(remaining)
        if (remaining <= 0) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          finishRecording()
        }
      }, 1000)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setMicStatus('denied')
      } else {
        setMicStatus('error')
      }
    }
  }

  return (
    <div className="mic-ui">
      {micStatus === 'idle' && (
        <button className="mic-btn mic-btn--idle" onClick={requestMic} title="クリックして録音開始">
          <img src="/mike.png" alt="マイク" className="mic-icon" />
        </button>
      )}
      {micStatus === 'recording' && (
        <>
          <button className="mic-btn mic-btn--active" onClick={finishRecording} title={`録音中 / あと ${countdown} 秒`}>
            <img src="/stop.png" alt="停止" className="mic-icon" />
            <span className="mic-countdown">{countdown}</span>
          </button>
          <canvas
            ref={canvasRef}
            width={200}
            height={60}
            style={{ display: 'block', background: '#1a1a2e', borderRadius: 6, margin: '6px 0' }}
          />
          <p style={{ margin: '2px 0', fontSize: '0.85em', color: '#aaa' }}>
            {db.toFixed(1)} dB
          </p>
        </>
      )}
      {micStatus === 'processing' && (
        <span className="mic-btn mic-btn--processing" title="天候を分析中...">
          <img src="/clock.png" alt="分析中" className="mic-icon" />
        </span>
      )}
      {micStatus === 'denied' && (
        <button className="mic-btn mic-btn--error" onClick={() => setMicStatus('idle')} title="マイクが拒否されました。クリックして再試行">
          <img src="/mike.png" alt="再試行" className="mic-icon mic-icon--denied" />
        </button>
      )}
      {micStatus === 'error' && (
        <button className="mic-btn mic-btn--error" onClick={() => setMicStatus('idle')} title="エラー。クリックして再試行">
          <img src="/mike.png" alt="再試行" className="mic-icon mic-icon--denied" />
        </button>
      )}
    </div>
  )
}
