# WebSocket Game Template

WebSocket を使ったマルチプレイヤーミニゲームを簡単に作成・デプロイするためのテンプレート。

## 構成

```
AWS API Gateway (WebSocket) + Lambda + DynamoDB + S3 + CloudFront
```

## セットアップ

### 前提条件

- Node.js 20+
- AWS CLI（認証済み）
- AWS CDK（`npm install -g aws-cdk`）
- CDK Bootstrap 済み（`cdk bootstrap aws://ACCOUNT_ID/ap-northeast-1`）

### インストール

```bash
npm run install:all
```

## 使い方

### 1. ゲーム設定を変更する

`backend/src/game.config.ts` を編集:

```typescript
export const gameConfig = {
  maxPlayers: 2,         // ルームの最大人数
  minPlayersToStart: 2,  // ゲーム開始に必要な人数
  roomTtlSeconds: 3600,  // ルームの有効期限（秒）
};
```

### 2. ゲームを実装する

開発者が編集するファイルは以下の通り。それ以外のファイルは**編集不要**。

#### 編集するファイル一覧

| ファイル | 何をするか | 必須 |
|---|---|---|
| `frontend/src/room.ts` | ゲームのメインロジック（描画・操作・通信） | YES |
| `frontend/public/index.html` | ゲーム画面のHTML | YES |
| `frontend/public/style.css` | 見た目のカスタマイズ | YES |
| `backend/src/game.config.ts` | ルームの人数設定 | YES |
| `backend/src/handlers/gameAction.ts` | サーバー側の判定ロジック（チート防止・勝敗判定等） | 必要な場合のみ |

#### 具体例: ○×ゲームを作る場合

**`frontend/public/index.html`** — ゲーム画面のHTMLを追加:

```html
<div id="gameContainer">
  <!-- 3x3 のマス目 -->
  <div class="board">
    <button class="cell" data-index="0"></button>
    <button class="cell" data-index="1"></button>
    <button class="cell" data-index="2"></button>
    <!-- ... 9マス分 -->
  </div>
  <p id="turnInfo"></p>
</div>
```

**`frontend/src/room.ts`** — 3つの関数を実装:

```typescript
function onGameStart(players: string[]): void {
  // マス目にクリックイベントを設定
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.addEventListener("click", (e) => {
      const index = (e.target as HTMLElement).dataset.index;
      // 自分がマスに置いたことを相手に送信
      sendGameAction({ index: Number(index), mark: "O" });
    });
  });
}

function onGameAction(from: string, data: Record<string, unknown>): void {
  // 相手がマスに置いた情報を受け取って画面に反映
  const cell = document.querySelector(`[data-index="${data.index}"]`);
  if (cell) cell.textContent = data.mark as string;
}

function onPlayerLeft(remainingPlayers: number): void {
  document.getElementById("turnInfo")!.textContent = "相手が退出しました";
}
```

**`backend/src/handlers/gameAction.ts`** — この例では編集不要。デフォルトの「相手にそのまま転送」で動く。

#### 具体例: じゃんけんを作る場合

**`frontend/src/room.ts`**:

```typescript
function onGameStart(players: string[]): void {
  // グー・チョキ・パーのボタンを表示
  document.querySelectorAll(".hand-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const hand = (e.target as HTMLElement).dataset.hand;
      sendGameAction({ hand });
    });
  });
}

function onGameAction(from: string, data: Record<string, unknown>): void {
  // サーバーから判定結果を受け取って表示
  const result = data.result as string; // "win" | "lose" | "draw"
  document.getElementById("result")!.textContent = result;
}
```

**`backend/src/handlers/gameAction.ts`** — じゃんけんはサーバーで判定が必要なので書き換える:

```typescript
// 両者の手を保存して、揃ったら判定して結果を返す
const hands: Record<string, string> = {};

// gameAction ハンドラー内で:
hands[connectionId] = gameData.hand;

if (Object.keys(hands).length === 2) {
  const result = judge(hands); // 勝敗判定
  await broadcastToRoom(domainName, stage, room.players, {
    type: "gameAction",
    data: { result, hands },
  });
}
```

> **ポイント**: フロントだけで完結するゲーム（○×ゲーム等）は `gameAction.ts` の編集不要。
> サーバーで判定が必要なゲーム（じゃんけん等）は `gameAction.ts` も書き換える。

### 3. デプロイ

```bash
bash scripts/deploy.sh my-game-name
```

**注意**: ゲーム名は必須です。他の人と被らない名前を指定してください。

デプロイ完了後、以下が出力される:

- **Frontend URL**: `https://xxxxx.cloudfront.net` — このURLを共有して遊べる
- **WebSocket URL**: 自動で `config.json` に埋め込まれるため、ハードコード不要

## 遊び方

1. Frontend URL にアクセスする
2. 「ルームを作成」をクリック → 招待コードが表示される
3. 相手に招待コードを共有する
4. 相手が招待コードを入力して「参加」をクリック
5. 全員揃ったらゲーム開始

## このテンプレートで作れるゲーム

API Gateway + Lambda の構成は **100〜200ms程度の遅延** があります。
「相手の操作が0.2秒遅れて見えても成立するか？」で判断してください。

### 向いているゲーム

| ジャンル | 例 |
|---|---|
| ターン制 | ○×ゲーム、将棋、カードゲーム、ボードゲーム |
| クイズ・パーティ | 早押しクイズ、お絵描き伝言、ワードウルフ |
| カジュアル対戦 | 針の糸通し、タイピング対決、じゃんけん |
| 軽いアクション | 落ちものパズル、ボンバーマン風 |

### 向いていないゲーム

毎フレーム（16ms〜33ms間隔）で全プレイヤーの位置同期が必要なもの。

- 弾幕シューティング
- 格闘ゲーム
- レースゲーム

これらはサーバーレスではなく、常時起動のWebSocketサーバー（ECS Fargate等）が必要です。

## ディレクトリ構成

```
websocket-game-template/
├── infra/                           # CDK（編集不要）
│   ├── bin/app.ts
│   └── lib/websocket-stack.ts
├── backend/
│   └── src/
│       ├── handlers/
│       │   ├── connect.ts           # 編集不要
│       │   ├── disconnect.ts        # 編集不要
│       │   ├── createRoom.ts        # 編集不要
│       │   ├── joinRoom.ts          # 編集不要
│       │   └── gameAction.ts        # ★ サーバー側ロジック（必要な場合のみ）
│       ├── lib/                     # 編集不要
│       │   ├── broadcast.ts
│       │   ├── roomManager.ts
│       │   └── types.ts
│       └── game.config.ts           # ★ 人数設定
├── frontend/
│   ├── public/
│   │   ├── index.html               # ★ ゲーム画面のHTML
│   │   └── style.css                # ★ スタイル
│   └── src/
│       └── room.ts                  # ★ ゲームのメインロジック
├── examples/
│   └── index.html                   # デモ用サンプル（参考用）
├── scripts/deploy.sh                # デプロイスクリプト
└── README.md
```

## 削除

```bash
npm run destroy
```
