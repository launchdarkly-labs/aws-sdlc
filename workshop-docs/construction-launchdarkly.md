# LaunchDarkly AI Configs - Construction Phase

Add AI-powered book recommendations to your AnyCompanyRead bookstore, controlled by LaunchDarkly AI Configs.

---

## Before You Start: Add Recommendations During Code Generation

**Important**: During the AI-DLC Code Generation phase, ask Kiro to include the recommendations feature:

```
Also add a recommendations-handler Lambda that:
- Takes a userId and returns 3 personalized book recommendations
- Uses Amazon Bedrock Claude to generate recommendations based on the user's order history
- Store the model ID in an environment variable BEDROCK_MODEL_ID (default: us.anthropic.claude-3-5-sonnet-20241022-v2:0)
```

This ensures the app has an AI feature we can control with LaunchDarkly.

---

**Continue below after Build and Test completes**

---

## What You'll Build

By the end of this section:
1. Your bookstore has AI-powered book recommendations
2. You can switch AI models instantly - no code deploy needed

---

## Step 1: Connect LaunchDarkly to Kiro CLI

### 1a. Set your API token

In your **bash terminal**, set your token as an environment variable:

```bash
export LAUNCHDARKLY_API_TOKEN="api-YOUR-TOKEN-HERE"
```

### 1b. Add the LaunchDarkly MCP server

```bash
kiro-cli mcp add \
  --name launchdarkly \
  --scope workspace \
  --command npx \
  --args "-y" --args "@launchdarkly/mcp-server" \
  --env LAUNCHDARKLY_API_TOKEN=$LAUNCHDARKLY_API_TOKEN \
  --force
```

### 1c. Start Kiro CLI

```bash
kiro-cli
```

Wait for the MCP server to initialize.

### 1d. Verify MCP is connected

```
/mcp list
```

You should see `launchdarkly` in the list.

---

## Step 2: Create the AI Config

Ask Kiro to create an AI Config for book recommendations:

```
Create a LaunchDarkly AI Config for book recommendations:

1. Create a project called "anycompanyread" (key: anycompanyread) if it doesn't exist
2. Create an AI Config called "book-recommendations" in completion mode with:
   - A "sonnet" variation using model us.anthropic.claude-3-5-sonnet-20241022-v2:0
     Instructions: "You are a book recommendation assistant. Given a user's reading history and preferences, suggest 3 relevant books with brief explanations."
   - An "opus" variation using model us.anthropic.claude-opus-4-20250514-v1:0
     Instructions: "You are an expert literary advisor. Analyze the user's reading patterns and provide 3 thoughtful, personalized book recommendations with detailed explanations of why each book would appeal to them."
   - Default targeting to serve "sonnet"
3. Get the SDK key for the Test environment and tell me what it is
```

### 2b. Store the SDK Key

Copy the SDK key Kiro gives you and store it in AWS SSM:

```bash
aws ssm put-parameter \
  --name "/anycompanyread/launchdarkly/sdk-key" \
  --value "sdk-YOUR-SDK-KEY" \
  --type SecureString \
  --overwrite
```

### 2c. Verify in LaunchDarkly

Check **https://app.launchdarkly.com**:
- Projects → anycompanyread
- AI configs → book-recommendations

---

## Step 3: Add Recommendations to the Bookstore

Ask Kiro to add the AI recommendations feature:

```
Add an AI-powered book recommendations feature to the AnyCompanyRead app:

1. Install launchdarkly-server-sdk and launchdarkly-server-sdk-ai
2. Create a recommendations API endpoint that:
   - Gets the SDK key from AWS SSM at /anycompanyread/launchdarkly/sdk-key
   - Uses the LaunchDarkly AI SDK to get the "book-recommendations" config
   - Sends the user's reading history to the AI model
   - Returns 3 book recommendations
3. Add a "Recommended for You" section to the homepage that calls this endpoint
```

Kiro will create the backend endpoint and frontend component.

---

## Step 4: Test It

### 4a. Run the App

```bash
npm run dev
```

### 4b. Check the Recommendations

Visit the homepage - you should see personalized book recommendations.

Check the logs for:
```
[LaunchDarkly] Using model: us.anthropic.claude-3-5-sonnet-20241022-v2:0
```

---

## Step 5: Switch Models

### 5a. Change to Opus

Ask Kiro:

```
Change the book-recommendations AI Config to serve "opus" instead of "sonnet"
```

### 5b. Refresh the App

The recommendations should now be more detailed (Opus provides richer explanations).

### 5c. Switch Back

```
Change book-recommendations targeting back to "sonnet"
```

**You switched AI models without changing any code!**

---

## How It Works

```
┌──────────────────┐
│  User visits     │
│  bookstore       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Recommendations │
│  API endpoint    │
└────────┬─────────┘
         │ "What model should I use?"
         ▼
┌──────────────────┐
│  LaunchDarkly    │
│  AI Config       │
│  book-recs:      │
│  - sonnet (fast) │
│  - opus (rich)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AWS Bedrock     │
│  (generates recs)│
└──────────────────┘
```

---

## What You Learned

- AI Configs let you change models without redeploying
- Different models have different strengths (speed vs quality)
- You can A/B test models to find the best user experience

---

## Next Steps

Continue to [Operations Phase LaunchDarkly](./operations-launchdarkly.md) to add feature flags.

---

## Troubleshooting

### MCP not connecting

Check your token is set:
```bash
echo $LAUNCHDARKLY_API_TOKEN
```

### "SDK key not found"

Verify the SSM parameter:
```bash
aws ssm get-parameter --name "/anycompanyread/launchdarkly/sdk-key" --with-decryption
```

### Recommendations not showing

- Check browser console for errors
- Verify the API endpoint is running
- Check LaunchDarkly AI Config is enabled
