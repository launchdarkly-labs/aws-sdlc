# LaunchDarkly Integration for the AWS AI-DLC Workshop

Add feature management and runtime AI configuration to the [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle) using **LaunchDarkly AI Configs**, **Feature Flags**, the [LaunchDarkly MCP server](https://github.com/launchdarkly/mcp-server), and the [LaunchDarkly agent skill catalog](https://skills.sh/launchdarkly/agent-skills).

This overlay targets the **Kiro-driven** version of the AWS AI-DLC workshop (Bedrock AgentCore agent, generated `packages/*` monorepo).

---

## Workshop Flow

Follow these in order while you work through the AWS workshop:

| When | Do this | Result |
|---|---|---|
| **Workshop Setup** | Read [`workshop-docs/participant-instructions.md`](workshop-docs/participant-instructions.md) → "Prerequisites" | LD account, API token, Kiro MCP wired up |
| **Inception → after User Stories** | Same doc → "Inception Phase" section | LD project `anycompanyread` + AI Config `book-recommendations` created |
| **Construction → before Code Generation** | `/context add workshop-docs/ai-recommendations-spec.md` | Kiro includes the recommendations feature in code generation |
| **Construction → before Deploy** | `aws ssm put-parameter ...` | SDK key stored, Lambda picks it up automatically |
| **Operations Phase Part 1** | Switch the AI Config default in LaunchDarkly | Live model swap — no redeploy |
| **Operations Phase Part 2** | Create the `new-book-card-design` flag | Frontend A/B test with instant rollback |

```
Setup
  └── Create LD account, install Kiro MCP + steering file

Inception Phase
  └── Create AI Config `book-recommendations` (safe-sonnet vs adventurous-opus)

Construction Phase
  ├── Kiro generates recommendations Lambda + React section + CDK
  └── Store SDK key in AWS SSM

Operations Phase
  ├── Part 1: Switch AI Config default (Sonnet → Opus, no redeploy)
  └── Part 2: Feature flag `new-book-card-design` (50/50 rollout)
```

---

## How Kiro Learns LaunchDarkly

Kiro doesn't use `npx skills add` (that's Claude Code). Instead the workshop uses three layered mechanisms:

| Layer | What it gives you | How to install |
|---|---|---|
| **Steering file** ([.kiro/steering/launchdarkly-ai-configs.md](.kiro/steering/launchdarkly-ai-configs.md)) | Persistent rules for every Kiro chat in this workshop — variations, SDK versions, code patterns, naming conventions | `cp` into your workshop's `.kiro/steering/` |
| **MCP server** ([@launchdarkly/mcp-server](https://github.com/launchdarkly/mcp-server)) | Live LD API calls from natural language ("Create flag X with 50/50 rollout") | Add to `.kiro/settings/mcp.json` |
| **On-demand skills** ([skills.sh/launchdarkly/agent-skills](https://skills.sh/launchdarkly/agent-skills)) | Detailed playbooks for specific tasks loaded only when needed | `/context add https://skills.sh/launchdarkly/agent-skills/<name>` |

Most participants will need only the **steering file + MCP**. Pull individual skills (`/aiconfig-migrate`, `/launchdarkly-flag-cleanup`, etc.) on demand when a specific workflow comes up.

---

## Quick Reference

### Your Keys

| Key | Starts With | Where to Get It | What It's For |
|-----|-------------|-----------------|---------------|
| API Token | `api-` | Account Settings → Authorization | Kiro MCP server / LD CLI / curl |
| Production SDK Key | `sdk-` | Project Settings → Environments → Production | Generated app's Lambda (read from SSM) |

### Set API Token (for the Kiro MCP server)

```bash
export LAUNCHDARKLY_API_TOKEN="api-YOUR-TOKEN"
```

### Store SDK Key in AWS

```bash
aws ssm put-parameter \
  --name "/anycompanyread/launchdarkly/sdk-key" \
  --value "sdk-YOUR-KEY" \
  --type SecureString
```

---

## What You'll Build

### Construction → Operations Part 1: AI Configs

The generated `recommendations-handler.ts` Lambda reads `book-recommendations` from LaunchDarkly at request time. Two variations give visibly different output:

```
You (in Kiro): "Switch book-recommendations default to adventurous-opus"
       │
       │  Kiro routes the request through @launchdarkly/mcp-server
       ▼
LaunchDarkly updates targeting (production fallthrough → adventurous-opus)
       │
       ▼
Next request hits the Lambda → tracker.trackBedrockConverseMetrics(...)
       │
       ▼
Bedrock Converse: runs Claude Opus 4 instead of Sonnet 3.5
       │
       ▼
Frontend re-renders with 5 hidden-gem recommendations (no redeploy)
```

### Operations Part 2: Feature Flags

Control a frontend UI experiment with a boolean flag:

| Flag | Type | Controls |
|---|---|---|
| `new-book-card-design` | boolean | Old vs. new book card component on the catalog page |
| `show-recommendation-reasons` | boolean | Whether the "Why we recommend it" copy shows under each card |
| `checkout-flow-version` | string (multivariate) | `v1` legacy / `v2` two-step / `v3` single-page |

---

## Files in This Repo

```
.kiro/
└── steering/
    └── launchdarkly-ai-configs.md   # Drop into participant's .kiro/steering/

workshop-docs/
├── participant-instructions.md      # The actual "do these steps" doc
├── ai-recommendations-spec.md       # Feature spec — /context add this before Code Generation
└── aws-integration-notes.md         # Notes for AWS workshop maintainers

integration-code/                    # Reference implementation
├── INTEGRATION.md                   # How to copy this into the generated app
├── packages/
│   ├── backend/src/handlers/recommendations-handler.ts
│   ├── cdk/lib/constructs/recommendations-construct.ts
│   ├── frontend/src/components/RecommendationsSection.tsx
│   └── shared/src/types/recommendations.ts
└── test/                            # Standalone Node test harness

examples/
├── aiconfig-agent.py                # Python equivalent (Strands / AgentCore)
└── frontend-flags.tsx               # Full React flag patterns (sync + async LDProvider)

iCode-main/                          # Reference snapshot of the workshop project
```

---

## SDK Versions

| Package | Version |
|---|---|
| `@launchdarkly/node-server-sdk` | ^9.10.14 |
| `@launchdarkly/server-sdk-ai` | ^0.20.0 |
| `launchdarkly-react-client-sdk` | ^3.9.1 |
| `launchdarkly-server-sdk` (Python) | ^9.15.1 |
| `launchdarkly-server-sdk-ai` (Python) | ^0.19.0 |

---

## Links

- [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle)
- [LaunchDarkly Agent Skills (Kiro-compatible via /context add)](https://skills.sh/launchdarkly/agent-skills)
- [LaunchDarkly MCP Server](https://github.com/launchdarkly/mcp-server)
- [LaunchDarkly AI Configs Docs](https://docs.launchdarkly.com/home/ai-configs)
- [LaunchDarkly Free Trial](https://launchdarkly.com/start-trial/)
- [Kiro CLI Docs](https://kiro.dev/docs/cli/)
