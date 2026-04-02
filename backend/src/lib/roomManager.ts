import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Connection, Room } from "./types";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

function getConnectionsTable(): string {
  const tableName = process.env.CONNECTIONS_TABLE;
  if (!tableName) {
    throw new Error("CONNECTIONS_TABLE environment variable is not set");
  }
  return tableName;
}

function getRoomsTable(): string {
  const tableName = process.env.ROOMS_TABLE;
  if (!tableName) {
    throw new Error("ROOMS_TABLE environment variable is not set");
  }
  return tableName;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function saveConnection(connectionId: string): Promise<void> {
  const connection: Connection = {
    connectionId,
    joinedAt: new Date().toISOString(),
  };
  await docClient.send(
    new PutCommand({
      TableName: getConnectionsTable(),
      Item: connection,
    })
  );
}

export async function removeConnection(connectionId: string): Promise<string | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: getConnectionsTable(),
      Key: { connectionId },
    })
  );

  const roomId = result.Item?.roomId as string | undefined;

  await docClient.send(
    new DeleteCommand({
      TableName: getConnectionsTable(),
      Key: { connectionId },
    })
  );

  if (roomId) {
    await removePlayerFromRoom(roomId, connectionId);
  }

  return roomId;
}

export async function createRoom(
  connectionId: string,
  maxPlayers: number,
  roomTtlSeconds: number
): Promise<Room> {
  const roomCode = generateRoomCode();
  const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Math.floor(Date.now() / 1000);

  const room: Room = {
    roomId,
    roomCode,
    players: [connectionId],
    status: "waiting",
    createdAt: new Date().toISOString(),
    ttl: now + roomTtlSeconds,
  };

  await docClient.send(
    new PutCommand({
      TableName: getRoomsTable(),
      Item: { ...room, maxPlayers },
    })
  );

  await docClient.send(
    new UpdateCommand({
      TableName: getConnectionsTable(),
      Key: { connectionId },
      UpdateExpression: "SET roomId = :roomId",
      ExpressionAttributeValues: { ":roomId": roomId },
    })
  );

  return room;
}

export async function findRoomByCode(roomCode: string): Promise<Room | undefined> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: getRoomsTable(),
      IndexName: "roomCode-index",
      KeyConditionExpression: "roomCode = :roomCode",
      ExpressionAttributeValues: { ":roomCode": roomCode },
    })
  );

  const rooms = result.Items as Room[] | undefined;
  if (!rooms || rooms.length === 0) {
    return undefined;
  }
  return rooms[0];
}

export async function joinRoom(
  roomId: string,
  connectionId: string
): Promise<Room> {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: getRoomsTable(),
      Key: { roomId },
      UpdateExpression: "SET players = list_append(players, :newPlayer)",
      ExpressionAttributeValues: {
        ":newPlayer": [connectionId],
      },
      ReturnValues: "ALL_NEW",
    })
  );

  await docClient.send(
    new UpdateCommand({
      TableName: getConnectionsTable(),
      Key: { connectionId },
      UpdateExpression: "SET roomId = :roomId",
      ExpressionAttributeValues: { ":roomId": roomId },
    })
  );

  return result.Attributes as Room;
}

export async function getRoom(roomId: string): Promise<Room | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: getRoomsTable(),
      Key: { roomId },
    })
  );
  return result.Item as Room | undefined;
}

export async function updateRoomStatus(
  roomId: string,
  status: Room["status"]
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: getRoomsTable(),
      Key: { roomId },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status },
    })
  );
}

export async function getRoomByConnectionId(connectionId: string): Promise<Room | undefined> {
  const connectionResult = await docClient.send(
    new GetCommand({
      TableName: getConnectionsTable(),
      Key: { connectionId },
    })
  );

  const roomId = connectionResult.Item?.roomId as string | undefined;
  if (!roomId) {
    return undefined;
  }

  return getRoom(roomId);
}

async function removePlayerFromRoom(roomId: string, connectionId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) return;

  const updatedPlayers = room.players.filter((p) => p !== connectionId);

  if (updatedPlayers.length === 0) {
    await docClient.send(
      new DeleteCommand({
        TableName: getRoomsTable(),
        Key: { roomId },
      })
    );
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: getRoomsTable(),
      Key: { roomId },
      UpdateExpression: "SET players = :players",
      ExpressionAttributeValues: { ":players": updatedPlayers },
    })
  );
}
