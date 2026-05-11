# LaunchDarkly Integration — Participant Instructions

These instructions slot into the [AWS AI-DLC workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle). Insert each block at the workshop step indicated by the **`INSERT INTO`** heading.

The new workshop drives the build through **Kiro CLI** and produces a monorepo with `packages/backend/` (Node 20 Lambdas), `packages/frontend/` (React + Cloudscape), `packages/shared/`, and `packages/cdk/`. All references below match that layout.

---

## Why LaunchDarkly?

LaunchDarkly lets you change models, prompts, and features at runtime — no redeploy:

- **Faster iteration** — test different AI behaviors instantly
- **Reduced risk** — roll back in seconds, not hours
- **A/B testing** — compare model performance with real users
- **Gradual rollouts** — ship confidently with percentage-based releases

In this workshop you use **AI Configs** to control the recommendations model and **Feature Flags** for progressive UI delivery.

[AI Configs docs](https://docs.launchdarkly.com/home/ai-configs) · [Agent skills](https://skills.sh/launchdarkly/agent-skills)

---

## INSERT INTO: Workshop Setup → Prerequisites

### LaunchDarkly Account Setup

1. **Create a LaunchDarkly account** at https://launchdarkly.com/start-trial (verify your email)
2. **Get your API Token** ([docs](https://docs.launchdarkly.com/home/account/api))
   - Account Settings → Authorization → Create token
   - Format: `api-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Save it — you'll use it from Kiro CLI during Inception

### (Recommended) Drop the LaunchDarkly Steering File into Kiro

Kiro auto-loads any markdown in `.kiro/steering/`. Copy this repo's steering file into your workshop project once:

```bash
mkdir -p .kiro/steering
cp /path/to/aws-aisdlc/.kiro/steering/launchdarkly-ai-configs.md .kiro/steering/
```

Now every Kiro CLI session knows the LaunchDarkly workflows for this workshop — how to create the `book-recommendations` AI Config, where to store the SDK key, which flag keys go with which Operations issue, and which agent-skill URL to pull in for each step.

> Kiro does not support `npx skills add`. The pattern in this workshop is: **steering file for persistent rules + `/context add <skill-url>` for one-off skill content + MCP server for live API operations.**

### (Recommended) Add the LaunchDarkly MCP Server

This is the easiest path for "do it with natural language" — `"create a flag called X with a 50/50 rollout"` just works.

1. Add a config block at `.kiro/settings/mcp.json` (workspace) or `~/.kiro/settings/mcp.json` (global):

   ```json
   {
     "mcpServers": {
       "launchdarkly": {
         "command": "npx",
         "args": ["-y", "@launchdarkly/mcp-server"],
         "env": { "LAUNCHDARKLY_API_KEY": "api-your-token-here" },
         "disabled": false
       }
     }
   }
   ```

   Or via CLI: `kiro-cli mcp add --name launchdarkly --command npx --args "-y,@launchdarkly/mcp-server" --env "LAUNCHDARKLY_API_KEY=api-..."`

2. Restart Kiro CLI. Verify with `/mcp` — `launchdarkly` should appear as loaded.

See https://github.com/launchdarkly/mcp-server for details.

### Pulling Specific Agent Skills On Demand

When a workshop step calls for a particular skill (e.g. `/aiconfig-create`), pull its markdown into the current Kiro chat:

```text
/context add https://skills.sh/launchdarkly/agent-skills/aiconfig-create
```

This loads that skill's playbook for the rest of the chat without permanently installing anything. [Full skill catalog](https://skills.sh/launchdarkly/agent-skills).

---

## INSERT INTO: Inception Phase → After "User Stories Creation"

### Add AI Recommendations as a Planned Feature

Before workflow planning, add LaunchDarkly-powered AI recommendations to the feature set. AI Configs let you change models and prompts at runtime — no redeployment.

[AI Configs quickstart](https://docs.launchdarkly.com/home/ai-configs/quickstart) · [Best practices](https://docs.launchdarkly.com/guides/ai-configs/best-practices)

#### Step 1 — Create the LaunchDarkly project

Pick one path:

- **Dashboard:** [Projects](https://app.launchdarkly.com/settings/projects) → Create → Name: `anycompanyread` → grab the SDK key from Project Settings → Environments → Production.
- **Kiro + MCP:** "Create a LaunchDarkly project called `anycompanyread` and return the production SDK key."
- **Kiro + skill on demand:** `/context add https://skills.sh/launchdarkly/agent-skills/aiconfig-projects` → "Create project `anycompanyread` and give me the production SDK key."

#### Step 2 — Create the AI Config ([docs](https://docs.launchdarkly.com/home/ai-configs))

| Field | Value |
|---|---|
| Key | `book-recommendations` |
| Mode | Completion |
| Variation 1 | `safe-sonnet` — `us.anthropic.claude-3-5-sonnet-20241022-v2:0`, temp 0.2, custom `maxRecommendations` = 3 |
| Variation 2 | `adventurous-opus` — `us.anthropic.claude-opus-4-20250514-v1:0`, temp 0.95, custom `maxRecommendations` = 5 |
| Default | `safe-sonnet` |

- **Dashboard:** [AI Configs](https://app.launchdarkly.com/projects/anycompanyread/ai-configs) → Create → fill in the table above.
- **Kiro + MCP:** "Create AI Config `book-recommendations` (completion mode) with variations `safe-sonnet` (sonnet 3.5, temp 0.2, maxRecommendations 3) and `adventurous-opus` (opus 4, temp 0.95, maxRecommendations 5). Default to `safe-sonnet`."
- **Kiro + skill on demand:** `/context add https://skills.sh/launchdarkly/agent-skills/aiconfig-create` → same prompt as above.

> **Already have AI Configs in another LD project?** `/context add https://skills.sh/launchdarkly/agent-skills/aiconfig-migrate` → "Copy AI Configs from `<source-project>` to `anycompanyread`."

#### Step 3 — Save your credentials

| Credential | Format | Where it goes |
|---|---|---|
| API Token | `api-...` | Kiro context / MCP server env |
| Production SDK Key | `sdk-...` | AWS SSM (set below in Construction) |

---

## INSERT INTO: Construction Phase → Before "Code Generation"

### Include AI Recommendations in Code Generation

Add the spec as context so Kiro generates the feature as part of the AnyCompanyRead app:

```text
/context add workshop-docs/ai-recommendations-spec.md
```

Then prompt Kiro:

```text
Include the AI recommendations feature from the spec in the generated application,
following the integration-code layout (packages/backend, packages/frontend,
packages/shared, packages/cdk).
```

Kiro will produce, alongside the rest of the app:

- `packages/backend/src/handlers/recommendations-handler.ts` — Lambda with LaunchDarkly + Bedrock Converse
- `packages/frontend/src/components/RecommendationsSection.tsx` — Cloudscape card section
- `packages/shared/src/types/recommendations.ts` — shared types
- `packages/cdk/lib/constructs/recommendations-construct.ts` — Lambda + API + IAM + SSM read

---

## INSERT INTO: Construction Phase → After "Build and Test", Before "Deploy"

### Store the SDK Key in AWS SSM

Before deploy, store the LaunchDarkly SDK key so the Lambda can read it at runtime:

```bash
aws ssm put-parameter \
  --name "/anycompanyread/launchdarkly/sdk-key" \
  --value "sdk-YOUR-PROD-SDK-KEY" \
  --type SecureString
```

The deploy step in the workshop will then bring up the Lambda with the right IAM policy already attached (from `RecommendationsConstruct`).

---

## INSERT INTO: Operations Phase — Part 1 (Runtime AI Configuration)

This is where LaunchDarkly shines — **change AI behavior instantly without redeploying.**

[AI Config targeting docs](https://docs.launchdarkly.com/home/ai-configs/target)

**Test `safe-sonnet`** (default):

Open the deployed app → "Recommended for You" section. You should see 3 mainstream picks with a "Powered by Claude Sonnet" badge.

**Switch to `adventurous-opus` — no redeploy:**

- **Dashboard:** [AI Configs → book-recommendations](https://app.launchdarkly.com/projects/anycompanyread/ai-configs/book-recommendations) → Targeting → change default to `adventurous-opus`.
- **Kiro + MCP:** "Switch `book-recommendations` default to `adventurous-opus`."
- **Kiro + skill on demand:** `/context add https://skills.sh/launchdarkly/agent-skills/aiconfig-targeting` → same prompt.

**Refresh the app** → 5 hidden-gem recommendations, badge now reads "Powered by Claude Opus".

Open the AI Config dashboard to see the latency, token, and cost metrics that `trackBedrockConverseMetrics` is reporting automatically.

---

## INSERT INTO: Operations Phase — Part 2 (Feature Flags for Faster Development)

Feature flags decouple **deployment from release** — deploy code anytime, release features when ready.

[Feature Flags overview](https://docs.launchdarkly.com/home/flags)

#### Step 1 — Create the flag

- **Dashboard:** [Feature Flags](https://app.launchdarkly.com/projects/anycompanyread/flags) → Create → Key: `new-book-card-design` → check "SDKs using Client-side ID" → Create.
- **Kiro + MCP:** "Create boolean flag `new-book-card-design` (client-side enabled) for A/B testing the book card UI."
- **Kiro + skill on demand:** `/context add https://skills.sh/launchdarkly/agent-skills/launchdarkly-flag-create` → same prompt.

#### Step 2 — Wire it into the frontend

Prompt Kiro CLI:

```text
Add LaunchDarkly to the frontend using launchdarkly-react-client-sdk.
Read VITE_LD_CLIENT_SIDE_ID from the runtime config.json and wrap the app
in <LDProvider>. Use the flag `new-book-card-design` to switch the
book card component between the existing design and a new variant.
```

Reference: [React SDK docs](https://docs.launchdarkly.com/sdk/client-side/react/react-web). See `examples/frontend-flags.tsx` for a minimal pattern.

#### Step 3 — Test the flag

- **Dashboard:** [Feature Flags → new-book-card-design](https://app.launchdarkly.com/projects/anycompanyread/flags/new-book-card-design) → Turn ON → set rollout to 50% / 50%.
- **Kiro + MCP:** "Turn on `new-book-card-design` with 50/50 rollout."
- **Kiro + skill on demand:** `/context add https://skills.sh/launchdarkly/agent-skills/launchdarkly-flag-targeting` → same prompt.

Refresh the app — you'll randomly get the old or new design. Toggle to 100% ON or OFF instantly.

#### Why this matters

- **A/B test UI changes** without deploying — validate ideas with real users
- **Gradual rollouts** (10% → 50% → 100%) — reduce blast radius
- **Instant rollback** if something breaks — seconds, not hours
- **Target specific users** — beta testers, premium users, internal teams
- **Kill switch** for any feature

[Flag best practices](https://docs.launchdarkly.com/guides/flags/best-practices)
