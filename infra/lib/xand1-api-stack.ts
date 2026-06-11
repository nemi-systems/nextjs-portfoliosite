import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'
import path from 'path'

export interface Xand1ApiStackProps extends StackProps {
  allowedOrigins?: string[]
  bedrockModelId?: string
  categoryLabelThreshold?: string
  openAiApiKeySecretArn?: string
  openAiModel?: string
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://xand1.n3mi.net',
  'http://localhost:3000',
  'http://localhost:3001',
]

export class Xand1ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: Xand1ApiStackProps = {}) {
    super(scope, id, props)

    const table = new dynamodb.Table(this, 'BoardsTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    })

    const bedrockModelId = props.bedrockModelId ?? 'cohere.embed-v4:0'
    const commonEnvironment = {
      TABLE_NAME: table.tableName,
      BEDROCK_MODEL_ID: bedrockModelId,
    }

    const bundling = {
      format: OutputFormat.CJS,
      sourceMap: true,
      target: 'node20',
    }

    const refreshBoardFunction = new NodejsFunction(this, 'RefreshBoardFunction', {
      functionName: 'xand1-refresh-board',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/xand1/refresh-board.ts'),
      handler: 'handler',
      timeout: Duration.seconds(60),
      memorySize: 1024,
      environment: {
        ...commonEnvironment,
        OPENAI_MODEL: props.openAiModel ?? 'gpt-4.1-mini',
        OPENAI_API_KEY_SECRET_ARN: props.openAiApiKeySecretArn ?? '',
        GENERATION_PROMPT_VERSION: '2026-06-11',
      },
      bundling,
    })

    const gameApiFunction = new NodejsFunction(this, 'GameApiFunction', {
      functionName: 'xand1-game-api',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/xand1/game-api.ts'),
      handler: 'handler',
      timeout: Duration.seconds(15),
      memorySize: 512,
      environment: {
        ...commonEnvironment,
        CATEGORY_LABEL_THRESHOLD: props.categoryLabelThreshold ?? '0.35',
      },
      bundling,
    })

    table.grantReadWriteData(refreshBoardFunction)
    table.grantReadData(gameApiFunction)

    const bedrockPolicy = new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'aws-marketplace:ViewSubscriptions',
        'aws-marketplace:Subscribe',
      ],
      resources: ['*'],
    })
    refreshBoardFunction.addToRolePolicy(bedrockPolicy)
    gameApiFunction.addToRolePolicy(bedrockPolicy)

    if (props.openAiApiKeySecretArn) {
      const openAiSecret = secretsmanager.Secret.fromSecretCompleteArn(
        this,
        'OpenAiApiKeySecret',
        props.openAiApiKeySecretArn,
      )
      openAiSecret.grantRead(refreshBoardFunction)
    }

    const integration = new integrations.HttpLambdaIntegration('GameApiIntegration', gameApiFunction)
    const api = new apigatewayv2.HttpApi(this, 'GameHttpApi', {
      apiName: 'xand1-game-api',
      corsPreflight: {
        allowOrigins: props.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS,
        allowMethods: [apigatewayv2.CorsHttpMethod.GET, apigatewayv2.CorsHttpMethod.POST, apigatewayv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['content-type'],
        maxAge: Duration.days(1),
      },
    })

    api.addRoutes({
      path: '/board',
      methods: [apigatewayv2.HttpMethod.GET],
      integration,
    })
    api.addRoutes({
      path: '/guess',
      methods: [apigatewayv2.HttpMethod.POST],
      integration,
    })

    new CfnOutput(this, 'Xand1BoardsTableName', {
      value: table.tableName,
    })
    new CfnOutput(this, 'Xand1ApiUrl', {
      value: api.apiEndpoint,
    })
    new CfnOutput(this, 'Xand1RefreshBoardFunctionName', {
      value: refreshBoardFunction.functionName,
    })
  }
}
