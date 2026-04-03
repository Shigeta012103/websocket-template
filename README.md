# WebSocket Game Template

WebSocket を使ったマルチプレイヤーミニゲームを簡単に作成・デプロイするためのテンプレート。

## 構成

```
AWS API Gateway (WebSocket) + Lambda + DynamoDB + S3 + CloudFront
```

## セットアップ

### 前提条件

- Node.js 20+
- AWS CLI
- AWS CDK（`npm install -g aws-cdk`）
- ~~CDK Bootstrap（`cdk bootstrap`）~~ → sandbox アカウントでは実行済みのため不要

> デプロイ先は **sandbox アカウント固定**です。
> AWS CLI のプロファイル名を **`sandbox`** にしてください。
> 設定方法は以下を参照:
>
> ```bash
> # SSO の場合
> aws configure sso
> # → プロファイル名を聞かれたら「sandbox」と入力
>
> # 設定済みプロファイルの確認
> aws configure list-profiles
>
> # ログイン
> aws sso login --profile sandbox
> ```

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

| ファイル | 書くこと |
|---|---|
| `frontend/public/index.html` | 3x3のマス目のHTMLを `<div id="gameContainer">` 内に配置する |
| `frontend/public/style.css` | マス目の見た目を整える |
| `frontend/src/room.ts` の `onGameStart` | マス目のクリックイベントを設定する。クリックしたら `sendGameAction()` でどのマスに置いたかを相手に送信する |
| `frontend/src/room.ts` の `onGameAction` | 相手がどのマスに置いたかを受け取り、画面に反映する |
| `frontend/src/room.ts` の `onPlayerLeft` | 「相手が退出しました」と表示する |
| `backend/src/handlers/gameAction.ts` | **編集不要**。相手にそのまま転送するだけで動く |

#### 具体例: じゃんけんを作る場合

| ファイル | 書くこと |
|---|---|
| `frontend/public/index.html` | グー・チョキ・パーのボタンを配置する |
| `frontend/src/room.ts` の `onGameStart` | 各ボタンのクリックイベントを設定する。クリックしたら `sendGameAction()` で選んだ手を送信する |
| `frontend/src/room.ts` の `onGameAction` | サーバーから判定結果（勝ち/負け/あいこ）を受け取り、画面に表示する |
| `backend/src/handlers/gameAction.ts` | **編集が必要**。両者の手が揃うまで保持し、揃ったら勝敗を判定して結果を両者に送信する |

> **ポイント**: フロントだけで完結するゲーム（○×ゲーム等）は `gameAction.ts` の編集不要。
> サーバーで判定が必要なゲーム（じゃんけん等）は `gameAction.ts` も書き換える。

### 3. デプロイ

```bash
# sandboxにデプロイ（デフォルト）
bash scripts/deploy.sh my-game-name

# 別のプロファイルを指定する場合
bash scripts/deploy.sh my-game-name my-profile
```

**注意**: ゲーム名は必須です。他の人と被らない名前を指定してください。

**アカウントID検証**: 環境変数 `DEPLOY_ACCOUNT_ID` を設定しておくと、デプロイ先のアカウントIDが一致するか事前に検証します。意図しないアカウントへの誤デプロイを防げます。

```bash
export DEPLOY_ACCOUNT_ID=123456789012
bash scripts/deploy.sh my-game-name
```

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
