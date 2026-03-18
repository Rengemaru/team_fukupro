import Phaser from 'phaser';
import { useGameStore } from '../store/gameStore';
import type { MapNode } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';

export class MapScene extends Phaser.Scene {
  constructor() { super({ key: 'MapScene' }); }

  // ─── シーン構築 ────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    const loading = this.add.text(W / 2, H / 2, '読み込み中...', {
      fontSize: '20px',
      fontFamily: '"Yu Gothic","YuGothic",monospace',
      color: '#aabbcc',
    }).setOrigin(0.5);

    this.loadSession()
      .then(({ nodes, player_node_id, completed_nodes }) => {
        loading.destroy();
        this.initScene(nodes, player_node_id, completed_nodes);
      })
      .catch(() => {
        loading.setText('読み込みに失敗しました');
      });
  }

  // ─── セッション取得（既存復元 or 新規作成） ───────────────
  private async loadSession(): Promise<{
    nodes: MapNode[];
    player_node_id: number;
    completed_nodes: number[];
    player_hp: number;
    player_max_hp: number;
  }> {
    const token = localStorage.getItem('session_token');

    if (token) {
      const res = await fetch(`/api/sessions/${token}`);
      if (res.ok) {
        const data = await res.json();
        this.syncStore(data);
        return data;
      }
    }

    // 新規セッション作成
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    localStorage.setItem('session_token', data.session_token);
    this.syncStore(data);
    return data;
  }

  private syncStore(data: { nodes: MapNode[]; player_node_id: number; completed_nodes: number[]; player_spells?: string[] }) {
  private syncStore(data: { nodes: MapNode[]; player_node_id: number; completed_nodes: number[]; player_hp: number }) {
    const store = useGameStore.getState();
    store.setNodes(data.nodes);
    store.setPlayerNodeId(data.player_node_id);
    store.setCompletedNodes(data.completed_nodes);
    if (data.player_spells) store.setPlayerSpells(data.player_spells);
    usePlayerStore.getState().setHp(data.player_hp);
  }

  // ─── 実描画 ───────────────────────────────────────────────
  private initScene(nodes: MapNode[], playerNodeId: number, completedIds: number[]) {
    const W = this.scale.width;
    const H = this.scale.height;

    // completed 状態を反映
    nodes.forEach(n => { n.completed = completedIds.includes(n.id); });

    this.drawBackground(W, H);
    this.drawEdges(nodes);
    this.drawNodes(nodes, playerNodeId);
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
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x120820, 0x120820, 0x0a1030, 0x0a1030, 1);
    bg.fillRect(0, 0, W, H);

    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const r = Phaser.Math.FloatBetween(0.5, 1.8);
      const a = Phaser.Math.FloatBetween(0.3, 1.0);
      const star = this.add.circle(x, y, r, 0xffffff, a);
      this.tweens.add({
        targets: star, alpha: 0.05,
        duration: Phaser.Math.Between(800, 3000),
        yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 2500),
      });
    }
  }

  // ─── エッジ描画 ──────────────────────────────────────────
  private drawEdges(nodes: MapNode[]) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const g = this.add.graphics();
    g.lineStyle(2, 0x666677, 0.7);
    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = nodeMap.get(targetId);
        if (!target) return;
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

    const currentNode = nodes.find(n => n.id === playerNodeId)!;
    const reachableIds = new Set(
      currentNode.connections.filter(id => {
        const n = nodes.find(n => n.id === id);
        return n && !n.completed;
      })
    );

    nodes.forEach(node => {
      const isPlayer    = node.id === playerNodeId;
      const isReachable = reachableIds.has(node.id);
      const isCompleted = node.completed;

      if (isPlayer) {
        const glow = this.add.circle(node.x, node.y, RADIUS + 10, 0xffff44, 0.25);
        this.tweens.add({
          targets: glow, alpha: 0.05, scaleX: 1.3, scaleY: 1.3,
          duration: 900, yoyo: true, repeat: -1,
        });
        this.add.circle(node.x, node.y, RADIUS + 5, 0xffff44, 0.55);
      }

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

      const borderColor = isReachable ? 0xffffff : (isPlayer ? 0xffff44 : 0x444466);
      const borderAlpha = isReachable ? 1.0 : (isPlayer ? 1.0 : 0.4);
      const circle = this.add.circle(node.x, node.y, RADIUS, fillColor,
        isCompleted || (!isReachable && !isPlayer) ? 0.45 : 1.0);
      circle.setStrokeStyle(isReachable ? 3 : 2, borderColor, borderAlpha);

      if (node.type === 'goal' && !isCompleted) {
        const goalGlow = this.add.circle(node.x, node.y, RADIUS + 14, 0xcc44ff, 0.20);
        this.tweens.add({ targets: goalGlow, alpha: 0.05, scaleX: 1.4, scaleY: 1.4, duration: 1100, yoyo: true, repeat: -1 });
        this.add.circle(node.x, node.y, RADIUS + 7, 0xee88ff, 0.40);
      }

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
        hitArea.on('pointerdown', async () => {
          await this.onNodeClick(node);
        });
      }
    });
  }

  // ─── ノードクリック処理 ──────────────────────────────────
  private async onNodeClick(node: MapNode) {
    const token = localStorage.getItem('session_token');
    const store = useGameStore.getState();

    if (node.type === 'enemy') {
      // enemy: バトル勝利まで completed にしない
      await fetch(`/api/sessions/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_node_id: node.id,
          completed_nodes: store.completedNodes,
        }),
      });
      store.setPlayerNodeId(node.id);
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('GameScene', {
          nodeId:    node.id,
          enemyId:   node.enemy_id,
          enemyName: node.enemy_name,
          enemyHp:   node.current_hp,
        });
      });
      return;
    }

    await fetch(`/api/sessions/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_node_id: node.id,
        completed_nodes: store.completedNodes,
      }),
    });

    store.setPlayerNodeId(node.id);

    this.cameras.main.fade(500, 0, 0, 0);

    if (node.type === 'goal') {
      localStorage.removeItem('session_token');
      store.reset();
      this.time.delayedCall(500, () => this.scene.start('ClearScene'));
    } else {
      const EVENT_TO_VILLAGER_TYPE: Record<string, string> = {
        drought:    'drought',
        heavy_rain: 'heavy_rain',
        sailing:    'sailing_ship',
        beast:      'beast_attack',
      };
      const villagerType = EVENT_TO_VILLAGER_TYPE[node.village_event ?? ''] ?? 'man';
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
    const current = nodes.find(n => n.id === playerNodeId)!;
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
