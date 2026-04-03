/**
 * ルーム管理（共通）
 *
 * WebSocket接続、ルーム作成・参加、画面切り替えを行う。
 * ゲーム開始後の処理は onGameStart / onGameMessage をカスタマイズする。
 */

let ws;

const lobby = document.getElementById("lobby");
const waiting = document.getElementById("waiting");
const gameEl = document.getElementById("game");
const lobbyStatus = document.getElementById("lobbyStatus");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const codeInput = document.getElementById("codeInput");
const roomCodeEl = document.getElementById("roomCode");
const playerCountEl = document.getElementById("playerCount");

// --- 画面切り替え ---

function showLobby() {
  lobby.classList.remove("hidden");
  waiting.classList.add("hidden");
  gameEl.classList.add("hidden");
}

function showWaiting(roomCode) {
  lobby.classList.add("hidden");
  waiting.classList.remove("hidden");
  gameEl.classList.add("hidden");
  roomCodeEl.textContent = roomCode;
}

function showGame() {
  lobby.classList.add("hidden");
  waiting.classList.add("hidden");
  gameEl.classList.remove("hidden");
}

// --- WebSocket接続 ---

function connect(wsUrl) {
  ws = new WebSocket(wsUrl);

  ws.onopen = function () {
    lobbyStatus.textContent = "接続完了";
    createBtn.disabled = false;
    joinBtn.disabled = false;
  };

  ws.onclose = function () {
    lobbyStatus.textContent = "切断されました。再接続中...";
    createBtn.disabled = true;
    joinBtn.disabled = true;
    setTimeout(function () {
      connect(wsUrl);
    }, 3000);
  };

  ws.onmessage = function (event) {
    var msg = JSON.parse(event.data);

    switch (msg.type) {
      case "roomCreated":
        showWaiting(msg.roomCode);
        playerCountEl.textContent = "1人が参加中... 相手を待っています";
        break;

      case "playerJoined":
        playerCountEl.textContent =
          msg.playerCount + "/" + msg.maxPlayers + " 人が参加中";
        break;

      case "gameStart":
        showGame();
        onGameStart(msg.players);
        break;

      case "gameAction":
        onGameAction(msg.from, msg.data);
        break;

      case "playerLeft":
        onPlayerLeft(msg.remainingPlayers);
        break;

      case "error":
        alert(msg.message);
        showLobby();
        break;
    }
  };
}

// --- ルーム操作 ---

createBtn.addEventListener("click", function () {
  ws.send(JSON.stringify({ action: "createRoom" }));
});

joinBtn.addEventListener("click", function () {
  var code = codeInput.value.trim().toUpperCase();
  if (!code) return;
  ws.send(JSON.stringify({ action: "joinRoom", roomCode: code }));
  showWaiting(code);
  playerCountEl.textContent = "参加中...";
});

codeInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") joinBtn.click();
});

// --- ゲームアクション送信（開発者が使うユーティリティ） ---

function sendGameAction(data) {
  ws.send(JSON.stringify({ action: "gameAction", data: data }));
}

// --- ★ 以下を開発者がカスタマイズする ---

/**
 * ゲーム開始時に呼ばれる
 * @param {string[]} players - 参加プレイヤーの接続ID一覧
 */
function onGameStart(players) {
  // 例: document.getElementById("gameContainer").innerHTML = "ゲーム画面を実装";
  console.log("Game started with players:", players);
}

/**
 * 他プレイヤーからゲームアクションを受信した時に呼ばれる
 * @param {string} from - 送信者の接続ID
 * @param {object} data - 受信データ
 */
function onGameAction(from, data) {
  // 例: 相手の位置を更新する
  console.log("Message from:", from, data);
}

/**
 * プレイヤーが退出した時に呼ばれる
 * @param {number} remainingPlayers - 残りの人数
 */
function onPlayerLeft(remainingPlayers) {
  console.log("Player left. Remaining:", remainingPlayers);
}

// --- 初期化 ---

fetch("/config.json")
  .then(function (res) {
    return res.json();
  })
  .then(function (config) {
    connect(config.wsUrl);
  })
  .catch(function () {
    lobbyStatus.textContent =
      "config.json の読み込みに失敗しました。デプロイ済みか確認してください。";
  });
