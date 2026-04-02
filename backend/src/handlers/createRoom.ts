import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { createRoom } from "../lib/roomManager";
import { sendToConnection } from "../lib/broadcast";
import { gameConfig } from "../game.config";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { domainName, stage } = event.requestContext;

  try {
    const room = await createRoom(
      connectionId,
      gameConfig.maxPlayers,
      gameConfig.roomTtlSeconds
    );

    await sendToConnection(domainName, stage, connectionId, {
      type: "roomCreated",
      roomCode: room.roomCode,
      roomId: room.roomId,
    });

    return { statusCode: 200, body: "Room created" };
  } catch (error) {
    console.error("Create room error:", error);
    await sendToConnection(domainName, stage, connectionId, {
      type: "error",
      message: "Failed to create room",
    });
    return { statusCode: 500, body: "Failed to create room" };
  }
};
