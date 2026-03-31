import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import { init as initAI, LDAIClient } from '@launchdarkly/server-sdk-ai';

// AWS Clients
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

// LaunchDarkly client (singleton)
let ldClient: LaunchDarkly.LDClient | null = null;
let aiClient: LDAIClient | null = null;

// Default model if LaunchDarkly is not configured
const DEFAULT_MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

interface BookRecommendation {
  bookId: string;
  title: string;
  author: string;
  reason: string;
}

/**
 * Initialize LaunchDarkly client
 */
async function initLaunchDarkly(): Promise<void> {
  if (ldClient) return;

  try {
    // Get SDK key from AWS SSM
    const response = await ssmClient.send(
      new GetParameterCommand({
        Name: '/anycompanyread/launchdarkly/sdk-key',
        WithDecryption: true,
      })
    );

    const sdkKey = response.Parameter?.Value;
    if (!sdkKey) {
      console.log('[LaunchDarkly] SDK key not found in SSM, using default model');
      return;
    }

    ldClient = LaunchDarkly.init(sdkKey);
    await ldClient.waitForInitialization();
    aiClient = initAI(ldClient);
    console.log('[LaunchDarkly] Client initialized successfully');
  } catch (error) {
    console.log('[LaunchDarkly] Failed to initialize:', error);
  }
}

/**
 * Get AI model configuration from LaunchDarkly
 */
async function getModelConfig(userId: string): Promise<{ modelId: string; instructions: string }> {
  if (!aiClient || !ldClient) {
    return {
      modelId: DEFAULT_MODEL_ID,
      instructions: 'You are a book recommendation assistant. Suggest 3 books based on the user reading history.',
    };
  }

  try {
    const context = {
      kind: 'user',
      key: userId,
    };

    // Get AI Config from LaunchDarkly
    const config = await aiClient.config(
      'book-recommendations', // AI Config key
      context,
      {
        model: { name: DEFAULT_MODEL_ID },
        enabled: true,
      },
      { instructions: 'You are a book recommendation assistant.' }
    );

    if (config.enabled && config.model?.name) {
      console.log(`[LaunchDarkly] Using model: ${config.model.name}`);
      return {
        modelId: config.model.name,
        instructions: config.messages?.[0]?.content || 'You are a book recommendation assistant.',
      };
    }
  } catch (error) {
    console.log('[LaunchDarkly] Error getting config:', error);
  }

  return {
    modelId: DEFAULT_MODEL_ID,
    instructions: 'You are a book recommendation assistant.',
  };
}

/**
 * Get user's order history from DynamoDB
 */
async function getUserOrderHistory(userId: string): Promise<string[]> {
  try {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: process.env.ORDERS_TABLE || 'Orders',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        Limit: 10,
      })
    );

    // Extract book titles from orders
    const bookTitles: string[] = [];
    for (const order of result.Items || []) {
      for (const item of order.items || []) {
        if (item.title) {
          bookTitles.push(item.title);
        }
      }
    }

    return bookTitles;
  } catch (error) {
    console.log('[Orders] Error fetching order history:', error);
    return [];
  }
}

/**
 * Get book catalog for context
 */
async function getBookCatalog(): Promise<Array<{ bookId: string; title: string; author: string; genre: string }>> {
  try {
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: process.env.BOOKS_TABLE || 'Books',
        Limit: 50,
      })
    );

    return (result.Items || []).map((book) => ({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      genre: book.genre,
    }));
  } catch (error) {
    console.log('[Books] Error fetching catalog:', error);
    // Return some sample books for demo
    return [
      { bookId: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Fiction' },
      { bookId: '2', title: 'To Kill a Mockingbird', author: 'Harper Lee', genre: 'Fiction' },
      { bookId: '3', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Non-Fiction' },
      { bookId: '4', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help' },
      { bookId: '5', title: 'The Midnight Library', author: 'Matt Haig', genre: 'Fiction' },
    ];
  }
}

/**
 * Call Bedrock Claude to generate recommendations
 */
async function generateRecommendations(
  modelId: string,
  instructions: string,
  orderHistory: string[],
  catalog: Array<{ bookId: string; title: string; author: string; genre: string }>
): Promise<BookRecommendation[]> {
  const prompt = `${instructions}

User's previously purchased books:
${orderHistory.length > 0 ? orderHistory.join(', ') : 'No purchase history yet'}

Available books in our catalog:
${catalog.map((b) => `- "${b.title}" by ${b.author} (${b.genre}) [ID: ${b.bookId}]`).join('\n')}

Based on the user's reading history (or popular choices if no history), recommend exactly 3 books from the catalog.
For each book, explain why it would appeal to this reader.

Respond in this exact JSON format:
{
  "recommendations": [
    {"bookId": "1", "title": "Book Title", "author": "Author Name", "reason": "Why this book is recommended"}
  ]
}`;

  try {
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.recommendations || [];
    }
  } catch (error) {
    console.error('[Bedrock] Error generating recommendations:', error);
  }

  // Fallback recommendations
  return [
    { bookId: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', reason: 'A timeless classic' },
    { bookId: '3', title: 'Sapiens', author: 'Yuval Noah Harari', reason: 'Fascinating look at human history' },
    { bookId: '4', title: 'Atomic Habits', author: 'James Clear', reason: 'Practical self-improvement' },
  ];
}

/**
 * Lambda handler for book recommendations
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    // Get user ID from JWT claims
    const userId = event.requestContext.authorizer?.claims?.sub || 'anonymous';

    // Initialize LaunchDarkly
    await initLaunchDarkly();

    // Get model configuration from LaunchDarkly
    const { modelId, instructions } = await getModelConfig(userId);

    // Get user's order history
    const orderHistory = await getUserOrderHistory(userId);

    // Get book catalog
    const catalog = await getBookCatalog();

    // Generate recommendations using AI
    const recommendations = await generateRecommendations(modelId, instructions, orderHistory, catalog);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        recommendations,
        model: modelId, // Include model ID so UI can show which model was used
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
