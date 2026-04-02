#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebSocketGameStack } from "../lib/websocket-stack";

const app = new cdk.App();

const gameName = app.node.tryGetContext("gameName");
if (!gameName) {
  throw new Error(
    "gameName is required. Set it in infra/cdk.json の context.gameName を変更してください。"
  );
}

new WebSocketGameStack(app, `${gameName}-stack`, {
  gameName,
});
