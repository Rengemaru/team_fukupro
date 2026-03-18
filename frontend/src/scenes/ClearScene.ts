import Phaser from 'phaser';
import { usePlayerStore } from '../store/playerStore';

export class ClearScene extends Phaser.Scene {
  constructor() { super({ key: 'ClearScene' }); }

  preload() {
    if (!this.textures.exists('clear')) this.load.image('clear', 'clear.jpg');
  }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // ① 黒背景
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

    // ② クリア画像フェードイン
    const img = this.add.image(W / 2, H / 2, 'clear').setDisplaySize(W, H).setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 1800, ease: 'Sine.easeIn' });

    // ③ 暗めのビネット（周囲を暗くして中央を引き立てる）
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    vignette.fillRect(0, 0, W, H * 0.5);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    vignette.fillRect(0, H * 0.5, W, H * 0.5);
    vignette.setAlpha(0);
    this.tweens.add({ targets: vignette, alpha: 1, duration: 2000, delay: 400, ease: 'Sine.easeIn' });

    // ④ GAME CLEAR テキスト群（最初は非表示）
    const titleY = H * 0.20;

    // 最外周グロー（大きくぼかした感じ）
    const glow3 = this.add.text(W / 2, titleY, 'GAME CLEAR', {
      fontSize: '72px', fontFamily: '"Palatino Linotype","Palatino",Georgia,serif',
      color: '#ff8800', stroke: '#ff6600', strokeThickness: 40,
    }).setOrigin(0.5).setAlpha(0);

    // 中間グロー
    const glow2 = this.add.text(W / 2, titleY, 'GAME CLEAR', {
      fontSize: '72px', fontFamily: '"Palatino Linotype","Palatino",Georgia,serif',
      color: '#ffcc44', stroke: '#dd7700', strokeThickness: 22,
    }).setOrigin(0.5).setAlpha(0);

    // 影
    const shadow = this.add.text(W / 2 + 5, titleY + 6, 'GAME CLEAR', {
      fontSize: '72px', fontFamily: '"Palatino Linotype","Palatino",Georgia,serif',
      color: '#1a0400',
    }).setOrigin(0.5).setAlpha(0);

    // 本体テキスト（上から降りてくる）
    const mainText = this.add.text(W / 2, titleY - 40, 'GAME CLEAR', {
      fontSize: '72px', fontFamily: '"Palatino Linotype","Palatino",Georgia,serif',
      color: '#fff8cc', stroke: '#cc7700', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    // ⑤ 装飾ライン & サブテキスト
    const deco1 = this.add.text(W / 2, titleY + 55, '✦ ══════════════════════ ✦', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffaa44',
    }).setOrigin(0.5).setAlpha(0);

    const sub = this.add.text(W / 2, titleY + 85, '〜 嵐の果てに、海が見えた 〜', {
      fontSize: '19px', fontFamily: '"Yu Gothic","YuGothic",serif',
      color: '#ffe8aa', stroke: '#220800', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    const deco2 = this.add.text(W / 2, titleY + 115, '✦ ══════════════════════ ✦', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffaa44',
    }).setOrigin(0.5).setAlpha(0);

    // ⑥ タイトルへ戻るボタン
    const btnY = H * 0.88;
    const btnGlow = this.add.rectangle(W / 2, btnY, 304, 64, 0xff7700, 0.25).setAlpha(0);
    const btn     = this.add.rectangle(W / 2, btnY, 288, 56, 0x120600)
      .setStrokeStyle(2, 0xffaa44)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    const label   = this.add.text(W / 2, btnY, '▶  タイトルへ戻る', {
      fontSize: '26px', fontFamily: '"Yu Gothic","YuGothic",monospace',
      color: '#ffdd88', stroke: '#0a0400', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

    const onReturn = () => {
      this.game.registry.set('mapNodes',       null);
      this.game.registry.set('playerNodeId',   0);
      this.game.registry.set('completedNodes', []);
      // HP リセット
      usePlayerStore.getState().reset();
      this.cameras.main.fade(700, 0, 0, 0);
      this.time.delayedCall(700, () => this.scene.start('TitleScene'));
    };
    [btn, label].forEach(o => {
      o.on('pointerover',  () => { btn.setFillStyle(0x2a1000); label.setColor('#ffffff'); btnGlow.setAlpha(0.5); });
      o.on('pointerout',   () => { btn.setFillStyle(0x120600); label.setColor('#ffdd88'); btnGlow.setAlpha(1); });
      o.on('pointerdown',  onReturn);
    });

    // ─── フェードイン演出シーケンス ──────────────────────────

    // 1秒後: グロー＆影が先に出る
    this.time.delayedCall(1000, () => {
      this.tweens.add({ targets: [glow3, glow2, shadow], alpha: 1, duration: 700, ease: 'Sine.easeOut' });
    });

    // 1.3秒後: 本体テキストが上から落ちてくる
    this.time.delayedCall(1300, () => {
      this.tweens.add({
        targets: mainText,
        alpha: 1, y: titleY,
        duration: 900,
        ease: 'Back.easeOut',
        onComplete: () => {
          // 完了後パルス
          this.tweens.add({ targets: [mainText, glow2], alpha: 0.82, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: glow3, alpha: 0.45, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });
    });

    // 1.9秒後: 装飾ライン・サブテキストが左右から展開
    this.time.delayedCall(1900, () => {
      this.tweens.add({ targets: deco1, alpha: 0.9, scaleX: { from: 0, to: 1 }, duration: 600, ease: 'Sine.easeOut' });
      this.time.delayedCall(200, () => {
        this.tweens.add({ targets: sub, alpha: 1, y: { from: titleY + 100, to: titleY + 85 }, duration: 600, ease: 'Sine.easeOut' });
      });
      this.time.delayedCall(400, () => {
        this.tweens.add({ targets: deco2, alpha: 0.9, scaleX: { from: 0, to: 1 }, duration: 600, ease: 'Sine.easeOut' });
      });
    });

    // 2.6秒後: ボタンがフワッと出る
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: [btn, label, btnGlow],
        alpha: 1, y: { from: btnY + 15, to: btnY },
        duration: 700, ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: btnGlow, alpha: 0.15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });
    });

    // ⑦ キラキラパーティクル（ゴールド）
    this.time.delayedCall(1500, () => this.spawnSparkles(W, H));
  }

  private spawnSparkles(W: number, H: number) {
    const colors = [0xffee44, 0xffcc22, 0xffffff, 0xffaa00, 0xffe888];
    const spawnOne = () => {
      const x = W * 0.05 + Math.random() * W * 0.90;
      const y = H * 0.05 + Math.random() * H * 0.75;
      const size = Math.random() * 3 + 1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const spark = this.add.star(x, y, 4, size * 0.4, size * 1.8, color, 0.95);
      this.tweens.add({
        targets: spark,
        alpha: 0, scaleX: 0.1, scaleY: 0.1, y: y - 30,
        duration: 1000 + Math.random() * 1200,
        ease: 'Sine.easeIn',
        onComplete: () => spark.destroy(),
      });
      // 次のパーティクルをランダム間隔でスポーン
      this.time.delayedCall(120 + Math.random() * 300, spawnOne);
    };
    // 最初に複数同時スポーン
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 100, spawnOne);
    }
  }
}
