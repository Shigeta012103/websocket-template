import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

interface WebSocketGameStackProps extends cdk.StackProps {
  gameName: string;
}

export class WebSocketGameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebSocketGameStackProps) {
    super(scope, id, props);

    const { gameName } = props;

    // DynamoDB: Connections
    const connectionsTable = new dynamodb.Table(this, "ConnectionsTable", {
      tableName: `${gameName}-connections`,
      partitionKey: { name: "connectionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    });

    // DynamoDB: Rooms
    const roomsTable = new dynamodb.Table(this, "RoomsTable", {
      tableName: `${gameName}-rooms`,
      partitionKey: { name: "roomId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    });

    roomsTable.addGlobalSecondaryIndex({
      indexName: "roomCode-index",
      partitionKey: { name: "roomCode", type: dynamodb.AttributeType.STRING },
    });

    // Lambda共通設定
    const lambdaEnvironment = {
      CONNECTIONS_TABLE: connectionsTable.tableName,
      ROOMS_TABLE: roomsTable.tableName,
    };

    const createLambda = (handlerName: string): lambda.Function => {
      const fn = new lambda.Function(this, `${handlerName}Function`, {
        functionName: `${gameName}-${handlerName}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: `handlers/${handlerName}.handler`,
        code: lambda.Code.fromAsset(path.join(__dirname, "../../backend/dist")),
        environment: lambdaEnvironment,
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
      });

      connectionsTable.grantReadWriteData(fn);
      roomsTable.grantReadWriteData(fn);

      return fn;
    };

    const connectFn = createLambda("connect");
    const disconnectFn = createLambda("disconnect");
    const createRoomFn = createLambda("createRoom");
    const joinRoomFn = createLambda("joinRoom");
    const gameActionFn = createLambda("gameAction");

    // WebSocket API
    const webSocketApi = new apigatewayv2.WebSocketApi(this, "WebSocketApi", {
      apiName: `${gameName}-ws`,
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "ConnectIntegration",
          connectFn
        ),
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          disconnectFn
        ),
      },
    });

    const webSocketStage = new apigatewayv2.WebSocketStage(this, "WebSocketStage", {
      webSocketApi,
      stageName: "prod",
      autoDeploy: true,
    });

    // カスタムルート
    webSocketApi.addRoute("createRoom", {
      integration: new integrations.WebSocketLambdaIntegration(
        "CreateRoomIntegration",
        createRoomFn
      ),
    });

    webSocketApi.addRoute("joinRoom", {
      integration: new integrations.WebSocketLambdaIntegration(
        "JoinRoomIntegration",
        joinRoomFn
      ),
    });

    webSocketApi.addRoute("gameAction", {
      integration: new integrations.WebSocketLambdaIntegration(
        "GameActionIntegration",
        gameActionFn
      ),
    });

    // Lambda に WebSocket API への送信権限を付与
    const connectionsArn = `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/POST/@connections/*`;

    const managementPolicy = new iam.PolicyStatement({
      actions: ["execute-api:ManageConnections"],
      resources: [connectionsArn],
    });

    [disconnectFn, createRoomFn, joinRoomFn, gameActionFn].forEach((fn) => {
      fn.addToRolePolicy(managementPolicy);
    });

    // S3: フロントエンド配信
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `${gameName}-frontend-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // CloudFront
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    // フロントエンドデプロイ（config.json を自動生成して同梱）
    const configJson = JSON.stringify({
      wsUrl: webSocketStage.url,
    });

    new s3deploy.BucketDeployment(this, "DeployFrontend", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../../frontend")),
        s3deploy.Source.data("config.json", configJson),
      ],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // Outputs
    new cdk.CfnOutput(this, "WebSocketUrl", {
      value: webSocketStage.url,
      description: "WebSocket API URL",
    });

    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Frontend URL",
    });
  }
}
