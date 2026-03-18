import Phaser from 'phaser';
import { usePlayerStore } from '../store/playerStore';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  preload() {
    this.load.image('game_over_bg', '/gameover.png');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // game_over.jpg を背景として表示
    if (this.textures.exists('game_over_bg')) {
      const bg = this.add.image(W / 2, H / 2, 'game_over_bg');
      bg.setDisplaySize(W, H);
    } else {
      // 画像が読み込めなかった場合は暗い背景にフォールバック
      this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a0f);
    }

    // 半透明オーバーレイ（薄め）
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.25);

    // GAME OVER テキスト（ファンタジー風・金縁）
    const title = this.add.text(W / 2, H * 0.28, 'GAME OVER', {
      fontSize: '68px',
      fontFamily: '"Georgia","Times New Roman",serif',
      color: '#e8c97a',
      stroke: '#3a1a00',
      strokeThickness: 10,
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    // サブテキスト
    const sub = this.add.text(W / 2, H * 0.48, '力尽きてしまった…', {
      fontSize: '22px',
      fontFamily: '"Georgia","Times New Roman","Yu Mincho","YuMincho",serif',
      color: '#d4b896',
      stroke: '#1a0a00',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    // タイトルへ戻るボタン
    const btn = this.add.text(W / 2, H * 0.66, '◆  タイトルへ戻る  ◆', {
      fontSize: '24px',
      fontFamily: '"Georgia","Times New Roman",serif',
      color: '#e8c97a',
      stroke: '#3a1a00',
      strokeThickness: 4,
      backgroundColor: '#1a0d00cc',
      padding: { x: 28, y: 14 },
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffffff', backgroundColor: '#3a1f00cc' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#e8c97a', backgroundColor: '#1a0d00cc' }));
    btn.on('pointerdown', () => {
      // HP をリセットしてタイトルへ
      usePlayerStore.getState().reset();
      this.cameras.main.fade(600, 0, 0, 0);
      this.time.delayedCall(600, () => this.scene.start('TitleScene'));
    });

    // フェードイン
    this.cameras.main.fadeIn(400);
    this.tweens.add({ targets: title, alpha: 1, duration: 600, ease: 'Power2' });
    this.tweens.add({ targets: sub,   alpha: 1, duration: 600, delay: 400, ease: 'Power2' });
    this.tweens.add({ targets: btn,   alpha: 1, duration: 600, delay: 800, ease: 'Power2' });

    // GAME OVER の点滅
    this.tweens.add({
      targets: title,
      alpha: 0.6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1200,
    });
  }
}
