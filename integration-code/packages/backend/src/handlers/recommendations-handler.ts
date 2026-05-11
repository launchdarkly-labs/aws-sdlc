import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { init as initLD, LDClient, LDContext } from '@launchdarkly/node-server-sdk';
import { initAi, LDAIClient, LDAIConfigTracker } from '@launchdarkly/server-sdk-ai';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

let ldClient: LDClient | null = null;
let aiClient: LDAIClient | null = null;

const AI_CONFIG_KEY = 'book-recommendations';
const SDK_KEY_SSM_PARAM = '/anycompanyread/launchdarkly/sdk-key';
const DEFAULT_MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEFAULT_INSTRUCTIONS =
  'You are a book recommendation assistant. Suggest 3 books based on the user reading history.';
const DEFAULT_MAX_RECOMMENDATIONS = 3;

interface BookRecommendation {
  bookId: string;
  title: string;
  author: string;
  reason: string;
}

interface ResolvedAIConfig {
  modelId: string;
  instructions: string;
  maxRecommendations: number;
  temperature: number;
  maxTokens: number;
  tracker: LDAIConfigTracker | null;
}

async function initLaunchDarkly(): Promise<void> {
  if (ldClient) return;

  let sdkKey: string | undefined = process.env.LAUNCHDARKLY_SDK_KEY;

  if (!sdkKey) {
    try {
      const ssmResponse = await ssmClient.send(
        new GetParameterCommand({ Name: SDK_KEY_SSM_PARAM, WithDecryption: true })
      );
      sdkKey = ssmResponse.Parameter?.Value;
    } catch (error) {
      console.log('[LaunchDarkly] Failed to fetch SDK key from SSM:', error);
    }
  }

  if (!sdkKey) {
    console.log('[LaunchDarkly] No SDK key available; using defaults');
    return;
  }

  ldClient = initLD(sdkKey);
  await ldClient.waitForInitialization({ timeout: 5 });
  aiClient = initAi(ldClient);
  console.log('[LaunchDarkly] Initialized');
}

async function resolveAIConfig(userId: string): Promise<ResolvedAIConfig> {
  if (!aiClient) {
    return {
      modelId: DEFAULT_MODEL_ID,
      instructions: DEFAULT_INSTRUCTIONS,
      maxRecommendations: DEFAULT_MAX_RECOMMENDATIONS,
      temperature: 0.5,
      maxTokens: 1024,
      tracker: null,
    };
  }

  const context: LDContext = { kind: 'user', key: userId };

  try {
    const config = await aiClient.completionConfig(
      AI_CONFIG_KEY,
      context,
      {
        enabled: true,
        model: { name: DEFAULT_MODEL_ID, parameters: { temperature: 0.5, maxTokens: 1024 } },
        messages: [{ role: 'system', content: DEFAULT_INSTRUCTIONS }],
      }
    );

    if (config.enabled) {
      return {
        modelId: config.model?.name ?? DEFAULT_MODEL_ID,
        instructions: config.messages?.[0]?.content ?? DEFAULT_INSTRUCTIONS,
        maxRecommendations:
          (config.model?.custom?.maxRecommendations as number) ?? DEFAULT_MAX_RECOMMENDATIONS,
        temperature: (config.model?.parameters?.temperature as number) ?? 0.5,
        maxTokens: (config.model?.parameters?.maxTokens as number) ?? 1024,
        tracker: config.tracker,
      };
    }
  } catch (error) {
    console.log('[LaunchDarkly] completionConfig error:', error);
  }

  return {
    modelId: DEFAULT_MODEL_ID,
    instructions: DEFAULT_INSTRUCTIONS,
    maxRecommendations: DEFAULT_MAX_RECOMMENDATIONS,
    temperature: 0.5,
    maxTokens: 1024,
    tracker: null,
  };
}

async function getUserOrderHistory(userId: string): Promise<string[]> {
  try {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: process.env.ORDERS_TABLE || 'Orders',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        Limit: 10,
      })
    );

    const titles: string[] = [];
    for (const order of result.Items || []) {
      for (const item of (order.items as Array<{ title?: string }> | undefined) || []) {
        if (item.title) titles.push(item.title);
      }
    }
    return titles;
  } catch (error) {
    console.log('[Orders] Error fetching order history:', error);
    return [];
  }
}

async function getBookCatalog(): Promise<
  Array<{ bookId: string; title: string; author: string; genre?: string }>
> {
  try {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: process.env.BOOKS_TABLE || 'Books',
        Limit: 50,
      })
    );

    return (result.Items || []).map((book: Record<string, unknown>) => ({
      bookId: book.bookId as string,
      title: book.title as string,
      author: book.author as string,
      genre: book.genre as string | undefined,
    }));
  } catch (error) {
    console.log('[Books] Error fetching catalog:', error);
    return [];
  }
}

async function generateRecommendations(
  resolved: ResolvedAIConfig,
  orderHistory: string[],
  catalog: Array<{ bookId: string; title: string; author: string; genre?: string }>
): Promise<BookRecommendation[]> {
  const userPrompt = `User's previously purchased books:
${orderHistory.length > 0 ? orderHistory.join(', ') : 'No purchase history yet'}

Available books in our catalog:
${catalog.map((b) => `- "${b.title}" by ${b.author} (${b.genre || 'General'}) [ID: ${b.bookId}]`).join('\n')}

Recommend exactly ${resolved.maxRecommendations} books from the catalog. For each book, explain why it would appeal to this reader.

Respond ONLY with JSON in this exact format:
{"recommendations":[{"bookId":"id","title":"Title","author":"Author","reason":"Why"}]}`;

  const invokeBedrock = () =>
    bedrockClient.send(
      new ConverseCommand({
        modelId: resolved.modelId,
        system: [{ text: resolved.instructions }],
        messages: [{ role: 'user', content: [{ text: userPrompt }] }],
        inferenceConfig: {
          temperature: resolved.temperature,
          maxTokens: resolved.maxTokens,
        },
      })
    );

  const response = resolved.tracker
    ? await resolved.tracker.trackBedrockConverseMetrics(invokeBedrock)
    : await invokeBedrock();

  const text = response.output?.message?.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    return parsed.recommendations ?? [];
  } catch {
    return [];
  }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const userId = event.requestContext.authorizer?.claims?.sub || 'anonymous';

    await initLaunchDarkly();
    const resolved = await resolveAIConfig(userId);
    const [orderHistory, catalog] = await Promise.all([
      getUserOrderHistory(userId),
      getBookCatalog(),
    ]);
    const recommendations = await generateRecommendations(resolved, orderHistory, catalog);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        recommendations,
        model: resolved.modelId,
        maxRecommendations: resolved.maxRecommendations,
      }),
    };
  } catch (error) {
    console.error('[Recommendations] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to generate recommendations' }),
    };
  }
};
