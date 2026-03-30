# LaunchDarkly Integration for AWS AI-DLC Workshop

LaunchDarkly overlay for the [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle). Adds feature management without modifying the core workshop.

## Quick Start

### 1. Configure MCP

Add to your AI client (Claude Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "LaunchDarkly feature management": {
      "type": "http",
      "url": "https://mcp.launchdarkly.com/mcp/fm"
    },
    "LaunchDarkly AI Configs": {
      "type": "http",
      "url": "https://mcp.launchdarkly.com/mcp/aiconfigs"
    }
  }
}
```

Or use quick install: [flags](https://mcp.launchdarkly.com/mcp/fm/install) | [AI Configs](https://mcp.launchdarkly.com/mcp/aiconfigs/install)

### 2. Follow the Tutorials

- **Construction Phase**: [AI Configs tutorial](workshop-docs/construction-ld-aiconfig.md) — runtime model/prompt switching
- **Operations Phase**: [Feature flags tutorial](workshop-docs/operations-ld-flags.md) — progressive rollout for the app

### 3. Use the Examples

- `examples/aiconfig-agent.py` — Python + Bedrock + LaunchDarkly AI Config
- `examples/frontend-flags.tsx` — React feature flags

## What's Here

```
├── kiro-power/
│   ├── Power.md              # MCP config
│   └── Steering.md           # Agent instructions
├── workshop-docs/
│   ├── construction-ld-aiconfig.md
│   └── operations-ld-flags.md
└── examples/
    ├── aiconfig-agent.py
    └── frontend-flags.tsx
```

## Design Decisions

**Why code generation agent?** Most visible output. Sonnet vs Opus produces noticeably different results.

For production evaluations, see [Custom Evals tutorial](https://launchdarkly.com/docs/tutorials/custom-evals-claude-code).

## Prerequisites

- [LaunchDarkly account](https://launchdarkly.com/start-trial/)
- AWS AI-DLC workshop setup complete
- Bedrock Claude models enabled

## Links

- [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle)
- [LaunchDarkly Docs](https://docs.launchdarkly.com)
- [Python AI SDK](https://docs.launchdarkly.com/sdk/ai/python)
- [React SDK](https://docs.launchdarkly.com/sdk/client-side/react)
