# Test LaunchDarkly + Bedrock Integration

Test the AI recommendations locally before integrating into the workshop.

## Prerequisites

1. **LaunchDarkly SDK Key** (starts with `sdk-`)
2. **AWS credentials** with Bedrock access
3. **Node.js** 18+

## Setup

```bash
cd integration-code/test
npm install
```

## Create AI Config in LaunchDarkly

1. Go to LaunchDarkly → AI Configs
2. Create new config:
   - **Key:** `book-recommendations`
   - **Mode:** Completion
3. Add variations:

| Name | Model ID |
|------|----------|
| sonnet | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| opus | `us.anthropic.claude-opus-4-20250514-v1:0` |

4. Set default targeting to serve "sonnet"

## Run Test

```bash
export LAUNCHDARKLY_SDK_KEY="sdk-your-key"
npm test
```

## Expected Output

```
🚀 LaunchDarkly + Bedrock Integration Test

✅ LaunchDarkly connected!
✅ AI Config found!
   Model: us.anthropic.claude-3-5-sonnet-20241022-v2:0

📚 Generating Book Recommendations

📖 Recommendation 1:
   Title: Brave New World
   Author: Aldous Huxley
   Reason: Based on your interest in dystopian classics...
```

## Test Model Switching

1. Run the test → note the recommendations
2. Go to LaunchDarkly → change targeting to "opus"
3. Run the test again → recommendations should be more detailed!
