import Phaser from 'phaser';

type WeatherChoice = 'thunder' | 'fire' | 'water' | 'wind' | 'hail';
type VillagerType = 'man' | 'woman' | 'beast_attack' | 'sailing_ship';

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

// 獣の襲撃イベント用メッセージ（雷のみ成功）
const BEAST_ATTACK_RESULTS: Record<WeatherChoice, string> = {
  thunder: '⚡ 天空を裂く雷が獣たちを直撃！\n「ぎゃああ！」と叫び散り散りに逃げ去った！\n「す、すごい…村が救われた！ありがとう！」',
  fire:    '☀️ 光が獣たちを一瞬怯ませたが…\n獣たちは慣れた様子で再び押し寄せてきた。\n「も、もっと強い力が必要だ…！」',
  water:   '💧 水流が獣を押しとどめようとするが…\n獣たちは川を泳いで渡ってきた！\n「水では止められない…別の手を！」',
  wind:    '🌀 嵐の風が獣たちを一時遠ざけたが…\n大きな獣は踏ん張り、また迫ってきた。\n「風だけでは足りない…！」',
  hail:    '🌨 雹が獣たちに降り注いだが…\n毛皮で守られた獣には効果が薄かった。\n「もっと強力な何かが必要だ！」',
};

// 帆船イベント用メッセージ（風のみ成功）
const SAILING_SHIP_RESULTS: Record<WeatherChoice, string> = {
  wind:    '🌀 力強い風が帆いっぱいに吹き込み…\n帆船がゆっくりと、しかし力強く動き出した！\n「出港できる…！ありがとう、天候使い！」',
  thunder: '⚡ 雷が轟いたが帆は揺れるだけ…\n船乗りたちは帆柱にしがみつき震えた。\n「雷じゃない、風が欲しいんだ！」',
  fire:    '☀️ 太陽が照りつけるが、帆は動かない…\n熱さで船員が倒れそうになってしまった。\n「晴れは要らない…風を！」',
  water:   '💧 波が激しくなったが向かい風になった！\n船はむしろ港に押し返されてしまった。\n「水ではなく風が必要なんだ！」',
  hail:    '🌨 雹が甲板を叩き、船員が避難した…\n嵐では出港できない。\n「穏やかな風を…お願いだ！」',
};

// タイトル画面と同じ全6フレーム
const ALL_WALK_KEYS = [
  'gale_walk','gale_walk1','gale_walk2','gale_walk3','gale_walk4','gale_walk5'
] as const;
const WALK_FILE: Record<string, string> = {
  gale_walk4: 'gale_walk4.jpg.png',
  gale_walk5: 'gale_walk5.png',
};

const VILLAGER_WEATHER_MAP: Record<string, WeatherChoice> = {
  thunderstorm: 'thunder',
  rain:         'water',
  wind:         'wind',
  sunny:        'fire',
  hail:         'hail',
};

export class VillagerScene extends Phaser.Scene {
  private activeWeatherType: WeatherChoice | null = null;
  private villagerBtnRedraw: Partial<Record<WeatherChoice, (hover: boolean) => void>> = {};
  private villagerChoiceTriggers: Partial<Record<WeatherChoice, () => void>> = {};
  private villagerChoiceMade = false;

  constructor() { super({ key: 'VillagerScene' }); }

  preload() {
    if (!this.textures.exists('man_murabito'))   this.load.image('man_murabito',   'man_murabito.jpg');
    if (!this.textures.exists('woman_murabito')) this.load.image('woman_murabito', 'woman_murabito.jpg');
    if (!this.textures.exists('village_attack')) this.load.image('village_attack', 'village-underattack.jpg');
    if (!this.textures.exists('wind_village'))   this.load.image('wind_village',   'wind-village.jpg');
    ALL_WALK_KEYS.forEach(key => {
      if (!this.textures.exists(key))
        this.load.image(key, WALK_FILE[key] ?? `${key}.jpg`);
    });
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
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i],d[i+1],d[i+2]), mn = Math.min(d[i],d[i+1],d[i+2]);
      const sat = mx === 0 ? 0 : (mx-mn)/mx;
      if (mx < 60) d[i+3] = 0;
      else if (mx < 100 && sat < 0.55) d[i+3] = Math.round(((mx-60)/40)*255);
    }
    ctx.putImageData(imgData, 0, 0);
    this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  create(data: { nodeId: number; villagerType: VillagerType }) {
    this.villagerChoiceMade = false;
    this.villagerChoiceTriggers = {};
    this.villagerBtnRedraw = {};
    this.activeWeatherType = null;

    const W = this.scale.width, H = this.scale.height;
    const nodeId       = data?.nodeId       ?? 0;
    const villagerType = data?.villagerType ?? 'man';

    if (villagerType === 'beast_attack') {
      this.buildBeastAttackScene(W, H, nodeId);
    } else if (villagerType === 'sailing_ship') {
      this.buildSailingShipScene(W, H, nodeId);
    } else {
      this.buildVillagerScene(W, H, nodeId, villagerType as 'man' | 'woman');
    }

    this.game.events.on('weatherChanged', (apiWeather: string) => {
      const type = VILLAGER_WEATHER_MAP[apiWeather];
      if (type) {
        this.highlightWeatherBtn(type);
        this.villagerChoiceTriggers[type]?.();
      }
    }, this);
  }

  shutdown() {
    this.game.events.off('weatherChanged', undefined, this);
  }

  private highlightWeatherBtn(type: WeatherChoice) {
    this.activeWeatherType = type;
    (Object.keys(this.villagerBtnRedraw) as WeatherChoice[]).forEach(t => {
      this.villagerBtnRedraw[t]?.(false);
    });
  }

  // ─── 獣の襲撃イベント ────────────────────────────────────────
  private buildBeastAttackScene(W: number, H: number, nodeId: number) {
    // 背景画像
    const hasBg = this.textures.exists('village_attack') && this.textures.get('village_attack').key !== '__MISSING';
    if (hasBg) {
      this.add.image(W/2, H/2, 'village_attack').setDisplaySize(W, H);
    } else {
      const bg = this.add.graphics();
      bg.fillStyle(0x1a0808); bg.fillRect(0, 0, W, H);
    }
    // 暗いオーバーレイ（上部と下部）
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.65, 0.65, 0, 0);
    overlay.fillRect(0, 0, W, H * 0.25);
    overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.82, 0.82);
    overlay.fillRect(0, H * 0.72, W, H * 0.28);

    this.addBackButton(W);

    const uiContainer = this.add.container(0, 0).setVisible(false);
    this.buildSpecialEventUI(W, H, nodeId, uiContainer,
      '⚠ 獣たちが村を襲っている！',
      '「たすけてくれ！獣の群れが\n　村に押し寄せてきた…！\n　天候の力で追い払って！」',
      BEAST_ATTACK_RESULTS,
      'thunder'
    );

    this.cameras.main.fadeIn(500);
    this.time.delayedCall(300, () => {
      this.animateHeroEntry(W, H * 0.72, () => uiContainer.setVisible(true));
    });
  }

  // ─── 帆船・無風イベント ──────────────────────────────────────
  private buildSailingShipScene(W: number, H: number, nodeId: number) {
    // 背景画像
    const hasBg = this.textures.exists('wind_village') && this.textures.get('wind_village').key !== '__MISSING';
    if (hasBg) {
      this.add.image(W/2, H/2, 'wind_village').setDisplaySize(W, H);
    } else {
      const bg = this.add.graphics();
      bg.fillStyle(0x080c1a); bg.fillRect(0, 0, W, H);
    }
    // 暗いオーバーレイ
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.65, 0.65, 0, 0);
    overlay.fillRect(0, 0, W, H * 0.25);
    overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.82, 0.82);
    overlay.fillRect(0, H * 0.72, W, H * 0.28);

    this.addBackButton(W);

    const uiContainer = this.add.container(0, 0).setVisible(false);
    this.buildSpecialEventUI(W, H, nodeId, uiContainer,
      '⛵ 帆船が出港できない…',
      '「風がなくて帆船が\n　動かせないんだ…\n　風の力を貸してくれ！」',
      SAILING_SHIP_RESULTS,
      'wind'
    );

    this.cameras.main.fadeIn(500);
    this.time.delayedCall(300, () => {
      this.animateHeroEntry(W, H * 0.72, () => uiContainer.setVisible(true));
    });
  }

  // ─── 特殊イベント共通UI（正解の天候1つ） ────────────────────
  private buildSpecialEventUI(
    W: number, H: number, nodeId: number,
    container: Phaser.GameObjects.Container,
    titleStr: string,
    speechStr: string,
    results: Record<WeatherChoice, string>,
    _correctChoice: WeatherChoice
  ) {
    const add = (go: Phaser.GameObjects.GameObject) => { container.add(go); return go; };

    // タイトルテキスト
    add(this.add.text(W/2, 26, titleStr, {
      fontSize:'22px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#ff9944', stroke:'#1a0800', strokeThickness:4,
    }).setOrigin(0.5));

    // セリフ吹き出し
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0x0a0a0a, 0.88);
    bubbleBg.fillRoundedRect(W*0.38, 52, W*0.58, 108, 12);
    bubbleBg.lineStyle(2, 0x884422, 0.85);
    bubbleBg.strokeRoundedRect(W*0.38, 52, W*0.58, 108, 12);
    bubbleBg.fillStyle(0x0a0a0a, 0.88);
    bubbleBg.fillTriangle(W*0.38, 96, W*0.38-18, 104, W*0.38, 112);
    add(bubbleBg);
    add(this.add.text(W*0.38+14, 62, speechStr, {
      fontSize:'13px', fontFamily:'"Yu Gothic","YuGothic",monospace',
      color:'#ffddcc', lineSpacing:4,
    }));

    // ── 下部HUDバー ───────────────────────────────────────
    const hudY  = H * 0.77;
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000011, 0.92); hudBg.fillRect(0, hudY, W, H - hudY);
    hudBg.lineStyle(2, 0x442288, 1);  hudBg.strokeRect(0, hudY, W, H - hudY);
    add(hudBg);

    add(this.add.text(W/2, hudY + 8, '▶  天候を選んでください', {
      fontSize:'14px', fontFamily:'"Yu Gothic","YuGothic",monospace', color:'#ffaa88',
    }).setOrigin(0.5, 0));

    // 結果テキスト（最初は非表示）
    const resultBg   = this.add.graphics().setVisible(false);
    const resultText = this.add.text(W/2, H*0.60, '', {
      fontSize:'16px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#ffeeaa', stroke:'#1a0a00', strokeThickness:3, align:'center', lineSpacing:4,
    }).setOrigin(0.5).setVisible(false);
    add(resultBg); add(resultText);

    // 天候ボタン5種
    const types: WeatherChoice[] = ['thunder','fire','water','wind','hail'];
    const gap  = 8;
    const btnH = H - hudY - 30;
    const btnW = Math.floor((W - 20 - gap*(types.length-1)) / types.length);
    const by   = hudY + 26;

    types.forEach((type, i) => {
      const cfg = WEATHER_BTN[type];
      const bx  = 10 + i*(btnW+gap);

      const frame = this.add.graphics();
      const draw = (hover: boolean) => {
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
      draw(false);
      this.villagerBtnRedraw[type] = draw;
      add(frame);
      add(this.add.text(bx+btnW/2, by+10, cfg.emoji, {fontSize:'18px'}).setOrigin(0.5, 0));
      add(this.add.text(bx+btnW/2, by+btnH-16, cfg.label, {
        fontSize:'18px', fontFamily:'"Yu Gothic","YuGothic",monospace',
        color:'#ffffff', stroke:'#000', strokeThickness:2,
      }).setOrigin(0.5, 1));

      const hit = this.add.rectangle(bx+btnW/2, by+btnH/2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor:true });
      add(hit);

      const isSuccess = type === _correctChoice;

      const triggerChoice = () => {
        if (this.villagerChoiceMade) return;
        this.villagerChoiceMade = true;
        hit.disableInteractive();

        // エフェクト
        for (let j = 0; j < 14; j++) {
          const px = W*0.50 + Phaser.Math.Between(-120, 120);
          const py = H*0.45 + Phaser.Math.Between(-60, 60);
          const color = isSuccess ? 0xffdd44 : cfg.btnGlow;
          const p = this.add.circle(px, py, Phaser.Math.Between(3,7), color, 0.9);
          this.tweens.add({ targets:p, y:py-Phaser.Math.Between(50,110), alpha:0,
            duration:Phaser.Math.Between(600,1100), delay:j*55, onComplete:()=>p.destroy() });
        }

        // 結果表示
        const msg = results[type];
        const bgColor = isSuccess ? 0x041a10 : 0x1a0404;
        const borderColor = isSuccess ? 0x33dd66 : 0xaa3333;
        resultBg.fillStyle(bgColor, 0.92);
        resultBg.fillRoundedRect(W/2-260, H*0.53, 520, 88, 10);
        resultBg.lineStyle(2, borderColor, 0.9);
        resultBg.strokeRoundedRect(W/2-260, H*0.53, 520, 88, 10);
        resultBg.setVisible(true);
        resultText.setText(msg).setY(H*0.575).setVisible(true);
        this.tweens.add({ targets:resultText, alpha:0.4, duration:450, yoyo:true, repeat:1 });

        const delay = isSuccess ? 2000 : 2200;
        this.time.delayedCall(delay, () => {
          const completed: number[] = this.game.registry.get('completedNodes') ?? [];
          if (!completed.includes(nodeId)) completed.push(nodeId);
          this.game.registry.set('completedNodes', completed);
          this.game.registry.set('playerNodeId', nodeId);
          this.cameras.main.fade(500, 0, 0, 0);
          this.time.delayedCall(500, () => this.scene.start('MapScene'));
        });
      };
      this.villagerChoiceTriggers[type] = triggerChoice;

      hit.on('pointerover',  () => draw(true));
      hit.on('pointerout',   () => draw(false));
      hit.on('pointerdown',  triggerChoice);
      this.tweens.add({ targets:frame, alpha:0.70, duration:1000+i*110, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    });
  }

  // ─── 村の背景 ─────────────────────────────────────────────────
  private buildVillageBackground(W: number, H: number, groundY: number) {
    this.add.image(W / 2, H * 0.52, 'bg_mura').setDisplaySize(W, H * 1.04);
    const ground = this.add.graphics();
    ground.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    ground.fillRect(0, groundY, W, H - groundY);
  }

  // ─── 通常の村人イベント ──────────────────────────────────────
  private buildVillagerScene(W: number, H: number, nodeId: number, villagerType: 'man' | 'woman') {
    const villagerKey = villagerType === 'man' ? 'man_murabito' : 'woman_murabito';
    const groundY = H * 0.72;

    this.removeBlackBg('man_murabito');
    this.removeBlackBg('woman_murabito');

    this.buildVillageBackground(W, H, groundY);

    const villagerX = W * 0.64;
    const hasVillager = this.textures.exists(villagerKey) && this.textures.get(villagerKey).key !== '__MISSING';
    if (hasVillager) {
      this.add.image(villagerX, groundY, villagerKey)
        .setOrigin(0.5, 1)
        .setScale(0.60)
        .setFlipX(true);
    } else {
      this.makeFallbackVillager(villagerX, groundY, villagerType);
    }

    this.addBackButton(W);

    const uiContainer = this.add.container(0, 0).setVisible(false);
    this.buildEventUI(W, H, nodeId, villagerType, uiContainer);

    this.cameras.main.fadeIn(500);
    this.time.delayedCall(300, () => {
      this.animateHeroEntry(W, groundY, () => uiContainer.setVisible(true));
    });
  }

  // ─── イベントUI（下部ボタン＋吹き出し） ─────────────────────
  private buildEventUI(
    W: number, H: number, nodeId: number,
    villagerType: 'man' | 'woman',
    container: Phaser.GameObjects.Container
  ) {
    const add = (go: Phaser.GameObjects.GameObject) => { container.add(go); return go; };

    add(this.add.text(W/2, 26, '村人が助けを求めている！', {
      fontSize:'22px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#ffcc66', stroke:'#1a0800', strokeThickness:4,
    }).setOrigin(0.5));

    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0x0a1a0a, 0.88);
    bubbleBg.fillRoundedRect(W*0.38, 52, W*0.58, 108, 12);
    bubbleBg.lineStyle(2, 0x3a7a44, 0.85);
    bubbleBg.strokeRoundedRect(W*0.38, 52, W*0.58, 108, 12);
    bubbleBg.fillStyle(0x0a1a0a, 0.88);
    bubbleBg.fillTriangle(W*0.38, 96, W*0.38-18, 104, W*0.38, 112);
    add(bubbleBg);
    const speechStr = villagerType === 'man'
      ? '「た、助けてください！\n　魔物に追われています…\n　あなたの天候の力で\n　何とかしてください！」'
      : '「お願い！ここから\n　逃げ出す手助けを…\n　あなたの天候の力で\n　魔物を追い払って！」';
    add(this.add.text(W*0.38+14, 62, speechStr, {
      fontSize:'13px', fontFamily:'"Yu Gothic","YuGothic",monospace',
      color:'#ddeedd', lineSpacing:4,
    }));

    const hudY  = H * 0.77;
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000011, 0.92); hudBg.fillRect(0, hudY, W, H - hudY);
    hudBg.lineStyle(2, 0x224488, 1);  hudBg.strokeRect(0, hudY, W, H - hudY);
    add(hudBg);

    add(this.add.text(W/2, hudY + 8, '▶  天候を選んでください', {
      fontSize:'14px', fontFamily:'"Yu Gothic","YuGothic",monospace', color:'#88ddbb',
    }).setOrigin(0.5, 0));

    const resultBg   = this.add.graphics().setVisible(false);
    const resultText = this.add.text(W/2, H*0.60, '', {
      fontSize:'17px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#88ffaa', stroke:'#001a0a', strokeThickness:3, align:'center', lineSpacing:4,
    }).setOrigin(0.5).setVisible(false);
    add(resultBg); add(resultText);

    const types: WeatherChoice[] = ['thunder','fire','water','wind','hail'];
    const gap  = 8;
    const btnH = H - hudY - 30;
    const btnW = Math.floor((W - 20 - gap*(types.length-1)) / types.length);
    const by   = hudY + 26;

    types.forEach((type, i) => {
      const cfg = WEATHER_BTN[type];
      const bx  = 10 + i*(btnW+gap);

      const frame = this.add.graphics();
      const draw = (hover: boolean) => {
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
      draw(false);
      this.villagerBtnRedraw[type] = draw;
      add(frame);
      add(this.add.text(bx+btnW/2, by+10, cfg.emoji, {fontSize:'18px'}).setOrigin(0.5, 0));
      add(this.add.text(bx+btnW/2, by+btnH-16, cfg.label, {
        fontSize:'18px', fontFamily:'"Yu Gothic","YuGothic",monospace',
        color:'#ffffff', stroke:'#000', strokeThickness:2,
      }).setOrigin(0.5, 1));

      const hit = this.add.rectangle(bx+btnW/2, by+btnH/2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor:true });
      add(hit);

      const triggerChoice = () => {
        if (this.villagerChoiceMade) return;
        this.villagerChoiceMade = true;
        hit.disableInteractive();
        for (let j = 0; j < 14; j++) {
          const px = W*0.50 + Phaser.Math.Between(-120, 120);
          const py = H*0.45 + Phaser.Math.Between(-60, 60);
          const p  = this.add.circle(px, py, Phaser.Math.Between(3,7), cfg.btnGlow, 0.9);
          this.tweens.add({ targets:p, y:py-Phaser.Math.Between(50,110), alpha:0,
            duration:Phaser.Math.Between(600,1100), delay:j*55, onComplete:()=>p.destroy() });
        }
        const msg = villagerType === 'man' ? cfg.manResult : cfg.womanResult;
        resultBg.fillStyle(0x041210, 0.90);
        resultBg.fillRoundedRect(W/2-250, H*0.55, 500, 72, 10);
        resultBg.lineStyle(2, 0x33aa66, 0.9);
        resultBg.strokeRoundedRect(W/2-250, H*0.55, 500, 72, 10);
        resultBg.setVisible(true);
        resultText.setText(msg).setY(H*0.59).setVisible(true);
        this.tweens.add({ targets:resultText, alpha:0.4, duration:450, yoyo:true, repeat:1 });

        this.time.delayedCall(1700, () => {
          const completed: number[] = this.game.registry.get('completedNodes') ?? [];
          if (!completed.includes(nodeId)) completed.push(nodeId);
          this.game.registry.set('completedNodes', completed);
          this.game.registry.set('playerNodeId', nodeId);
          this.cameras.main.fade(500, 0, 0, 0);
          this.time.delayedCall(500, () => this.scene.start('MapScene'));
        });
      };
      this.villagerChoiceTriggers[type] = triggerChoice;

      hit.on('pointerover',  () => draw(true));
      hit.on('pointerout',   () => draw(false));
      hit.on('pointerdown',  triggerChoice);
      this.tweens.add({ targets:frame, alpha:0.70, duration:1000+i*110, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    });
  }

  // ─── 主人公の歩き入場（タイトルと同じ6フレーム） ────────────
  private animateHeroEntry(W: number, groundY: number, onArrive: () => void) {
    const validKeys = ALL_WALK_KEYS.filter(
      k => this.textures.exists(k) && this.textures.get(k).key !== '__MISSING'
    );
    if (validKeys.length === 0) { onArrive(); return; }

    const hero = this.add.image(-90, groundY, validKeys[0]).setOrigin(0.5, 1).setScale(1.2);
    const fixedW = hero.displayWidth, fixedH = hero.displayHeight;
    const shadow = this.add.ellipse(-90, groundY + 4, 50, 12, 0x000000, 0.32);

    let fi = 0;
    const walkTimer = this.time.addEvent({
      delay: 125, repeat: -1,
      callback: () => {
        fi = (fi + 1) % validKeys.length;
        hero.setTexture(validKeys[fi]);
        hero.setDisplaySize(fixedW, fixedH);
      },
    });

    this.tweens.add({
      targets: [hero, shadow],
      x: W * 0.30,
      duration: 1800,
      ease: 'Linear',
      onComplete: () => {
        walkTimer.remove();
        hero.setTexture(validKeys[0]);
        hero.setDisplaySize(fixedW, fixedH);
        this.time.delayedCall(250, onArrive);
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
