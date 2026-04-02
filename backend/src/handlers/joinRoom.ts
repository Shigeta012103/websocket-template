import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { findRoomByCode, joinRoom, updateRoomStatus } from "../lib/roomManager";
import { sendToConnection, broadcastToRoom } from "../lib/broadcast";
import { gameConfig } from "../game.config";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { domainName, stage } = event.requestContext;

  try {
    const body = JSON.parse(event.body || "{}");
    const roomCode = body.roomCode as string | undefined;

    if (!roomCode) {
      await sendToConnection(domainName, stage, connectionId, {
        type: "error",
        message: "roomCode is required",
      });
      return { statusCode: 400, body: "roomCode is required" };
    }

    const room = await findRoomByCode(roomCode.toUpperCase());

    if (!room) {
      await sendToConnection(domainName, stage, connectionId, {
        type: "error",
        message: "Room not found",
      });
      return { statusCode: 404, body: "Room not found" };
    }

    if (room.players.length >= gameConfig.maxPlayers) {
      await sendToConnection(domainName, stage, connectionId, {
        type: "error",
        message: "Room is full",
      });
      return { statusCode: 400, body: "Room is full" };
    }

    if (room.status !== "waiting") {
      await sendToConnection(domainName, stage, connectionId, {
        type: "error",
        message: "Game already started",
      });
      return { statusCode: 400, body: "Game already started" };
    }

    const updatedRoom = await joinRoom(room.roomId, connectionId);

    await broadcastToRoom(domainName, stage, updatedRoom.players, {
      type: "playerJoined",
      playerCount: updatedRoom.players.length,
      maxPlayers: gameConfig.maxPlayers,
    });

    if (updatedRoom.players.length >= gameConfig.minPlayersToStart) {
      await updateRoomStatus(updatedRoom.roomId, "playing");
      await broadcastToRoom(domainName, stage, updatedRoom.players, {
        type: "gameStart",
        players: updatedRoom.players,
      });
    }

    return { statusCode: 200, body: "Joined room" };
  } catch (error) {
    console.error("Join room error:", error);
    await sendToConnection(domainName, stage, connectionId, {
      type: "error",
      message: "Failed to join room",
    });
    return { statusCode: 500, body: "Failed to join room" };
  }
};
