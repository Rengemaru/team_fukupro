// ─── AudioManager ────────────────────────────────────────────
// Web Audio API によるプロシージャル音声生成（外部ファイル不要）
// ─────────────────────────────────────────────────────────────

export type BGMType = 'title' | 'battle' | 'map' | 'village';
export type WeatherSFX = 'thunder' | 'sunny' | 'fire' | 'rain' | 'water' | 'wind' | 'hail';

// ── 音名 → 周波数 (Hz) ────────────────────────────────────────
const Hz = {
  R:   0,
  E2:  82.41, F2:  87.31, G2:  98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
  Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
  G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
};

type Note = readonly [freq: number, beats: number];
type Pattern = { bass: Note[]; mel: Note[]; bpm: number; beats: number };

// ── BGM パターン定義 ───────────────────────────────────────────

// バトル: Aマイナー 160BPM 16拍
const BATTLE_PAT: Pattern = {
  bpm: 160, beats: 16,
  bass: [
    [Hz.A2,1],[Hz.R,0.5],[Hz.A2,0.5],[Hz.C3,1],[Hz.R,1],
    [Hz.G2,1],[Hz.R,0.5],[Hz.G2,0.5],[Hz.A2,1],[Hz.R,1],
    [Hz.D3,1],[Hz.R,0.5],[Hz.C3,0.5],[Hz.A2,1],[Hz.R,1],
    [Hz.E2,1],[Hz.R,0.5],[Hz.G2,0.5],[Hz.A2,1],[Hz.R,1],
  ],
  mel: [
    [Hz.A4,0.5],[Hz.C5,0.5],[Hz.E5,0.5],[Hz.A4,0.5],
    [Hz.G4,0.5],[Hz.E4,0.5],[Hz.D4,0.5],[Hz.C4,0.5],
    [Hz.A4,0.5],[Hz.E4,0.5],[Hz.F4,0.5],[Hz.E4,0.5],
    [Hz.D4,0.5],[Hz.C4,0.5],[Hz.B3,0.5],[Hz.A3,0.5],
    [Hz.A4,0.5],[Hz.C5,0.5],[Hz.D5,0.5],[Hz.E5,0.5],
    [Hz.G4,0.5],[Hz.A4,0.5],[Hz.C5,0.5],[Hz.B4,0.5],
    [Hz.G4,0.5],[Hz.F4,0.5],[Hz.E4,0.5],[Hz.D4,0.5],
    [Hz.E4,0.5],[Hz.D4,0.5],[Hz.C4,0.5],[Hz.A3,0.5],
  ],
};

// マップ: Cメジャー 108BPM 16拍
const MAP_PAT: Pattern = {
  bpm: 108, beats: 16,
  bass: [
    [Hz.C3,2],[Hz.G2,2],[Hz.F3,2],[Hz.G2,2],
    [Hz.A2,2],[Hz.F2,2],[Hz.C3,2],[Hz.G2,2],
  ],
  mel: [
    [Hz.E4,1],[Hz.G4,1],[Hz.A4,2],
    [Hz.G4,1],[Hz.E4,1],[Hz.D4,2],
    [Hz.C4,1],[Hz.E4,1],[Hz.G4,1],[Hz.E4,1],
    [Hz.D4,2],[Hz.C4,2],
    [Hz.A4,1],[Hz.G4,1],[Hz.E4,2],
    [Hz.F4,1],[Hz.E4,1],[Hz.D4,2],
    [Hz.E4,1],[Hz.D4,1],[Hz.C4,1],[Hz.B3,1],
    [Hz.C4,4],
  ],
};

// 村: Fメジャー 80BPM 16拍
const VILLAGE_PAT: Pattern = {
  bpm: 80, beats: 16,
  bass: [
    [Hz.F2,4],[Hz.Bb2,4],[Hz.C3,4],[Hz.F2,4],
  ],
  mel: [
    [Hz.C4,1],[Hz.D4,1],[Hz.E4,2],
    [Hz.F4,1],[Hz.E4,1],[Hz.D4,2],
    [Hz.C4,2],[Hz.A3,2],
    [Hz.G3,3],[Hz.R,1],
    [Hz.F4,1],[Hz.G4,1],[Hz.A4,2],
    [Hz.Bb4,1],[Hz.A4,1],[Hz.G4,2],
    [Hz.F4,2],[Hz.E4,2],
    [Hz.F4,4],
  ],
};

// タイトル: Dマイナー 100BPM 16拍
const TITLE_PAT: Pattern = {
  bpm: 100, beats: 16,
  bass: [
    [Hz.D3,2],[Hz.A2,2],[Hz.Bb2,2],[Hz.C3,2],
    [Hz.D3,2],[Hz.F3,2],[Hz.G3,2],[Hz.A3,2],
  ],
  mel: [
    [Hz.D4,2],[Hz.R,1],[Hz.F4,1],
    [Hz.A4,2],[Hz.G4,2],
    [Hz.F4,1],[Hz.E4,1],[Hz.D4,2],
    [Hz.E4,4],
    [Hz.D4,1],[Hz.F4,1],[Hz.G4,2],
    [Hz.A4,1],[Hz.C5,1],[Hz.D5,2],
    [Hz.C5,1],[Hz.Bb4,1],[Hz.A4,2],
    [Hz.D4,4],
  ],
};

const PATTERNS: Record<BGMType, Pattern> = {
  battle:  BATTLE_PAT,
  map:     MAP_PAT,
  village: VILLAGE_PAT,
  title:   TITLE_PAT,
};

// ─────────────────────────────────────────────────────────────

class AudioManager {
  private static _inst: AudioManager | null = null;
  private _ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmBus!: GainNode;
  private sfxBus!: GainNode;
  private currentBGM: BGMType | null = null;
  private schedulerTimer = 0;
  private scheduleHead = 0;
  private oscs: { o: OscillatorNode; end: number }[] = [];

  private constructor() {}

  static get(): AudioManager {
    if (!AudioManager._inst) AudioManager._inst = new AudioManager();
    return AudioManager._inst;
  }

  // ── AudioContext 取得 ────────────────────────────────────────
  private ac(): AudioContext {
    if (!this._ctx) {
      this._ctx = new AudioContext();
      this.master  = this._ctx.createGain(); this.master.gain.value  = 0.65;
      this.bgmBus  = this._ctx.createGain(); this.bgmBus.gain.value  = 0.38;
      this.sfxBus  = this._ctx.createGain(); this.sfxBus.gain.value  = 0.80;
      this.bgmBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this._ctx.destination);
    }
    void this._ctx.resume();
    return this._ctx;
  }

  // ── ノイズバッファ生成 ────────────────────────────────────────
  private mkNoise(sec: number): AudioBuffer {
    const ac = this.ac();
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * sec), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── オシレーター再生 ─────────────────────────────────────────
  private playOsc(
    freq: number, type: OscillatorType,
    t: number, dur: number, vol: number,
    atk: number, rel: number,
    dest?: AudioNode,
  ) {
    if (freq === 0) return;
    const ac = this.ac();
    const out = dest ?? this.bgmBus;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + dur - rel);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.01);
    this.oscs.push({ o, end: t + dur + 0.02 });
  }

  // ── フィルタ付きノイズ再生 ────────────────────────────────────
  private playNoise(
    filterType: BiquadFilterType, freq: number,
    t: number, dur: number, vol: number,
    atk: number, rel: number,
    dest?: AudioNode,
  ) {
    const ac = this.ac();
    const out = dest ?? this.sfxBus;
    const src = ac.createBufferSource();
    src.buffer = this.mkNoise(dur + 0.05);
    const filt = ac.createBiquadFilter();
    filt.type = filterType; filt.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + dur - rel);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(filt); filt.connect(g); g.connect(out);
    src.start(t); src.stop(t + dur + 0.06);
  }

  // ── オシレーター GC ───────────────────────────────────────────
  private gc() {
    const now = this.ac().currentTime;
    this.oscs = this.oscs.filter(({ end }) => end > now);
  }

  // ═══════════════════════════════════════════════════════════
  // BGM
  // ═══════════════════════════════════════════════════════════

  playBGM(type: BGMType) {
    if (this.currentBGM === type) return;
    this.stopBGM();
    this.currentBGM = type;
    this.scheduleHead = this.ac().currentTime + 0.05;
    this.bgmBus.gain.setValueAtTime(0, this.ac().currentTime);
    this.bgmBus.gain.linearRampToValueAtTime(0.38, this.ac().currentTime + 1.5);
    this.runScheduler();
  }

  stopBGM(fadeMs = 400) {
    this.currentBGM = null;
    clearTimeout(this.schedulerTimer);
    if (this._ctx) {
      const now = this._ctx.currentTime;
      this.bgmBus.gain.cancelScheduledValues(now);
      this.bgmBus.gain.setValueAtTime(this.bgmBus.gain.value, now);
      this.bgmBus.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
      setTimeout(() => {
        if (!this._ctx) return;
        this.oscs.forEach(({ o }) => { try { o.stop(); } catch { /* already stopped */ } });
        this.oscs = [];
        this.bgmBus.gain.setValueAtTime(0.38, this._ctx.currentTime);
      }, fadeMs + 50);
    }
  }

  switchBGM(type: BGMType) {
    if (this.currentBGM === type) return;
    this.stopBGM(600);
    setTimeout(() => this.playBGM(type), 700);
  }

  private runScheduler() {
    const AHEAD = 2.5, TICK = 1000;
    const ac = this.ac();
    const until = ac.currentTime + AHEAD;
    while (this.scheduleHead < until && this.currentBGM) {
      const dur = this.scheduleLoop(this.currentBGM, this.scheduleHead);
      this.scheduleHead += dur;
    }
    this.gc();
    if (this.currentBGM) {
      this.schedulerTimer = window.setTimeout(() => this.runScheduler(), TICK);
    }
  }

  private scheduleLoop(type: BGMType, t: number): number {
    const pat = PATTERNS[type];
    const spb = 60 / pat.bpm; // seconds per beat

    // ── BASS ──
    let bt = t;
    const bassOscType: OscillatorType = type === 'battle' || type === 'title' ? 'sawtooth' : 'triangle';
    for (const [freq, beats] of pat.bass) {
      const dur = beats * spb;
      if (freq > 0) this.playOsc(freq, bassOscType, bt, dur * 0.88, 0.22, 0.02, 0.06);
      bt += dur;
    }

    // ── MELODY ──
    let mt = t;
    const melOscType: OscillatorType = type === 'battle' ? 'square' : 'sine';
    const melVol = type === 'battle' ? 0.10 : 0.17;
    for (const [freq, beats] of pat.mel) {
      const dur = beats * spb;
      if (freq > 0) this.playOsc(freq, melOscType, mt, dur * 0.80, melVol, 0.01, 0.05);
      mt += dur;
    }

    // ── PAD CHORDS (battle / title のみ) ──
    if (type === 'battle') {
      const chords: [number[], number][] = [
        [[Hz.A3, Hz.C4, Hz.E4], 4],
        [[Hz.G3, Hz.B3, Hz.D4], 4],
        [[Hz.D3, Hz.F3, Hz.A3], 4],
        [[Hz.E3, Hz.G3, Hz.B3], 4],
      ];
      let ct = t;
      for (const [freqs, beats] of chords) {
        const dur = beats * spb;
        for (const f of freqs) this.playOsc(f, 'sine', ct, dur * 0.95, 0.06, 0.15, 0.3);
        ct += dur;
      }
    }

    if (type === 'village') {
      // やわらかいパッド
      const pad: Note[] = [
        [Hz.F3,4],[Hz.C4,4],[Hz.Bb3,4],[Hz.C4,4],
      ];
      let pt = t;
      for (const [freq, beats] of pad) {
        const dur = beats * spb;
        if (freq > 0) this.playOsc(freq, 'sine', pt, dur * 0.92, 0.08, 0.2, 0.4);
        pt += dur;
      }
    }

    return pat.beats * spb;
  }

  // ═══════════════════════════════════════════════════════════
  // SFX
  // ═══════════════════════════════════════════════════════════

  // ── 天候 SFX ─────────────────────────────────────────────────
  sfxWeather(type: WeatherSFX) {
    switch (type) {
      case 'thunder':           this.sfxThunder(); break;
      case 'sunny': case 'fire':this.sfxFire();    break;
      case 'rain':  case 'water':this.sfxRain();   break;
      case 'wind':              this.sfxWind();    break;
      case 'hail':              this.sfxHail();    break;
    }
  }

  // ⚡ 雷
  sfxThunder() {
    const ac = this.ac(); const t = ac.currentTime;
    // バチッというクラック音
    this.playNoise('highpass', 1800, t, 0.08, 1.4, 0.001, 0.04);
    // ゴロゴロという低い唸り
    this.playNoise('lowpass', 130, t + 0.06, 1.8, 0.9, 0.01, 0.8);
    // ビリビリという中域ノイズ
    this.playNoise('bandpass', 600, t, 0.15, 0.7, 0.002, 0.1);
    // 電気音（高周波振動）
    for (let i = 0; i < 3; i++) {
      this.playOsc(880 + i * 220, 'sawtooth', t + i * 0.03, 0.06, 0.4, 0.003, 0.03, this.sfxBus);
    }
  }

  // ☀️ 晴れ / 炎
  sfxFire() {
    const ac = this.ac(); const t = ac.currentTime;
    // 炸裂音
    this.playNoise('bandpass', 900, t, 0.25, 0.8, 0.005, 0.15);
    // 明るい上昇音
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.3);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.4);
    this.oscs.push({ o, end: t + 0.41 });
    // キラキラ
    [523, 659, 784, 1047].forEach((freq, i) => {
      this.playOsc(freq, 'sine', t + i * 0.06, 0.12, 0.18, 0.01, 0.08, this.sfxBus);
    });
  }

  // 💧 雨 / 水
  sfxRain() {
    const ac = this.ac(); const t = ac.currentTime;
    // 水しぶき
    this.playNoise('bandpass', 800, t, 0.3, 0.6, 0.005, 0.15);
    this.playNoise('highpass', 2000, t, 0.1, 0.4, 0.001, 0.05);
    // 水滴ぽたぽた（低め）
    [392, 330, 294].forEach((freq, i) => {
      this.playOsc(freq, 'sine', t + 0.1 + i * 0.08, 0.1, 0.28, 0.005, 0.06, this.sfxBus);
    });
    // 凍結エフェクト（氷の結晶）
    [880, 1175, 1319].forEach((freq, i) => {
      this.playOsc(freq, 'triangle', t + 0.25 + i * 0.06, 0.15, 0.14, 0.005, 0.08, this.sfxBus);
    });
  }

  // 🌀 風
  sfxWind() {
    const ac = this.ac(); const t = ac.currentTime;
    // 風の唸り（swept noise）
    this.playNoise('bandpass', 300, t, 0.5, 0.55, 0.02, 0.25);
    this.playNoise('bandpass', 700, t + 0.1, 0.4, 0.35, 0.03, 0.2);
    this.playNoise('highpass', 1500, t + 0.05, 0.25, 0.25, 0.01, 0.15);
    // 切り裂く音
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.2);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.05);
    g.gain.linearRampToValueAtTime(0, t + 0.5);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.55);
    this.oscs.push({ o, end: t + 0.56 });
  }

  // 🌨 雹
  sfxHail() {
    const ac = this.ac(); const t = ac.currentTime;
    // 氷のフラッシュ音
    this.playNoise('highpass', 3000, t, 0.05, 1.0, 0.001, 0.02);
    // 結晶がバラバラ落ちる音
    for (let i = 0; i < 8; i++) {
      const delay = i * 0.07;
      const freq = 880 + Math.random() * 1320;
      this.playOsc(freq, 'sine', t + delay, 0.07, 0.18, 0.003, 0.04, this.sfxBus);
    }
    // 低い衝撃音
    this.playNoise('lowpass', 300, t + 0.1, 0.3, 0.5, 0.005, 0.15);
  }

  // ── 汎用 SFX ─────────────────────────────────────────────────

  // 敵へのヒット
  sfxHit() {
    const ac = this.ac(); const t = ac.currentTime;
    this.playNoise('bandpass', 500, t, 0.12, 0.9, 0.002, 0.06);
    this.playOsc(110, 'sine', t, 0.15, 0.5, 0.002, 0.1, this.sfxBus);
  }

  // 敵を倒した！
  sfxVictory() {
    const ac = this.ac(); const t = ac.currentTime;
    // 上昇アルペジオ（Cメジャー）
    [261.63, 329.63, 392.00, 523.25, 659.25].forEach((freq, i) => {
      this.playOsc(freq, 'triangle', t + i * 0.12, 0.3, 0.3, 0.01, 0.1, this.sfxBus);
    });
    // キラキラ上
    [1047, 1319, 1568].forEach((freq, i) => {
      this.playOsc(freq, 'sine', t + 0.6 + i * 0.1, 0.25, 0.2, 0.01, 0.1, this.sfxBus);
    });
  }

  // ゲームオーバー
  sfxGameOver() {
    const ac = this.ac(); const t = ac.currentTime;
    [440, 370, 311, 220].forEach((freq, i) => {
      this.playOsc(freq, 'sine', t + i * 0.25, 0.35, 0.3, 0.02, 0.2, this.sfxBus);
    });
    this.playNoise('lowpass', 80, t + 0.6, 1.0, 0.4, 0.05, 0.5);
  }

  // 新しい魔法取得
  sfxNewSpell() {
    const ac = this.ac(); const t = ac.currentTime;
    // ペンタトニック上昇
    [392, 494, 587, 740, 880, 1047].forEach((freq, i) => {
      this.playOsc(freq, 'sine', t + i * 0.09, 0.2, 0.22, 0.01, 0.1, this.sfxBus);
    });
    // 輝きノイズ
    this.playNoise('highpass', 4000, t + 0.4, 0.4, 0.3, 0.01, 0.25);
  }

  // ボタンクリック
  sfxButton() {
    const ac = this.ac(); const t = ac.currentTime;
    this.playOsc(880, 'sine', t, 0.05, 0.15, 0.003, 0.03, this.sfxBus);
  }

  // ポイント獲得
  sfxScore() {
    const ac = this.ac(); const t = ac.currentTime;
    [523, 659].forEach((freq, i) => {
      this.playOsc(freq, 'sine', t + i * 0.08, 0.12, 0.2, 0.005, 0.06, this.sfxBus);
    });
  }

  // 村人イベント成功
  sfxHelp() {
    const ac = this.ac(); const t = ac.currentTime;
    [392, 494, 587].forEach((freq, i) => {
      this.playOsc(freq, 'triangle', t + i * 0.1, 0.2, 0.25, 0.01, 0.1, this.sfxBus);
    });
  }

  // 村人イベント失敗（ペナルティ）
  sfxPenalty() {
    const ac = this.ac(); const t = ac.currentTime;
    [330, 247, 196].forEach((freq, i) => {
      this.playOsc(freq, 'sawtooth', t + i * 0.15, 0.2, 0.2, 0.01, 0.1, this.sfxBus);
    });
  }
}

export const audioManager = AudioManager.get();
