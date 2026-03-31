# AI Book Recommendations Feature

Add a `/recommendations` endpoint that uses **Amazon Bedrock** + **LaunchDarkly AI Configs** for runtime model/prompt switching.

📚 **SDK Reference**: [Node.js AI SDK](https://docs.launchdarkly.com/sdk/ai/node-js) | [AI Configs Overview](https://docs.launchdarkly.com/home/ai-configs)

## Requirements

- Recommend books from catalog based on user's order history
- Use LaunchDarkly AI Config key: `book-recommendations` (completion mode)
- Two variations control behavior: `safe-sonnet` (temp 0.2) and `adventurous-opus` (temp 0.95)
- Custom parameter `maxRecommendations` controls how many books to recommend (3 or 5)

## Dependencies

```json
{
  "@launchdarkly/node-server-sdk": "^9.7.1",
  "@launchdarkly/server-sdk-ai": "^0.16.7",
  "@aws-sdk/client-bedrock-runtime": "^3.712.0",
  "@aws-sdk/client-dynamodb": "^3.712.0",
  "@aws-sdk/lib-dynamodb": "^3.712.0"
}
```

## Environment Variables

- `LAUNCHDARKLY_SDK_KEY` - SDK key (starts with `sdk-`)
- `BOOKS_TABLE` - DynamoDB book catalog table
- `ORDERS_TABLE` - DynamoDB orders table
- `AWS_REGION` - e.g., `us-east-1`

## Lambda Handler

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import { initAi } from '@launchdarkly/server-sdk-ai';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

let ldClient: LaunchDarkly.LDClient | null = null;
let aiClient: ReturnType<typeof initAi> | null = null;

const DEFAULT_MODEL = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEFAULT_PROMPT = 'You are a book recommendation assistant. Recommend 3 books.';

async function initLaunchDarkly(): Promise<void> {
  if (ldClient) return;
  const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;
  if (!sdkKey) return;

  try {
    ldClient = LaunchDarkly.init(sdkKey);
    await ldClient.waitForInitialization({ timeout: 5 });
    aiClient = initAi(ldClient);
  } catch (error) {
    console.error('[LaunchDarkly] Init failed:', error);
  }
}

const DEFAULT_MAX_RECOMMENDATIONS = 3;

async function getAIConfig(userId: string): Promise<{ model: string; systemPrompt: string; maxRecommendations: number }> {
  if (!aiClient) return { model: DEFAULT_MODEL, systemPrompt: DEFAULT_PROMPT, maxRecommendations: DEFAULT_MAX_RECOMMENDATIONS };

  try {
    const context = { kind: 'user' as const, key: userId };
    const config = await aiClient.completionConfig('book-recommendations', context, {
      model: { name: DEFAULT_MODEL },
      enabled: true,
    });

    if (config.enabled && config.model?.name) {
      return {
        model: config.model.name,
        systemPrompt: config.messages?.[0]?.content || DEFAULT_PROMPT,
        maxRecommendations: (config.custom?.maxRecommendations as number) || DEFAULT_MAX_RECOMMENDATIONS,
      };
    }
  } catch (error) {
    console.error('[LaunchDarkly] Config error:', error);
  }
  return { model: DEFAULT_MODEL, systemPrompt: DEFAULT_PROMPT, maxRecommendations: DEFAULT_MAX_RECOMMENDATIONS };
}

async function getUserOrderHistory(userId: string): Promise<string[]> {
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: process.env.ORDERS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      Limit: 10,
    })
  );
  const titles: string[] = [];
  for (const order of result.Items || []) {
    for (const item of (order.items as any[]) || []) {
      if (item.title) titles.push(item.title);
    }
  }
  return titles;
}

async function getBookCatalog(): Promise<{ bookId: string; title: string; author: string; genre?: string }[]> {
  const result = await dynamoClient.send(
    new ScanCommand({ TableName: process.env.BOOKS_TABLE, Limit: 50 })
  );
  return (result.Items || []).map((item) => ({
    bookId: item.bookId as string,
    title: item.title as string,
    author: item.author as string,
    genre: item.genre as string,
  }));
}

async function generateRecommendations(
  model: string,
  systemPrompt: string,
  orderHistory: string[],
  catalog: { bookId: string; title: string; author: string; genre?: string }[],
  maxRecommendations: number
) {
  const userPrompt = `User's purchased books: ${orderHistory.length > 0 ? orderHistory.join(', ') : 'None'}

Available catalog:
${catalog.map((b) => `- "${b.title}" by ${b.author} (${b.genre || 'General'}) [ID: ${b.bookId}]`).join('\n')}

Recommend exactly ${maxRecommendations} books. Respond in JSON: {"recommendations": [{"bookId": "id", "title": "Title", "author": "Author", "reason": "Why"}]}`;

  const response = await bedrockClient.send(
    new InvokeModelCommand({
      modelId: model,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
  );

  const body = JSON.parse(new TextDecoder().decode(response.body));
  const match = body.content?.[0]?.text?.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]).recommendations || [] : [];
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  await initLaunchDarkly();
  const userId = event.requestContext.authorizer?.claims?.sub || 'anonymous';
  const { model, systemPrompt, maxRecommendations } = await getAIConfig(userId);
  const [orderHistory, catalog] = await Promise.all([getUserOrderHistory(userId), getBookCatalog()]);
  const recommendations = await generateRecommendations(model, systemPrompt, orderHistory, catalog, maxRecommendations);

  return { statusCode: 200, headers, body: JSON.stringify({ recommendations, model, maxRecommendations }) };
};
```

## CDK Infrastructure

```typescript
const recommendationsHandler = new lambda.Function(this, 'RecommendationsHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'recommendations-handler.handler',
  code: lambda.Code.fromAsset('dist/handlers'),
  timeout: cdk.Duration.seconds(30),
  environment: {
    LAUNCHDARKLY_SDK_KEY: process.env.LAUNCHDARKLY_SDK_KEY || '',
    BOOKS_TABLE: booksTable.tableName,
    ORDERS_TABLE: ordersTable.tableName,
  },
});

booksTable.grantReadData(recommendationsHandler);
ordersTable.grantReadData(recommendationsHandler);
recommendationsHandler.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: ['arn:aws:bedrock:*::foundation-model/*'],
  })
);

api.addRoutes({
  path: '/recommendations',
  methods: [apigateway.HttpMethod.GET],
  integration: new apigateway.LambdaProxyIntegration({ handler: recommendationsHandler }),
});
```

## LaunchDarkly Setup

### Create Project (if needed)

```bash
curl -X POST https://app.launchdarkly.com/api/v2/projects \
  -H "Authorization: {api-token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "AnyCompanyRead", "key": "anycompanyread"}'
```

Response includes SDK keys for each environment - save the `production` environment's `apiKey` (starts with `sdk-`).

### Create AI Config

```bash
curl -X POST \
  https://app.launchdarkly.com/api/v2/projects/{projectKey}/ai-configs \
  -H "Authorization: {api-token}" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{"key": "book-recommendations", "name": "Book Recommendations", "mode": "completion"}'
```

### Create Variations

**safe-sonnet** (mainstream recommendations):
```bash
curl -X POST \
  https://app.launchdarkly.com/api/v2/projects/{projectKey}/ai-configs/book-recommendations/variations \
  -H "Authorization: {api-token}" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{
    "key": "safe-sonnet",
    "name": "Safe Sonnet (Mainstream)",
    "messages": [{"role": "system", "content": "You are a book recommendation assistant for a mainstream bookstore. Recommend BESTSELLERS ONLY - books that sold millions or won major awards. Stay in the SAME GENRE. Make OBVIOUS CONNECTIONS. Do NOT recommend obscure books."}],
    "modelConfigKey": "Bedrock.us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "model": {"modelName": "us.anthropic.claude-3-5-sonnet-20241022-v2:0", "parameters": {"temperature": 0.2, "maxTokens": 1024}},
    "_custom": {"maxRecommendations": 3}
  }'
```

**adventurous-opus** (hidden gems):
```bash
curl -X POST \
  https://app.launchdarkly.com/api/v2/projects/{projectKey}/ai-configs/book-recommendations/variations \
  -H "Authorization: {api-token}" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{
    "key": "adventurous-opus",
    "name": "Adventurous (Hidden Gems)",
    "messages": [{"role": "system", "content": "You are a literary explorer helping readers discover unexpected treasures. Recommend HIDDEN GEMS - cult classics, international literature. Make TANGENTIAL CONNECTIONS across genres and eras. Be BOLD AND UNEXPECTED. AVOID bestsellers and obvious recommendations."}],
    "modelConfigKey": "Bedrock.us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "model": {"modelName": "us.anthropic.claude-3-5-sonnet-20241022-v2:0", "parameters": {"temperature": 0.95, "maxTokens": 1024}},
    "_custom": {"maxRecommendations": 5}
  }'
```

### Set Default Variation

```bash
# First get variation IDs
curl -X GET \
  https://app.launchdarkly.com/api/v2/projects/{projectKey}/ai-configs/book-recommendations/targeting \
  -H "Authorization: {api-token}" \
  -H "LD-API-Version: beta"

# Set default to safe-sonnet (use _id from response)
curl -X PATCH \
  https://app.launchdarkly.com/api/v2/projects/{projectKey}/ai-configs/book-recommendations/targeting \
  -H "Authorization: {api-token}" \
  -H "Content-Type: application/json; domain-model=launchdarkly.semanticpatch" \
  -H "LD-API-Version: beta" \
  -d '{
    "environmentKey": "production",
    "instructions": [{"kind": "updateFallthroughVariationOrRollout", "variationId": "{safe-sonnet-uuid}"}]
  }'
```

---

## Feature Flags (Operations Phase)

Add LaunchDarkly feature flags to the application for A/B testing and controlled rollouts.

### Frontend SDK Setup (React)

```bash
npm install launchdarkly-react-client-sdk
```

```tsx
// App.tsx - Wrap app with LDProvider
import { LDProvider } from 'launchdarkly-react-client-sdk';

const ldConfig = {
  clientSideID: process.env.REACT_APP_LD_CLIENT_ID, // Client-side ID, not SDK key
  context: { kind: 'user', key: 'anonymous' },
};

<LDProvider {...ldConfig}>
  <App />
</LDProvider>
```

```tsx
// Using flags in components
import { useFlags } from 'launchdarkly-react-client-sdk';

function BookCard({ book }) {
  const { newBookCardDesign, showRecommendationReasons } = useFlags();

  return newBookCardDesign ? (
    <NewBookCard book={book} showReasons={showRecommendationReasons} />
  ) : (
    <LegacyBookCard book={book} />
  );
}
```

### Create Feature Flags

```bash
# Boolean flag for A/B test
curl -X POST https://app.launchdarkly.com/api/v2/flags/{projectKey} \
  -H "Authorization: {api-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Book Card Design",
    "key": "new-book-card-design",
    "clientSideAvailability": {"usingEnvironmentId": true, "usingMobileKey": true},
    "variations": [{"value": true}, {"value": false}]
  }'

# Percentage rollout
curl -X PATCH \
  https://app.launchdarkly.com/api/v2/flags/{projectKey}/new-book-card-design \
  -H "Authorization: {api-token}" \
  -H "Content-Type: application/json; domain-model=launchdarkly.semanticpatch" \
  -d '{
    "environmentKey": "production",
    "instructions": [
      {"kind": "turnFlagOn"},
      {"kind": "updateFallthroughVariationOrRollout", "rolloutWeights": {"0": 50000, "1": 50000}}
    ]
  }'
```

### Example Flags for AnyCompanyRead

| Flag Key | Type | Use Case |
|----------|------|----------|
| `new-book-card-design` | boolean | A/B test new UI |
| `show-recommendation-reasons` | boolean | Toggle AI explanation text |
| `checkout-flow-version` | string | `v1`, `v2`, `v3` multivariate |

> **Note**: `max-recommendations` is controlled via AI Config custom parameters, not feature flags—see the AI Config variations above.
