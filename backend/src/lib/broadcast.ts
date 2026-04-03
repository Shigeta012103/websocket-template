import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { ServerMessage } from "./types";
import { removeConnection } from "./roomManager";

let apiClient: ApiGatewayManagementApiClient | undefined;

function getApiClient(domainName: string, stage: string): ApiGatewayManagementApiClient {
  if (!apiClient) {
    apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${domainName}/${stage}`,
    });
  }
  return apiClient;
}

export async function sendToConnection(
  domainName: string,
  stage: string,
  connectionId: string,
  message: ServerMessage
): Promise<void> {
  const client = getApiClient(domainName, stage);
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message)),
      })
    );
  } catch (error) {
    if (error instanceof GoneException) {
      await removeConnection(connectionId);
      return;
    }
    throw error;
  }
}

export async function broadcastToRoom(
  domainName: string,
  stage: string,
  playerConnectionIds: string[],
  message: ServerMessage,
  excludeConnectionId?: string
): Promise<void> {
  const targets = excludeConnectionId
    ? playerConnectionIds.filter((id) => id !== excludeConnectionId)
    : playerConnectionIds;

  await Promise.allSettled(
    targets.map((connectionId) =>
      sendToConnection(domainName, stage, connectionId, message)
    )
  );
}
