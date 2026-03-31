import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface RecommendationsConstructProps {
  api: apigateway.RestApi;
  authorizer: apigateway.CognitoUserPoolsAuthorizer;
  ordersTable: dynamodb.ITable;
  booksTable: dynamodb.ITable;
}

export class RecommendationsConstruct extends Construct {
  public readonly recommendationsLambda: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: RecommendationsConstructProps) {
    super(scope, id);

    // Create the recommendations Lambda function
    this.recommendationsLambda = new nodejs.NodejsFunction(this, 'RecommendationsHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: '../backend/src/handlers/recommendations-handler.ts',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ORDERS_TABLE: props.ordersTable.tableName,
        BOOKS_TABLE: props.booksTable.tableName,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
        nodeModules: [
          '@launchdarkly/node-server-sdk',
          '@launchdarkly/server-sdk-ai',
        ],
      },
    });

    // Grant permissions to read from DynamoDB tables
    props.ordersTable.grantReadData(this.recommendationsLambda);
    props.booksTable.grantReadData(this.recommendationsLambda);

    // Grant permissions to read SSM parameter (LaunchDarkly SDK key)
    this.recommendationsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/anycompanyread/launchdarkly/*`,
        ],
      })
    );

    // Grant permissions to invoke Bedrock models
    this.recommendationsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'], // Bedrock models don't have specific ARNs
      })
    );

    // Add API Gateway endpoint
    const recommendationsResource = props.api.root.addResource('recommendations');

    recommendationsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.recommendationsLambda),
      {
        authorizer: props.authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Add CORS
    recommendationsResource.addCorsPreflight({
      allowOrigins: ['*'],
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
  }
}
