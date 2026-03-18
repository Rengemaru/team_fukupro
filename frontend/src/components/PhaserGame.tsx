import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { useWeatherStore } from '../store/weatherStore';

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Zustand の weather を Phaser のイベントバスに流す
  useEffect(() => {
    const unsubscribe = useWeatherStore.subscribe((state) => {
      if (gameRef.current && state.weather) {
        gameRef.current.events.emit('weatherChanged', state.weather);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    let mounted = true;

    (async () => {
      // 動的インポート：Phaser とシーンをランタイムで読み込む
      const [{ default: Phaser }, { TitleScene }, { GameScene }, { MapScene }, { VillagerScene }, { ClearScene }, { GameOverScene }] = await Promise.all([
        import('phaser'),
        import('../scenes/TitleScene'),
        import('../scenes/GameScene'),
        import('../scenes/MapScene'),
        import('../scenes/VillagerScene'),
        import('../scenes/ClearScene'),
        import('../scenes/GameOverScene'),
      ]);

      if (!mounted || !containerRef.current) return;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: containerRef.current,
        backgroundColor: '#0d0820',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        pixelArt: true,
        scene: [TitleScene, MapScene, GameScene, VillagerScene, ClearScene, GameOverScene],
      });
    })();

    return () => {
      mounted = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
