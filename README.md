# LaunchDarkly Integration for AWS AI-DLC Workshop

Add feature management to the [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle).

---

## Workshop Flow

Complete these tutorials in order:

| When | Tutorial | What You'll Do |
|------|----------|----------------|
| **Before starting** | [LaunchDarkly Setup](workshop-docs/launchdarkly-setup.md) | Create account, get keys, install MCP |
| **After Build and Test** | [Construction Phase](workshop-docs/construction-launchdarkly.md) | Add AI Configs to switch models |
| **After Operations Overview** | [Operations Phase](workshop-docs/operations-launchdarkly.md) | Add feature flags to control issues |

---

## Quick Reference

### Your Keys

You'll need two keys from LaunchDarkly:

| Key | Starts With | Where to Get It | What It's For |
|-----|-------------|-----------------|---------------|
| API Token | `api-` | Account Settings → Authorization | Your AI assistant (MCP) |
| SDK Key | `sdk-` | Project Settings → Environments → Test | Your application code |

### MCP Server Config

Add to your AI tool's MCP config:

```json
{
  "mcpServers": {
    "launchdarkly": {
      "command": "npx",
      "args": ["-y", "@launchdarkly/mcp-server", "--access-token", "api-YOUR-TOKEN"]
    }
  }
}
```

### Store SDK Key in AWS

```bash
aws ssm put-parameter \
  --name "/icode/launchdarkly/sdk-key" \
  --value "sdk-YOUR-KEY" \
  --type SecureString
```

---

## What You'll Build

### Construction Phase: AI Configs

Switch AI models without redeploying:

```
You (in LaunchDarkly dashboard)
    │
    │  Click: Change default from "sonnet" to "opus"
    ▼
Your Agent (automatically uses new model)
    │
    │  No code change needed!
    ▼
AWS Bedrock (runs Claude Opus instead of Sonnet)
```

### Operations Phase: Feature Flags

Control the three workshop issues:

| Flag | Controls |
|------|----------|
| `catalog-service-enabled` | Catalog service replicas (0 or 1) |
| `enable-security-group-fix` | Security group rule (missing or present) |
| `use-correct-health-check` | ALB health path (`/health` or `/actuator/health`) |

Toggle flags in the dashboard → Issues fix/unfix instantly.

---

## Files in This Repo

```
workshop-docs/
├── launchdarkly-setup.md         # Step 1: Account, keys, MCP setup
├── construction-launchdarkly.md  # Step 2: AI Configs for model switching
└── operations-launchdarkly.md    # Step 3: Feature flags for issue control

examples/
├── aiconfig-agent.py             # Python example with Bedrock
└── frontend-flags.tsx            # React example with feature flags
```

---

## Links

- [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle)
- [LaunchDarkly Free Trial](https://launchdarkly.com/start-trial/)
- [LaunchDarkly Docs](https://docs.launchdarkly.com)
- [LaunchDarkly MCP Server](https://github.com/launchdarkly/mcp-server)
