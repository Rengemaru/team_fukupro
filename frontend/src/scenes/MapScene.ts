import Phaser from 'phaser';

interface MapNode {
  id: number;
  x: number;
  y: number;
  type: 'start' | 'enemy' | 'villager' | 'goal';
  connections: number[];
  completed: boolean;
}

// Fixed node positions and connection graph (13 nodes, multi-path)
const NODE_DEFS: { id: number; x: number; y: number; connections: number[] }[] = [
  // Row 1 – スタート
  { id:  0, x: 400, y: 530, connections: [1, 2, 3] },
  // Row 2 – 3択
  { id:  1, x: 175, y: 425, connections: [4, 5] },
  { id:  2, x: 400, y: 425, connections: [4, 5, 6] },
  { id:  3, x: 625, y: 425, connections: [5, 6, 7] },
  // Row 3 – 4択
  { id:  4, x: 100, y: 315, connections: [8, 9] },
  { id:  5, x: 280, y: 310, connections: [8, 9, 10] },
  { id:  6, x: 520, y: 310, connections: [9, 10, 11] },
  { id:  7, x: 700, y: 315, connections: [10, 11] },
  // Row 4 – 4択
  { id:  8, x: 150, y: 200, connections: [12] },
  { id:  9, x: 320, y: 195, connections: [12] },
  { id: 10, x: 480, y: 195, connections: [12] },
  { id: 11, x: 650, y: 200, connections: [12] },
  // Row 5 – ゴール
  { id: 12, x: 400, y:  80, connections: [] },
];

function generateMap(): MapNode[] {
  return NODE_DEFS.map(def => {
    let type: MapNode['type'];
    if (def.id === 0) {
      type = 'start';
    } else if (def.id === 12) {
      type = 'goal';
    } else {
      type = Math.random() < 0.6 ? 'enemy' : 'villager';
    }
    return { ...def, type, completed: false };
  });
}

export class MapScene extends Phaser.Scene {
  constructor() { super({ key: 'MapScene' }); }

  // ─── シーン構築 ────────────────────────────────────────────
  create() {
    const W = this.scale.width;   // 800
    const H = this.scale.height;  // 600

    // ── マップデータをレジストリから読み込む（なければ生成） ──
    let nodes: MapNode[] = this.game.registry.get('mapNodes');
    if (!nodes || nodes.length === 0) {
      nodes = generateMap();
      this.game.registry.set('mapNodes', nodes);
    }

    // 完了ノードをレジストリから反映
    const completedNodes: number[] = this.game.registry.get('completedNodes') ?? [];
    nodes.forEach(n => { n.completed = completedNodes.includes(n.id); });

    // プレイヤー位置
    const playerNodeId: number = this.game.registry.get('playerNodeId') ?? 0;

    // ── 背景 ─────────────────────────────────────────────────
    this.drawBackground(W, H);

    // ── エッジ（接続線） ──────────────────────────────────────
    this.drawEdges(nodes);

    // ── ノード ────────────────────────────────────────────────
    this.drawNodes(nodes, playerNodeId);

    // ── UI ───────────────────────────────────────────────────
    this.addTitle(W);
    this.addInfoText(W, H, playerNodeId, nodes);
    this.addBackButton(W);

    this.cameras.main.fadeIn(500);
  }

  // ─── 背景 ─────────────────────────────────────────────────────
  private drawBackground(W: number, H: number) {
    // 背景画像
    this.add.image(W / 2, H / 2, 'bg_farest').setDisplaySize(W, H);

    // 暗いオーバーレイ（マップUIを見やすくする）
    const overlay = this.add.graphics();
    overlay.fillStyle(0x080412, 0.55);
    overlay.fillRect(0, 0, W, H);
  }

  // ─── エッジ描画 ──────────────────────────────────────────
  private drawEdges(nodes: MapNode[]) {
    const g = this.add.graphics();
    g.lineStyle(2, 0x666677, 0.7);
    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = nodes[targetId];
        g.beginPath();
        g.moveTo(node.x, node.y);
        g.lineTo(target.x, target.y);
        g.strokePath();
      });
    });
  }

  // ─── ノード描画 ──────────────────────────────────────────
  private drawNodes(nodes: MapNode[], playerNodeId: number) {
    const RADIUS = 22;

    // 到達可能ノードを算出（現在地から接続されていて未完了）
    const currentNode = nodes[playerNodeId];
    const reachableIds = new Set(
      currentNode.connections.filter(id => !nodes[id].completed)
    );

    nodes.forEach(node => {
      const isPlayer    = node.id === playerNodeId;
      const isReachable = reachableIds.has(node.id);
      const isCompleted = node.completed;

      // ─ プレイヤー位置のグロー ─
      if (isPlayer) {
        const glow = this.add.circle(node.x, node.y, RADIUS + 10, 0xffff44, 0.25);
        this.tweens.add({
          targets: glow, alpha: 0.05, scaleX: 1.3, scaleY: 1.3,
          duration: 900, yoyo: true, repeat: -1,
        });
        this.add.circle(node.x, node.y, RADIUS + 5, 0xffff44, 0.55);
      }

      // ─ ノード円の色 ─
      let fillColor: number;
      if (isCompleted) {
        fillColor = 0x444455;
      } else if (node.type === 'start') {
        fillColor = 0xddaa22;
      } else if (node.type === 'goal') {
        fillColor = 0x8822cc;
      } else if (node.type === 'enemy') {
        fillColor = 0xcc2222;
      } else {
        fillColor = 0x22aa44;
      }

      // 外枠（到達可能 → 明るい、それ以外 → 暗め）
      const borderColor = isReachable ? 0xffffff : (isPlayer ? 0xffff44 : 0x444466);
      const borderAlpha = isReachable ? 1.0 : (isPlayer ? 1.0 : 0.4);
      const circle = this.add.circle(node.x, node.y, RADIUS, fillColor,
        isCompleted || (!isReachable && !isPlayer) ? 0.45 : 1.0);
      circle.setStrokeStyle(isReachable ? 3 : 2, borderColor, borderAlpha);

      // ─ ゴールノードに特別なグロー ─
      if (node.type === 'goal' && !isCompleted) {
        const goalGlow = this.add.circle(node.x, node.y, RADIUS + 14, 0xcc44ff, 0.20);
        this.tweens.add({ targets: goalGlow, alpha: 0.05, scaleX: 1.4, scaleY: 1.4, duration: 1100, yoyo: true, repeat: -1 });
        this.add.circle(node.x, node.y, RADIUS + 7, 0xee88ff, 0.40);
      }

      // ─ アイコン / テキスト ─
      let iconText = '';
      if (isCompleted) {
        iconText = '✓';
      } else if (node.type === 'start') {
        iconText = '★';
      } else if (node.type === 'goal') {
        iconText = '👑';
      } else if (node.type === 'enemy') {
        iconText = '⚔';
      } else {
        iconText = '🏠';
      }

      this.add.text(node.x, node.y, iconText, {
        fontSize: '16px',
        fontFamily: '"Yu Gothic","YuGothic",monospace',
        color: isCompleted ? '#888899' : '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5)
        .setAlpha(isCompleted || (!isReachable && !isPlayer) ? 0.5 : 1.0);

      // ─ インタラクション（到達可能ノードのみ） ─
      if (isReachable) {
        const hitArea = this.add.circle(node.x, node.y, RADIUS + 6, 0x000000, 0)
          .setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => {
          circle.setStrokeStyle(4, 0xffffff, 1.0);
          circle.setFillStyle(fillColor, 1.0);
        });
        hitArea.on('pointerout', () => {
          circle.setStrokeStyle(3, 0xffffff, 1.0);
          circle.setFillStyle(fillColor, 1.0);
        });
        hitArea.on('pointerdown', () => this.onNodeClick(node));
      }
    });
  }

  // ─── ノードクリック処理 ──────────────────────────────────
  private onNodeClick(node: MapNode) {
    this.game.registry.set('currentNodeId', node.id);

    this.cameras.main.fade(500, 0, 0, 0);

    if (node.type === 'goal') {
      this.time.delayedCall(500, () => this.scene.start('ClearScene'));
    } else if (node.type === 'enemy') {
      this.time.delayedCall(500, () => {
        this.scene.start('GameScene', { nodeId: node.id });
      });
    } else {
      // villager
      const villagerType = node.id % 2 === 0 ? 'man' : 'woman';
      this.time.delayedCall(500, () => {
        this.scene.start('VillagerScene', { nodeId: node.id, villagerType });
      });
    }
  }

  // ─── タイトル ───────────────────────────────────────────
  private addTitle(W: number) {
    this.add.text(W / 2, 30, '探索マップ', {
      fontSize: '28px',
      fontFamily: '"Yu Gothic","YuGothic",serif',
      color: '#ddeeff',
      stroke: '#0a0820',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // 凡例
    const legendItems = [
      { color: 0xddaa22, label: '★ スタート' },
      { color: 0xcc2222, label: '⚔ 敵' },
      { color: 0x22aa44, label: '🏠 村人' },
      { color: 0x8822cc, label: '👑 ゴール' },
    ];
    legendItems.forEach((item, i) => {
      const lx = 16 + i * 120;
      this.add.circle(lx + 6, 16, 6, item.color);
      this.add.text(lx + 16, 10, item.label, {
        fontSize: '11px', fontFamily: '"Yu Gothic","YuGothic",monospace', color: '#aabbcc',
      });
    });
  }

  // ─── 下部インフォテキスト ──────────────────────────────
  private addInfoText(W: number, H: number, playerNodeId: number, nodes: MapNode[]) {
    const current = nodes[playerNodeId];
    const typeName = current.type === 'start'   ? 'スタート地点' :
                     current.type === 'goal'    ? '👑 ゴール'    :
                     current.type === 'enemy'   ? '敵エリア'     : '村人エリア';
    const infoStr = `現在地: ノード${playerNodeId}（${typeName}）  光る枠のノードを選んで進もう`;
    this.add.text(W / 2, H - 22, infoStr, {
      fontSize: '13px',
      fontFamily: '"Yu Gothic","YuGothic",monospace',
      color: '#8899bb',
      stroke: '#0a0820',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);
  }

  // ─── タイトルへ戻るボタン ─────────────────────────────
  private addBackButton(W: number) {
    const btn = this.add.text(W - 16, 16, '[ タイトルへ ]', {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: '#4488ff',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#88bbff'));
    btn.on('pointerout',  () => btn.setColor('#4488ff'));
    btn.on('pointerdown', () => {
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => this.scene.start('TitleScene'));
    });
  }
}
