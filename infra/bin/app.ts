#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebSocketGameStack } from "../lib/websocket-stack";

const app = new cdk.App();

const gameName = app.node.tryGetContext("gameName") || "websocket-game";

new WebSocketGameStack(app, `${gameName}-stack`, {
  gameName,
});
