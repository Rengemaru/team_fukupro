import Phaser from 'phaser';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { apiClient } from '../api/apiClient';
import { useSceneStore } from '../store/sceneStore';

type WeatherChoice = 'thunder' | 'sunny' | 'rain' | 'wind' | 'hail';
type VillagerType = 'man' | 'woman' | 'beast_attack' | 'sailing_ship' | 'drought' | 'heavy_rain';

const WEATHER_BTN: Record<WeatherChoice, {
  label: string; emoji: string; btnColor: number; btnGlow: number;
  manResult: string; womanResult: string;
}> = {
  thunder: { label:'雷', emoji:'⚡', btnColor:0x1a2255, btnGlow:0x8888ff,
    manResult: '⚡ 雷が轟き、魔物を追い払った！\n「す、すごい…！ありがとう！」',
    womanResult: '⚡ 雷が空を裂き、魔物が逃げ去った！\n「助かりました…！」' },
  sunny:   { label:'晴れ', emoji:'☀️', btnColor:0x2a2200, btnGlow:0xffcc00,
    manResult: '☀️ 眩い光が周囲を照らし、魔物を退けた！\n「熱いけど…命拾いした！」',
    womanResult: '☀️ 陽光の壁が魔物の道を塞いだ！\n「あなたは天候の使い手…！」' },
  rain:    { label:'雨', emoji:'💧', btnColor:0x002244, btnGlow:0x44aaff,
    manResult: '💧 急流が魔物を押し流した！\n「川が…あいつを飲み込んだ！」',
    womanResult: '💧 水の盾が魔物の爪を弾いた！\n「ありがとう、怪我はない…！」' },
  wind:    { label:'風', emoji:'🌀', btnColor:0x003322, btnGlow:0x44ffaa,
    manResult: '🌀 嵐が魔物を吹き飛ばした！\n「風がこんなに力強いとは…！」',
    womanResult: '🌀 竜巻が魔物を連れ去った！\n「本当にありがとう！」' },
  hail:    { label:'雹', emoji:'🌨', btnColor:0x001833, btnGlow:0x88ccff,
    manResult: '🌨 雹嵐が魔物を凍らせた！\n「か、固まってる…す、すごい！」',
    womanResult: '🌨 氷の結晶が魔物を貫いた！\n「冷たいけど…助かった！」' },
};

interface SpecialEventCfg {
  bgKey: string;
  titleStr: string;
  speechStr: string;
  correctChoices: WeatherChoice[];
  penaltyChoices: WeatherChoice[];
  results: Record<WeatherChoice, string>;
}

const SPECIAL_EVENTS: Record<'beast_attack' | 'sailing_ship' | 'drought' | 'heavy_rain', SpecialEventCfg> = {
  beast_attack: {
    bgKey: 'village_attack',
    titleStr: '⚠ 獣たちが村を襲っている！',
    speechStr: '「たすけてくれ！獣の群れが\n　村に押し寄せてきた…！\n　天候の力で追い払って！」',
    correctChoices: ['thunder'],
    penaltyChoices: ['sunny'],
    results: {
      thunder: '⚡ 天空を裂く雷が獣たちを直撃！\n獣たちは悲鳴を上げて散り散りに逃げ去った！\n「す、すごい…村が救われた！ありがとう！」',
      sunny:   '☀️ 晴れで気温が上がり、獣が活発になった！\n手に負えなくなってしまった…\n💢 村人たちに怒られてボコボコにされた！ HP -1',
      rain:    '💧 水流が獣を一時遠ざけたが…\n獣たちは川を泳いで戻ってきた。\n「水では止められない…別の手を！」',
      wind:    '🌀 嵐の風が獣を遠ざけたが…\n大きな獣は踏ん張り、また迫ってきた。\n「風だけでは足りない…！」',
      hail:    '🌨 雹が獣たちに降り注いだが…\n毛皮に守られた獣には効果が薄かった。\n「もっと強力な何かが必要だ！」',
    },
  },
  sailing_ship: {
    bgKey: 'wind_village',
    titleStr: '⛵ 帆船が出港できない…',
    speechStr: '「帆船が港から\n　動けないんだ…！\n　天候の力で何とか\n　してくれないか！」',
    correctChoices: ['wind'],
    penaltyChoices: ['thunder'],
    results: {
      wind:    '🌀 力強い風が帆いっぱいに吹き込み…\n帆船がゆっくりと、力強く動き出した！\n「出港できる…！ありがとう、天候使い！」',
      thunder: '⚡ 雷が落ちてマストが折れてしまった！\n修理費が莫大になってしまい…\n💢 怒り狂った船長にボコボコにされた！ HP -1',
      sunny:   '☀️ 太陽が照りつけるが、帆は動かない…\n熱さで船員が倒れそうになった。\n「晴れは要らない…風を！」',
      rain:    '💧 波が激しくなったが向かい風になった！\n船はむしろ港に押し返されてしまった。\n「水ではなく風が必要なんだ！」',
      hail:    '🌨 雹が甲板を叩き、船員が避難した…\n嵐では出港できない。\n「穏やかな風を…お願いだ！」',
    },
  },
  drought: {
    bgKey: 'drought_village',
    titleStr: '🌵 村が干ばつに苦しんでいる！',
    speechStr: '「畑が全滅だ…\n　作物が枯れ果てた…！\n　天候の力で村を\n　救ってくれ！」',
    correctChoices: ['rain', 'hail'],
    penaltyChoices: ['sunny'],
    results: {
      rain:    '💧 恵みの雨が大地に降り注いだ！\n干からびた畑に水が満ちていく…\n「ありがとう！作物が生き返った！」',
      hail:    '🌨 雹が降り注ぎ大地を冷やした！\nその後に大量の雪解け水が流れ込んだ！\n「雹まで役に立つとは…！ありがとう！」',
      sunny:   '☀️ 炎天下でさらに乾燥が加速した！\n残っていた作物まで全滅してしまった…\n💢 激怒した村人たちにボコボコにされた！ HP -1',
      thunder: '⚡ 雷が落ちたが雨は来なかった…\n乾いた大地は変わらないまま。\n「雷だけでは水は湧かない…」',
      wind:    '🌀 熱風が吹いて、さらに乾燥が進んだ…\nほこりだらけになってしまった。\n「風じゃなくて水が欲しいんだ！」',
    },
  },
  heavy_rain: {
    bgKey: 'heavy_rain_village',
    titleStr: '🌧 村が大雨で水浸しだ！',
    speechStr: '「洪水が来る…！\n　村が沈んでしまう…\n　天候の力で何とか\n　してくれ！」',
    correctChoices: ['sunny'],
    penaltyChoices: ['rain', 'thunder'],
    results: {
      sunny:   '☀️ 強い日差しが雲を吹き散らした！\n雨が止み、青空が村に戻ってきた！\n「奇跡だ…！ありがとう！村が救われた！」',
      rain:    '💧 さらに雨が強まって洪水になった！\n村の家が流されてしまった…\n💢 全財産を失った村人にボコボコにされた！ HP -1',
      thunder: '⚡ 雷雨になってさらに状況が悪化！\n落雷で家が燃え水も溢れ大惨事に…\n💢 泣き叫ぶ村人たちにボコボコにされた！ HP -1',
      wind:    '🌀 強風で屋根が吹き飛んでしまった…\n雨も降り続けて二重苦になった。\n「風も雨もいらない！晴れを！」',
      hail:    '🌨 雹まで降ってきて大惨事に…\n雨と雹で畑が壊滅してしまった。\n「もう何もかもがダメだ…！」',
    },
  },
};

const ALL_WALK_KEYS = [
  'gale_walk','gale_walk1','gale_walk2','gale_walk3','gale_walk4','gale_walk5'
] as const;
// 全て透過PNG版を使用（黒背景除去済み）
const WALK_FILE: Record<string, string> = {
  gale_walk4: 'gale_walk4.jpg.png',  // PNG (既存)
  gale_walk5: 'gale_walk5.png',      // PNG (既存)
};

const VILLAGER_WEATHER_MAP: Record<string, WeatherChoice> = {
  thunder: 'thunder',
  rain:    'rain',
  wind:    'wind',
  sunny:   'sunny',
  hail:    'hail',
};

export class VillagerScene extends Phaser.Scene {
  private activeWeatherType: WeatherChoice | null = null;
  private villagerBtnRedraw: Partial<Record<WeatherChoice, (hover: boolean) => void>> = {};
  private villagerChoiceTriggers: Partial<Record<WeatherChoice, () => void>> = {};
  private villagerChoiceMade = false;

  constructor() { super({ key: 'VillagerScene' }); }

  preload() {
    if (!this.textures.exists('bg_mura'))         this.load.image('bg_mura',         'mura.jpg');
    if (!this.textures.exists('man_murabito'))    this.load.image('man_murabito',    'man_murabito.jpg');
    if (!this.textures.exists('woman_murabito'))  this.load.image('woman_murabito',  'woman_murabito.jpg');
    if (!this.textures.exists('village_attack'))  this.load.image('village_attack',  'village-underattack.jpg');
    if (!this.textures.exists('wind_village'))    this.load.image('wind_village',    'wind-village.jpg');
    if (!this.textures.exists('drought_village')) this.load.image('drought_village', 'drought_stricken_village.png');
    if (!this.textures.exists('heavy_rain_village')) this.load.image('heavy_rain_village', 'heavy_rain_village.png');
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
    useSceneStore.getState().setCurrentScene('VillagerScene');
    useSceneStore.getState().setMikeVisible(true);
    this.villagerChoiceMade = false;
    this.villagerChoiceTriggers = {};
    this.villagerBtnRedraw = {};
    this.activeWeatherType = null;

    const W = this.scale.width, H = this.scale.height;
    const nodeId       = data?.nodeId       ?? 0;
    const villagerType = data?.villagerType ?? 'man';

    if (villagerType === 'man' || villagerType === 'woman') {
      this.buildVillagerScene(W, H, nodeId, villagerType);
    } else {
      this.buildSpecialScene(W, H, nodeId, SPECIAL_EVENTS[villagerType]);
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
    useSceneStore.getState().setCurrentScene('');
    useSceneStore.getState().setMikeVisible(false);
    this.game.events.off('weatherChanged', undefined, this);
  }

  private highlightWeatherBtn(type: WeatherChoice) {
    this.activeWeatherType = type;
    (Object.keys(this.villagerBtnRedraw) as WeatherChoice[]).forEach(t => {
      this.villagerBtnRedraw[t]?.(false);
    });
  }

  // ─── 特殊イベント（背景画像あり）────────────────────────────
  private buildSpecialScene(W: number, H: number, nodeId: number, cfg: SpecialEventCfg) {
    const hasBg = this.textures.exists(cfg.bgKey) && this.textures.get(cfg.bgKey).key !== '__MISSING';
    if (hasBg) {
      this.add.image(W/2, H/2, cfg.bgKey).setDisplaySize(W, H);
    } else {
      this.add.graphics().fillStyle(0x080c1a).fillRect(0, 0, W, H);
    }
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x000000,0x000000,0x000000,0x000000,0.65,0.65,0,0);
    overlay.fillRect(0, 0, W, H * 0.22);
    overlay.fillGradientStyle(0x000000,0x000000,0x000000,0x000000,0,0,0.82,0.82);
    overlay.fillRect(0, H * 0.72, W, H * 0.28);

    this.addBackButton(W);

    // 村人（冒険者の対面）
    const specialGroundY = H * 0.72;
    const specialVillagerY = specialGroundY + 20;
    this.removeBlackBg('woman_murabito');
    const hasWoman = this.textures.exists('woman_murabito') && this.textures.get('woman_murabito').key !== '__MISSING';
    if (hasWoman) {
      this.add.image(W * 0.68, specialVillagerY, 'woman_murabito')
        .setOrigin(0.5, 1).setScale(0.45).setFlipX(true);
    } else {
      this.makeFallbackVillager(W * 0.68, specialVillagerY, 'woman');
    }

    // depth:10 でヒーローより前面に描画
    const uiContainer = this.add.container(0, 0).setVisible(false).setDepth(10);
    this.buildSpecialEventUI(W, H, nodeId, uiContainer, cfg);

    this.cameras.main.fadeIn(500);
    this.time.delayedCall(300, () => {
      this.animateHeroEntry(W, specialGroundY, () => uiContainer.setVisible(true));
    });
  }

  // ─── 特殊イベントUI ──────────────────────────────────────────
  private buildSpecialEventUI(
    W: number, H: number, nodeId: number,
    container: Phaser.GameObjects.Container,
    cfg: SpecialEventCfg
  ) {
    const add = (go: Phaser.GameObjects.GameObject) => { container.add(go); return go; };

    add(this.add.text(W/2, 18, cfg.titleStr, {
      fontSize:'20px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#ff9944', stroke:'#1a0800', strokeThickness:4,
    }).setOrigin(0.5));

    // 吹き出し（村人の上）
    const bw = W * 0.52, bx = W * 0.68 - bw / 2, bTop = H * 0.72 - 300, bH = 100;
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0x050505, 0.90);
    bubbleBg.fillRoundedRect(bx, bTop, bw, bH, 12);
    bubbleBg.lineStyle(2, 0x884422, 0.90);
    bubbleBg.strokeRoundedRect(bx, bTop, bw, bH, 12);
    bubbleBg.fillStyle(0x050505, 0.90);
    bubbleBg.fillTriangle(bx + bw / 2 - 12, bTop + bH, bx + bw / 2 + 12, bTop + bH, bx + bw / 2, bTop + bH + 20);
    add(bubbleBg);
    add(this.add.text(bx+12, bTop+8, cfg.speechStr, {
      fontSize:'13px', fontFamily:'"Yu Gothic","YuGothic",monospace',
      color:'#ffddcc', lineSpacing:4,
    }));

    // HUDバー
    const hudY = H * 0.77;
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000011, 0.92); hudBg.fillRect(0, hudY, W, H - hudY);
    hudBg.lineStyle(2, 0x442288, 1);  hudBg.strokeRect(0, hudY, W, H - hudY);
    add(hudBg);
    add(this.add.text(W/2, hudY + 8, '▶  天候を選んでください', {
      fontSize:'14px', fontFamily:'"Yu Gothic","YuGothic",monospace', color:'#ffaa88',
    }).setOrigin(0.5, 0));

    // 結果ボックス（非表示）
    const resultBg   = this.add.graphics().setVisible(false);
    const resultText = this.add.text(W/2, H*0.575, '', {
      fontSize:'15px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#ffeeaa', stroke:'#1a0a00', strokeThickness:3, align:'center', lineSpacing:4,
    }).setOrigin(0.5).setVisible(false);
    add(resultBg); add(resultText);

    this.buildWeatherButtons(W, H, hudY, nodeId, container, cfg, resultBg, resultText);
  }

  private buildWeatherButtons(
    W: number, H: number, hudY: number, nodeId: number,
    container: Phaser.GameObjects.Container,
    cfg: SpecialEventCfg,
    resultBg: Phaser.GameObjects.Graphics,
    resultText: Phaser.GameObjects.Text
  ) {
    const add = (go: Phaser.GameObjects.GameObject) => { container.add(go); return go; };
    const ownedSpells = useGameStore.getState().playerSpells;
    const allChoices: WeatherChoice[] = ['thunder','sunny','rain','wind','hail'];
    const types: WeatherChoice[] = ownedSpells.length > 0
      ? allChoices.filter(t => ownedSpells.includes(t))
      : allChoices;
    const gap = 8, btnH = H - hudY - 30;
    const btnW = Math.floor((W - 20 - gap*(types.length-1)) / types.length);
    const by = hudY + 26;

    types.forEach((type, i) => {
      const wcfg = WEATHER_BTN[type];
      const bx = 10 + i*(btnW+gap);

      const frame = this.add.graphics();
      const draw = (hover: boolean) => {
        const isActive = this.activeWeatherType === type;
        frame.clear();
        frame.fillStyle(wcfg.btnColor, hover || isActive ? 1 : 0.9);
        frame.fillRoundedRect(bx, by, btnW, btnH, 6);
        frame.lineStyle(
          isActive ? 4 : hover ? 3 : 2,
          isActive ? 0xffffff : hover ? 0xffffff : wcfg.btnGlow,
          isActive ? 1 : hover ? 1 : 0.85
        );
        frame.strokeRoundedRect(bx, by, btnW, btnH, 6);
      };
      draw(false);
      this.villagerBtnRedraw[type] = draw;
      add(frame);
      add(this.add.text(bx+btnW/2, by+10, wcfg.emoji, {fontSize:'18px'}).setOrigin(0.5, 0));
      add(this.add.text(bx+btnW/2, by+btnH-16, wcfg.label, {
        fontSize:'18px', fontFamily:'"Yu Gothic","YuGothic",monospace',
        color:'#ffffff', stroke:'#000', strokeThickness:2,
      }).setOrigin(0.5, 1));

      const hit = this.add.rectangle(bx+btnW/2, by+btnH/2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor:true });
      add(hit);

      const isCorrect = cfg.correctChoices.includes(type);
      const isPenalty = cfg.penaltyChoices.includes(type);

      const triggerChoice = () => {
        if (this.villagerChoiceMade) return;
        this.villagerChoiceMade = true;
        useSceneStore.getState().setMikeVisible(false);
        hit.disableInteractive();

        // パーティクルエフェクト
        const particleColor = isCorrect ? 0xffdd44 : isPenalty ? 0xff2222 : wcfg.btnGlow;
        for (let j = 0; j < 14; j++) {
          const px = W*0.55 + Phaser.Math.Between(-120, 120);
          const py = H*0.45 + Phaser.Math.Between(-60, 60);
          const p = this.add.circle(px, py, Phaser.Math.Between(3,7), particleColor, 0.9);
          p.setDepth(20);
          this.tweens.add({ targets:p, y:py-Phaser.Math.Between(50,110), alpha:0,
            duration:Phaser.Math.Between(600,1100), delay:j*55, onComplete:()=>p.destroy() });
        }

        // スコア加算（ペナルティ以外）
        if (!isPenalty) {
          usePlayerStore.getState().addScore(10);
          const ptsText = this.add.text(W/2, H*0.48, '+10 pts', {
            fontSize:'22px', fontFamily:'monospace', color:'#ffdd44',
            stroke:'#000', strokeThickness:3,
          }).setOrigin(0.5).setAlpha(0).setDepth(20);
          this.tweens.add({
            targets: ptsText, alpha: 1, y: H*0.43, duration: 500, ease:'Back.easeOut',
            onComplete: () => this.tweens.add({ targets:ptsText, alpha:0, duration:400, delay:800, onComplete:()=>ptsText.destroy() }),
          });
        }

        // ペナルティ：赤フラッシュ（HPはAPI経由で更新）
        // ペナルティ：赤フラッシュ＋画面揺れ
        if (isPenalty) {
          const flash = this.add.rectangle(W/2, H/2, W, H, 0xff0000, 0.55).setDepth(50);
          this.tweens.add({
            targets: flash, alpha: 0, duration: 600,
            onComplete: () => flash.destroy(),
          });
          this.cameras.main.shake(400, 0.014);
        }

        // 結果表示
        const msg = cfg.results[type];
        const bgColor    = isCorrect ? 0x041a10 : isPenalty ? 0x1a0404 : 0x0a0a18;
        const borderColor = isCorrect ? 0x33dd66 : isPenalty ? 0xff3333 : 0x444488;
        resultBg.clear();
        resultBg.fillStyle(bgColor, 0.93);
        resultBg.fillRoundedRect(W/2-260, H*0.50, 520, 100, 10);
        resultBg.lineStyle(2, borderColor, 0.95);
        resultBg.strokeRoundedRect(W/2-260, H*0.50, 520, 100, 10);
        resultBg.setVisible(true);
        resultText.setText(msg).setY(H*0.555).setVisible(true);
        this.tweens.add({ targets:resultText, alpha:0.4, duration:450, yoyo:true, repeat:1 });

        const delay = isCorrect ? 2000 : 2400;
        this.time.delayedCall(delay, async () => {
          const token = localStorage.getItem('session_token') ?? '';
          try {
            const res = await apiClient.postVillage({ session_token: token, node_id: nodeId, weather: type });
            usePlayerStore.getState().setHp(res.player_current_hp);
          } catch (e) {
            console.error('[VillagerScene] postVillage failed', e);
            if (isPenalty) usePlayerStore.getState().dealDamage();
          }
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

  // ─── 村の背景 ──────────────────────────────────────────────
  private buildVillageBackground(W: number, H: number, groundY: number) {
    this.add.image(W / 2, H * 0.52, 'bg_mura').setDisplaySize(W, H * 1.04);
    const ground = this.add.graphics();
    ground.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    ground.fillRect(0, groundY, W, H - groundY);
  }

  // ─── 通常の村人イベント ────────────────────────────────────
  private buildVillagerScene(W: number, H: number, nodeId: number, villagerType: 'man' | 'woman') {
    const villagerKey = villagerType === 'man' ? 'man_murabito' : 'woman_murabito';
    const groundY = H * 0.72;

    this.removeBlackBg('man_murabito');
    this.removeBlackBg('woman_murabito');

    this.buildVillageBackground(W, H, groundY);

    const villagerX = W * 0.68;
    const hasVillager = this.textures.exists(villagerKey) && this.textures.get(villagerKey).key !== '__MISSING';
    if (hasVillager) {
      this.add.image(villagerX, groundY + 20, villagerKey)
        .setOrigin(0.5, 1).setScale(0.45).setFlipX(true);
    } else {
      this.makeFallbackVillager(villagerX, groundY, villagerType);
    }

    this.addBackButton(W);

    const uiContainer = this.add.container(0, 0).setVisible(false).setDepth(10);
    this.buildNormalEventUI(W, H, nodeId, villagerType, uiContainer);

    this.cameras.main.fadeIn(500);
    this.time.delayedCall(300, () => {
      this.animateHeroEntry(W, groundY, () => uiContainer.setVisible(true));
    });
  }

  // ─── 通常イベントUI ────────────────────────────────────────
  private buildNormalEventUI(
    W: number, H: number, nodeId: number,
    villagerType: 'man' | 'woman',
    container: Phaser.GameObjects.Container
  ) {
    const add = (go: Phaser.GameObjects.GameObject) => { container.add(go); return go; };

    add(this.add.text(W/2, 18, '村人が助けを求めている！', {
      fontSize:'22px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#ffcc66', stroke:'#1a0800', strokeThickness:4,
    }).setOrigin(0.5));

    const bw = W * 0.52, bx = W * 0.68 - bw / 2, bTop = H * 0.72 - 300, bH = 108;
    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0x0a1a0a, 0.90);
    bubbleBg.fillRoundedRect(bx, bTop, bw, bH, 12);
    bubbleBg.lineStyle(2, 0x3a7a44, 0.85);
    bubbleBg.strokeRoundedRect(bx, bTop, bw, bH, 12);
    bubbleBg.fillStyle(0x0a1a0a, 0.90);
    bubbleBg.fillTriangle(bx + bw / 2 - 12, bTop + bH, bx + bw / 2 + 12, bTop + bH, bx + bw / 2, bTop + bH + 20);
    add(bubbleBg);
    const speechStr = villagerType === 'man'
      ? '「た、助けてください！\n　魔物に追われています…\n　あなたの天候の力で\n　何とかしてください！」'
      : '「お願い！ここから\n　逃げ出す手助けを…\n　あなたの天候の力で\n　魔物を追い払って！」';
    add(this.add.text(bx+12, bTop+8, speechStr, {
      fontSize:'13px', fontFamily:'"Yu Gothic","YuGothic",monospace',
      color:'#ddeedd', lineSpacing:4,
    }));

    const hudY = H * 0.77;
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000011, 0.92); hudBg.fillRect(0, hudY, W, H - hudY);
    hudBg.lineStyle(2, 0x224488, 1);  hudBg.strokeRect(0, hudY, W, H - hudY);
    add(hudBg);
    add(this.add.text(W/2, hudY + 8, '▶  天候を選んでください', {
      fontSize:'14px', fontFamily:'"Yu Gothic","YuGothic",monospace', color:'#88ddbb',
    }).setOrigin(0.5, 0));

    const resultBg   = this.add.graphics().setVisible(false);
    const resultText = this.add.text(W/2, H*0.575, '', {
      fontSize:'17px', fontFamily:'"Yu Gothic","YuGothic",serif',
      color:'#88ffaa', stroke:'#001a0a', strokeThickness:3, align:'center', lineSpacing:4,
    }).setOrigin(0.5).setVisible(false);
    add(resultBg); add(resultText);

    const ownedSpells2 = useGameStore.getState().playerSpells;
    const allChoices2: WeatherChoice[] = ['thunder','sunny','rain','wind','hail'];
    const types: WeatherChoice[] = ownedSpells2.length > 0
      ? allChoices2.filter(t => ownedSpells2.includes(t))
      : allChoices2;
    const gap = 8, btnH = H - hudY - 30;
    const btnW = Math.floor((W - 20 - gap*(types.length-1)) / types.length);
    const by = hudY + 26;

    types.forEach((type, i) => {
      const cfg = WEATHER_BTN[type];
      const bx2 = 10 + i*(btnW+gap);

      const frame = this.add.graphics();
      const draw = (hover: boolean) => {
        const isActive = this.activeWeatherType === type;
        frame.clear();
        frame.fillStyle(cfg.btnColor, hover || isActive ? 1 : 0.9);
        frame.fillRoundedRect(bx2, by, btnW, btnH, 6);
        frame.lineStyle(
          isActive ? 4 : hover ? 3 : 2,
          isActive ? 0xffffff : hover ? 0xffffff : cfg.btnGlow,
          isActive ? 1 : hover ? 1 : 0.85
        );
        frame.strokeRoundedRect(bx2, by, btnW, btnH, 6);
      };
      draw(false);
      this.villagerBtnRedraw[type] = draw;
      add(frame);
      add(this.add.text(bx2+btnW/2, by+10, cfg.emoji, {fontSize:'18px'}).setOrigin(0.5, 0));
      add(this.add.text(bx2+btnW/2, by+btnH-16, cfg.label, {
        fontSize:'18px', fontFamily:'"Yu Gothic","YuGothic",monospace',
        color:'#ffffff', stroke:'#000', strokeThickness:2,
      }).setOrigin(0.5, 1));

      const hit = this.add.rectangle(bx2+btnW/2, by+btnH/2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor:true });
      add(hit);

      const triggerChoice = () => {
        if (this.villagerChoiceMade) return;
        this.villagerChoiceMade = true;
        useSceneStore.getState().setMikeVisible(false);
        hit.disableInteractive();
        for (let j = 0; j < 14; j++) {
          const px = W*0.55 + Phaser.Math.Between(-120, 120);
          const py = H*0.45 + Phaser.Math.Between(-60, 60);
          const p = this.add.circle(px, py, Phaser.Math.Between(3,7), cfg.btnGlow, 0.9);
          p.setDepth(20);
          this.tweens.add({ targets:p, y:py-Phaser.Math.Between(50,110), alpha:0,
            duration:Phaser.Math.Between(600,1100), delay:j*55, onComplete:()=>p.destroy() });
        }
        // 通常イベントは常に+10pt
        usePlayerStore.getState().addScore(10);
        const ptsText2 = this.add.text(W/2, H*0.48, '+10 pts', {
          fontSize:'22px', fontFamily:'monospace', color:'#ffdd44',
          stroke:'#000', strokeThickness:3,
        }).setOrigin(0.5).setAlpha(0).setDepth(20);
        this.tweens.add({
          targets: ptsText2, alpha: 1, y: H*0.43, duration: 500, ease:'Back.easeOut',
          onComplete: () => this.tweens.add({ targets:ptsText2, alpha:0, duration:400, delay:800, onComplete:()=>ptsText2.destroy() }),
        });

        const msg = villagerType === 'man' ? cfg.manResult : cfg.womanResult;
        resultBg.clear();
        resultBg.fillStyle(0x041210, 0.92);
        resultBg.fillRoundedRect(W/2-250, H*0.50, 500, 90, 10);
        resultBg.lineStyle(2, 0x33aa66, 0.9);
        resultBg.strokeRoundedRect(W/2-250, H*0.50, 500, 90, 10);
        resultBg.setVisible(true);
        resultText.setText(msg).setY(H*0.555).setVisible(true);
        this.tweens.add({ targets:resultText, alpha:0.4, duration:450, yoyo:true, repeat:1 });

        this.time.delayedCall(1700, async () => {
          const token = localStorage.getItem('session_token') ?? '';
          try {
            const res = await apiClient.postVillage({ session_token: token, node_id: nodeId, weather: type });
            usePlayerStore.getState().setHp(res.player_current_hp);
          } catch (e) {
            console.error('[VillagerScene] postVillage failed', e);
            // 通常イベントはペナルティなし（HPは変化しない）
          }
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

  // ─── 主人公の歩き入場 ────────────────────────────────────────
  private animateHeroEntry(W: number, groundY: number, onArrive: () => void) {
    const validKeys = ALL_WALK_KEYS.filter(
      k => this.textures.exists(k) && this.textures.get(k).key !== '__MISSING'
    );
    if (validKeys.length === 0) { onArrive(); return; }

    const heroY = groundY + 20;
    const hero = this.add.image(-90, heroY, validKeys[0]).setOrigin(0.5, 1).setScale(1.2).setDepth(5);
    const fixedW = hero.displayWidth, fixedH = hero.displayHeight;
    const shadow = this.add.ellipse(-90, groundY + 6, 50, 12, 0x000000, 0.32).setDepth(4);

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
      x: W * 0.13,
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
    }).setOrigin(1, 0).setInteractive({ useHandCursor:true }).setDepth(15);
    btn.on('pointerover', () => btn.setColor('#88bbff'));
    btn.on('pointerout',  () => btn.setColor('#4488ff'));
    btn.on('pointerdown', () => {
      localStorage.removeItem('session_token');
      usePlayerStore.getState().reset();
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start('TitleScene'));
    });
    this.add.text(W-16, 44, `SCORE: ${usePlayerStore.getState().score}`, {
      fontSize:'14px', fontFamily:'monospace', color:'#ffdd88',
      stroke:'#000', strokeThickness:2,
    }).setOrigin(1, 0).setDepth(15);
  }
}
