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
  /** SSM parameter path that stores the LaunchDarkly SDK key (SecureString). */
  ldSdkKeyParameterName?: string;
}

export class RecommendationsConstruct extends Construct {
  public readonly recommendationsLambda: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: RecommendationsConstructProps) {
    super(scope, id);

    const ldSdkKeyParameterName =
      props.ldSdkKeyParameterName ?? '/anycompanyread/launchdarkly/sdk-key';

    this.recommendationsLambda = new nodejs.NodejsFunction(this, 'RecommendationsHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: '../backend/src/handlers/recommendations-handler.ts',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ORDERS_TABLE: props.ordersTable.tableName,
        BOOKS_TABLE: props.booksTable.tableName,
        LD_SDK_KEY_PARAM: ldSdkKeyParameterName,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
        nodeModules: ['@launchdarkly/node-server-sdk', '@launchdarkly/server-sdk-ai'],
      },
    });

    props.ordersTable.grantReadData(this.recommendationsLambda);
    props.booksTable.grantReadData(this.recommendationsLambda);

    this.recommendationsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter${ldSdkKeyParameterName}`,
        ],
      })
    );

    this.recommendationsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/*`,
          `arn:aws:bedrock:*::foundation-model/*`,
          `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:inference-profile/*`,
        ],
      })
    );

    const recommendationsResource = props.api.root.addResource('recommendations');

    recommendationsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.recommendationsLambda),
      {
        authorizer: props.authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    recommendationsResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
  }
}
