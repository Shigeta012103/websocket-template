#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Error: ゲーム名を指定してください"
  echo "Usage: bash scripts/deploy.sh <game-name>"
  exit 1
fi

GAME_NAME="$1"
PROFILE="sandbox"

# sandboxアカウントのみデプロイ可能
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text 2>/dev/null)
if [ -z "$ACCOUNT_ID" ]; then
  echo "Error: sandbox プロファイルで認証できません"
  echo "以下を実行してログインしてください:"
  echo "  aws sso login --profile sandbox"
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
