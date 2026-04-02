import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { removeConnection, getRoom } from "../lib/roomManager";
import { broadcastToRoom } from "../lib/broadcast";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { domainName, stage } = event.requestContext;

  try {
    const roomId = await removeConnection(connectionId);

    if (roomId) {
      const room = await getRoom(roomId);
      if (room) {
        await broadcastToRoom(domainName, stage, room.players, {
          type: "playerLeft",
          connectionId,
          remainingPlayers: room.players.length,
        });
      }
    }

    return { statusCode: 200, body: "Disconnected" };
  } catch (error) {
    console.error("Disconnect error:", error);
    return { statusCode: 500, body: "Failed to disconnect" };
  }
};
