export interface Connection {
  connectionId: string;
  roomId?: string;
  joinedAt: string;
}

export interface Room {
  roomId: string;
  roomCode: string;
  players: string[];
  status: "waiting" | "playing" | "finished";
  gameState?: Record<string, unknown>;
  createdAt: string;
  ttl: number;
}

export interface WebSocketEvent {
  requestContext: {
    connectionId: string;
    domainName: string;
    stage: string;
    routeKey: string;
  };
  body?: string;
}

export interface WebSocketResponse {
  statusCode: number;
  body?: string;
}

export interface GameActionPayload {
  action: "gameAction";
  data: Record<string, unknown>;
}

export interface CreateRoomPayload {
  action: "createRoom";
}

export interface JoinRoomPayload {
  action: "joinRoom";
  roomCode: string;
}

export type ClientMessage = CreateRoomPayload | JoinRoomPayload | GameActionPayload;

export interface ServerMessage {
  type:
    | "roomCreated"
    | "playerJoined"
    | "gameStart"
    | "gameAction"
    | "playerLeft"
    | "error";
  [key: string]: unknown;
}
