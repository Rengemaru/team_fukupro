import Phaser from 'phaser';

export class ClearScene extends Phaser.Scene {
  constructor() { super({ key: 'ClearScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    this.drawSunsetSky(W, H);
    this.drawMountains(W, H);
    this.drawCliff(W, H);
    this.showCharacter(W, H);
    this.addUI(W, H);

    this.cameras.main.fadeIn(900);
  }

  // ─── 夕焼け空（輝く太陽アニメ付き） ─────────────────────────
  private drawSunsetSky(W: number, H: number) {
    const sunX = W * 0.32, sunY = H * 0.60;

    // ① 空グラデーション（3段）
    const sky1 = this.add.graphics();
    sky1.fillGradientStyle(0x14010a, 0x14010a, 0x8c1800, 0x8c1800, 1);
    sky1.fillRect(0, 0, W, H * 0.40);
    const sky2 = this.add.graphics();
    sky2.fillGradientStyle(0x8c1800, 0x8c1800, 0xcc4400, 0xcc4400, 1);
    sky2.fillRect(0, H * 0.40, W, H * 0.24);
    const sky3 = this.add.graphics();
    sky3.fillGradientStyle(0xcc4400, 0xcc4400, 0xee8800, 0xee8800, 1);
    sky3.fillRect(0, H * 0.64, W, H * 0.16);

    // ② ゴッドレイ（太陽から広がる光の柱・全方向）
    const diagLen = Math.sqrt(W * W + H * H);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const alpha = 0.04 + (i % 4) * 0.015;
      const ray   = this.add.graphics();
      ray.fillStyle(0xffdd88, alpha);
      // 扇形で描画
      ray.beginPath();
      ray.moveTo(sunX, sunY);
      const a1 = angle - 0.06, a2 = angle + 0.06;
      ray.lineTo(sunX + Math.cos(a1) * diagLen, sunY + Math.sin(a1) * diagLen);
      ray.lineTo(sunX + Math.cos(a2) * diagLen, sunY + Math.sin(a2) * diagLen);
      ray.closePath(); ray.fillPath();
      // ゆらめきアニメ
      this.tweens.add({
        targets: ray, alpha: alpha * 0.3,
        duration: 1800 + i * 280,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: i * 160,
      });
      // 幅も変化
      this.tweens.add({
        targets: ray, scaleX: 1 + (i % 2) * 0.08,
        duration: 2400 + i * 200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ③ 地平線グロー（横帯）
    const hGlow = this.add.graphics();
    hGlow.fillGradientStyle(0xff9900, 0xff9900, 0xcc4400, 0xcc4400, 0.58);
    hGlow.fillRect(0, sunY - 50, W, 100);
    this.tweens.add({ targets: hGlow, alpha: 0.75, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ④ 太陽外周グロー（多重円・パルス）
    const glowData = [
      { r: 170, color: 0xffaa22, a: 0.04 },
      { r: 135, color: 0xffbb33, a: 0.08 },
      { r: 105, color: 0xffcc44, a: 0.15 },
      { r:  80, color: 0xffdd55, a: 0.28 },
    ];
    glowData.forEach(({ r, color, a }, i) => {
      const c = this.add.circle(sunX, sunY, r, color, a);
      this.tweens.add({
        targets: c, scaleX: 1.12, scaleY: 1.12, alpha: a * 0.4,
        duration: 1600 + i * 350,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: i * 200,
      });
    });

    // ⑤ 近距離放射状光線（回転アニメ）
    const raysGfx = this.add.graphics();
    raysGfx.setPosition(sunX, sunY);
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const inner = 54, outer = 82 + (i % 4 === 0 ? 28 : i % 4 === 1 ? 14 : 0);
      const lw    = i % 4 === 0 ? 3 : i % 4 === 1 ? 2 : 1;
      const la    = i % 4 === 0 ? 0.60 : i % 4 === 1 ? 0.40 : 0.22;
      raysGfx.lineStyle(lw, 0xffee88, la);
      raysGfx.beginPath();
      raysGfx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      raysGfx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      raysGfx.strokePath();
    }
    // ゆっくり回転
    this.tweens.add({ targets: raysGfx, angle: 360, duration: 12000, repeat: -1, ease: 'Linear' });

    // ⑥ 太陽本体（中心ほど明るい）
    this.add.circle(sunX, sunY, 52, 0xffcc44, 0.95);
    this.add.circle(sunX, sunY, 42, 0xffee66, 1.0);
    this.add.circle(sunX, sunY, 30, 0xffffff, 0.90);
    // コアのパルス
    const core = this.add.circle(sunX, sunY, 36, 0xffee66, 0.55);
    this.tweens.add({ targets: core, scaleX: 1.15, scaleY: 1.15, alpha: 0.28, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ⑦ 赤雲（複数・一部シマー）
    const cloudData = [
      { x:W*0.08, y:H*0.09, w:220, h:40, c:0x6a0c00, a:0.82 },
      { x:W*0.52, y:H*0.06, w:290, h:54, c:0x7c1400, a:0.76 },
      { x:W*0.83, y:H*0.13, w:200, h:38, c:0x601000, a:0.72 },
      { x:W*0.20, y:H*0.20, w:250, h:46, c:0x741400, a:0.68 },
      { x:W*0.66, y:H*0.24, w:215, h:42, c:0x6a1200, a:0.62 },
      { x:W*0.04, y:H*0.32, w:170, h:34, c:0x5a1000, a:0.58 },
      { x:W*0.76, y:H*0.37, w:195, h:38, c:0x641200, a:0.55 },
      { x:W*0.40, y:H*0.29, w:160, h:30, c:0x721600, a:0.50 },
    ];
    cloudData.forEach(({ x, y, w, h, c, a }) => {
      const cg = this.add.graphics();
      cg.fillStyle(c, a);
      cg.fillEllipse(x, y, w, h);
      cg.fillEllipse(x - w*0.28, y + h*0.22, w*0.65, h*0.65);
      cg.fillEllipse(x + w*0.28, y + h*0.18, w*0.58, h*0.60);
      // 太陽に近い雲はシマー
      if (Math.abs(x - sunX) < W * 0.3 && Math.abs(y - sunY) < H * 0.25) {
        this.tweens.add({ targets: cg, alpha: a * 0.70, duration: 2800 + Math.random() * 2000, yoyo: true, repeat: -1 });
      }
    });
  }

  // ─── 山のシルエット ────────────────────────────────────────
  private drawMountains(W: number, H: number) {
    // 遠景（薄め）
    const far = this.add.graphics();
    far.fillStyle(0x3a1206, 0.55);
    far.beginPath();
    far.moveTo(0, H * 0.75);
    far.lineTo(0, H * 0.52); far.lineTo(W*0.06, H*0.44); far.lineTo(W*0.14, H*0.51);
    far.lineTo(W*0.22, H*0.40); far.lineTo(W*0.30, H*0.48); far.lineTo(W*0.38, H*0.43);
    far.lineTo(W*0.46, H*0.52); far.lineTo(W*0.55, H*0.75);
    far.closePath(); far.fillPath();

    // 中景（濃い）
    const mid = this.add.graphics();
    mid.fillStyle(0x280c04, 0.90);
    mid.beginPath();
    mid.moveTo(0, H * 0.75);
    mid.lineTo(0, H * 0.60); mid.lineTo(W*0.05, H*0.52); mid.lineTo(W*0.12, H*0.60);
    mid.lineTo(W*0.18, H*0.48); mid.lineTo(W*0.26, H*0.58); mid.lineTo(W*0.34, H*0.52);
    mid.lineTo(W*0.42, H*0.60); mid.lineTo(W*0.50, H*0.75);
    mid.closePath(); mid.fillPath();

    // 地平線の平地
    const plain = this.add.graphics();
    plain.fillStyle(0x1e0a02, 0.95);
    plain.fillRect(0, H * 0.75, W * 0.54, H * 0.25);
  }

  // ─── 崖（右側） ──────────────────────────────────────────
  private drawCliff(W: number, H: number) {
    const cliffLeft = W * 0.28;
    const cliffTop  = H * 0.63;

    // 崖上面（石畳風）
    const cliff = this.add.graphics();
    cliff.fillStyle(0x8a7050, 1.0);
    cliff.fillRect(cliffLeft, cliffTop, W - cliffLeft, H * 0.12);

    // 崖の側面
    cliff.fillStyle(0x503820, 1.0);
    cliff.beginPath();
    cliff.moveTo(cliffLeft, cliffTop);
    cliff.lineTo(cliffLeft - 22, cliffTop + 18);
    cliff.lineTo(cliffLeft - 18, H);
    cliff.lineTo(W, H);
    cliff.lineTo(W, cliffTop + H * 0.12);
    cliff.closePath(); cliff.fillPath();

    // 石のひび・テクスチャ
    cliff.lineStyle(1, 0x6a5030, 0.5);
    [[cliffLeft+30, cliffTop+5, 70, cliffTop+5],
     [cliffLeft+120, cliffTop+8, 200, cliffTop+4],
     [cliffLeft+260, cliffTop+6, 380, cliffTop+9],
     [cliffLeft+30, cliffTop+20, 110, cliffTop+22],
     [cliffLeft-10, cliffTop+28, cliffLeft+20, cliffTop+35],
     [cliffLeft-8, cliffTop+45, cliffLeft+15, cliffTop+55],
    ].forEach(([x1,y1,x2,y2]) => {
      cliff.beginPath(); cliff.moveTo(x1,y1); cliff.lineTo(x2,y2); cliff.strokePath();
    });

    // 崖の端の草
    cliff.fillStyle(0x3a6a14, 0.85);
    for (let gx = cliffLeft + 8; gx < cliffLeft + 160; gx += 14) {
      const gh = Phaser.Math.Between(8, 14);
      cliff.fillTriangle(gx, cliffTop, gx-4, cliffTop+gh, gx+4, cliffTop+gh);
    }
    // 小石
    cliff.fillStyle(0x6a5535, 0.9);
    [[cliffLeft+55,cliffTop+8,14,9],[cliffLeft+95,cliffTop+5,9,7],[W-90,cliffTop+7,12,8]].forEach(([x,y,rw,rh]) => {
      cliff.fillEllipse(x, y, rw, rh);
    });
    // 右端の草
    cliff.fillStyle(0x2e5510, 0.75);
    for (let gx = W-140; gx < W; gx += 18) {
      cliff.fillTriangle(gx, cliffTop, gx-5, cliffTop+12, gx+5, cliffTop+12);
    }
  }

  // ─── キャラクター（崖の上に立つ） ────────────────────────
  private showCharacter(W: number, H: number) {
    const cliffTop = H * 0.63;
    const charX = W * 0.68;
    // walk0（タイトルで使うキー）があれば表示
    const key = ['gale_walk3','gale_walk2','gale_walk','gale_idle'].find(
      k => this.textures.exists(k) && this.textures.get(k).key !== '__MISSING'
    );
    if (key) {
      this.add.image(charX, cliffTop, key).setOrigin(0.5, 1).setScale(1.35);
    }
  }

  // ─── UI（タイトル・ボタン） ──────────────────────────────
  private addUI(W: number, H: number) {
    const FONT = '"Palatino Linotype","Palatino",Georgia,serif';

    // GAME CLEAR グロー
    this.add.text(W/2, H*0.11, 'GAME CLEAR', {
      fontSize:'58px', fontFamily:FONT, color:'#ff6600', stroke:'#aa3300', strokeThickness:18,
    }).setOrigin(0.5).setAlpha(0.32);
    // 影
    this.add.text(W/2+3, H*0.11+3, 'GAME CLEAR', {
      fontSize:'58px', fontFamily:FONT, color:'#1a0400',
    }).setOrigin(0.5);
    // 本体
    const title = this.add.text(W/2, H*0.11, 'GAME CLEAR', {
      fontSize:'58px', fontFamily:FONT,
      color:'#ffee44', stroke:'#883300', strokeThickness:5,
    }).setOrigin(0.5);
    this.tweens.add({ targets:title, alpha:0.82, duration:1600, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });

    // 装飾・サブテキスト
    this.add.text(W/2, H*0.21, '✦ ══════════════════ ✦', {
      fontSize:'13px', fontFamily:'monospace', color:'#cc6611',
    }).setOrigin(0.5).setAlpha(0.85);
    this.add.text(W/2, H*0.265, '〜 嵐の果てに、海が見えた 〜', {
      fontSize:'17px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#ffcc88', stroke:'#1a0800', strokeThickness:2,
    }).setOrigin(0.5);
    this.add.text(W/2, H*0.32, '✦ ══════════════════ ✦', {
      fontSize:'13px', fontFamily:'monospace', color:'#cc6611',
    }).setOrigin(0.5).setAlpha(0.85);

    // タイトルへ戻るボタン
    const btnY = H * 0.435;
    const glow  = this.add.rectangle(W/2, btnY, 298, 62, 0xff8800, 0.22);
    const btn   = this.add.rectangle(W/2, btnY, 284, 54, 0x1a0800)
      .setInteractive({ useHandCursor:true })
      .setStrokeStyle(2, 0xff8800);
    const label = this.add.text(W/2, btnY, '▶  タイトルへ戻る', {
      fontSize:'26px', fontFamily:'monospace', color:'#ffcc88',
      stroke:'#0a0400', strokeThickness:2,
    }).setOrigin(0.5).setInteractive({ useHandCursor:true });

    this.tweens.add({ targets:[btn,glow,label], alpha:0.35, duration:950, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });

    const onReturn = () => {
      // レジストリ全リセット（新しいゲームのため）
      this.game.registry.set('mapNodes',       null);
      this.game.registry.set('playerNodeId',   0);
      this.game.registry.set('completedNodes', []);
      this.cameras.main.fade(700, 0, 0, 0);
      this.time.delayedCall(700, () => this.scene.start('TitleScene'));
    };
    [btn, label].forEach(o => {
      o.on('pointerover',  () => { btn.setFillStyle(0x2a1200); label.setColor('#ffffff'); });
      o.on('pointerout',   () => { btn.setFillStyle(0x1a0800); label.setColor('#ffcc88'); });
      o.on('pointerdown',  onReturn);
    });

    // 輝きパーティクル
    for (let i = 0; i < 14; i++) {
      const x = W * 0.08 + Math.random() * W * 0.84;
      const y = H * 0.04 + Math.random() * H * 0.38;
      const size = Math.random() * 2.5 + 0.8;
      const color = [0xffee44, 0xff8822, 0xffffff, 0xffcc66][Math.floor(Math.random() * 4)];
      const spark = this.add.star(x, y, 4, size * 0.4, size * 1.6, color, 0.9);
      this.tweens.add({
        targets: spark, alpha:0, scaleX:0.1, scaleY:0.1, y:y-22,
        duration: 1200 + Math.random() * 2000, delay: Math.random() * 3500,
        repeat: -1, repeatDelay: Math.random() * 1500 + 500,
      });
    }
  }
}
