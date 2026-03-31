# LaunchDarkly AI Recommendations Integration

This folder contains the code to add AI-powered book recommendations to the AnyCompanyRead app, controlled by LaunchDarkly AI Configs.

## What's Included

```
integration-code/
├── packages/
│   ├── backend/src/handlers/
│   │   └── recommendations-handler.ts    # Lambda that generates AI recommendations
│   ├── frontend/src/components/
│   │   └── RecommendationsSection.tsx    # React component for homepage
│   ├── shared/src/types/
│   │   └── recommendations.ts            # TypeScript types
│   └── cdk/lib/constructs/
│       └── recommendations-construct.ts  # CDK infrastructure
└── INTEGRATION.md                        # This file
```

## How It Works

```
User visits homepage
        │
        ▼
┌─────────────────────────┐
│  RecommendationsSection │
│  (React component)      │
└───────────┬─────────────┘
            │ GET /recommendations
            ▼
┌─────────────────────────┐
│  recommendations-handler │
│  (Lambda)               │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌─────────┐   ┌─────────────┐
│ Launch  │   │ DynamoDB    │
│ Darkly  │   │ (orders,    │
│ AI      │   │  books)     │
│ Config  │   └─────────────┘
└────┬────┘
     │ "Use Sonnet" or "Use Opus"
     ▼
┌─────────────────────────┐
│  AWS Bedrock Claude     │
│  (generates 3 book      │
│   recommendations)      │
└─────────────────────────┘
```

## Integration Steps

### 1. Add Dependencies

Add to `packages/backend/package.json`:

```json
{
  "dependencies": {
    "@launchdarkly/node-server-sdk": "^9.0.0",
    "@launchdarkly/server-sdk-ai": "^0.1.0",
    "@aws-sdk/client-bedrock-runtime": "^3.0.0"
  }
}
```

### 2. Copy the Files

Copy the files to their respective locations in the AnyCompanyRead app:

```bash
# Backend handler
cp packages/backend/src/handlers/recommendations-handler.ts \
   /path/to/anycompanyread/packages/backend/src/handlers/

# Frontend component
cp packages/frontend/src/components/RecommendationsSection.tsx \
   /path/to/anycompanyread/packages/frontend/src/components/

# Shared types
cp packages/shared/src/types/recommendations.ts \
   /path/to/anycompanyread/packages/shared/src/types/

# CDK construct
cp packages/cdk/lib/constructs/recommendations-construct.ts \
   /path/to/anycompanyread/packages/cdk/lib/constructs/
```

### 3. Update the CDK Stack

In `packages/cdk/lib/anycompanyread-stack.ts`, add:

```typescript
import { RecommendationsConstruct } from './constructs/recommendations-construct';

// In the stack constructor, after creating api, authorizer, ordersTable, booksTable:
const recommendations = new RecommendationsConstruct(this, 'Recommendations', {
  api: apiConstruct.api,
  authorizer: apiConstruct.authorizer,
  ordersTable: dataConstruct.ordersTable,
  booksTable: dataConstruct.booksTable,
});
```

### 4. Update the Frontend

In `packages/frontend/src/pages/CatalogPage.tsx`, add:

```tsx
import { RecommendationsSection } from '../components/RecommendationsSection';

// In the page component, add above or below the book catalog:
<RecommendationsSection />
```

### 5. Store LaunchDarkly SDK Key

Workshop participants will run:

```bash
aws ssm put-parameter \
  --name "/anycompanyread/launchdarkly/sdk-key" \
  --value "sdk-YOUR-SDK-KEY" \
  --type SecureString
```

## LaunchDarkly Setup

### Create AI Config

Participants create an AI Config in LaunchDarkly:

**Key:** `book-recommendations`
**Mode:** Completion

**Variations:**

| Name | Model ID | Instructions |
|------|----------|--------------|
| sonnet | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` | "You are a book recommendation assistant. Suggest 3 books based on the user reading history. Keep explanations concise." |
| opus | `us.anthropic.claude-opus-4-20250514-v1:0` | "You are an expert literary advisor. Analyze the user's reading patterns and provide 3 thoughtful, personalized book recommendations with detailed explanations of why each book would appeal to them." |

### Switch Models

To demonstrate AI Configs:

1. Go to LaunchDarkly → AI Configs → book-recommendations
2. Click Targeting tab
3. Change default rule from "sonnet" to "opus"
4. Save
5. Refresh the app → recommendations are now more detailed!

## Demo Script

1. **Show the app** - Point out "Recommended for You" section and the model badge
2. **Explain** - "This is using Claude Sonnet for fast, concise recommendations"
3. **Switch in LaunchDarkly** - Change targeting to "opus"
4. **Refresh** - "Now it's using Claude Opus - notice the recommendations are more detailed"
5. **Key point** - "We didn't redeploy anything. LaunchDarkly AI Configs let you swap models instantly."

## Troubleshooting

### Recommendations not loading

- Check browser console for errors
- Verify the Lambda has Bedrock permissions
- Check CloudWatch logs for the Lambda

### "SDK key not found"

```bash
aws ssm get-parameter --name "/anycompanyread/launchdarkly/sdk-key" --with-decryption
```

### Model not switching

- Verify AI Config key is exactly `book-recommendations`
- Check LaunchDarkly targeting is enabled
- Lambda may cache the client - try redeploying
