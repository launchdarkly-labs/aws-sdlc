# AI Book Recommendations Feature Spec

Add a `GET /recommendations` endpoint to AnyCompanyRead that uses **Amazon Bedrock** (via the Converse API) with **LaunchDarkly AI Configs** for runtime model / prompt switching. The frontend renders a "Recommended for You" section on the catalog page.

📚 **SDK Reference**: [Node.js AI SDK](https://docs.launchdarkly.com/sdk/ai/node-js) · [AI Configs overview](https://docs.launchdarkly.com/home/ai-configs) · [Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)

## Functional Requirements

- Recommend books from the existing `Books` DynamoDB catalog based on the user's order history (`Orders` table, limit 10).
- Use LaunchDarkly AI Config key `book-recommendations` in **completion** mode.
- Two variations control behavior:
  - `safe-sonnet` — Claude 3.5 Sonnet, temperature 0.2, custom param `maxRecommendations` = 3, mainstream picks.
  - `adventurous-opus` — Claude Opus 4, temperature 0.95, custom param `maxRecommendations` = 5, hidden gems.
- Switching the AI Config default in LaunchDarkly must change behavior **without redeploy**.
- Lambda must call `tracker.trackBedrockConverseMetrics(...)` so latency/token/cost metrics appear on the AI Config dashboard.

## Architecture

```
Frontend (React/Cloudscape)
    │  GET /recommendations  (Cognito JWT)
    ▼
API Gateway → Lambda (Node 20)
    │
    ├─► LaunchDarkly: aiClient.completionConfig('book-recommendations', context, fallback)
    │       → { model, instructions, temperature, maxRecommendations, tracker }
    │
    ├─► DynamoDB: Orders (user history), Books (catalog)
    │
    └─► Bedrock Converse: tracker.trackBedrockConverseMetrics(client.send(new ConverseCommand(...)))
            → { recommendations[], model } back to frontend
```

## Dependencies

`packages/backend/package.json`:

```json
{
  "@launchdarkly/node-server-sdk": "^9.10.14",
  "@launchdarkly/server-sdk-ai": "^0.20.0",
  "@aws-sdk/client-bedrock-runtime": "^3.712.0",
  "@aws-sdk/client-ssm": "^3.712.0",
  "@aws-sdk/client-dynamodb": "^3.712.0",
  "@aws-sdk/lib-dynamodb": "^3.712.0"
}
```

`packages/frontend/package.json` (only needed if you add feature flags in Operations Phase Part 2):

```json
{
  "launchdarkly-react-client-sdk": "^3.9.1"
}
```

## Environment

| Variable | Value | Resolved by |
|---|---|---|
| `LAUNCHDARKLY_SDK_KEY` | Production SDK key (`sdk-...`) | Lambda env var (optional) |
| `LD_SDK_KEY_PARAM` | `/anycompanyread/launchdarkly/sdk-key` | Lambda env var (set by CDK) |
| `BOOKS_TABLE` / `ORDERS_TABLE` | DynamoDB table names | CDK construct |
| `AWS_REGION` | e.g. `us-east-1` | Lambda runtime |

The Lambda prefers `LAUNCHDARKLY_SDK_KEY` if set; otherwise reads the value from SSM Parameter Store at `LD_SDK_KEY_PARAM`.

## Reference Implementation

A complete reference implementation lives in [`integration-code/`](../integration-code/INTEGRATION.md):

| File | Purpose |
|---|---|
| `packages/backend/src/handlers/recommendations-handler.ts` | Lambda handler (completionConfig + Converse + tracker) |
| `packages/cdk/lib/constructs/recommendations-construct.ts` | NodejsFunction + REST route + IAM (SSM read, Bedrock invoke, inference profile) |
| `packages/frontend/src/components/RecommendationsSection.tsx` | Cloudscape "Recommended for You" card section |
| `packages/shared/src/types/recommendations.ts` | Shared `BookRecommendation` / response types |
| `test/test-recommendations.js` | Local Node script — run after creating the AI Config to validate it end-to-end |

Tell Kiro CLI to follow that layout when generating the feature:

```text
Include the AI recommendations feature from this spec in the generated application.
Use the layout in integration-code/: a Lambda handler at
packages/backend/src/handlers/recommendations-handler.ts using @launchdarkly/server-sdk-ai
completionConfig + Bedrock Converse, a CDK construct at
packages/cdk/lib/constructs/recommendations-construct.ts, a Cloudscape component at
packages/frontend/src/components/RecommendationsSection.tsx, and shared types at
packages/shared/src/types/recommendations.ts. Use the SDK versions in the spec.
```

## LaunchDarkly Setup (API Quick Reference)

### Create the project

```bash
curl -X POST https://app.launchdarkly.com/api/v2/projects \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "AnyCompanyRead", "key": "anycompanyread"}'
```

The response includes per-environment `apiKey` values — save `production` (`sdk-...`).

### Create the AI Config

```bash
curl -X POST \
  https://app.launchdarkly.com/api/v2/projects/anycompanyread/ai-configs \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{"key": "book-recommendations", "name": "Book Recommendations", "mode": "completion"}'
```

### Create the variations

**`safe-sonnet`** (mainstream):

```bash
curl -X POST \
  https://app.launchdarkly.com/api/v2/projects/anycompanyread/ai-configs/book-recommendations/variations \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{
    "key": "safe-sonnet",
    "name": "Safe Sonnet (Mainstream)",
    "messages": [{"role": "system", "content": "You are a book recommendation assistant for a mainstream bookstore. Recommend BESTSELLERS ONLY. Stay in the SAME GENRE. Make OBVIOUS CONNECTIONS."}],
    "modelConfigKey": "Bedrock.us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "model": {"modelName": "us.anthropic.claude-3-5-sonnet-20241022-v2:0", "parameters": {"temperature": 0.2, "maxTokens": 1024}, "custom": {"maxRecommendations": 3}}
  }'
```

**`adventurous-opus`** (hidden gems):

```bash
curl -X POST \
  https://app.launchdarkly.com/api/v2/projects/anycompanyread/ai-configs/book-recommendations/variations \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{
    "key": "adventurous-opus",
    "name": "Adventurous (Hidden Gems)",
    "messages": [{"role": "system", "content": "You are a literary explorer. Recommend HIDDEN GEMS - cult classics, international literature. Make TANGENTIAL CONNECTIONS. AVOID bestsellers."}],
    "modelConfigKey": "Bedrock.us.anthropic.claude-opus-4-20250514-v1:0",
    "model": {"modelName": "us.anthropic.claude-opus-4-20250514-v1:0", "parameters": {"temperature": 0.95, "maxTokens": 1024}, "custom": {"maxRecommendations": 5}}
  }'
```

### Set the default variation

```bash
# Get variation IDs first:
curl -X GET \
  https://app.launchdarkly.com/api/v2/projects/anycompanyread/ai-configs/book-recommendations/targeting \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "LD-API-Version: beta"

# Then default to safe-sonnet (use the _id from response):
curl -X PATCH \
  https://app.launchdarkly.com/api/v2/projects/anycompanyread/ai-configs/book-recommendations/targeting \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json; domain-model=launchdarkly.semanticpatch" \
  -H "LD-API-Version: beta" \
  -d '{
    "environmentKey": "production",
    "instructions": [{"kind": "updateFallthroughVariationOrRollout", "variationId": "<safe-sonnet-id>"}]
  }'
```

Or simply: drop `.kiro/steering/launchdarkly-ai-configs.md` into your workshop project and tell Kiro to run the whole setup.

## Operations Phase: Frontend Feature Flag

After the recommendations feature is live, add a feature flag to control a UI experiment on the catalog page.

### Frontend SDK Setup

```bash
npm install launchdarkly-react-client-sdk
```

```tsx
// packages/frontend/src/main.tsx — wrap the app
import { LDProvider } from 'launchdarkly-react-client-sdk';

const config = await fetch('/config.json').then((r) => r.json());

<LDProvider
  clientSideID={config.ldClientSideId}
  context={{ kind: 'user', key: currentUser?.id ?? 'anonymous' }}
>
  <App />
</LDProvider>
```

```tsx
// In a component
import { useFlags } from 'launchdarkly-react-client-sdk';

function BookCard({ book }: { book: Book }) {
  const { newBookCardDesign } = useFlags<{ newBookCardDesign: boolean }>();
  return newBookCardDesign ? <NewBookCard book={book} /> : <LegacyBookCard book={book} />;
}
```

### Example Flags for AnyCompanyRead

| Flag key | Type | Use case |
|---|---|---|
| `new-book-card-design` | boolean | A/B test new card UI |
| `show-recommendation-reasons` | boolean | Toggle the "Why we recommend it" copy |
| `checkout-flow-version` | string | `v1` / `v2` / `v3` multivariate experiment |

> `maxRecommendations` is controlled via AI Config **custom parameters**, not a feature flag — see the variations above.
