import Phaser from 'phaser';

const SPRITE_SCALE     = 1.5;   // ← キャラクター（立ち・攻撃）の倍率
const ATK_SPRITE_SCALE = 2.0;   // ← 攻撃エフェクト画像の倍率
const IDLE_KEYS = ['gale_idle','gale_idle1','gale_idle2','gale_idle3'] as const;

// 天候タイプ → 使用するスプライト画像のキー
// ラベルとの対応:
//   thunder → Lightning Strike   (gale_atk_thunder.png)
//   fire    → Flame Strike       (gale_atk_fire.png)
//   water   → Beam Attack        (gale_atk_water.png)
//   wind    → Ice Swirl Attack A (gale_atk_wind.png)
type WeatherType = 'thunder' | 'fire' | 'water' | 'wind' | 'hail';

// API の天候 → GameScene の WeatherType マッピング
const API_WEATHER_MAP: Record<string, WeatherType> = {
  thunderstorm: 'thunder',
  rain:         'water',
  wind:         'wind',
  sunny:        'fire',
  hail:         'hail',
};

// 雹の3フレームキー
const HAIL_KEYS = ['gale_atk_hyou', 'gale_atk_hyou1', 'gale_atk_hyou2'] as const;

const WEATHER_CONFIG: Record<WeatherType, {
  label: string; emoji: string;
  spriteKey: string;
  projColor: number;
  btnColor: number; btnGlow: number;
}> = {
  thunder: { label:'雷',  emoji:'⚡', spriteKey:'gale_atk_thunder', projColor:0xffff44, btnColor:0x1a2255, btnGlow:0x8888ff },
  fire:    { label:'晴れ', emoji:'☀️', spriteKey:'gale_atk_fire',   projColor:0xffee44, btnColor:0x2a2200, btnGlow:0xffcc00 },
  water:   { label:'水',  emoji:'💧', spriteKey:'gale_atk_water',   projColor:0x44ccff, btnColor:0x002244, btnGlow:0x44aaff },
  wind:    { label:'風',  emoji:'🌀', spriteKey:'gale_atk_wind',    projColor:0x44ffaa, btnColor:0x003322, btnGlow:0x44ffaa },
  hail:    { label:'雹',  emoji:'🌨', spriteKey:'gale_atk_hyou',   projColor:0xaaddff, btnColor:0x001833, btnGlow:0x88ccff },
};

export class GameScene extends Phaser.Scene {
  private slimeHp = 30;
  private readonly slimeMaxHp = 30;
  private slimeSprite!: Phaser.GameObjects.Image;
  private slimeBounce!: Phaser.Tweens.Tween;
  private slimeHpFill!: Phaser.GameObjects.Rectangle;
  private battleLog!: Phaser.GameObjects.Text;
  private attackEnabled = true;
  private slimeX = 0;
  private slimeY = 0;
  private playerX = 0;
  private playerBaseY = 0;

  // プレイヤー表示オブジェクト
  private skyGfx!: Phaser.GameObjects.Graphics;
  private idleSprite!: Phaser.GameObjects.Image;
  private castImage!: Phaser.GameObjects.Image;
  private atkImages: Partial<Record<WeatherType, Phaser.GameObjects.Image>> = {};
  private hailFrames: (Phaser.GameObjects.Image | undefined)[] = [];
  private hailTimer?: Phaser.Time.TimerEvent;
  private hailDisplayW = 0;
  private hailDisplayH = 0;
  private currentNodeId = -1;
  private activeWeatherType: WeatherType | null = null;
  private weatherBtnRedraw: Partial<Record<WeatherType, (hover: boolean) => void>> = {};

  constructor() { super({ key: 'GameScene' }); }

  shutdown() {
    this.game.events.off('weatherChanged', undefined, this);
  }

  // ─── アセット読み込み ──────────────────────────────────────
  preload() {
    // TitleScene でロード済みの場合はスキップ
    // アイドル・歩行（個別フレーム）
    IDLE_KEYS.forEach(key => { if (!this.textures.exists(key)) this.load.image(key, `${key}.jpg`); });
    ['gale_walk','gale_walk1','gale_walk2','gale_walk3'].forEach(key => { if (!this.textures.exists(key)) this.load.image(key, `${key}.jpg`); });
    // 攻撃ポーズ・単体画像
    ['gale_cast','gale_atk_thunder','gale_atk_fire','gale_atk_water','gale_atk_wind','gale_atk_ice'].forEach(key => { if (!this.textures.exists(key)) this.load.image(key, `${key}.jpg`); });
    HAIL_KEYS.forEach(key => { if (!this.textures.exists(key)) this.load.image(key, `${key}.jpg`); });
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('[GameScene] load failed:', f.key));
  }

  create(data?: { nodeId?: number }) {
    this.currentNodeId = data?.nodeId ?? -1;
    this.slimeHp = 30;
    this.attackEnabled = true;
    const W = this.scale.width;
    const H = this.scale.height;
    this.slimeX  = W * 0.70;
    this.slimeY  = H * 0.60;
    this.playerX = W * 0.22;
    this.playerBaseY = H * 0.70;

    if (!this.textures.exists('slime')) this.makeSlimeTexture();

    this.drawBackground(W, H);
    this.createPlayer(this.playerX, this.playerBaseY);
    this.createSlime(this.slimeX, this.slimeY);
    this.createHUD(W, H);
    this.createWeatherButtons(W, H);
    this.createBackButton(W);

    this.cameras.main.fadeIn(600);

    // Zustand の天候変化を受け取り、空・エフェクトに反映する
    this.game.events.on('weatherChanged', (apiWeather: string) => {
      const type = API_WEATHER_MAP[apiWeather];
      if (type) {
        this.highlightWeatherBtn(type);
        this.attackWithWeather(type);
      }
    }, this);
  }

  // ─── 背景（2.5D奥行き感） ──────────────────────────────────
  private drawBackground(W: number, H: number) {
    const GY = H * 0.63; // 地平線

    // ① 空（天候で切り替え可）
    this.skyGfx = this.add.graphics();
    this.skyGfx.fillGradientStyle(0x0c1e44, 0x0c1e44, 0x1e5090, 0x1e5090, 1);
    this.skyGfx.fillRect(0, 0, W, GY);

    // ② 地平線グロー
    const hGlow = this.add.graphics();
    hGlow.fillGradientStyle(0x2255aa, 0x2255aa, 0x0c1e44, 0x0c1e44, 0.45);
    hGlow.fillRect(0, GY - 55, W, 55);

    // ③ 遠景山（薄い・遠近感）
    const farM = this.add.graphics();
    farM.fillStyle(0x182e50, 0.42);
    farM.beginPath(); farM.moveTo(0, GY);
    [0,90,200,320,430,540,640,720,800].forEach((x,i) => farM.lineTo(x, GY-[0,28,12,38,16,30,8,22,0][i]));
    farM.lineTo(W, GY); farM.closePath(); farM.fillPath();

    // ④ 中景山（くっきり）
    const midM = this.add.graphics();
    midM.fillStyle(0x0f1c3a, 0.88);
    midM.beginPath();
    midM.moveTo(0,GY); midM.lineTo(0,GY-72); midM.lineTo(W*0.10,GY-48); midM.lineTo(W*0.20,GY-105);
    midM.lineTo(W*0.32,GY-60); midM.lineTo(W*0.44,GY-88); midM.lineTo(W*0.53,GY-52);
    midM.lineTo(W*0.63,GY-98); midM.lineTo(W*0.76,GY-65); midM.lineTo(W*0.88,GY-110);
    midM.lineTo(W,GY-72); midM.lineTo(W,GY); midM.closePath(); midM.fillPath();
    // 雪頂
    midM.fillStyle(0xddeeff, 0.55);
    [[W*0.20,GY-105,20,26],[W*0.44,GY-88,16,20],[W*0.63,GY-98,18,23],[W*0.88,GY-110,20,28]].forEach(([px,py,tw,th]) => {
      midM.fillTriangle(px-tw, py+th, px, py-4, px+tw, py+th);
    });

    // ⑤ 地面（グラデーション）
    const ground = this.add.graphics();
    ground.fillGradientStyle(0x1e5010, 0x1e5010, 0x0e2808, 0x0e2808, 1);
    ground.fillRect(0, GY, W, H * 0.80 - GY);

    // ⑥ パース透視グリッド（奥行き線）
    const grid = this.add.graphics();
    const vanX = W / 2, botY = H * 0.80;
    grid.lineStyle(1, 0x1e4a12, 0.28);
    for (let i = 0; i <= 12; i++) {
      grid.beginPath(); grid.moveTo(vanX, GY); grid.lineTo((i / 12) * W, botY); grid.strokePath();
    }
    grid.lineStyle(1, 0x1e4a12, 0.20);
    for (let j = 1; j <= 5; j++) {
      const t = j / 5, gy = GY + (botY - GY) * t, hw = W / 2 * t;
      grid.beginPath(); grid.moveTo(vanX - hw, gy); grid.lineTo(vanX + hw, gy); grid.strokePath();
    }

    // ⑦ バトルサークル（闘技場）
    const arena = this.add.graphics();
    arena.lineStyle(2, 0x3a6a22, 0.40);
    arena.strokeEllipse(W/2, GY+(botY-GY)*0.65, W*0.56, (botY-GY)*0.46);
    arena.lineStyle(1, 0x2a5218, 0.22);
    arena.strokeEllipse(W/2, GY+(botY-GY)*0.65, W*0.38, (botY-GY)*0.28);

    // ⑧ 地平線草ライン
    this.add.rectangle(0, GY, W, 7, 0x2a5a1a).setOrigin(0, 0);

    // ⑨ 両サイドの木（深度ガイド）
    const trees = this.add.graphics();
    ([-18,28,72,114] as number[]).forEach((tx,i) => {
      const sy=[0.80,0.82,0.78,0.83][i], ty=H*sy, th=(1-sy)*H*2.4;
      trees.fillStyle(0x082210,0.88); trees.fillTriangle(tx,ty,tx-22,ty+th,tx+22,ty+th);
      trees.fillStyle(0x0d3018,0.70); trees.fillTriangle(tx,ty-15,tx-15,ty+th*0.55,tx+15,ty+th*0.55);
    });
    ([W+18,W-28,W-72,W-114] as number[]).forEach((tx,i) => {
      const sy=[0.80,0.82,0.78,0.83][i], ty=H*sy, th=(1-sy)*H*2.4;
      trees.fillStyle(0x082210,0.88); trees.fillTriangle(tx,ty,tx-22,ty+th,tx+22,ty+th);
      trees.fillStyle(0x0d3018,0.70); trees.fillTriangle(tx,ty-15,tx-15,ty+th*0.55,tx+15,ty+th*0.55);
    });

    // ⑩ 前景岩・草（最手前・奥行き強調）
    const fg = this.add.graphics();
    fg.fillStyle(0x1c1a14, 0.85);
    fg.fillEllipse(42, H*0.786, 58, 18); fg.fillEllipse(12, H*0.795, 36, 13);
    fg.fillEllipse(W-42, H*0.786, 58, 18); fg.fillEllipse(W-12, H*0.795, 36, 13);
    fg.fillStyle(0x0f2808, 0.75);
    for (let gx = 8; gx < W; gx += 20) {
      fg.fillTriangle(gx, H*0.783, gx-4, H*0.783+11, gx+4, H*0.783+11);
    }

    // ⑪ 雲（アニメ）
    [{x:W*0.14,y:H*0.09,s:1.0},{x:W*0.44,y:H*0.06,s:0.8},{x:W*0.74,y:H*0.13,s:1.2}].forEach(({x,y,s}) => {
      const c = this.add.graphics();
      c.fillStyle(0xffffff, 0.48);
      c.fillEllipse(x,y,110*s,38*s); c.fillEllipse(x-28*s,y+11*s,68*s,28*s); c.fillEllipse(x+28*s,y+11*s,68*s,28*s);
      this.tweens.add({ targets:c, x:x+16, duration:5000+x*2, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    });
  }

  // ─── スライムテクスチャ ─────────────────────────────────────
  private makeSlimeTexture() {
    const P = 5, g = this.make.graphics({ x:0, y:0 });
    const r = (c:number,row:number,w:number,h:number,col:number) => { g.fillStyle(col); g.fillRect(c*P,row*P,w*P,h*P); };
    const G1=0x22dd22,G2=0x0a8a0a,G3=0x77ff77,G4=0x11aa11,WH=0xffffff,PU=0x111133,MO=0x0a5a0a;
    r(3,0,8,1,G2);r(2,1,10,1,G2);r(1,2,12,1,G2);r(0,3,14,1,G2);r(0,9,14,1,G2);r(1,10,12,1,G2);r(2,11,4,1,G2);r(8,11,4,1,G2);
    r(3,1,8,1,G1);r(2,2,10,1,G1);r(1,3,12,6,G1);r(2,9,10,1,G1);r(3,10,8,1,G4);
    r(4,1,4,1,G3);r(3,2,4,2,G3);r(2,3,2,2,G3);
    r(3,4,2,2,WH);r(3,4,1,1,PU);r(4,5,1,1,WH);r(9,4,2,2,WH);r(9,4,1,1,PU);r(10,5,1,1,WH);
    r(5,7,4,1,MO);r(4,6,1,1,MO);r(9,6,1,1,MO);
    r(3,10,2,2,G1);r(9,10,2,2,G1);r(3,11,2,1,G2);r(9,11,2,1,G2);
    g.generateTexture('slime', 14*P, 12*P); g.destroy();
  }

  // ─── プレイヤー（全スプライトを生成して切り替え） ─────────────
  private createPlayer(x: number, y: number) {
    // ファイル名が gale_idle.jpg なのでキーは 'gale_idle'
    const hasIdle = this.textures.exists('gale_idle') && this.textures.get('gale_idle').key !== '__MISSING';
    const hasCast = this.textures.exists('gale_cast') && this.textures.get('gale_cast').key !== '__MISSING';

    // ── Idle Animation（個別フレーム手動サイクル） ──
    if (hasIdle) {
      const img = this.add.image(x, y, IDLE_KEYS[0])
        .setOrigin(0.5, 1)
        .setScale(SPRITE_SCALE);

      // 最初のフレームのサイズを固定 → フレームごとの高さ違いによる上下ずれを防ぐ
      const fixedW = img.displayWidth;
      const fixedH = img.displayHeight;

      let fi = 0;
      this.time.addEvent({
        delay: 250,   // 4fps
        repeat: -1,
        callback: () => {
          if (img.visible) {
            fi = (fi + 1) % IDLE_KEYS.length;
            img.setTexture(IDLE_KEYS[fi]);
            img.setDisplaySize(fixedW, fixedH);  // サイズ固定でずれを防止
          }
        },
      });
      this.idleSprite = img;
    } else {
      // フォールバック（ドット絵）
      const img = this.add.image(x, y - 60, 'weather_mage').setScale(0.9);
      this.tweens.add({ targets:img, y:img.y-5, duration:800, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
      this.idleSprite = img;
    }

    // ── Casting Pose（攻撃直前の共通ポーズ） ──
    const castKey = hasCast ? 'gale_cast' : IDLE_KEYS[0];
    this.castImage = this.add.image(x, y, castKey)
      .setOrigin(0.5, 1)
      .setScale(SPRITE_SCALE)
      .setVisible(false);

    // ── 雹アニメーションフレーム（3枚・アイドルと同サイズに固定） ──
    // 雹画像は元解像度が大きいためスケールではなく絶対サイズで統一する
    this.hailDisplayW = this.idleSprite.displayWidth;
    this.hailDisplayH = this.idleSprite.displayHeight;
    this.hailFrames = HAIL_KEYS.map(key => {
      if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') return undefined;
      return this.add.image(x, y, key)
        .setOrigin(0.5, 1)
        .setDisplaySize(this.hailDisplayW, this.hailDisplayH)
        .setVisible(false);
    });

    // ── 各攻撃ポーズ画像（非表示で配置） ──
    const atkKeys: WeatherType[] = ['thunder', 'fire', 'water', 'wind'];
    atkKeys.forEach(type => {
      const key = WEATHER_CONFIG[type].spriteKey;
      if (this.textures.exists(key) && this.textures.get(key).key !== '__MISSING') {
        this.atkImages[type] = this.add.image(x, y, key)
          .setOrigin(0.05, 1)           // 攻撃画像: キャラが左端にいるため左寄せ
          .setScale(ATK_SPRITE_SCALE)
          .setVisible(false);
      }
    });

    // 宝石グロー
    const glow = this.add.circle(x - 30, y - 100, 10, 0x44aaff, 0.4);
    this.tweens.add({ targets:glow, scaleX:1.7, scaleY:1.7, alpha:0.1, duration:1100, yoyo:true, repeat:-1 });

    this.add.text(x, y + 8, 'Gale', { fontSize:'15px', fontFamily:'monospace', color:'#aaddff', stroke:'#000', strokeThickness:2 }).setOrigin(0.5);
  }

  // ─── スライム ──────────────────────────────────────────────
  private createSlime(x: number, y: number) {
    this.slimeSprite = this.add.image(x, y, 'slime').setScale(2.2);
    this.slimeBounce = this.tweens.add({ targets:this.slimeSprite, y:y-14, scaleX:2.4, scaleY:2.0, duration:550, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    const shadow = this.add.ellipse(x, y+62, 90, 20, 0x000000, 0.25);
    this.tweens.add({ targets:shadow, scaleX:1.1, alpha:0.12, duration:550, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    this.add.text(x, y-90, 'スライム', { fontSize:'17px', fontFamily:'"Yu Gothic","YuGothic",monospace', color:'#ffffff', stroke:'#000', strokeThickness:2 }).setOrigin(0.5);
    const barW=110, barH=14, barX=x-barW/2, barY=y-74;
    this.add.rectangle(barX, barY, barW, barH, 0x330000).setOrigin(0,0.5);
    this.slimeHpFill = this.add.rectangle(barX, barY, barW, barH, 0x22cc22).setOrigin(0,0.5);
    this.add.rectangle(barX, barY, barW, barH, 0x000000, 0).setOrigin(0,0.5).setStrokeStyle(1,0x44ee44);
    this.add.text(barX, barY-11, 'HP', { fontSize:'11px', fontFamily:'monospace', color:'#88ff88' });
  }

  // ─── HUD ──────────────────────────────────────────────────
  private createHUD(W: number, H: number) {
    const hudY = H * 0.80;
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000011, 0.90); hudBg.fillRect(0, hudY, W, H-hudY);
    hudBg.lineStyle(2, 0x224488);    hudBg.strokeRect(0, hudY, W, H-hudY);
    const fi = this.add.graphics();
    fi.fillStyle(0x2255cc); fi.fillRoundedRect(12, hudY+10, 48, 48, 4);
    fi.fillStyle(0xffcc99); fi.fillRect(20, hudY+18, 32, 26);
    fi.fillStyle(0xe0e8ff); fi.fillRect(22, hudY+14, 28, 10);
    fi.lineStyle(2, 0x4488ff); fi.strokeRoundedRect(12, hudY+10, 48, 48, 4);
    this.add.text(68, hudY+12, 'Gale', { fontSize:'14px', fontFamily:'monospace', color:'#aaddff' });
    this.add.text(68, hudY+30, '♥ ♥ ♥ ♥ ♥', { fontSize:'18px', fontFamily:'monospace', color:'#ee2222' });
    const mpBg = this.add.graphics();
    mpBg.fillStyle(0x001133); mpBg.fillRect(68, hudY+50, 120, 10);
    mpBg.fillStyle(0x2244cc); mpBg.fillRect(68, hudY+50, 90, 10);
    this.add.text(68, hudY+42, 'MP', { fontSize:'10px', fontFamily:'monospace', color:'#5588ff' });
    this.battleLog = this.add.text(W/2, hudY - 18, 'スライムが現れた！天候の力で攻撃せよ！', {
      fontSize:'14px', fontFamily:'"Yu Gothic","YuGothic",monospace',
      color:'#ffffff', stroke:'#000', strokeThickness:2, align:'center',
    }).setOrigin(0.5);
  }

  // ─── 天候攻撃ボタン（4種） — HUD内ステータス右側に配置 ────
  private createWeatherButtons(W: number, H: number) {
    const hudY   = H * 0.80;
    const hudH   = H - hudY;          // HUDの高さ（約120px）
    const pad    = 10;
    const statusW = 200;              // 左のステータス枠の幅

    const types: WeatherType[] = ['thunder', 'fire', 'water', 'wind', 'hail'];
    const gap  = 8;
    const btnW = Math.floor((W - statusW - pad * 2 - gap * (types.length - 1)) / types.length);
    const btnH = hudH - pad * 2;
    const startX = statusW + pad;
    const by     = hudY + pad;

    types.forEach((type, i) => {
      const cfg = WEATHER_CONFIG[type];
      const bx  = startX + i * (btnW + gap);

      const frame = this.add.graphics();
      const drawFrame = (hover: boolean) => {
        const isActive = this.activeWeatherType === type;
        frame.clear();
        frame.fillStyle(cfg.btnColor, hover || isActive ? 1 : 0.9);
        frame.fillRoundedRect(bx, by, btnW, btnH, 6);
        frame.lineStyle(
          isActive ? 4 : hover ? 3 : 2,
          isActive ? 0xffffff : hover ? 0xffffff : cfg.btnGlow,
          isActive ? 1 : hover ? 1 : 0.85
        );
        frame.strokeRoundedRect(bx, by, btnW, btnH, 6);
      };
      drawFrame(false);
      this.weatherBtnRedraw[type] = drawFrame;

      // アイコン（左上）& ラベル（中央）
      this.add.text(bx + 8, by + 6, cfg.emoji, { fontSize:'18px' }).setDepth(1);
      this.add.text(bx + btnW / 2, by + btnH / 2 + 2, cfg.label, {
        fontSize:'22px', fontFamily:'"Yu Gothic","YuGothic",monospace',
        color:'#ffffff', stroke:'#000', strokeThickness:2,
      }).setOrigin(0.5).setDepth(1);

      const hit = this.add.rectangle(bx + btnW/2, by + btnH/2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover',  () => drawFrame(true));
      hit.on('pointerout',   () => drawFrame(false));
      hit.on('pointerdown',  () => this.attackWithWeather(type));

      this.tweens.add({ targets: frame, alpha: 0.7, duration: 1000 + i*120, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    });
  }

  // ─── 攻撃処理（天候選択） ──────────────────────────────────
  private attackWithWeather(type: WeatherType) {
    if (!this.attackEnabled || this.slimeHp <= 0) return;
    this.attackEnabled = false;

    const cfg = WEATHER_CONFIG[type];

    // ① 空背景を天候に合わせて変化させる
    this.updateSkyForWeather(type);
    this.spawnWeatherFx(type);

    // ② Casting Pose を一瞬表示
    this.showSprite('cast');
    this.battleLog.setText(`${cfg.label}の天候を呼んだ！`);

    // ③ 0.25秒後に攻撃ポーズに切り替え & 弾発射
    this.time.delayedCall(250, () => {
      if (type !== 'wind') this.showSprite(type);
      this.battleLog.setText(`${cfg.label}の力を放った！`);

      this.time.delayedCall(180, () => {
        this.launchProjectile(type, cfg.projColor, () => {
          const dmg = Phaser.Math.Between(6, 16);
          this.onProjectileHit(dmg, cfg.projColor);
        });
      });
    });

    // ③ 1.1秒後にアイドルに戻す
    this.time.delayedCall(1100, () => this.showSprite('idle'));
  }

  // ─── スプライト切り替え ─────────────────────────────────────
  private showSprite(target: WeatherType | 'idle' | 'cast') {
    // hailタイマー停止
    this.hailTimer?.remove();
    this.hailTimer = undefined;

    // 全部非表示
    this.idleSprite.setVisible(false);
    this.castImage.setVisible(false);
    Object.values(this.atkImages).forEach(img => img?.setVisible(false));
    this.hailFrames.forEach(f => f?.setVisible(false));

    if (target === 'idle') {
      this.idleSprite.setVisible(true);
      this.attackEnabled = true;
    } else if (target === 'cast') {
      this.castImage.setVisible(true);
    } else if (target === 'hail') {
      // 3フレームをサイクル再生
      const frames = this.hailFrames.filter(Boolean) as Phaser.GameObjects.Image[];
      if (frames.length > 0) {
        frames[0].setVisible(true);
        let fi = 0;
        this.hailTimer = this.time.addEvent({
          delay: 100, repeat: -1,
          callback: () => {
            frames.forEach(f => f.setVisible(false));
            fi = (fi + 1) % frames.length;
            frames[fi].setVisible(true);
            frames[fi].setDisplaySize(this.hailDisplayW, this.hailDisplayH);
          },
        });
      } else {
        this.castImage.setVisible(true);
      }
    } else {
      const img = this.atkImages[target];
      if (img) img.setVisible(true);
      else      this.castImage.setVisible(true);
    }
  }

  // ─── 弾エフェクト ─────────────────────────────────────────
  private launchProjectile(type: WeatherType, color: number, onHit: () => void) {
    const sx = this.playerX + 60;
    const sy = this.slimeY - 20;
    if      (type === 'thunder') this.fxThunder(sx, sy, onHit);
    else if (type === 'fire')    this.fxFire(sx, sy, onHit);
    else if (type === 'water')   this.fxWater(sx, sy, onHit);
    else if (type === 'hail')    this.fxHail(onHit);
    else                         this.fxWind(sx, sy, color, onHit);
  }

  // ── 雹 (Hail) ──
  private fxHail(onHit: () => void) {
    const count = 9;
    let done = 0;
    for (let i = 0; i < count; i++) {
      const tx = this.slimeX + Phaser.Math.Between(-45, 45);
      const startY = this.slimeY - 160 + Phaser.Math.Between(-20, 20);
      const crystal = this.add.rectangle(tx, startY, 5, 13, 0xaaddff);
      crystal.setAngle(Phaser.Math.Between(-25, 25));
      this.tweens.add({
        targets: crystal,
        y: this.slimeY - 10,
        alpha: 0.2,
        duration: 260 + i * 35,
        delay: i * 55,
        ease: 'Quad.easeIn',
        onComplete: () => {
          crystal.destroy();
          const flash = this.add.circle(tx, this.slimeY - 10, 10, 0xffffff, 0.85);
          this.tweens.add({ targets: flash, alpha: 0, scaleX: 2.2, scaleY: 2.2, duration: 140, onComplete: () => flash.destroy() });
          done++;
          if (done === count) onHit();
        },
      });
    }
  }

  // ── 雷 (Lightning Strike) ──
  private fxThunder(sx: number, sy: number, onHit: () => void) {
    const g = this.add.graphics();
    let f = 0;
    const flash = () => {
      g.clear();
      if (f % 2 === 0) {
        g.lineStyle(4, 0xffff44, 1);
        const mx = (sx + this.slimeX) / 2 + Phaser.Math.Between(-30, 30);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(mx, sy-45+Phaser.Math.Between(-20,20)); g.lineTo(this.slimeX, sy+Phaser.Math.Between(-10,10)); g.strokePath();
        g.lineStyle(2, 0xffffff, 0.6);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(mx+8, sy-40+Phaser.Math.Between(-10,10)); g.lineTo(this.slimeX+5, sy+Phaser.Math.Between(-8,8)); g.strokePath();
      }
      f++;
      if (f < 6) this.time.delayedCall(60, flash);
      else { g.destroy(); onHit(); }
    };
    flash();
    for (let i = 0; i < 8; i++) {
      const sp = this.add.circle(this.slimeX+Phaser.Math.Between(-25,25), sy+Phaser.Math.Between(-25,25), Phaser.Math.Between(2,5), 0xffffff);
      this.tweens.add({ targets:sp, alpha:0, scaleX:0, scaleY:0, duration:300, delay:i*40, onComplete:()=>sp.destroy() });
    }
  }

  // ── 晴れ (Sunny) ──
  private fxFire(sx: number, sy: number, onHit: () => void) {
    const ball  = this.add.circle(sx, sy, 12, 0xffee44);
    const inner = this.add.circle(sx, sy, 7, 0xffffff);
    this.tweens.add({
      targets:[ball,inner], x:this.slimeX, y:sy, scaleX:2.5, scaleY:2.5,
      duration:280, ease:'Quad.easeIn',
      onComplete: () => {
        ball.destroy(); inner.destroy();
        for (let i = 0; i < 14; i++) {
          const ep = this.add.circle(this.slimeX, sy, Phaser.Math.Between(4,9), [0xffee44,0xffffff,0xffcc00][i%3]);
          this.tweens.add({ targets:ep, x:this.slimeX+Phaser.Math.Between(-55,55), y:sy+Phaser.Math.Between(-55,25), alpha:0, duration:450, onComplete:()=>ep.destroy() });
        }
        onHit();
      },
    });
  }

  // ─── 空の背景を天候に合わせて変化 ──────────────────────────
  private updateSkyForWeather(type: WeatherType) {
    const W = this.scale.width, H = this.scale.height;
    type GradArgs = [number, number, number, number, number];
    const g: Record<WeatherType, GradArgs> = {
      thunder: [0x06021a, 0x06021a, 0x0a1030, 0x0a1030, 1],
      fire:    [0x2277cc, 0x2277cc, 0x88aadd, 0x88aadd, 1],  // 晴れ: 明るい青空
      water:   [0x040c1a, 0x040c1a, 0x0a1a2e, 0x0a1a2e, 1],  // 雨: 暗い青灰
      wind:    [0x182230, 0x182230, 0x2a3a55, 0x2a3a55, 1],  // 風: 曇り青灰
      hail:    [0x020408, 0x020408, 0x04080e, 0x04080e, 1],  // 雹: 吹雪
    };
    const [tl, tr, bl, br, a] = g[type];
    this.skyGfx.clear();
    this.skyGfx.fillGradientStyle(tl, tr, bl, br, a);
    this.skyGfx.fillRect(0, 0, W, H * 0.68);
  }

  // ─── 天候エフェクト（一時的な空演出） ─────────────────────
  private spawnWeatherFx(type: WeatherType) {
    const W = this.scale.width, H = this.scale.height * 0.68;

    if (type === 'water') {
      for (let i = 0; i < 35; i++) {
        const x = Phaser.Math.Between(0, W);
        const y = Phaser.Math.Between(-20, H * 0.5);
        const drop = this.add.rectangle(x, y, 1, 9, 0x88ccff, 0.7);
        this.tweens.add({ targets: drop, y: y + H, alpha: 0, duration: Phaser.Math.Between(500, 900), delay: i * 25, onComplete: () => drop.destroy() });
      }
    } else if (type === 'hail') {
      for (let i = 0; i < 28; i++) {
        const x = Phaser.Math.Between(0, W);
        const y = Phaser.Math.Between(-20, H * 0.3);
        const shard = this.add.rectangle(x, y, 3, 9, 0xddeeff, 0.85);
        shard.setAngle(Phaser.Math.Between(-20, 20));
        this.tweens.add({ targets: shard, y: y + H, x: x + 30, alpha: 0, duration: Phaser.Math.Between(380, 650), delay: i * 35, onComplete: () => shard.destroy() });
      }
    } else if (type === 'thunder') {
      const flash = this.add.rectangle(W / 2, H * 0.4, W, H * 0.8, 0x8888ff, 0);
      this.tweens.add({ targets: flash, alpha: 0.28, duration: 70, yoyo: true, repeat: 2, onComplete: () => flash.destroy() });
      const g = this.add.graphics();
      g.lineStyle(3, 0xffffaa, 0.9);
      const lx = Phaser.Math.Between(W * 0.25, W * 0.75);
      g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx - 18, H * 0.3); g.lineTo(lx + 10, H * 0.3); g.lineTo(lx - 12, H * 0.62); g.strokePath();
      this.tweens.add({ targets: g, alpha: 0, duration: 400, delay: 120, onComplete: () => g.destroy() });
    } else if (type === 'wind') {
      for (let i = 0; i < 14; i++) {
        const y = Phaser.Math.Between(10, H - 10);
        const len = 60 + Phaser.Math.Between(0, 70);
        const streak = this.add.rectangle(-len / 2, y, len, 2, 0xcceecc, 0.5);
        this.tweens.add({ targets: streak, x: W + len, alpha: 0, duration: Phaser.Math.Between(280, 560), delay: i * 55, onComplete: () => streak.destroy() });
      }
    } else if (type === 'fire') {
      // 晴れ: 太陽光線
      const sunX = W * 0.80, sunY = H * 0.18;
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        const len = 55 + Phaser.Math.Between(0, 35);
        const ray = this.add.rectangle(sunX + Math.cos(angle) * 20, sunY + Math.sin(angle) * 20, len, 3, 0xffee88, 0.65);
        ray.setAngle(Phaser.Math.RadToDeg(angle));
        this.tweens.add({ targets: ray, scaleX: 1.6, alpha: 0, duration: 650, delay: i * 45, onComplete: () => ray.destroy() });
      }
      const sun = this.add.circle(sunX, sunY, 26, 0xffee44, 0.65);
      this.tweens.add({ targets: sun, scaleX: 2.0, scaleY: 2.0, alpha: 0, duration: 800, onComplete: () => sun.destroy() });
    }
  }

  // ── 水 (Beam Attack) ──
  private fxWater(sx: number, sy: number, onHit: () => void) {
    const beam = this.add.rectangle(sx + 10, sy, 20, 12, 0x44ccff);
    this.tweens.add({
      targets:beam, x:this.slimeX, scaleX:(this.slimeX-sx)/20,
      duration:230, ease:'Linear',
      onComplete: () => {
        beam.destroy();
        const ice  = this.add.circle(this.slimeX, sy, 26, 0x88ddff, 0.75);
        const ice2 = this.add.circle(this.slimeX, sy, 18, 0xaaffff, 0.55);
        this.tweens.add({ targets:[ice,ice2], scaleX:1.5, scaleY:1.5, alpha:0, duration:400, onComplete:()=>{ ice.destroy(); ice2.destroy(); } });
        for (let i = 0; i < 6; i++) {
          const sh = this.add.rectangle(this.slimeX+Phaser.Math.Between(-22,22), sy+Phaser.Math.Between(-22,22), 4, 9, 0xaaddff);
          sh.setAngle(Phaser.Math.Between(0,360));
          this.tweens.add({ targets:sh, y:sh.y+32, alpha:0, duration:500, onComplete:()=>sh.destroy() });
        }
        onHit();
      },
    });
  }

  // ── 風 (Ice Swirl Attack A) ──
  private fxWind(sx: number, sy: number, _color: number, onHit: () => void) {
    const hasImg = this.textures.exists('gale_atk_wind') &&
                   this.textures.get('gale_atk_wind').key !== '__MISSING';

    if (hasImg) {
      // 竜巻画像をプレイヤー横からスライムへ飛ばす
      const img = this.add.image(sx + 20, sy, 'gale_atk_wind')
        .setOrigin(0.5, 0.5)
        .setScale(0.9);
      // 回転しながら移動
      this.tweens.add({
        targets: img,
        x: this.slimeX, y: this.slimeY - 20,
        angle: 360,
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => { img.destroy(); onHit(); },
      });
    } else {
      // フォールバック: ドットアニメ
      const dots: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 7; i++) {
        const t = i / 7;
        dots.push(this.add.circle(sx + (this.slimeX-sx)*t, sy + Math.sin(t*Math.PI*2)*22, 5+i*2, 0x44ffaa, 0.75));
      }
      this.tweens.add({
        targets: dots, x: this.slimeX, y: sy, scaleX: 1.6, scaleY: 1.6, alpha: 0,
        duration: 320, ease: 'Quad.easeIn',
        onComplete: () => { dots.forEach(d => d.destroy()); onHit(); },
      });
    }
  }

  // ─── ヒット処理 ───────────────────────────────────────────
  private onProjectileHit(dmg: number, color: number) {
    this.slimeHp = Math.max(0, this.slimeHp - dmg);
    let flash = 0;
    const doFlash = () => {
      flash++;
      this.slimeSprite.setTint(flash % 2 === 0 ? 0xffffff : color);
      if (flash < 5) this.time.delayedCall(80, doFlash);
      else { this.slimeSprite.clearTint(); }
    };
    doFlash();
    this.tweens.add({ targets:this.slimeSprite, x:this.slimeX+24, duration:65, yoyo:true, repeat:1 });
    const dt = this.add.text(this.slimeX+Phaser.Math.Between(-20,20), this.slimeY-90, `-${dmg}`, { fontSize:'30px', fontFamily:'monospace', color:'#ffcc00', stroke:'#000', strokeThickness:3 }).setOrigin(0.5);
    this.tweens.add({ targets:dt, y:dt.y-55, alpha:0, duration:900, onComplete:()=>dt.destroy() });
    const ratio = this.slimeHp / this.slimeMaxHp;
    this.slimeHpFill.setSize(110 * ratio, 14);
    this.slimeHpFill.setFillStyle(ratio > 0.5 ? 0x22cc22 : ratio > 0.25 ? 0xddcc00 : 0xee2222);
    this.battleLog.setText(`${dmg}ダメージ！（スライムHP: ${this.slimeHp}/${this.slimeMaxHp}）`);
    if (this.slimeHp <= 0) this.onSlimeDefeated();
  }

  // ─── スライム撃破 ──────────────────────────────────────────
  private onSlimeDefeated() {
    this.slimeBounce.stop();
    this.tweens.add({ targets:this.slimeSprite, alpha:0, scaleY:0, y:this.slimeY+30, duration:500,
      onComplete: () => {
        this.battleLog.setText('スライムを倒した！');
        this.time.delayedCall(600, () => this.showMapReturnButton());
      }
    });
    this.time.delayedCall(200, () => {
      for (let i = 0; i < 14; i++) {
        const colors = [0xffcc00, 0xff88ff, 0x88ffcc, 0xffffff, 0xff6644];
        const p = this.add.circle(this.slimeX+Phaser.Math.Between(-30,30), this.slimeY+Phaser.Math.Between(-30,30), Phaser.Math.Between(3,7), colors[i%colors.length]);
        this.tweens.add({ targets:p, x:p.x+Phaser.Math.Between(-90,90), y:p.y+Phaser.Math.Between(-110,20), alpha:0, duration:Phaser.Math.Between(600,1100), onComplete:()=>p.destroy() });
      }
    });
  }

  private showMapReturnButton() {
    const W = this.scale.width, H = this.scale.height;
    const btn = this.add.text(W/2, H*0.45, '▶  マップへ戻る', {
      fontSize:'26px', fontFamily:'monospace', color:'#aaddff',
      stroke:'#001144', strokeThickness:2,
      backgroundColor:'#0d1a44', padding:{ x:22, y:12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#aaddff'));
    btn.on('pointerdown', () => {
      // 完了ノードを registry に記録
      const reg = this.game.registry;
      const done: number[] = reg.get('completedNodes') ?? [];
      if (this.currentNodeId >= 0 && !done.includes(this.currentNodeId)) done.push(this.currentNodeId);
      reg.set('completedNodes', done);
      reg.set('playerNodeId', this.currentNodeId);
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start('MapScene'));
    });
  }

  // ─── 天候ボタンハイライト ────────────────────────────────────
  private highlightWeatherBtn(type: WeatherType) {
    this.activeWeatherType = type;
    (Object.keys(this.weatherBtnRedraw) as WeatherType[]).forEach(t => {
      this.weatherBtnRedraw[t]?.(false);
    });
  }

  // ─── 戻るボタン ────────────────────────────────────────────
  private createBackButton(W: number) {
    const back = this.add.text(W-16, 16, '[ タイトルへ ]', { fontSize:'15px', fontFamily:'monospace', color:'#4488ff' }).setOrigin(1,0).setInteractive({ useHandCursor:true });
    back.on('pointerover', () => back.setColor('#88bbff'));
    back.on('pointerout',  () => back.setColor('#4488ff'));
    back.on('pointerdown', () => {
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start('TitleScene'));
    });
  }
}
