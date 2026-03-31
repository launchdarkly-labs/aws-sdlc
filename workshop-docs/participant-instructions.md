# LaunchDarkly Integration - Participant Instructions

This document tells workshop participants what to do and when. Insert these instructions into the existing AWS AI-DLC workshop at the specified points.

---

## Why LaunchDarkly?

LaunchDarkly enables **runtime configuration** of your AI applications—change models, prompts, and features **without redeploying**. This means:

- **Faster iteration**: Test different AI behaviors instantly
- **Reduced risk**: Roll back changes in seconds, not hours
- **A/B testing**: Compare model performance with real users
- **Gradual rollouts**: Ship confidently with percentage-based releases

In this workshop, you'll use **AI Configs** to control AI model behavior and **Feature Flags** for progressive delivery—core capabilities that accelerate development cycles.

📚 **Learn more**: [LaunchDarkly AI Configs Documentation](https://docs.launchdarkly.com/home/ai-configs)

---

## INSERT INTO: Workshop Setup / Prerequisites

### LaunchDarkly Account Setup

1. **Create a LaunchDarkly account**
   - Go to https://launchdarkly.com and sign up for a free trial
   - Verify your email

2. **Get your API Token** ([Documentation](https://docs.launchdarkly.com/home/account/api))
   - Account Settings → Authorization → Create token
   - Format: `api-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Save this - you'll need it during Inception

---

## INSERT INTO: Inception Phase > After "User Stories Creation"

### Add AI Recommendations as a Planned Feature

Before workflow planning, we'll add LaunchDarkly-powered AI recommendations as a feature requirement. AI Configs let you **change models and prompts at runtime**—no redeployment needed.

📚 **AI Configs Quickstart**: [docs.launchdarkly.com/home/ai-configs/quickstart](https://docs.launchdarkly.com/home/ai-configs/quickstart) | **Best Practices**: [docs.launchdarkly.com/guides/ai-configs/best-practices](https://docs.launchdarkly.com/guides/ai-configs/best-practices)

#### Step 1: (Optional) Set up LaunchDarkly MCP for Kiro

If you want to use natural language to manage LaunchDarkly (instead of providing skills as context):

1. See: https://github.com/launchdarkly/mcp-server
2. Add to your MCP config:
```json
{
  "mcpServers": {
    "launchdarkly": {
      "command": "npx",
      "args": ["-y", "@launchdarkly/mcp-server"],
      "env": {
        "LAUNCHDARKLY_API_KEY": "api-your-token-here"
      }
    }
  }
}
```
3. Restart Kiro to load the MCP server

#### Step 2: Create LaunchDarkly Project

- **Via Dashboard:** [Projects](https://app.launchdarkly.com/settings/projects) → Create project → Name: `anycompanyread` → Get SDK Key from Project Settings → Environments → Production
- **Via Kiro + LD Skills:** `/context add https://github.com/launchdarkly-labs/agent-skills/tree/main/skills/ai-configs/aiconfig-projects`, then: `"Create project anycompanyread and give me the SDK key"`
- **Via Kiro + LD MCP:** `"Create a LaunchDarkly project called anycompanyread"`

#### Step 3: Create the AI Config ([Documentation](https://docs.launchdarkly.com/home/ai-configs))

- **Via Dashboard:** [AI Configs](https://app.launchdarkly.com/projects/anycompanyread/ai-configs) → Create → Key: `book-recommendations`, Mode: Completion → Add variations `safe-sonnet` (temp 0.2) and `adventurous-opus` (temp 0.95) → Set default to `safe-sonnet`
- **Via Kiro + LD Skills:** `/context add https://github.com/launchdarkly-labs/agent-skills/tree/main/skills/ai-configs/aiconfig-create`, then: `"Create AI Config book-recommendations with variations safe-sonnet (temp 0.2) and adventurous-opus (temp 0.95), default to safe-sonnet"`
- **Via Kiro + LD MCP:** `"Create AI Config book-recommendations with two variations: safe-sonnet (temp 0.2) and adventurous-opus (temp 0.95). Set default to safe-sonnet."`

#### Step 4: Save Your Credentials

| Credential | Format | Use |
|------------|--------|-----|
| **API Token** | `api-xxxxxxxx-...` | Kiro context/MCP, API calls |
| **SDK Key** | `sdk-xxxxxxxx-...` | Lambda runtime (add to environment) |

---

## INSERT INTO: Construction Phase > Before "Code Generation"

### Include AI Recommendations in Code Generation

Add the recommendations spec as context so it gets generated with the application:

1. Add the spec as context: `/context add workshop-docs/ai-recommendations-spec.md`
2. Tell the coding assistant: `"Include the AI recommendations feature from the spec in the generated application"`

The coding assistant will generate:
- `handlers/recommendations-handler.ts` - Lambda with LaunchDarkly + Bedrock integration
- CDK infrastructure updates with `LAUNCHDARKLY_SDK_KEY` environment variable

---

## INSERT INTO: Operations Phase (after deployment)

### Part 1: Runtime AI Configuration

This is where LaunchDarkly shines—**change AI behavior instantly without redeploying**. Test different models, adjust prompts, tune parameters—all in real-time.

📚 **AI Config Targeting**: [docs.launchdarkly.com/home/ai-configs/target](https://docs.launchdarkly.com/home/ai-configs/target)

**Test safe-sonnet:**
```bash
curl https://your-api-gateway/recommendations
```
You should see mainstream, bestseller-style recommendations.

**Switch to adventurous-opus (NO REDEPLOY!):**

- **Via Dashboard:** [AI Configs → book-recommendations](https://app.launchdarkly.com/projects/anycompanyread/ai-configs/book-recommendations) → Targeting → Change default to `adventurous-opus`
- **Via Kiro + LD Skills:** `/context add https://github.com/launchdarkly-labs/agent-skills/tree/main/skills/ai-configs/aiconfig-targeting`, then: `"Switch book-recommendations default to adventurous-opus"`
- **Via Kiro + LD MCP:** `"Switch book-recommendations default to adventurous-opus"`

**Test again** - you should now see hidden gems and unexpected recommendations!

---

### Part 2: Feature Flags for Faster Development

Feature flags decouple **deployment from release**—deploy code anytime, release features when ready. This enables true continuous delivery and drastically reduces release risk.

📚 **Feature Flags Overview**: [docs.launchdarkly.com/home/flags](https://docs.launchdarkly.com/home/flags)

#### Step 1: Create a Feature Flag ([Documentation](https://docs.launchdarkly.com/home/flags/create))

- **Via Dashboard:** [Feature Flags](https://app.launchdarkly.com/projects/anycompanyread/flags) → Create → Key: `new-book-card-design` → Check "SDKs using Client-side ID" → Create
- **Via Kiro + LD Skills:** `/context add https://github.com/launchdarkly-labs/agent-skills/tree/main/skills/feature-flags/launchdarkly-flag-create`, then: `"Create boolean flag new-book-card-design for A/B testing book card UI"`
- **Via Kiro + LD MCP:** `"Create a boolean feature flag called new-book-card-design for A/B testing the book card UI"`

#### Step 2: Add to Frontend ([React SDK Docs](https://docs.launchdarkly.com/sdk/client-side/react/react-web))

Ask the coding assistant:
```
"Add LaunchDarkly feature flags to the frontend using the new-book-card-design flag to A/B test a new book card component"
```

#### Step 3: Test the Flag

**Turn on with 50/50 rollout:**
- **Via Dashboard:** [Feature Flags → new-book-card-design](https://app.launchdarkly.com/projects/anycompanyread/flags/new-book-card-design) → Turn ON → Set rollout to 50%
- **Via Kiro + LD Skills:** `/context add https://github.com/launchdarkly-labs/agent-skills/tree/main/skills/feature-flags/launchdarkly-flag-targeting`, then: `"Turn on new-book-card-design with 50/50 rollout"`
- **Via Kiro + LD MCP:** `"Turn on new-book-card-design with 50/50 rollout"`

Refresh the app - you'll randomly see old or new design. Toggle to 100% ON or OFF instantly.

#### Why This Matters

LaunchDarkly feature flags transform how you ship software:
- **A/B test UI changes** without deploying—validate ideas with real users
- **Gradual rollouts** (10% → 50% → 100%)—reduce blast radius
- **Instant rollback** if something breaks—seconds, not hours
- **Target specific users**—beta testers, premium users, internal teams
- **Kill switch** for any feature—sleep better at night

📚 **Best Practices**: [docs.launchdarkly.com/guides/flags/best-practices](https://docs.launchdarkly.com/guides/flags/best-practices)

