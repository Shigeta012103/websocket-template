/**
 * ルーム管理（共通）
 *
 * WebSocket接続、ルーム作成・参加、画面切り替えを行う。
 * ゲーム開始後の処理は onGameStart / onGameAction をカスタマイズする。
 */

interface GameConfig {
  wsUrl: string;
}

interface ServerMessage {
  type: "roomCreated" | "playerJoined" | "gameStart" | "gameAction" | "playerLeft" | "error";
  roomCode?: string;
  roomId?: string;
  playerCount?: number;
  maxPlayers?: number;
  players?: string[];
  from?: string;
  data?: Record<string, unknown>;
  remainingPlayers?: number;
  message?: string;
}

const RECONNECT_INTERVAL_MS = 3000;

let ws: WebSocket | null = null;

const lobby = document.getElementById("lobby") as HTMLDivElement;
const waiting = document.getElementById("waiting") as HTMLDivElement;
const gameEl = document.getElementById("game") as HTMLDivElement;
const lobbyStatus = document.getElementById("lobbyStatus") as HTMLParagraphElement;
const createBtn = document.getElementById("createBtn") as HTMLButtonElement;
const joinBtn = document.getElementById("joinBtn") as HTMLButtonElement;
const codeInput = document.getElementById("codeInput") as HTMLInputElement;
const roomCodeEl = document.getElementById("roomCode") as HTMLParagraphElement;
const playerCountEl = document.getElementById("playerCount") as HTMLParagraphElement;

// --- 画面切り替え ---

function showLobby(): void {
  lobby.classList.remove("hidden");
  waiting.classList.add("hidden");
  gameEl.classList.add("hidden");
}

function showWaiting(roomCode: string): void {
  lobby.classList.add("hidden");
  waiting.classList.remove("hidden");
  gameEl.classList.add("hidden");
  roomCodeEl.textContent = roomCode;
}

function showGame(): void {
  lobby.classList.add("hidden");
  waiting.classList.add("hidden");
  gameEl.classList.remove("hidden");
}

// --- WebSocket接続 ---

function connect(wsUrl: string): void {
  ws = new WebSocket(wsUrl);

  ws.onopen = (): void => {
    lobbyStatus.textContent = "接続完了";
    createBtn.disabled = false;
    joinBtn.disabled = false;
  };

  ws.onclose = (): void => {
    lobbyStatus.textContent = "切断されました。再接続中...";
    createBtn.disabled = true;
    joinBtn.disabled = true;
    setTimeout(() => connect(wsUrl), RECONNECT_INTERVAL_MS);
  };

  ws.onmessage = (event: MessageEvent): void => {
    const msg: ServerMessage = JSON.parse(event.data as string);

    switch (msg.type) {
      case "roomCreated":
        showWaiting(msg.roomCode ?? "");
        playerCountEl.textContent = "1人が参加中... 相手を待っています";
        break;

      case "playerJoined":
        playerCountEl.textContent = `${msg.playerCount}/${msg.maxPlayers} 人が参加中`;
        break;

      case "gameStart":
        showGame();
        onGameStart(msg.players ?? []);
        break;

      case "gameAction":
        onGameAction(msg.from ?? "", msg.data ?? {});
        break;

      case "playerLeft":
        onPlayerLeft(msg.remainingPlayers ?? 0);
        break;

      case "error":
        alert(msg.message);
        showLobby();
        break;
    }
  };
}

// --- ルーム操作 ---

createBtn.addEventListener("click", () => {
  ws?.send(JSON.stringify({ action: "createRoom" }));
});

joinBtn.addEventListener("click", () => {
  const code = codeInput.value.trim().toUpperCase();
  if (!code) return;
  ws?.send(JSON.stringify({ action: "joinRoom", roomCode: code }));
  showWaiting(code);
  playerCountEl.textContent = "参加中...";
});

codeInput.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter") joinBtn.click();
});

// --- ゲームアクション送信（開発者が使うユーティリティ） ---

function sendGameAction(data: Record<string, unknown>): void {
  ws?.send(JSON.stringify({ action: "gameAction", data }));
}

// --- ★ 以下を開発者がカスタマイズする ---

/**
 * ゲーム開始時に呼ばれる
 */
function onGameStart(players: string[]): void {
  // 例: document.getElementById("gameContainer")!.innerHTML = "ゲーム画面を実装";
  console.log("Game started with players:", players);
}

/**
 * 他プレイヤーからゲームアクションを受信した時に呼ばれる
 */
function onGameAction(from: string, data: Record<string, unknown>): void {
  // 例: 相手の位置を更新する
  console.log("Action from:", from, data);
}

/**
 * プレイヤーが退出した時に呼ばれる
 */
function onPlayerLeft(remainingPlayers: number): void {
  console.log("Player left. Remaining:", remainingPlayers);
}

// --- 初期化 ---

fetch("/config.json")
  .then((res) => res.json())
  .then((config: GameConfig) => {
    connect(config.wsUrl);
  })
  .catch(() => {
    lobbyStatus.textContent =
      "config.json の読み込みに失敗しました。デプロイ済みか確認してください。";
  });
