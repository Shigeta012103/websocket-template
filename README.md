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

### 2. ゲームロジックを実装する

`backend/src/handlers/gameAction.ts` を編集。
デフォルトでは受け取ったデータをそのまま他プレイヤーに転送する。

### 3. フロントエンドを作成する

`frontend/` ディレクトリに好きな技術で作成する。
ビルド後の静的ファイル（HTML/CSS/JS）を `frontend/` に配置する。

### 4. デプロイ

```bash
bash scripts/deploy.sh my-game-name
```

**注意**: ゲーム名は必須です。他の人と被らない名前を指定してください。

デプロイ完了後、以下が出力される:

- **WebSocket URL**: `wss://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod`
- **Frontend URL**: `https://xxxxx.cloudfront.net`

## WebSocket 接続サンプル

デプロイすると `/config.json` が自動生成され、WebSocket URL が含まれます。
フロントエンドからはこれを読み込んで接続してください。ハードコード不要です。

```javascript
// config.json を読み込んで接続
const config = await fetch("/config.json").then((res) => res.json());
const ws = new WebSocket(config.wsUrl);
```

その他のサンプルコード:

```javascript
// ルーム作成
ws.send(JSON.stringify({ action: "createRoom" }));

// ルーム参加
ws.send(JSON.stringify({ action: "joinRoom", roomCode: "ABC123" }));

// ゲームアクション送信
ws.send(JSON.stringify({
  action: "gameAction",
  data: { type: "move", x: 100, y: 200 }
}));

// メッセージ受信
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "roomCreated":
      // message.roomCode でルームコードを取得
      console.log("Room created:", message.roomCode);
      break;

    case "playerJoined":
      // message.playerCount, message.maxPlayers
      console.log(`Players: ${message.playerCount}/${message.maxPlayers}`);
      break;

    case "gameStart":
      // message.players で参加者一覧を取得
      console.log("Game started!", message.players);
      break;

    case "gameAction":
      // message.from で送信者、message.data でゲームデータ
      console.log("Action from:", message.from, message.data);
      break;

    case "playerLeft":
      // message.remainingPlayers で残りの人数
      console.log("Player left. Remaining:", message.remainingPlayers);
      break;

    case "error":
      console.error("Error:", message.message);
      break;
  }
};
```

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
├── infra/                        # CDK（インフラ定義）
│   ├── bin/app.ts
│   └── lib/websocket-stack.ts
├── backend/
│   └── src/
│       ├── handlers/
│       │   ├── connect.ts        # 共通: 接続管理
│       │   ├── disconnect.ts     # 共通: 切断管理
│       │   ├── createRoom.ts     # 共通: ルーム作成
│       │   ├── joinRoom.ts       # 共通: ルーム参加
│       │   └── gameAction.ts     # ★ ここにゲームロジックを書く
│       └── lib/
│           ├── broadcast.ts      # 共通: メッセージ送信
│           ├── roomManager.ts    # 共通: ルーム管理
│           └── types.ts          # 型定義
├── frontend/                     # ★ ここにフロントエンドを配置
├── examples/
│   └── index.html                # デモ用サンプル（参考用）
├── scripts/deploy.sh             # デプロイスクリプト
└── README.md
```

## 削除

```bash
npm run destroy
```
