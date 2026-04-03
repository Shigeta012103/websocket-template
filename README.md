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

### 2. フロントエンドをカスタマイズする

`frontend/room.js` 内の以下の関数をカスタマイズしてゲームを実装する:

| 関数 | 説明 |
|---|---|
| `onGameStart(players)` | ゲーム開始時の処理 |
| `onGameMessage(from, data)` | 相手からデータを受信した時の処理 |
| `onPlayerLeft(remainingPlayers)` | プレイヤー退出時の処理 |

データ送信には `sendGameAction(data)` を使用する。

ゲーム画面は `index.html` の `<div id="gameContainer">` 内に実装する。

ルーム作成・参加のUIは共通で用意済みのため、実装不要。

### 3. ゲームロジックを実装する（任意）

`backend/src/handlers/gameAction.ts` を編集。
デフォルトでは受け取ったデータをそのまま他プレイヤーに転送する。

サーバー側でバリデーションや勝敗判定が必要な場合のみ書き換える。

### 4. デプロイ

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
│       │   └── gameAction.ts     # ★ サーバー側ロジック（任意）
│       ├── lib/
│       │   ├── broadcast.ts      # 共通: メッセージ送信
│       │   ├── roomManager.ts    # 共通: ルーム管理
│       │   └── types.ts          # 型定義
│       └── game.config.ts        # ゲーム設定
├── frontend/
│   ├── index.html                # ルーム作成・参加UI（共通）
│   ├── style.css                 # スタイル
│   └── room.js                   # ★ ゲームロジックをここに実装
├── examples/
│   └── index.html                # デモ用サンプル（参考用）
├── scripts/deploy.sh             # デプロイスクリプト
└── README.md
```

## 削除

```bash
npm run destroy
```
