import Phaser from 'phaser';

type WeatherChoice = 'thunder' | 'fire' | 'water' | 'wind' | 'hail';

const WEATHER_BTN: Record<WeatherChoice, {
  label: string; emoji: string; btnColor: number; btnGlow: number;
  manResult: string; womanResult: string;
}> = {
  thunder: { label:'雷', emoji:'⚡', btnColor:0x1a2255, btnGlow:0x8888ff,
    manResult: '⚡ 雷が轟き、魔物を追い払った！\n「す、すごい…！ありがとう！」',
    womanResult: '⚡ 雷が空を裂き、魔物が逃げ去った！\n「助かりました…！」' },
  fire:    { label:'晴れ', emoji:'☀️', btnColor:0x2a2200, btnGlow:0xffcc00,
    manResult: '☀️ 眩い光が周囲を照らし、魔物を退けた！\n「熱いけど…命拾いした！」',
    womanResult: '☀️ 陽光の壁が魔物の道を塞いだ！\n「あなたは天候の使い手…！」' },
  water:   { label:'水', emoji:'💧', btnColor:0x002244, btnGlow:0x44aaff,
    manResult: '💧 急流が魔物を押し流した！\n「川が…あいつを飲み込んだ！」',
    womanResult: '💧 水の盾が魔物の爪を弾いた！\n「ありがとう、怪我はない…！」' },
  wind:    { label:'風', emoji:'🌀', btnColor:0x003322, btnGlow:0x44ffaa,
    manResult: '🌀 嵐が魔物を吹き飛ばした！\n「風がこんなに力強いとは…！」',
    womanResult: '🌀 竜巻が魔物を連れ去った！\n「本当にありがとう！」' },
  hail:    { label:'雹', emoji:'🌨', btnColor:0x001833, btnGlow:0x88ccff,
    manResult: '🌨 雹嵐が魔物を凍らせた！\n「か、固まってる…す、すごい！」',
    womanResult: '🌨 氷の結晶が魔物を貫いた！\n「冷たいけど…助かった！」' },
};

const WALK_KEYS_V = ['gale_walk','gale_walk1','gale_walk2','gale_walk3'] as const;

export class VillagerScene extends Phaser.Scene {
  constructor() { super({ key: 'VillagerScene' }); }

  preload() {
    if (!this.textures.exists('man_murabito'))   this.load.image('man_murabito',   'man_murabito.jpg');
    if (!this.textures.exists('woman_murabito')) this.load.image('woman_murabito', 'woman_murabito.jpg');
    WALK_KEYS_V.forEach(key => { if (!this.textures.exists(key)) this.load.image(key, `${key}.jpg`); });
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('[VillagerScene] load failed:', f.key));
  }

  private removeBlackBg(key: string) {
    if (!this.textures.exists(key) || this.textures.get(key).key === '__MISSING') return;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const w = (src as HTMLImageElement).naturalWidth || src.width;
    const h = (src as HTMLImageElement).naturalHeight || src.height;
    if (w === 0 || h === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i],d[i+1],d[i+2]), mn = Math.min(d[i],d[i+1],d[i+2]);
      const sat = mx === 0 ? 0 : (mx-mn)/mx;
      if (mx < 60) d[i+3] = 0;
      else if (mx < 100 && sat < 0.55) d[i+3] = Math.round(((mx-60)/40)*255);
    }
    const imgData = new ImageData(d, w, h);
    ctx.putImageData(imgData, 0, 0);
    this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  create(data: { nodeId: number; villagerType: 'man' | 'woman' }) {
    const W = this.scale.width, H = this.scale.height;
    const nodeId       = data?.nodeId       ?? 0;
    const villagerType = data?.villagerType ?? 'man';
    const villagerKey  = villagerType === 'man' ? 'man_murabito' : 'woman_murabito';
    const groundY      = H * 0.70;

    this.removeBlackBg('man_murabito');
    this.removeBlackBg('woman_murabito');

    // ── 村の背景 ─────────────────────────────────────────
    this.buildVillageBackground(W, H, groundY);

    // ── 村人を配置（右寄り） ──────────────────────────────
    const villagerX = W * 0.64;
    const hasVillager = this.textures.exists(villagerKey) && this.textures.get(villagerKey).key !== '__MISSING';
    if (hasVillager) {
      this.add.image(villagerX, groundY, villagerKey).setOrigin(0.5, 1).setScale(0.60);
    } else {
      this.makeFallbackVillager(villagerX, groundY, villagerType);
    }

    // ── UIコンテナ（最初は非表示） ────────────────────────
    const uiContainer = this.add.container(0, 0).setVisible(false);
    this.buildEventUI(W, H, nodeId, villagerType, uiContainer);

    // ── タイトルへ戻るボタン ─────────────────────────────
    this.addBackButton(W);

    // ── 主人公が歩いてきてイベント発生 ───────────────────
    this.cameras.main.fadeIn(500);
    this.time.delayedCall(300, () => {
      this.animateHeroEntry(W, groundY, () => {
        uiContainer.setVisible(true);
      });
    });
  }

  // ─── 村の背景 ─────────────────────────────────────────────
  private buildVillageBackground(W: number, H: number, groundY: number) {
    // 空（夕暮れ〜夜明け）
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a2a55, 0x1a2a55, 0x6a4a22, 0x6a4a22, 1);
    sky.fillRect(0, 0, W, groundY);

    // 星
    for (let i = 0; i < 55; i++) {
      const sx = Phaser.Math.Between(0, W);
      const sy = Phaser.Math.Between(0, groundY * 0.6);
      const star = this.add.circle(sx, sy, Phaser.Math.FloatBetween(0.4,1.5), 0xffffff, Phaser.Math.FloatBetween(0.3,0.9));
      this.tweens.add({ targets:star, alpha:0.05, duration:Phaser.Math.Between(1000,3500), yoyo:true, repeat:-1, delay:Phaser.Math.Between(0,2000) });
    }

    // 遠景山
    const mtn = this.add.graphics();
    mtn.fillStyle(0x1a1a3a, 0.65);
    mtn.beginPath();
    mtn.moveTo(0, groundY);
    [0,120,200,300,380,480,560,660,740,800].forEach((x,i) =>
      mtn.lineTo(x, groundY - [0,55,30,80,40,70,25,60,35,0][i]));
    mtn.lineTo(W, groundY); mtn.closePath(); mtn.fillPath();

    // 村の建物（石造りの家々）
    const buildings: {x:number,w:number,h:number,rh:number,wc:number,rc:number}[] = [
      {x:30,  w:75, h:80, rh:35, wc:0x3a2a18, rc:0x5a2c10},
      {x:120, w:55, h:62, rh:28, wc:0x2e2010, rc:0x4a2008},
      {x:185, w:90, h:90, rh:40, wc:0x3d2a1a, rc:0x622010},
      {x:580, w:80, h:85, rh:38, wc:0x3a2a18, rc:0x5a2c10},
      {x:672, w:58, h:65, rh:28, wc:0x2e2010, rc:0x481a08},
      {x:740, w:78, h:88, rh:40, wc:0x3d2a1a, rc:0x602010},
    ];
    const bg2 = this.add.graphics();
    buildings.forEach(b => {
      const by = groundY - b.h;
      bg2.fillStyle(b.wc); bg2.fillRect(b.x, by, b.w, b.h);
      bg2.fillStyle(b.rc); bg2.fillTriangle(b.x-5, by+2, b.x+b.w/2, by-b.rh, b.x+b.w+5, by+2);
      bg2.fillStyle(0xffee88, 0.80); bg2.fillRect(b.x+b.w/2-10, by+18, 20, 15);
      bg2.fillStyle(0x1a0800); bg2.fillRect(b.x+b.w/2-1, by+18, 2, 15);
      bg2.fillRect(b.x+b.w/2-10, by+25, 20, 2);
      bg2.fillStyle(0x120600); bg2.fillRect(b.x+b.w/2-8, groundY-b.h*0.3, 16, b.h*0.3);
    });

    // 石畳の道（透視）
    const path = this.add.graphics();
    path.fillStyle(0x5a4a38, 0.85);
    path.beginPath();
    path.moveTo(W*0.35, groundY); path.lineTo(W*0.65, groundY);
    path.lineTo(W*0.75, groundY+H*0.30); path.lineTo(W*0.25, groundY+H*0.30);
    path.closePath(); path.fillPath();
    // 石畳の線
    path.lineStyle(1, 0x3a2a20, 0.45);
    for (let row = 1; row <= 4; row++) {
      const t = row / 4;
      const lx = W*0.35 + (W*0.25-W*0.35) * t;
      const rx = W*0.65 + (W*0.75-W*0.65) * t;
      const y  = groundY + H*0.30 * t;
      path.beginPath(); path.moveTo(lx, y); path.lineTo(rx, y); path.strokePath();
    }

    // 両サイドの木
    const trees = this.add.graphics();
    [[W*0.32, groundY],[W*0.68, groundY],[W*0.28, groundY-10],[W*0.72, groundY-10]].forEach(([tx, ty]) => {
      trees.fillStyle(0x2a1400,0.9); trees.fillRect(tx-5, ty-40, 10, 40);
      trees.fillStyle(0x0e2e0a,0.88); trees.fillTriangle(tx, ty-80, tx-25, ty-28, tx+25, ty-28);
      trees.fillStyle(0x112e10,0.75); trees.fillTriangle(tx, ty-95, tx-18, ty-50, tx+18, ty-50);
    });

    // 地面
    const ground = this.add.graphics();
    ground.fillStyle(0x1a2808); ground.fillRect(0, groundY, W, H-groundY);
    ground.fillStyle(0x223a0a, 0.7);
    for (let gx = 10; gx < W; gx += 18) {
      ground.fillTriangle(gx, groundY, gx-4, groundY+12, gx+4, groundY+12);
    }
    this.add.rectangle(0, groundY, W, 6, 0x2a5a12).setOrigin(0, 0);
  }

  // ─── イベントUI（天候選択） ──────────────────────────────────
  private buildEventUI(W: number, H: number, nodeId: number, villagerType: 'man' | 'woman', container: Phaser.GameObjects.Container) {
    const add = (go: Phaser.GameObjects.GameObject) => { container.add(go); return go; };

    // タイトル帯
    add(this.add.text(W/2, 28, '村人が助けを求めている！', {
      fontSize:'24px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#ffcc66', stroke:'#1a0800', strokeThickness:4,
    }).setOrigin(0.5));

    // セリフ吹き出し
    const speechBg = this.add.graphics();
    speechBg.fillStyle(0x0a1a0a, 0.88);
    speechBg.fillRoundedRect(W*0.40, 55, W*0.56, 105, 12);
    speechBg.lineStyle(2, 0x3a7a44, 0.85);
    speechBg.strokeRoundedRect(W*0.40, 55, W*0.56, 105, 12);
    // 吹き出しの三角（左向き）
    speechBg.fillStyle(0x0a1a0a, 0.88);
    speechBg.fillTriangle(W*0.40, 100, W*0.40-18, 107, W*0.40, 114);
    add(speechBg);

    const speechStr = villagerType === 'man'
      ? '「た、助けてください！\n　魔物に追われています…\n　あなたの天候の力で\n　何とかしてください！」'
      : '「お願い！ここから\n　逃げ出す手助けを…\n　あなたの天候の力で\n　魔物を追い払って！」';
    add(this.add.text(W*0.40+14, 65, speechStr, {
      fontSize:'13px', fontFamily:'"Yu Gothic","YuGothic",monospace',
      color:'#ddeedd', lineSpacing:4,
    }));

    // 天候選択ラベル
    add(this.add.text(W/2, 172, '▶ 天候を選んでください', {
      fontSize:'14px', fontFamily:'"Yu Gothic","YuGothic",monospace', color:'#88ddbb',
    }).setOrigin(0.5));

    // 結果テキスト（最初は非表示）
    const resultBg = this.add.graphics().setVisible(false);
    const resultText = this.add.text(W/2, H*0.42, '', {
      fontSize:'17px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#88ffaa', stroke:'#001a0a', strokeThickness:3, align:'center', lineSpacing:4,
    }).setOrigin(0.5).setVisible(false);
    add(resultBg); add(resultText);

    // 天候ボタン5種
    const types: WeatherChoice[] = ['thunder','fire','water','wind','hail'];
    const gap=7, btnH=58;
    const btnW = Math.floor((W - 24 - gap*(types.length-1)) / types.length);

    types.forEach((type, i) => {
      const cfg = WEATHER_BTN[type];
      const bx  = 12 + i*(btnW+gap), by = 192;

      const frame = this.add.graphics();
      const draw = (hover: boolean) => {
        frame.clear();
        frame.fillStyle(cfg.btnColor, hover ? 1 : 0.9);
        frame.fillRoundedRect(bx, by, btnW, btnH, 6);
        frame.lineStyle(hover?3:2, hover?0xffffff:cfg.btnGlow, hover?1:0.85);
        frame.strokeRoundedRect(bx, by, btnW, btnH, 6);
      };
      draw(false);
      add(frame);
      add(this.add.text(bx+btnW/2, by+14, cfg.emoji, {fontSize:'18px'}).setOrigin(0.5));
      add(this.add.text(bx+btnW/2, by+40, cfg.label, {
        fontSize:'16px', fontFamily:'"Yu Gothic","YuGothic",monospace',
        color:'#ffffff', stroke:'#000', strokeThickness:2,
      }).setOrigin(0.5));

      const hit = this.add.rectangle(bx+btnW/2, by+btnH/2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor:true });
      add(hit);

      hit.on('pointerover',  () => draw(true));
      hit.on('pointerout',   () => draw(false));
      hit.on('pointerdown',  () => {
        // 全ボタン無効化
        types.forEach((_,j) => {
          container.getAt(container.length - types.length + j - 1);
        });
        hit.disableInteractive();

        // 天候エフェクト
        for (let j = 0; j < 16; j++) {
          const px = W*0.42 + Phaser.Math.Between(-80, 80);
          const py = H*0.42 + Phaser.Math.Between(-60, 60);
          const p  = this.add.circle(px, py, Phaser.Math.Between(3,7), cfg.btnGlow, 0.9);
          this.tweens.add({ targets:p, y:py-Phaser.Math.Between(50,120), alpha:0,
            duration:Phaser.Math.Between(600,1200), delay:j*55, onComplete:()=>p.destroy() });
        }

        // 結果表示
        const msg = villagerType === 'man' ? cfg.manResult : cfg.womanResult;
        resultBg.fillStyle(0x041210, 0.90);
        resultBg.fillRoundedRect(W/2-260, H*0.36, 520, 72, 10);
        resultBg.lineStyle(2, 0x33aa66, 0.9);
        resultBg.strokeRoundedRect(W/2-260, H*0.36, 520, 72, 10);
        resultBg.setVisible(true);
        resultText.setText(msg).setVisible(true);
        this.tweens.add({ targets:resultText, alpha:0.4, duration:450, yoyo:true, repeat:1 });

        this.time.delayedCall(1700, () => {
          const completed: number[] = this.game.registry.get('completedNodes') ?? [];
          if (!completed.includes(nodeId)) completed.push(nodeId);
          this.game.registry.set('completedNodes', completed);
          this.game.registry.set('playerNodeId', nodeId);
          this.cameras.main.fade(500, 0, 0, 0);
          this.time.delayedCall(500, () => this.scene.start('MapScene'));
        });
      });

      this.tweens.add({ targets:frame, alpha:0.72, duration:1000+i*110, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    });
  }

  // ─── 主人公の歩き登場アニメ ─────────────────────────────────
  private animateHeroEntry(W: number, groundY: number, onArrive: () => void) {
    const hasWalk = WALK_KEYS_V.some(k => this.textures.exists(k) && this.textures.get(k).key !== '__MISSING');
    const heroKey = hasWalk ? WALK_KEYS_V[0] : null;
    if (!heroKey) { onArrive(); return; }

    const hero = this.add.image(-80, groundY, heroKey).setOrigin(0.5, 1).setScale(1.2);
    const fixedW = hero.displayWidth, fixedH = hero.displayHeight;
    let fi = 0;
    const walkTimer = this.time.addEvent({
      delay: 120, repeat: -1,
      callback: () => {
        fi = (fi + 1) % WALK_KEYS_V.length;
        hero.setTexture(WALK_KEYS_V[fi]);
        hero.setDisplaySize(fixedW, fixedH);
      },
    });

    // 足元の影
    const shadow = this.add.ellipse(-80, groundY + 4, 50, 12, 0x000000, 0.32);

    // 歩いて中央寄りまで移動
    this.tweens.add({
      targets: [hero, shadow],
      x: W * 0.30,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => {
        walkTimer.remove();
        // アイドルに切り替え（walk0に戻す）
        hero.setTexture(WALK_KEYS_V[0]);
        hero.setDisplaySize(fixedW, fixedH);
        // 少し待ってからイベント発生
        this.time.delayedCall(300, onArrive);
      },
    });
  }

  private makeFallbackVillager(cx: number, cy: number, type: 'man' | 'woman') {
    const g = this.add.graphics();
    const color = type === 'man' ? 0x4488cc : 0xcc4488;
    g.fillStyle(0xffcc99); g.fillCircle(cx, cy-80, 22);
    g.fillStyle(color);    g.fillRect(cx-18, cy-58, 36, 50);
    g.fillStyle(0x334455); g.fillRect(cx-16, cy-8, 14, 30); g.fillRect(cx+2, cy-8, 14, 30);
  }

  private addBackButton(W: number) {
    const btn = this.add.text(W-16, 16, '[ タイトルへ ]', {
      fontSize:'15px', fontFamily:'monospace', color:'#4488ff',
    }).setOrigin(1, 0).setInteractive({ useHandCursor:true });
    btn.on('pointerover', () => btn.setColor('#88bbff'));
    btn.on('pointerout',  () => btn.setColor('#4488ff'));
    btn.on('pointerdown', () => {
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start('TitleScene'));
    });
  }
}
