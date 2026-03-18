import { useState, useRef } from 'react'
import Meyda from 'meyda'
import type { MeydaAnalyzer } from 'meyda/dist/node/esm/meyda-wa'
import type { MeydaFeaturesObject } from 'meyda/dist/node/esm/main'
import { useWeatherStore } from '../store/weatherStore'

const RECORDING_DURATION = 3 // 秒

type MicStatus = 'idle' | 'recording' | 'processing' | 'denied' | 'error'

type FeatureFrame = {
  rms: number | null
  zcr: number | null
  spectralCentroid: number | null
  spectralRolloff: number | null
}

export default function MikeAccess() {
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [volume, setVolume] = useState(0)
  const [countdown, setCountdown] = useState(RECORDING_DURATION)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const meydaAnalyzerRef = useRef<MeydaAnalyzer | null>(null)
  const frameBufferRef = useRef<FeatureFrame[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { setWeather } = useWeatherStore()

  const cleanupMic = () => {
    meydaAnalyzerRef.current?.stop()
    meydaAnalyzerRef.current = null
    sourceNodeRef.current?.disconnect()
    sourceNodeRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setVolume(0)
  }

  const finishRecording = async () => {
    const frames = [...frameBufferRef.current]
    frameBufferRef.current = []
    cleanupMic()
    setMicStatus('processing')

    try {
      const res = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames }),
      })
      const data = await res.json()
      if (data.weather) {
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
          setVolume(Math.min(1, (features.rms ?? 0) * 4))
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
        <button className="mic-btn mic-btn--active" onClick={finishRecording} title={`録音中 / あと ${countdown} 秒`}>
          <img src="/stop.png" alt="停止" className="mic-icon" />
          <span className="mic-countdown">{countdown}</span>
        </button>
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
