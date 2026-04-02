import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { saveConnection } from "../lib/roomManager";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await saveConnection(connectionId);
    return { statusCode: 200, body: "Connected" };
  } catch (error) {
    console.error("Connection error:", error);
    return { statusCode: 500, body: "Failed to connect" };
  }
};
