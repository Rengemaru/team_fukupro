import { useEffect, useRef, useState } from 'react'
import { PhaserGame } from './components/PhaserGame'
import MikeAccess from './components/MikeAccess'
import { useSceneStore } from './store/sceneStore'
import './App.css'

function App() {
  const { currentScene, mikeVisible } = useSceneStore()
  const isVillagerScene = currentScene === 'VillagerScene'
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [canvasRect, setCanvasRect] = useState<{ left: number; bottom: number } | null>(null)

  useEffect(() => {
    if (!mikeVisible) return

    const update = () => {
      const canvas = wrapperRef.current?.querySelector('canvas')
      if (!canvas) return
      const r = canvas.getBoundingClientRect()
      // GameScene: HUD下20%、VillagerScene: HUD下23%
      const hudFraction = isVillagerScene ? 0.23 : 0.20
      const hudHeight = r.height * hudFraction
      setCanvasRect({ left: r.left, bottom: window.innerHeight - r.bottom + hudHeight })
    }

    update()
    const timer = setInterval(update, 300)
    window.addEventListener('resize', update)
    return () => { clearInterval(timer); window.removeEventListener('resize', update) }
  }, [mikeVisible, isVillagerScene])

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0d0820' }}>
      {/* デッドスペース背景 */}
      <div style={{
        position: 'absolute',
        inset: '-20px',
        backgroundImage: 'url(/mura.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(10px) brightness(0.45)',
        zIndex: 0,
      }} />

      {/* Phaser ゲームキャンバス */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <PhaserGame />
      </div>

      {/* 戦闘・村イベント時のみ: マイクをキャンバス左下に表示 */}
      {mikeVisible && canvasRect && (
        <div style={{
          position: 'fixed',
          left: canvasRect.left + 12,
          bottom: canvasRect.bottom + 12,
          zIndex: 2,
          pointerEvents: 'auto',
        }}>
          <MikeAccess />
        </div>
      )}
    </div>
  )
}

export default App
