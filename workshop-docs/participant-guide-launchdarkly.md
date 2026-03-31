# LaunchDarkly AI Configs Workshop Guide

This guide walks you through setting up LaunchDarkly to control your AI-powered book recommendations in real-time.

## What You'll Learn

- Create a LaunchDarkly account and project
- Set up AI Configs to manage AI model and prompt variations
- Switch between recommendation strategies without redeploying code
- See how different models and prompts affect recommendations

---

## Part 1: Create Your LaunchDarkly Account

### Step 1.1: Sign Up

1. Go to [launchdarkly.com](https://launchdarkly.com)
2. Click **Start Trial** (no credit card required)
3. Complete the signup process
4. You'll land in your default project

### Step 1.2: Get Your Keys

You'll need two keys from LaunchDarkly:

| Key | Where to Find | Used For |
|-----|---------------|----------|
| **SDK Key** | Project Settings → Environments → Test → SDK Key | Your application code |
| **API Access Token** | Account Settings → Authorization → Create Token | Creating configs via API/Kiro |

**Create an API Access Token:**
1. Click your profile (bottom left) → **Account settings**
2. Go to **Authorization** tab
3. Click **Create token**
4. Name: `workshop-token`
5. Role: **Writer** (or custom with `ai-configs:write`)
6. Copy and save the token securely

---

## Part 2: Add LaunchDarkly Skills to Kiro

### Step 2.1: Configure MCP Server

Add the LaunchDarkly MCP server to Kiro for AI-assisted setup.

Run in your terminal:
```bash
kiro-cli mcp add --name launchdarkly --args "-y" --args "@launchdarkly/mcp-server"
```

### Step 2.2: Set Your API Token

Set your API token as an environment variable:
```bash
export LAUNCHDARKLY_ACCESS_TOKEN="api-your-token-here"
```

Or add it to your shell profile (`~/.zshrc` or `~/.bashrc`).

---

## Part 3: Create the AI Config

### About Our Recommendation Variations

We'll create two distinct recommendation strategies:

| Variation | Model | Strategy |
|-----------|-------|----------|
| **safe-sonnet** | Claude 3.5 Sonnet | Mainstream, popular, safe recommendations |
| **adventurous-opus** | Claude 3 Opus | Unusual, unexpected, hidden gem recommendations |

This lets you compare:
- **Different prompts**: Safe vs adventurous instructions
- **Different models**: Sonnet (fast, capable) vs Opus (deeper reasoning)

### Step 3.1: Create the Config via Kiro (Recommended)

1. Add the LaunchDarkly skill docs as context in Kiro (from `skills/aiconfig-create/`)
2. Ask Kiro:
   > "Create an AI Config called `book-recommendations` in completion mode with two variations: safe-sonnet using Claude 3.5 Sonnet with conservative prompts, and adventurous-opus using Claude 3 Opus with prompts for hidden gems"

Kiro will use the MCP server and skill context to set up everything for you.

### Alternative: Use the API Directly

If you prefer to use the API directly:
```bash
curl -X POST "https://app.launchdarkly.com/api/v2/projects/default/ai-configs" \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{
    "key": "book-recommendations",
    "name": "Book Recommendations",
    "description": "AI-powered book recommendations with switchable strategies",
    "mode": "completion"
  }'
```

### Step 3.2: Create the Safe-Sonnet Variation

This variation recommends popular, well-reviewed books:

```bash
curl -X POST "https://app.launchdarkly.com/api/v2/projects/default/ai-configs/book-recommendations/variations" \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{
    "key": "safe-sonnet",
    "name": "Safe Recommendations (Sonnet)",
    "modelConfigKey": "Bedrock.us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "model": {
      "name": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      "parameters": {
        "maxTokens": 1024,
        "temperature": 0.3
      }
    },
    "messages": [
      {
        "role": "system",
        "content": "You are a book recommendation assistant for a mainstream bookstore.\n\nYour recommendations should be:\n- SAFE and POPULAR: Recommend well-known, highly-rated books\n- PROVEN: Focus on bestsellers, award winners, and critically acclaimed titles\n- ACCESSIBLE: Choose books with broad appeal that most readers enjoy\n- CONSERVATIVE: When in doubt, recommend the more popular option\n\nAvoid obscure titles, experimental fiction, or niche genres unless the user specifically requests them."
      }
    ]
  }'
```

### Step 3.3: Create the Adventurous-Opus Variation

This variation recommends unexpected, hidden gem books:

```bash
curl -X POST "https://app.launchdarkly.com/api/v2/projects/default/ai-configs/book-recommendations/variations" \
  -H "Authorization: $LAUNCHDARKLY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "LD-API-Version: beta" \
  -d '{
    "key": "adventurous-opus",
    "name": "Adventurous Recommendations (Opus)",
    "modelConfigKey": "Bedrock.anthropic.claude-3-opus-20240229-v1:0",
    "model": {
      "name": "anthropic.claude-3-opus-20240229-v1:0",
      "parameters": {
        "maxTokens": 1024,
        "temperature": 0.8
      }
    },
    "messages": [
      {
        "role": "system",
        "content": "You are a book recommendation assistant for adventurous readers who want to discover hidden gems.\n\nYour recommendations should be:\n- UNEXPECTED: Surprise the reader with books they would never find on their own\n- HIDDEN GEMS: Prioritize underrated, overlooked, or cult-classic titles\n- CROSS-GENRE: Make unexpected connections across genres and time periods\n- BOLD: Take creative risks - recommend the book that changed YOUR mind\n\nAvoid obvious bestsellers unless they have an unexpected angle. The reader wants to be surprised and delighted, not given the same recommendations they see everywhere."
      }
    ]
  }'
```

> **Note:** The modelConfigKey format for Bedrock models is `Bedrock.{model-id}`. Some models use the `us.` prefix in the model name, others don't. If you get a "model config not found" error, try removing the `us.` prefix.

---

## Part 4: Configure Targeting

### Option A: Use Kiro

With the LaunchDarkly skill docs as context, ask Kiro:
> "Enable the book-recommendations AI Config and set the default variation to safe-sonnet"

### Option B: Use the LaunchDarkly Dashboard

1. Go to [LaunchDarkly Dashboard](https://app.launchdarkly.com)
2. Navigate to **AI Configs** → **book-recommendations**
3. Select the **test** environment
4. Toggle the config **ON**
5. Under **Default rule**, select **safe-sonnet**
6. Click **Review and save**

Now your application will serve safe recommendations by default.

---

## Part 5: Test the Integration

### Step 5.1: Set Your SDK Key

```bash
export LAUNCHDARKLY_SDK_KEY="sdk-your-key-here"
```

### Step 5.2: Run the Test

```bash
cd integration-code/test
npm install
npm test
```

You should see:
```
🚀 LaunchDarkly + Bedrock Integration Test

✅ LaunchDarkly connected!
✅ AI Config found!
   Model: us.anthropic.claude-3-5-sonnet-20241022-v2:0

📚 Generating Book Recommendations

📖 Recommendation 1:
   Title: Brave New World
   Author: Aldous Huxley
   Reason: A classic dystopian novel that pairs well with 1984...
```

---

## Part 6: Switch Recommendation Strategies

Now for the fun part - see how different strategies affect recommendations!

### Step 6.1: Change to Adventurous Mode

**Option A: Use Kiro**

With the LaunchDarkly skill docs as context, ask Kiro:
> "Change the book-recommendations AI Config to use the adventurous-opus variation"

**Option B: Use the LaunchDarkly Dashboard**

1. Go to **AI Configs** → **book-recommendations**
2. Under **Default rule**, change to **adventurous-opus**
3. Click **Review and save**

### Step 6.2: Run the Test Again

```bash
npm test
```

Notice the differences:
- **Model changed**: Now using Claude Opus
- **Recommendations changed**: More unusual, unexpected titles
- **Reasoning changed**: More creative connections between books

### What to Look For

| Aspect | Safe-Sonnet | Adventurous-Opus |
|--------|-------------|------------------|
| **Titles** | Bestsellers, award winners | Hidden gems, cult classics |
| **Reasoning** | "Popular choice", "highly rated" | "Unexpected connection", "overlooked masterpiece" |
| **Temperature** | 0.3 (more focused) | 0.8 (more creative) |
| **Model** | Claude 3.5 Sonnet | Claude 3 Opus |

---

## Part 7: Advanced - Percentage Rollout

Want to test both strategies on real users? Use a percentage rollout:

1. Go to **AI Configs** → **book-recommendations**
2. Under **Default rule**, click **Add rollout**
3. Set:
   - 50% → **safe-sonnet**
   - 50% → **adventurous-opus**
4. Click **Review and save**

Now half your users get safe recommendations, half get adventurous ones. Track which performs better!

---

## Troubleshooting

### "AI Config not found"
- Check that the config key is exactly `book-recommendations`
- Verify the config is enabled in your environment
- Confirm your SDK key matches the project/environment

### "Model shows as NO MODEL"
- The `modelConfigKey` must match exactly
- Re-create the variation with the correct modelConfigKey

### "Bedrock access denied"
- Ensure your AWS credentials have Bedrock access
- Verify the model is enabled in your AWS account
- Check you're using the correct AWS region

---

## Next Steps

- Try creating your own variations with different prompts
- Add targeting rules based on user attributes
- Set up an experiment to measure which strategy users prefer

## Resources

- [LaunchDarkly AI Configs Docs](https://docs.launchdarkly.com/home/ai-configs)
- [AWS Bedrock Claude Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
