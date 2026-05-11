# Test LaunchDarkly + Bedrock Integration

Run the AI recommendations integration locally before adding it to the AnyCompanyRead app.

## Prerequisites

1. **LaunchDarkly SDK Key** (starts with `sdk-`) for the `anycompanyread` project
2. **AWS credentials** with Bedrock model access for Claude Sonnet 3.5
3. **Node.js** 20+

## Setup

```bash
cd integration-code/test
npm install
```

## Create the AI Config in LaunchDarkly

1. Go to LaunchDarkly → AI Configs → Create
2. **Key:** `book-recommendations`, **Mode:** Completion
3. Add two variations:

| Variation key | Model ID | Temperature | Custom: `maxRecommendations` |
|---|---|---|---|
| `safe-sonnet` | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` | 0.2 | 3 |
| `adventurous-opus` | `us.anthropic.claude-opus-4-20250514-v1:0` | 0.95 | 5 |

4. Set default targeting to serve `safe-sonnet`.

## Run

```bash
export LAUNCHDARKLY_SDK_KEY="sdk-..."
export AWS_REGION="us-east-1"
npm test
```

## Test the live model switch

1. Run the test → note which titles come back.
2. In LaunchDarkly → AI Configs → `book-recommendations` → Targeting → change default to `adventurous-opus`.
3. Run `npm test` again → recommendations should be more adventurous (different titles, more detail).

No redeploy, no code change.
