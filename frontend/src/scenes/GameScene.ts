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
type WeatherType = 'thunder' | 'fire' | 'water' | 'wind';

const WEATHER_CONFIG: Record<WeatherType, {
  label: string; emoji: string;
  spriteKey: string;          // 攻撃ポーズ画像のキー
  projColor: number;          // 弾の主色
  btnColor: number; btnGlow: number;
}> = {
  thunder: { label:'雷',  emoji:'⚡', spriteKey:'gale_atk_thunder', projColor:0xffff44, btnColor:0x1a2255, btnGlow:0x8888ff },
  fire:    { label:'炎',  emoji:'🔥', spriteKey:'gale_atk_fire',    projColor:0xff4400, btnColor:0x3a1100, btnGlow:0xff6622 },
  water:   { label:'水',  emoji:'💧', spriteKey:'gale_atk_water',   projColor:0x44ccff, btnColor:0x002244, btnGlow:0x44aaff },
  wind:    { label:'風',  emoji:'🌀', spriteKey:'gale_atk_wind',    projColor:0x44ffaa, btnColor:0x003322, btnGlow:0x44ffaa },
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
  private idleSprite!: Phaser.GameObjects.Image;
  private castImage!: Phaser.GameObjects.Image;                        // Casting Pose
  private atkImages: Partial<Record<WeatherType, Phaser.GameObjects.Image>> = {};

  constructor() { super({ key: 'GameScene' }); }

  // ─── アセット読み込み ──────────────────────────────────────
  preload() {
    // TitleScene でロード済みの場合はスキップ
    // アイドル・歩行（個別フレーム）
    IDLE_KEYS.forEach(key => { if (!this.textures.exists(key)) this.load.image(key, `${key}.jpg`); });
    ['gale_walk','gale_walk1','gale_walk2','gale_walk3'].forEach(key => { if (!this.textures.exists(key)) this.load.image(key, `${key}.jpg`); });
    // 攻撃ポーズ・単体画像
    ['gale_cast','gale_atk_thunder','gale_atk_fire','gale_atk_water','gale_atk_wind','gale_atk_ice'].forEach(key => { if (!this.textures.exists(key)) this.load.image(key, `${key}.jpg`); });
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('[GameScene] load failed:', f.key));
  }

  create() {
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
  }

  // ─── 背景 ──────────────────────────────────────────────────
  private drawBackground(W: number, H: number) {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0a1a44, 0x0a1a44, 0x1e4a8a, 0x1e4a8a, 1);
    sky.fillRect(0, 0, W, H * 0.68);
    this.add.rectangle(0, H*0.68, W, H*0.32, 0x1a3d0e).setOrigin(0,0);
    this.add.rectangle(0, H*0.68, W, 8, 0x2a5a1a).setOrigin(0,0);
    [{x:W*0.15,y:H*0.10,s:1.0},{x:W*0.45,y:H*0.07,s:0.8},{x:W*0.72,y:H*0.14,s:1.2}].forEach(({x,y,s}) => {
      const c = this.add.graphics();
      c.fillStyle(0xffffff, 0.55);
      c.fillEllipse(x,y,110*s,42*s); c.fillEllipse(x-28*s,y+12*s,70*s,32*s); c.fillEllipse(x+28*s,y+12*s,70*s,32*s);
      this.tweens.add({ targets:c, x:x+18, duration:5000+x*2, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    });
    const mtn = this.add.graphics();
    mtn.fillStyle(0x1a2a5a, 0.6);
    mtn.beginPath();
    mtn.moveTo(0,H*0.68);mtn.lineTo(0,H*0.38);mtn.lineTo(W*0.12,H*0.22);mtn.lineTo(W*0.25,H*0.40);mtn.lineTo(W*0.38,H*0.18);
    mtn.lineTo(W*0.52,H*0.35);mtn.lineTo(W*0.65,H*0.25);mtn.lineTo(W*0.78,H*0.42);mtn.lineTo(W*0.90,H*0.28);mtn.lineTo(W,H*0.38);mtn.lineTo(W,H*0.68);
    mtn.closePath();mtn.fillPath();
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
    this.battleLog = this.add.text(W/2, hudY - 18, 'スライムが現れた！天候魔法で攻撃せよ！', {
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

    const types: WeatherType[] = ['thunder', 'fire', 'water', 'wind'];
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
        frame.clear();
        frame.fillStyle(cfg.btnColor, hover ? 1 : 0.9);
        frame.fillRoundedRect(bx, by, btnW, btnH, 6);
        frame.lineStyle(hover ? 3 : 2, hover ? 0xffffff : cfg.btnGlow, hover ? 1 : 0.85);
        frame.strokeRoundedRect(bx, by, btnW, btnH, 6);
      };
      drawFrame(false);

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

    // ① Casting Pose を一瞬表示
    this.showSprite('cast');
    this.battleLog.setText(`${cfg.label}の魔法を詠唱！`);

    // ② 0.25秒後に攻撃ポーズに切り替え & 弾発射
    // 風はキャラなし画像なのでキャストポーズのまま維持
    this.time.delayedCall(250, () => {
      if (type !== 'wind') this.showSprite(type);
      this.battleLog.setText(`${cfg.label}の魔法を放った！`);

      this.time.delayedCall(180, () => {
        this.launchProjectile(type, cfg.projColor, () => {
          const dmg = Phaser.Math.Between(6, 16);
          this.onProjectileHit(dmg, cfg.projColor, type);
        });
      });
    });

    // ③ 1.1秒後にアイドルに戻す
    this.time.delayedCall(1100, () => this.showSprite('idle'));
  }

  // ─── スプライト切り替え ─────────────────────────────────────
  private showSprite(target: WeatherType | 'idle' | 'cast') {
    // 全部非表示
    this.idleSprite.setVisible(false);
    this.castImage.setVisible(false);
    Object.values(this.atkImages).forEach(img => img?.setVisible(false));

    if (target === 'idle') {
      this.idleSprite.setVisible(true);
      this.attackEnabled = true;
    } else if (target === 'cast') {
      this.castImage.setVisible(true);
    } else {
      // 攻撃ポーズ画像があれば表示、なければキャスティングポーズで代用
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
    else                         this.fxWind(sx, sy, color, onHit);
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

  // ── 炎 (Flame Strike) ──
  private fxFire(sx: number, sy: number, onHit: () => void) {
    const ball  = this.add.circle(sx, sy, 10, 0xff4400);
    const inner = this.add.circle(sx, sy, 6, 0xff8800);
    this.tweens.add({
      targets:[ball,inner], x:this.slimeX, y:sy, scaleX:2.5, scaleY:2.5,
      duration:280, ease:'Quad.easeIn',
      onComplete: () => {
        ball.destroy(); inner.destroy();
        for (let i = 0; i < 14; i++) {
          const ep = this.add.circle(this.slimeX, sy, Phaser.Math.Between(4,9), [0xff4400,0xff8800,0xffcc00][i%3]);
          this.tweens.add({ targets:ep, x:this.slimeX+Phaser.Math.Between(-55,55), y:sy+Phaser.Math.Between(-55,25), alpha:0, duration:450, onComplete:()=>ep.destroy() });
        }
        onHit();
      },
    });
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
  private onProjectileHit(dmg: number, color: number, _type: WeatherType) {
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
      onComplete: () => { this.battleLog.setText('スライムを倒した！\n\n（次のエリアへ…実装中）'); }
    });
    this.time.delayedCall(200, () => {
      for (let i = 0; i < 14; i++) {
        const colors = [0xffcc00, 0xff88ff, 0x88ffcc, 0xffffff, 0xff6644];
        const p = this.add.circle(this.slimeX+Phaser.Math.Between(-30,30), this.slimeY+Phaser.Math.Between(-30,30), Phaser.Math.Between(3,7), colors[i%colors.length]);
        this.tweens.add({ targets:p, x:p.x+Phaser.Math.Between(-90,90), y:p.y+Phaser.Math.Between(-110,20), alpha:0, duration:Phaser.Math.Between(600,1100), onComplete:()=>p.destroy() });
      }
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
