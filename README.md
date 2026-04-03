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

#### `frontend/src/room.ts` で何を書くか

ファイル下部の「★ 以下を開発者がカスタマイズする」セクションの3つの関数を実装する:

```typescript
// ゲーム開始時に呼ばれる。ここでゲーム画面の初期化を行う。
function onGameStart(players: string[]): void {
  // 例: Canvasを生成してゲームループを開始する
}

// 相手のゲーム操作を受信した時に呼ばれる。ここで相手の状態を反映する。
function onGameAction(from: string, data: Record<string, unknown>): void {
  // 例: 相手のキャラ位置を更新する
}

// プレイヤーが退出した時に呼ばれる。
function onPlayerLeft(remainingPlayers: number): void {
  // 例: 「相手が退出しました」と表示する
}
```

相手にデータを送るには `sendGameAction()` を呼ぶ:

```typescript
// 自分の操作を相手に送信する
sendGameAction({ x: 100, y: 200, type: "move" });
```

#### `frontend/public/index.html` で何を書くか

`<div id="gameContainer">` の中にゲーム画面のHTMLを配置する。
ルーム作成・参加画面（`<div id="lobby">`, `<div id="waiting">`）は共通で用意済み。見た目の変更は自由。

#### `backend/src/handlers/gameAction.ts` で何を書くか（任意）

デフォルトでは受け取ったデータをそのまま他プレイヤーに転送する。
以下のような場合のみ書き換える:

- じゃんけんのように**両者の入力が揃ってから判定**したい
- クイズの早押しで**サーバーのタイムスタンプで順番を確定**したい
- **不正なデータを弾く**バリデーションを入れたい

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
