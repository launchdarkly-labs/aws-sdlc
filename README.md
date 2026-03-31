# LaunchDarkly Integration for AWS AI-DLC Workshop

Add feature management to the [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle) using **Agent Skills**.

---

## Workshop Flow

Complete these tutorials in order:

| When | Tutorial | What You'll Do |
|------|----------|----------------|
| **After starting Inception** | [LaunchDarkly Setup](workshop-docs/launchdarkly-setup.md) | Create account, get API token (2 min) |
| **During Code Generation** | [Construction Phase](workshop-docs/construction-launchdarkly.md) | Ask Kiro to add AI recommendations feature |
| **After Build and Test** | [Construction Phase](workshop-docs/construction-launchdarkly.md) | Connect LaunchDarkly, control the AI model |
| **After Operations Overview** | [Operations Phase](workshop-docs/operations-launchdarkly.md) | Add feature flags to control issues |

```
Inception Phase
    │
    └── ★ LaunchDarkly Setup (just get your API token)
    │
Construction Phase (after Build and Test)
    │
    └── ★ Kiro CLI does the work:
    │       /mcp add launchdarkly ...
    │       "Set up LaunchDarkly for this workshop..."
    │       → Creates project, AI Config, stores SDK key
    │
Operations Phase (after Overview)
    │
    └── ★ Feature Flags for issue control
```

---

## Agent Skills

This workshop uses **Agent Skills** - text-based playbooks that teach Kiro how to manage LaunchDarkly.

### Included Kiro Steering

The `.kiro/steering/launchdarkly-ai-configs.md` file teaches Kiro the LaunchDarkly workflows, referencing skills from the [Agent Skills repo](https://github.com/launchdarkly/agent-skills).

### Available Skills

| Skill | What It Does |
|-------|--------------|
| `/aiconfig-projects` | Create a LaunchDarkly project for the workshop |
| `/aiconfig-create` | Create AI Configs with model + instructions |
| `/aiconfig-variations` | Add variations for A/B testing |
| `/aiconfig-targeting` | Change which users get which variation |
| `/aiconfig-tools` | Attach function-calling tools |

---

## Quick Reference

### Your Keys

| Key | Starts With | Where to Get It | What It's For |
|-----|-------------|-----------------|---------------|
| API Token | `api-` | Account Settings → Authorization | Agent Skills / MCP |
| SDK Key | `sdk-` | Project Settings → Environments → Test | Your application code |

### Set API Token

```bash
export LAUNCHDARKLY_ACCESS_TOKEN="api-YOUR-TOKEN"
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

Switch AI models using Agent Skills:

```
You (in Kiro)
    │
    │  /aiconfig-targeting
    │  "Change default for aidlc-agent to opus"
    ▼
LaunchDarkly (updates targeting)
    │
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

---

## Files in This Repo

```
.kiro/
└── steering/
    └── launchdarkly-ai-configs.md   # Kiro steering for Agent Skills

workshop-docs/
├── launchdarkly-setup.md            # Step 1: Account, keys, setup
├── construction-launchdarkly.md     # Step 2: AI Configs for model switching
└── operations-launchdarkly.md       # Step 3: Feature flags for issue control

examples/
├── aiconfig-agent.py                # Python example with Bedrock
└── frontend-flags.tsx               # React example with feature flags
```

---

## Links

- [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle)
- [LaunchDarkly Agent Skills](https://github.com/launchdarkly/agent-skills)
- [LaunchDarkly Free Trial](https://launchdarkly.com/start-trial/)
- [LaunchDarkly Docs](https://docs.launchdarkly.com)
