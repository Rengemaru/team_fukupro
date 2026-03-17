import { useState, useRef } from 'react'
import Meyda from 'meyda'
import type { MeydaAnalyzer, MeydaFeaturesObject } from 'meyda'
import './App.css'

type MicStatus = 'idle' | 'active' | 'denied' | 'error'

function App() {
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const meydaAnalyzerRef = useRef<MeydaAnalyzer | null>(null)

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
        featureExtractors: ['rms', 'spectralCentroid'],
        callback: (features: Partial<MeydaFeaturesObject>) => {
          console.log('rms:', features.rms, 'spectralCentroid:', features.spectralCentroid)
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
            <p>マイクへのアクセスが拒否されました。</p>
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

export default App
