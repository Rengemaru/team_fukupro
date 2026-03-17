import Phaser from 'phaser';

const WALK_SCALE = 1.2;  // ← 表示倍率
const WALK_KEYS  = ['gale_walk','gale_walk1','gale_walk2','gale_walk3','gale_walk4','gale_walk5'] as const;
const IDLE_KEYS  = ['gale_idle','gale_idle1','gale_idle2','gale_idle3'] as const;

// walk4/walk5 はファイル名の拡張子が異なるため個別管理
const WALK_PATHS: Record<string, string> = {
  gale_walk:  'gale_walk.jpg',
  gale_walk1: 'gale_walk1.jpg',
  gale_walk2: 'gale_walk2.jpg',
  gale_walk3: 'gale_walk3.jpg',
  gale_walk4: 'gale_walk4.jpg.png',
  gale_walk5: 'gale_walk5.png',
};

export class TitleScene extends Phaser.Scene {

  constructor() { super({ key: 'TitleScene' }); }

  // ─── アセット読み込み ──────────────────────────────────────
  preload() {
    // 歩行アニメ（個別フレーム）— walk4/walk5 は拡張子が異なる
    WALK_KEYS.forEach(key => this.load.image(key, WALK_PATHS[key]));
    // アイドルアニメ（個別フレーム）
    IDLE_KEYS.forEach(key => this.load.image(key, `${key}.jpg`));
    // 攻撃ポーズ・単体画像
    ['gale_cast','gale_atk_thunder','gale_atk_fire',
     'gale_atk_water','gale_atk_wind','gale_atk_ice'].forEach(key => {
      this.load.image(key, `${key}.jpg`);
    });
    // 雹攻撃フレーム
    ['gale_atk_hyou','gale_atk_hyou1','gale_atk_hyou2'].forEach(key => {
      this.load.image(key, `${key}.jpg`);
    });
    // 村人立ち絵
    this.load.image('man_murabito',   'man_murabito.jpg');
    this.load.image('woman_murabito', 'woman_murabito.jpg');
    // ステージ背景画像
    this.load.image('bg_taitle', 'taitle.jpg');
    this.load.image('bg_farest', 'farest1.jpg');
    this.load.image('bg_mura',    'mura.jpg');
    this.load.on('loaderror', (f: Phaser.Loader.File) =>
      console.warn('[TitleScene] load failed:', f.key));
  }

  // ─── 黒背景を透明化（ピクセル処理） ─────────────────────────
  private removeBlackBg(key: string) {
    if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') return;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const w = (src as HTMLImageElement).naturalWidth  || src.width;
    const h = (src as HTMLImageElement).naturalHeight || src.height;
    if (w === 0 || h === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(src, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      // max < 60: ほぼ黒 → 完全透明
      // max 60〜100 かつ彩度低め: JPGノイズ由来の暗い背景 → フェード
      // 有彩色（saturation高い）の暗い部分はキャラの影として残す
      if (max < 60) {
        d[i + 3] = 0;
      } else if (max < 100 && saturation < 0.55) {
        d[i + 3] = Math.round(((max - 60) / 40) * 255);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  // ─── シーン構築 ───────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const groundY = Math.floor(H * 0.84);

    // 全キャラクター画像の黒背景を除去（ゲームシーンでも共有される）
    [...WALK_KEYS, ...IDLE_KEYS,
     'gale_cast', 'gale_atk_thunder', 'gale_atk_fire',
     'gale_atk_water', 'gale_atk_wind', 'gale_atk_ice',
     'gale_atk_hyou', 'gale_atk_hyou1', 'gale_atk_hyou2',
     'man_murabito', 'woman_murabito',
    ].forEach(key => this.removeBlackBg(key));

    this.cameras.main.setBackgroundColor('#0d0820');
    // 幅広1枚をゆっくり左右にパン（切れ目なし）
    const bgImg = this.add.image(W / 2 + W * 0.25, H / 2, 'bg_taitle').setDisplaySize(W * 1.5, H);
    this.tweens.add({
      targets: bgImg,
      x: W / 2 - W * 0.25,
      duration: 18000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createCharacter(W / 2, groundY);
    this.addTitle(W, H);
    this.addStartButton(W, H);
    this.addLocationPath(W, groundY);

    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.cameras.main.fadeIn(600);
  }


  // ─── キャラクター（歩行スプライト） ───────────────────────
  private createCharacter(cx: number, cy: number) {
    const hasWalk = this.textures.exists('gale_walk') &&
                    this.textures.get('gale_walk').key !== '__MISSING';

    if (hasWalk) {
      // 個別フレームを手動サイクル
      const img = this.add.image(cx, cy, WALK_KEYS[0])
        .setOrigin(0.5, 1)
        .setScale(WALK_SCALE);

      // 最初のフレームの表示サイズを固定値として全フレームに統一する
      const fixedW = img.displayWidth;
      const fixedH = img.displayHeight;

      let fi = 0;
      this.time.addEvent({
        delay: 125,   // 8fps
        repeat: -1,
        callback: () => {
          fi = (fi + 1) % WALK_KEYS.length;
          img.setTexture(WALK_KEYS[fi]);
          img.setDisplaySize(fixedW, fixedH);  // サイズを統一
        },
      });
      // 足元の影
      this.add.ellipse(cx, cy + 4, 55, 12, 0x000000, 0.35);
      // 魔法エフェクト（キャラ高さの約半分を上にオフセット）
      this.addMagicEffects(cx, cy - 80);
    } else {
      // スプライト未配置 → ドット絵フォールバック
      this.makeCharacterTexture();
      const img = this.add.image(cx, cy - 60, 'weather_mage');
      this.tweens.add({ targets: img, y: cy - 68, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.addMagicEffects(cx, cy - 60);
    }
  }

  // ─── ドット絵フォールバック ────────────────────────────────
  makeCharacterTexture() {
    if (this.textures.exists('weather_mage')) return;
    const P = 4;
    const g = this.make.graphics({ x: 0, y: 0 });
    const r = (c: number, row: number, w: number, h: number, col: number) => { g.fillStyle(col); g.fillRect(c*P, row*P, w*P, h*P); };
    const H2=0xe8ecff,H3=0x9098c0,SK=0xffcc99,SK2=0xcc9966,EY=0x2277ee,EYH=0xaaddff,MO=0xcc7755;
    const RB=0x2255cc,RB2=0x0e2a88,RBL=0x4488ff,IN=0xfafafa,GO=0xddaa22,GOL=0xffcc44,BO=0x5a3010,BO2=0x3a1a00;
    const WD=0x7a4e2a,GM=0x66ccff,GMH=0xaaddff,GMD=0x0066aa;
    r(1,7,2,22,WD);r(2,2,2,1,GMH);r(1,3,4,1,GM);r(0,4,6,2,GM);r(1,6,4,1,GMD);r(0,4,1,2,GMD);r(5,4,1,2,GMD);r(2,3,1,1,GMH);
    r(8,0,8,1,H2);r(6,1,12,1,H2);r(5,2,14,2,H2);r(4,3,2,4,H2);r(18,3,2,4,H2);r(6,4,12,2,H2);r(5,5,3,1,H3);r(16,5,3,1,H3);r(7,6,2,1,H3);r(15,6,2,1,H3);
    r(6,4,12,8,SK);r(8,6,2,2,EY);r(14,6,2,2,EY);r(8,6,1,1,EYH);r(14,6,1,1,EYH);r(11,8,2,1,SK2);r(9,10,6,1,MO);r(10,11,4,2,SK);
    r(6,12,4,1,GO);r(14,12,4,1,GO);r(3,13,2,14,RB2);r(19,13,2,14,RB2);r(2,16,2,9,RB2);r(20,16,2,9,RB2);
    r(5,12,14,12,RB);r(6,12,2,10,RBL);r(16,12,2,10,RBL);r(8,12,8,9,IN);r(5,22,14,2,GO);r(10,22,4,2,GOL);
    r(4,24,16,2,RB);r(3,26,18,1,RB2);r(5,26,14,1,RB);r(7,27,4,2,RB2);r(13,27,4,2,RB2);
    r(6,28,5,2,BO);r(13,28,5,2,BO);r(5,29,6,1,BO2);r(13,29,6,1,BO2);
    r(20,13,2,4,SK);r(21,16,2,3,SK);r(21,18,2,1,SK);r(20,13,2,1,RB);r(4,13,2,4,RB);
    g.generateTexture('weather_mage', 24*P, 30*P); g.destroy();
  }

  // ─── 魔法エフェクト ────────────────────────────────────────
  private addMagicEffects(cx: number, centerY: number) {
    const colors = [0x88ccff, 0xffffff, 0xffddff, 0x88ffee, 0xffee88, 0xaaffff];
    colors.forEach((color, i) => {
      const angle = (i / colors.length) * Math.PI * 2;
      const dot = this.add.circle(cx + Math.cos(angle)*68, centerY + Math.sin(angle)*22, 4, color, 0.85);
      this.tweens.add({ targets: dot, x: cx + Math.cos(angle+Math.PI)*68, y: centerY + Math.sin(angle+Math.PI)*22, duration: 2200+i*80, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
      this.tweens.add({ targets: dot, alpha: 0.15, duration: 900+i*130, yoyo:true, repeat:-1, delay:i*180 });
    });
    const glow = this.add.circle(cx - 40, centerY - 30, 14, 0x44aaff, 0.4);
    this.tweens.add({ targets: glow, scaleX:1.8, scaleY:1.8, alpha:0.08, duration:1100, yoyo:true, repeat:-1 });
  }

  // ─── タイトル文字（冒険・魔法スタイル） ──────────────────────
  private addTitle(W: number, H: number) {
    const FONT = '"Palatino Linotype","Palatino","Book Antiqua",Georgia,serif';

    // 上部装飾
    this.add.text(W/2, H*0.055, '✦ ══════════════════════════ ✦', {
      fontSize:'13px', fontFamily:'monospace', color:'#aa8822',
    }).setOrigin(0.5).setAlpha(0.85);
    this.add.text(W/2, H*0.105, '声で天候を操る　ローグライクRPG', {
      fontSize:'15px', fontFamily:'"Yu Gothic","YuGothic",monospace',
      color:'#ddaa44', stroke:'#1a0800', strokeThickness:3,
    }).setOrigin(0.5);

    // ── WEATHER（空・魔法の青白） ──
    // グロー層
    this.add.text(W/2, H*0.205, 'WEATHER', {
      fontSize:'56px', fontFamily:FONT, color:'#4488ff',
      stroke:'#2244cc', strokeThickness:14,
    }).setOrigin(0.5).setAlpha(0.35);
    // 影
    this.add.text(W/2+3, H*0.205+3, 'WEATHER', {
      fontSize:'56px', fontFamily:FONT, color:'#0a1040',
    }).setOrigin(0.5);
    // 本体
    const w1 = this.add.text(W/2, H*0.205, 'WEATHER', {
      fontSize:'56px', fontFamily:FONT,
      color:'#d8ecff', stroke:'#1a44cc', strokeThickness:5,
    }).setOrigin(0.5);

    // ── ROGUE（冒険・炎の金） ──
    // グロー層
    this.add.text(W/2, H*0.305, 'ROGUE', {
      fontSize:'68px', fontFamily:FONT, color:'#ff8800',
      stroke:'#aa4400', strokeThickness:16,
    }).setOrigin(0.5).setAlpha(0.30);
    // 影
    this.add.text(W/2+3, H*0.305+3, 'ROGUE', {
      fontSize:'68px', fontFamily:FONT, color:'#2a1000',
    }).setOrigin(0.5);
    // 本体
    const w2 = this.add.text(W/2, H*0.305, 'ROGUE', {
      fontSize:'68px', fontFamily:FONT,
      color:'#ffe066', stroke:'#8a3a00', strokeThickness:5,
    }).setOrigin(0.5);

    this.tweens.add({ targets:w1, alpha:0.88, duration:2000, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    this.tweens.add({ targets:w2, alpha:0.88, duration:2400, yoyo:true, repeat:-1, ease:'Sine.easeInOut', delay:300 });

    // サブタイトル
    this.add.text(W/2, H*0.395, '〜 嵐の果てに海を目指せ 〜', {
      fontSize:'16px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#aabbdd', stroke:'#0a0820', strokeThickness:2,
    }).setOrigin(0.5);

    // 下部装飾
    this.add.text(W/2, H*0.44, '✦ ══════════════════════════ ✦', {
      fontSize:'13px', fontFamily:'monospace', color:'#aa8822',
    }).setOrigin(0.5).setAlpha(0.85);

    // タイトル周囲の魔法パーティクル
    this.addTitleSparkles(W, H);
  }

  // ─── タイトル装飾パーティクル ──────────────────────────────
  private addTitleSparkles(W: number, H: number) {
    const colors = [0xffd844, 0x88aaff, 0xffffff, 0xff9922, 0xaaddff];
    for (let i = 0; i < 18; i++) {
      const x = W * 0.08 + Math.random() * W * 0.84;
      const y = H * 0.06 + Math.random() * H * 0.38;
      const size = Math.random() * 2.5 + 0.8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const spark = this.add.star(x, y, 4, size * 0.4, size * 1.6, color, 0.85);
      this.tweens.add({
        targets: spark,
        alpha: 0, scaleX: 0.1, scaleY: 0.1, y: y - 25,
        duration: 1200 + Math.random() * 2000,
        delay: Math.random() * 3500,
        repeat: -1,
        repeatDelay: Math.random() * 1500 + 500,
      });
    }
  }

  // ─── スタートボタン ────────────────────────────────────────
  private addStartButton(W: number, H: number) {
    const btnY = H * 0.91;
    const glow  = this.add.rectangle(W/2, btnY, 294, 62, 0x4488ff, 0.25);
    const btn   = this.add.rectangle(W/2, btnY, 280, 54, 0x0d1a44).setInteractive({ useHandCursor:true }).setStrokeStyle(2, 0x4488ff);
    const label = this.add.text(W/2, btnY, '▶  START GAME', { fontSize:'28px', fontFamily:'monospace', color:'#aaddff', stroke:'#001144', strokeThickness:2 }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    this.add.text(W/2, btnY+37, 'SPACE / ENTER でもスタート', { fontSize:'12px', fontFamily:'"Yu Gothic","YuGothic",monospace', color:'#445566' }).setOrigin(0.5);
    this.tweens.add({ targets:[btn,glow,label], alpha:0.3, duration:950, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    const onOver = () => { btn.setFillStyle(0x1a3377); label.setColor('#ffffff'); };
    const onOut  = () => { btn.setFillStyle(0x0d1a44); label.setColor('#aaddff'); };
    [btn, label].forEach(o => { o.on('pointerover', onOver); o.on('pointerout', onOut); o.on('pointerdown', () => this.startGame()); });
  }

  // ─── 地名パス ──────────────────────────────────────────────
  private addLocationPath(W: number, groundY: number) {
    const locs = ['村','森','ダンジョン','砂漠','雪山','海'];
    const startX = W * 0.06, spacing = (W * 0.88) / (locs.length - 1), pathY = groundY + 22;
    locs.forEach((name, i) => {
      const x = startX + i * spacing, isFirst = i === 0;
      this.add.circle(x, pathY, isFirst ? 6 : 3, isFirst ? 0xffdd00 : 0x3a5266);
      if (i < locs.length - 1) {
        const lg = this.add.graphics();
        lg.lineStyle(1, 0x2a3d4d, 0.8); lg.beginPath(); lg.moveTo(x+8, pathY); lg.lineTo(x+spacing-8, pathY); lg.strokePath();
        lg.fillStyle(0x2a3d4d, 0.8); lg.fillTriangle(x+spacing-7, pathY-4, x+spacing+1, pathY, x+spacing-7, pathY+4);
      }
      this.add.text(x, pathY+7, name, { fontSize: isFirst?'13px':'11px', fontFamily:'"Yu Gothic","YuGothic",monospace', color: isFirst?'#ffdd00':'#3a5a6a' }).setOrigin(0.5, 0);
    });
    this.tweens.add({ targets: this.add.text(startX, pathY-22, '▼', { fontSize:'12px', fontFamily:'monospace', color:'#ffdd00' }).setOrigin(0.5), y: pathY-18, duration:500, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
  }

  // ─── ゲーム開始 ────────────────────────────────────────────
  private startGame() {
    this.input.keyboard?.removeAllListeners();
    this.cameras.main.fade(700, 0, 0, 0);
    this.time.delayedCall(700, () => this.scene.start('MapScene'));
  }

  update() {
    // 背景スクロールはtweenで管理
  }
}
