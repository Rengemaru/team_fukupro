import { useState, useRef } from 'react'
import Meyda from 'meyda'
import type { MeydaAnalyzer } from 'meyda/dist/node/esm/meyda-wa'
import type { MeydaFeaturesObject } from 'meyda/dist/node/esm/main'
import { useWeatherStore } from '../store/weatherStore'

const FRAME_BUFFER_SIZE = 10

type MicStatus = 'idle' | 'active' | 'denied' | 'error'

type FeatureFrame = {
  rms: number | null
  zcr: number | null
  spectralCentroid: number | null
  spectralRolloff: number | null
}

export default function MikeAccess() {
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
    <>
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
    </>
  )
}
