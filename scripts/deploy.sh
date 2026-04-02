#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Error: ゲーム名を指定してください"
  echo "Usage: bash scripts/deploy.sh <game-name>"
  exit 1
fi

GAME_NAME="$1"

echo "=== WebSocket Game Deploy ==="
echo "Game: $GAME_NAME"
echo ""

# Install dependencies
echo "[1/3] Installing dependencies..."
npm run install:all

# Build backend
echo "[2/3] Building backend..."
npm run build

# Deploy
echo "[3/3] Deploying to AWS..."
cd infra && npx cdk deploy --context gameName="$GAME_NAME" --outputs-file ../cdk-outputs.json --require-approval never

echo ""
echo "=== Deploy Complete ==="
echo ""

if [ -f ../cdk-outputs.json ]; then
  echo "Outputs:"
  cat ../cdk-outputs.json
fi
