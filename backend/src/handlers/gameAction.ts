import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { getRoomByConnectionId } from "../lib/roomManager";
import { broadcastToRoom } from "../lib/broadcast";

/**
 * ★ ゲームロジックをここに実装する
 *
 * クライアントから送られた gameAction メッセージを処理し、
 * 同じルームの他プレイヤーに転送する。
 *
 * デフォルトでは受け取ったデータをそのまま他プレイヤーに転送する。
 * サーバー側でバリデーションや状態管理が必要な場合はこのハンドラーを編集する。
 */
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { domainName, stage } = event.requestContext;

  try {
    const body = JSON.parse(event.body || "{}");
    const gameData = body.data as Record<string, unknown> | undefined;

    const room = await getRoomByConnectionId(connectionId);

    if (!room) {
      return { statusCode: 400, body: "Not in a room" };
    }

    if (room.status !== "playing") {
      return { statusCode: 400, body: "Game not started" };
    }

    // デフォルト: 受け取ったデータを他プレイヤーに転送
    await broadcastToRoom(
      domainName,
      stage,
      room.players,
      {
        type: "gameAction",
        from: connectionId,
        data: gameData,
      },
      connectionId
    );

    return { statusCode: 200, body: "Action sent" };
  } catch (error) {
    console.error("Game action error:", error);
    return { statusCode: 500, body: "Failed to process action" };
  }
};
