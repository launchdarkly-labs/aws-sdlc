# LaunchDarkly Integration for AWS AI-DLC Workshop

This repository provides LaunchDarkly integration materials for the [AWS AI-Driven Development Lifecycle (AI-DLC) Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle). It adds feature management capabilities as an overlay without modifying the core workshop.

## What This Repo Provides

| Directory | Contents | Purpose |
|-----------|----------|---------|
| `kiro-power/` | Power.md, Steering.md | Kiro Power configuration for AI assistants |
| `workshop-docs/` | Tutorial markdown files | Step-by-step guides for workshop participants |
| `examples/` | Python and React code | Working code examples to copy into projects |

## Official LaunchDarkly Resources vs. This Repo

### Official LaunchDarkly Resources

| Resource | Location | What It Is |
|----------|----------|------------|
| **Hosted MCP Servers** | `https://mcp.launchdarkly.com/mcp/fm` (flags) <br> `https://mcp.launchdarkly.com/mcp/aiconfigs` (AI Configs) | Production MCP servers that connect AI clients to LaunchDarkly via OAuth |
| **Official Documentation** | [docs.launchdarkly.com](https://docs.launchdarkly.com) | Comprehensive SDK docs, tutorials, API reference |
| **Python AI SDK** | [PyPI](https://pypi.org/project/launchdarkly-server-sdk-ai/) / [GitHub](https://github.com/launchdarkly/python-server-sdk-ai) | Official SDK for AI Configs in Python |
| **React SDK** | [npm](https://www.npmjs.com/package/launchdarkly-react-client-sdk) | Official SDK for feature flags in React |
| **MCP Server Package** | [@launchdarkly/mcp-server](https://www.npmjs.com/package/@launchdarkly/mcp-server) | Local MCP server (alternative to hosted) |

### This Repository (Workshop-Specific)

| File | Based On | Purpose |
|------|----------|---------|
| `kiro-power/Power.md` | [Official MCP docs](https://docs.launchdarkly.com/home/getting-started/mcp-hosted) | Pre-configured MCP setup for workshop participants |
| `kiro-power/Steering.md` | Workshop requirements | Agent instructions specific to AI-DLC integration |
| `examples/aiconfig-agent.py` | [Python AI SDK docs](https://docs.launchdarkly.com/sdk/ai/python) | Working example adapted for the workshop's code generation agent |
| `examples/frontend-flags.tsx` | [React SDK docs](https://docs.launchdarkly.com/sdk/client-side/react) | Working example adapted for AnyCompanyRead e-commerce app |
| `workshop-docs/*.md` | Original content | Step-by-step tutorials for workshop phases |

## Quick Start

### 1. Configure MCP Servers

Add to your AI client's MCP configuration (Claude Code, Cursor, etc.):

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

Or use the quick install links:
- [Feature management server](https://mcp.launchdarkly.com/mcp/fm/install)
- [AI Configs server](https://mcp.launchdarkly.com/mcp/aiconfigs/install)

### 2. Follow the Workshop Docs

1. **Construction Phase**: Follow [construction-ld-aiconfig.md](workshop-docs/construction-ld-aiconfig.md) to add AI Configs to code generation agents
2. **Operations Phase**: Follow [operations-ld-flags.md](workshop-docs/operations-ld-flags.md) to add feature flags to the AnyCompanyRead app

### 3. Use the Code Examples

Copy the examples into your workshop project:

- `examples/aiconfig-agent.py` - Python agent with LaunchDarkly AI Config
- `examples/frontend-flags.tsx` - React components with feature flags

## Workshop Integration Points

### Construction Phase: AI Configs

Add runtime model/prompt configuration to AI agents:

```
┌─────────────────────────────────────────────────────────┐
│  AI-DLC Code Generation Agent                           │
│                                                         │
│  ┌─────────────┐    ┌──────────────────┐               │
│  │ User Request │───▶│ LaunchDarkly     │               │
│  └─────────────┘    │ AI Config        │               │
│                     │ (model, prompt)  │               │
│                     └────────┬─────────┘               │
│                              │                          │
│                              ▼                          │
│                     ┌──────────────────┐               │
│                     │ Claude/GPT/etc   │               │
│                     │ (configured at   │               │
│                     │  runtime)        │               │
│                     └──────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### Operations Phase: Feature Flags

Add progressive delivery to the generated e-commerce app:

```
┌─────────────────────────────────────────────────────────┐
│  AnyCompanyRead E-commerce App                          │
│                                                         │
│  ┌──────────────┐   ┌─────────────────┐                │
│  │ new-checkout │──▶│ NewCheckout     │ (10% rollout)  │
│  │ -flow: true  │   └─────────────────┘                │
│  ├──────────────┤   ┌─────────────────┐                │
│  │ new-checkout │──▶│ LegacyCheckout  │ (90% control)  │
│  │ -flow: false │   └─────────────────┘                │
│  └──────────────┘                                       │
│                                                         │
│  ┌──────────────┐   ┌─────────────────┐                │
│  │ premium-     │──▶│ PremiumFeatures │ (pro/ent only) │
│  │ features     │   └─────────────────┘                │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
aws-aisdlc/
├── README.md                              # This file
├── .gitignore                             # Git ignore rules
├── kiro-power/
│   ├── Power.md                           # MCP server configuration
│   └── Steering.md                        # Agent integration instructions
├── workshop-docs/
│   ├── construction-ld-aiconfig.md        # AI Configs tutorial
│   └── operations-ld-flags.md             # Feature flags tutorial
└── examples/
    ├── aiconfig-agent.py                  # Python AI Config example
    └── frontend-flags.tsx                 # React feature flags example
```

## Prerequisites

- LaunchDarkly account ([free trial](https://launchdarkly.com/start-trial/))
- Completed AWS AI-DLC workshop setup
- AI client with MCP support (Claude Code, Cursor, VS Code + Copilot, Windsurf)

## Related Links

- [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle)
- [LaunchDarkly Documentation](https://docs.launchdarkly.com)
- [LaunchDarkly AI Configs](https://docs.launchdarkly.com/home/ai-configs)
- [LaunchDarkly MCP Server](https://docs.launchdarkly.com/home/getting-started/mcp-hosted)
- [Python AI SDK Reference](https://docs.launchdarkly.com/sdk/ai/python)
- [React SDK Reference](https://docs.launchdarkly.com/sdk/client-side/react)
