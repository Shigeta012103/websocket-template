#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Error: ゲーム名を指定してください"
  echo "Usage: bash scripts/deploy.sh <game-name> [profile]"
  echo "  profile: AWS CLIプロファイル名（デフォルト: sandbox）"
  exit 1
fi

GAME_NAME="$1"
PROFILE="${2:-sandbox}"
EXPECTED_ACCOUNT_ID="${DEPLOY_ACCOUNT_ID:-}"

# プロファイルの認証確認
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text 2>/dev/null)
if [ -z "$ACCOUNT_ID" ]; then
  echo "Error: $PROFILE プロファイルで認証できません"
  echo "以下を実行してログインしてください:"
  echo "  aws sso login --profile $PROFILE"
  exit 1
fi

# アカウントIDの一致確認
if [ -n "$EXPECTED_ACCOUNT_ID" ] && [ "$ACCOUNT_ID" != "$EXPECTED_ACCOUNT_ID" ]; then
  echo "Error: デプロイ先のアカウントIDが一致しません"
  echo "  期待値: $EXPECTED_ACCOUNT_ID"
  echo "  実際値: $ACCOUNT_ID"
  echo "DEPLOY_ACCOUNT_ID 環境変数またはプロファイルを確認してください"
  exit 1
fi

echo "=== WebSocket Game Deploy ==="
echo "Game: $GAME_NAME"
echo "Profile: $PROFILE (Account: $ACCOUNT_ID)"
echo ""

# Install dependencies
echo "[1/3] Installing dependencies..."
npm run install:all

# Build backend
echo "[2/3] Building backend..."
npm run build

# Deploy
echo "[3/3] Deploying to AWS..."
cd infra && npx cdk deploy --profile "$PROFILE" --context gameName="$GAME_NAME" --outputs-file ../cdk-outputs.json --require-approval never

echo ""
echo "=== Deploy Complete ==="
echo ""

if [ -f ../cdk-outputs.json ]; then
  echo "Outputs:"
  cat ../cdk-outputs.json
fi
