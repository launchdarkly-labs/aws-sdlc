# LaunchDarkly Workflows for the AWS AI-DLC Workshop

This steering file teaches Kiro how to manage LaunchDarkly across the two LaunchDarkly touchpoints in the AWS AI-DLC workshop:

1. **`aidlc-agent`** — controls the workshop's *own* AI-DLC agent model (demonstrate runtime model switching during Construction).
2. **`book-recommendations`** — controls the AI recommendations feature in the *generated* AnyCompanyRead app (demonstrate runtime switching during Operations).

Auto-loaded by Kiro from any `.kiro/steering/` directory. Pair with the `@launchdarkly/mcp-server` MCP server — the MCP performs the API calls, this file defines the policy.

> **Note for participants:** Kiro does not support `npx skills add` (that's Claude Code). Get the same workflows via this steering file + MCP, or pull a one-off skill markdown into chat with `/context add https://skills.sh/launchdarkly/agent-skills/<skill-name>`.

---

## Connect the LaunchDarkly MCP server

Set the access token and create the MCP config:

```bash
export LAUNCHDARKLY_API_TOKEN="api-YOUR-TOKEN-HERE"
mkdir -p .kiro/settings
cat > .kiro/settings/mcp.json <<EOF
{
  "mcpServers": {
    "launchdarkly": {
      "command": "npx",
      "args": ["-y", "@launchdarkly/mcp-server", "--access-token", "$LAUNCHDARKLY_API_TOKEN"]
    }
  }
}
EOF
```

Restart Kiro CLI (`/quit`, then `kiro-cli`) and verify with `/mcp` — `launchdarkly` should appear as loaded.

---

## Project & key conventions

| Item | Value |
|---|---|
| LaunchDarkly project key | `anycompanyread` |
| Production environment | `production` |
| API token env var | `LAUNCHDARKLY_API_TOKEN` |
| AI Config (workshop agent) | `aidlc-agent` (Agent mode) |
| AI Config (recommendations feature) | `book-recommendations` (Completion mode) |
| Feature flag (Operations Part 2) | `new-book-card-design` (boolean, client-side enabled) |
| SDK key for agent (SSM SecureString) | `/icode/launchdarkly/sdk-key` |
| SDK key for generated app (SSM SecureString) | `/anycompanyread/launchdarkly/sdk-key` |

If a participant uses a different project name, substitute consistently.

---

## Workshop Agent: `aidlc-agent` (Agent mode)

Use this AI Config to demonstrate switching the model that drives the workshop's own AI-DLC agent during Construction.

### Setup

```
Create an AI Config called "aidlc-agent" in agent mode with:
- A "sonnet" variation using model us.anthropic.claude-3-5-sonnet-20241022-v2:0
- An "opus" variation using model us.anthropic.claude-opus-4-20250514-v1:0
- Default targeting to serve "sonnet"
```

Then store the SDK key:

```
Get the production SDK key and store it in AWS SSM at /icode/launchdarkly/sdk-key as a SecureString
```

### Switch models live

```
Change the aidlc-agent AI Config targeting to serve "opus"
```

### A/B test models

```
Update aidlc-agent targeting to a 50/50 rollout between "sonnet" and "opus"
```

---

## Generated App Feature: `book-recommendations` (Completion mode)

Used by the generated AnyCompanyRead `recommendations-handler.ts` Lambda. Two variations with deliberately different prompts so the demo shows a visible behavior change.

### Setup

1. Create AI Config `book-recommendations`, mode `completion`.
2. Add these two variations exactly — do not invent names or temperatures, the workshop demo depends on them:

   | Variation key | Model ID | Temp | maxTokens | Custom `maxRecommendations` | System prompt |
   |---|---|---|---|---|---|
   | `safe-sonnet` | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` | 0.2 | 1024 | 3 | "You are a book recommendation assistant for a mainstream bookstore. Recommend BESTSELLERS ONLY. Stay in the SAME GENRE. Make OBVIOUS CONNECTIONS." |
   | `adventurous-opus` | `us.anthropic.claude-opus-4-20250514-v1:0` | 0.95 | 1024 | 5 | "You are a literary explorer. Recommend HIDDEN GEMS - cult classics, international literature. Make TANGENTIAL CONNECTIONS. AVOID bestsellers." |

3. Set production default targeting to `safe-sonnet`.
4. Print the production SDK key once so the participant can store it:

   ```bash
   aws ssm put-parameter \
     --name "/anycompanyread/launchdarkly/sdk-key" \
     --value "sdk-..." \
     --type SecureString
   ```

### Operations Phase Part 1 — live model switch

When the participant asks for "opus" / "the more adventurous model" / similar, patch the production fallthrough to `adventurous-opus`. Tell them to refresh the app — they should see 5 hidden-gem recommendations with a "Powered by Claude Opus" badge. To switch back, target `safe-sonnet` again.

---

## Operations Phase Part 2: frontend feature flag

When the participant says "add a feature flag" / "A/B test the UI" / similar:

1. Create boolean flag `new-book-card-design`:
   - **client-side availability:** enable for "SDKs using Client-side ID"
   - variations: `true` (new design), `false` (legacy). Default off.
2. After Kiro generates the React integration (`launchdarkly-react-client-sdk` ^3.9.1 wired with `config.json#ldClientSideId`), help the participant verify by turning it on with a 50/50 rollout.
3. Support gradual-rollout asks: `10/90`, `25/75`, `50/50`, `100/0`.

Additional example flag keys the workshop may exercise:
- `show-recommendation-reasons` (boolean) — toggles the "Why we recommend it" line under each recommendation
- `checkout-flow-version` (string, multivariate `v1`/`v2`/`v3`) — multivariate experiment

---

## Code patterns to enforce when generating LaunchDarkly code

### Node.js (Lambda / `packages/backend/`)

- `@launchdarkly/node-server-sdk` >= **9.10.14**
- `@launchdarkly/server-sdk-ai` >= **0.20.0**
- Imports: `import { init as initLD } from '@launchdarkly/node-server-sdk'`; `import { initAi } from '@launchdarkly/server-sdk-ai'`
- AI Config method: `aiClient.completionConfig(key, context, fallback)` — NEVER the deprecated `config()`
- Bedrock call: `ConverseCommand` from `@aws-sdk/client-bedrock-runtime` — NEVER `InvokeModelCommand`
- Wrap the Bedrock call in `config.tracker.trackBedrockConverseMetrics(...)` so the AI Config dashboard populates
- `await ldClient.waitForInitialization({ timeout: 5 })` — the timeout argument is required in v9+
- Singleton the LD client at module scope so it survives Lambda warm starts

### Python (Strands / AgentCore)

- `launchdarkly-server-sdk` >= **9.15.1**
- `launchdarkly-server-sdk-ai` >= **0.19.0**
- AI Config method: `ai_client.completion_config(key, context, fallback)` or `ai_client.agent_config(...)`
- Bedrock call: `tracker.track_bedrock_converse_metrics(client.converse(...))`

### React frontend (`packages/frontend/`)

- `launchdarkly-react-client-sdk` >= **3.9.1**
- Read `ldClientSideId` from runtime `config.json` (matches the workshop's existing config pattern). Do NOT bake it into a build-time `VITE_*` unless the participant explicitly asks.
- Wrap the app with `LDProvider`; prefer `asyncWithLDProvider` so flags are available on first render.
- Use `useFlags<AppFlags>()` with a typed flag interface — never read flag keys as raw strings.

---

## Bedrock model IDs

| Model | Bedrock Model ID |
|---|---|
| Claude 3.5 Sonnet | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Claude Sonnet 4 | `us.anthropic.claude-sonnet-4-20250514-v1:0` |
| Claude Opus 4 | `us.anthropic.claude-opus-4-20250514-v1:0` |

These are cross-region inference profile IDs. The Lambda IAM policy must include both `arn:aws:bedrock:*::foundation-model/*` AND `arn:aws:bedrock:<region>:<account>:inference-profile/*`.

---

## What NOT to do

- **Do not** put the SDK key in source files or commit it. SSM SecureString → Lambda env at runtime.
- **Do not** invent variation names or change the model IDs for `book-recommendations` — the demo depends on Sonnet vs Opus showing visibly different output.
- **Do not** call `aiClient.config()` — that's the deprecated API. Always `completionConfig` / `agentConfig`.
- **Do not** drop the `tracker` call. Without it, the AI Config dashboard shows no metrics and the demo falls flat.
- **Do not** suggest `npx skills add` — that's Claude Code only. In Kiro, use this steering file + MCP + `/context add` for one-off skills.

---

## When in doubt

- Workshop spec: `workshop-docs/ai-recommendations-spec.md`
- Reference implementation: `integration-code/`
- LaunchDarkly skill catalog: https://skills.sh/launchdarkly/agent-skills
- AWS-side notes for maintainers: `workshop-docs/aws-integration-notes.md`
